//Matthew Seymour, matthew dot seymour at gmail.com

"use strict";

var fft = {};

fft.FFT_DIRECTIONS = {FORWARD: 1, BACKWARD: 2};


fft.getPrograms = function(gl) {
    var fftProgs = {};
    
    fftProgs.gl = gl;
    
    fftProgs.unitRectBuffer = glUtils.generateSimpleUnitRectangleBuffer(gl);
    

    
    fftProgs.transformProgramInfo = glUtils.makeProgram(
        gl, fftVertexSource, transposeFragmentSource, 
        ["a_position", "a_texCoord"], 
        ["u_image", "u_transpose"]
    );

    fftProgs.scaleProgramInfo = glUtils.makeProgram(
        gl, fftVertexSource, scaleFragmentSource, 
        ["a_position", "a_texCoord"], 
        ["u_image", "u_scale"]
    );

    fftProgs.bitReverseProgramInfo = glUtils.makeProgram(
        gl, fftVertexSource, bitReverseFragmentSource, 
        ["a_position", "a_texCoord"], 
        ["u_image", "u_bitReverse", "u_n"]
    );

    fftProgs.stageProgramInfo = glUtils.makeProgram(
        gl, fftVertexSource, stageFragmentSource, 
        ["a_position", "a_texCoord"], 
        ["u_image_r", "u_image_i", "u_twiddles_r", "u_twiddles_i", "u_read", "u_numStages", "u_n", "u_stage", "u_reduce", "u_outputReal"]
    );

    fftProgs.colorMapProgramInfo = glUtils.makeProgram(
        gl, fftVertexSource, colorMapFragmentSource, 
        ["a_position", "a_texCoord"], 
        ["u_image_0", "u_image_1", "u_image_2", "u_colorMap"]
    );

    fftProgs.bicubicProgramInfo = glUtils.makeProgram(
        gl, fftVertexSource, bicubicFragmentSource, 
        ["a_position", "a_texCoord"], 
        ["u_image", "u_size"]
    );

    fftProgs.gradientProgramInfo = glUtils.makeProgram(
        gl, fftVertexSource, gradientFragmentSource, 
        ["a_position", "a_texCoord"], 
        ["u_image", "u_size", "u_gradVec", "u_dist"]
    );
    
    fftProgs.noiseProgramInfo = glUtils.makeProgram(
        gl, fftVertexSource, noiseFragmentSource, 
        ["a_position", "a_texCoord"], 
        ["u_seed"]
    );
    
    fftProgs.gaussianNoiseProgramInfo = glUtils.makeProgram(
        gl, fftVertexSource, gaussianNoiseFragmentSource, 
        ["a_position", "a_texCoord"], 
        ["u_seed", "u_scale"]
    );
    
    
    
    return fftProgs;
}

fft.buildCustomProgram = function(gl, code) {
    var fragmentSource = transformFragmentSource1 + code + transformFragmentSource2;
    var programInfo = glUtils.makeProgram(
        gl, fftVertexSource, fragmentSource,
        ["a_position", "a_texCoord"],
        ["u_image","u_1","u_2","u_3"]
    );
    programInfo.unitRectBuffer = glUtils.generateSimpleUnitRectangleBuffer(gl);
    return programInfo;
}

fft.buildCustomProgram2 = function(gl, code) {
    var fragmentSource = transform2FragmentSource1 + code + transform2FragmentSource2;
    var programInfo = glUtils.makeProgram(
        gl, fftVertexSource, fragmentSource,
        ["a_position", "a_texCoord"],
        ["u_image0", "u_image1","u_1","u_2","u_3","u_4"]
    );
    programInfo.unitRectBuffer = glUtils.generateSimpleUnitRectangleBuffer(gl);
    return programInfo;
}

fft.packNumber = function(x) { //range [-1, 1.00003...]
    var xScaled = Math.round(x * 32767) + 32767;
    return [Math.floor(xScaled / 256), xScaled % 256, 0, 0];
}

fft.unpackNumber = function(v) { //range [(0, 0), (255, 255)]
    var x = v[0] * 256 + v[1];   //Range [0, 65535]
    
    return (x - 32767) / 32767; //Range [-1, 1.00003...]
}

fft.makePlan = function(stages, direction, reduce) {
    var N = 1 << stages;
    
    var reduceFactor = Math.pow(reduce, 1 / stages);
    
    function getIndex(x, y, width) {
        return (x + y * width) * 4;
    }
    
    //Bit reverse N x 1
    var imageDataBitReverse = new Uint8Array(N * 1 * 4);
    for(var i = 0; i < N; i++) {
        //Bit reversal:
        var k1 = 1; 
        var k2 = N >> 1;
        var j = 0; //output index
        while(k1 < N) {
            j += (Math.floor(i / k2) % 2) * k1;
            k1 = k1 << 1;
            k2 = k2 >> 1;
        }
    
        imageDataBitReverse[i * 4    ] = Math.floor(j / 256);
        imageDataBitReverse[i * 4 + 1] = j % 256;
        imageDataBitReverse[i * 4 + 2] = 0;
        imageDataBitReverse[i * 4 + 3] = 0;
    }

    var imageDataTwiddleR = new Uint8Array(N * stages * 4);
    var imageDataTwiddleI = new Uint8Array(N * stages * 4);
    var imageDataRead = new Uint8Array(N * stages * 4);

    
    var outputSize = 2;
    var row = 0;
    var dirFactor = (direction == fft.FFT_DIRECTIONS.FORWARD ? 1 : -1);
    while(outputSize <= N) {
        for(var n = 0; n < N / outputSize; n++) {
            for(var k = 0; k < outputSize / 2; k++) {
                var i1 = outputSize * n + k;
                var i2 = i1 + outputSize / 2;
                
                var twiddle_r = Math.cos(- dirFactor * 2 * Math.PI * k / outputSize);
                var twiddle_i = Math.sin(- dirFactor * 2 * Math.PI * k / outputSize);
                
                //Even:
                imageDataRead[getIndex(i1, row, N) + 0] = Math.floor(i1 / 256);
                imageDataRead[getIndex(i1, row, N) + 1] = i1 % 256;
                //Odd:
                imageDataRead[getIndex(i1, row, N) + 2] = Math.floor(i2 / 256);
                imageDataRead[getIndex(i1, row, N) + 3] = i2 % 256;
                
                var packedR, packedI;
                packedR = fft.packNumber(twiddle_r);
                packedI = fft.packNumber(twiddle_i);
                
                imageDataTwiddleR[getIndex(i1, row, N) + 0] = packedR[0];
                imageDataTwiddleR[getIndex(i1, row, N) + 1] = packedR[1];
                imageDataTwiddleR[getIndex(i1, row, N) + 2] = packedR[2];
                imageDataTwiddleR[getIndex(i1, row, N) + 3] = packedR[3];
                
                imageDataTwiddleI[getIndex(i1, row, N) + 0] = packedI[0];
                imageDataTwiddleI[getIndex(i1, row, N) + 1] = packedI[1];
                imageDataTwiddleI[getIndex(i1, row, N) + 2] = packedI[2];
                imageDataTwiddleI[getIndex(i1, row, N) + 3] = packedI[3];
            
                //Even
                imageDataRead[getIndex(i2, row, N) + 0] = Math.floor(i1 / 256);
                imageDataRead[getIndex(i2, row, N) + 1] = i1 % 256;
                //Odd
                imageDataRead[getIndex(i2, row, N) + 2] = Math.floor(i2 / 256);
                imageDataRead[getIndex(i2, row, N) + 3] = i2 % 256;
                
                packedR = fft.packNumber(-twiddle_r);
                packedI = fft.packNumber(-twiddle_i);
                
                imageDataTwiddleR[getIndex(i2, row, N) + 0] = packedR[0];
                imageDataTwiddleR[getIndex(i2, row, N) + 1] = packedR[1];
                imageDataTwiddleR[getIndex(i2, row, N) + 2] = packedR[2];
                imageDataTwiddleR[getIndex(i2, row, N) + 3] = packedR[3];

                imageDataTwiddleI[getIndex(i2, row, N) + 0] = packedI[0];
                imageDataTwiddleI[getIndex(i2, row, N) + 1] = packedI[1];
                imageDataTwiddleI[getIndex(i2, row, N) + 2] = packedI[2];
                imageDataTwiddleI[getIndex(i2, row, N) + 3] = packedI[3];
                
            }
        }
        outputSize *= 2;
        row++;
    }

    return {
        N          : N, 
        reduce     : reduceFactor,
        stages     : stages, 
        bitReverse : glUtils.makeSimpleTexture(N, 1     , imageDataBitReverse),
        twiddlesR  : glUtils.makeSimpleTexture(N, stages, imageDataTwiddleR  ),
        twiddlesI  : glUtils.makeSimpleTexture(N, stages, imageDataTwiddleI  ),
        read       : glUtils.makeSimpleTexture(N, stages, imageDataRead      ),        
    }
        
    
}

fft.computeFft = function(fftProgs, fftPlan, dataReal, dataImag, outputFrameBufferReal, outputFrameBufferImag, tempFrameBufferReal, tempFrameBufferImag) {
    var gl = fftProgs.gl;
    var stages = fftPlan.stages;
    var size = fftPlan.N;
    
    //Calc steps:
    var directions = {FORWARD: 0, BACKWARD: 1};
    

    function bitReverse(inputBuffer, outputBuffer) {
        //Bit reverse step:
    	gl.useProgram(fftProgs.bitReverseProgramInfo.program);
    
        gl.bindFramebuffer(gl.FRAMEBUFFER, outputBuffer.frameBuffer);
        gl.viewport(0, 0, size, size); 
    
        glUtils.bindRectBuffer(gl, fftProgs.bitReverseProgramInfo, fftProgs.unitRectBuffer);

        gl.activeTexture(gl.TEXTURE0);
    	gl.bindTexture(gl.TEXTURE_2D, inputBuffer.texture);
    
        gl.activeTexture(gl.TEXTURE1);
    	gl.bindTexture(gl.TEXTURE_2D, fftPlan.bitReverse.texture);

    	fftProgs.bitReverseProgramInfo.setters.u_image(0);
    	fftProgs.bitReverseProgramInfo.setters.u_bitReverse(1);
    	fftProgs.bitReverseProgramInfo.setters.u_n(size);
    
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
    

    function getFromBufferReal(direction) {
        if(direction == directions.FORWARD) {
            return outputFrameBufferReal;
        } else if(direction == directions.BACKWARD) {
            return tempFrameBufferReal;
        }
    }
    
    function getFromBufferImag(direction) {
        if(direction == directions.FORWARD) {
            return outputFrameBufferImag;
        } else if(direction == directions.BACKWARD) {
            return tempFrameBufferImag;
        }
    }
    
    function getToBufferReal(direction) {
        if(direction == directions.FORWARD) {
            return tempFrameBufferReal;
        } else if(direction == directions.BACKWARD) {
            return outputFrameBufferReal;
        }
    }

    function getToBufferImag(direction) {
        if(direction == directions.FORWARD) {
            return tempFrameBufferImag;
        } else if(direction == directions.BACKWARD) {
            return outputFrameBufferImag;
        }
    }
    
    function swapDirection(direction) {
        if(direction == directions.FORWARD) {
            return directions.BACKWARD;
        } else if(direction == directions.BACKWARD) {
            return directions.FORWARD;
        }
    }
    
    
    function transform(direction) {
    	gl.useProgram(fftProgs.stageProgramInfo.program);
    
        glUtils.bindRectBuffer(gl, fftProgs.stageProgramInfo, fftProgs.unitRectBuffer);
    
        gl.activeTexture(gl.TEXTURE2);
    	gl.bindTexture(gl.TEXTURE_2D, fftPlan.twiddlesR.texture);
        
        gl.activeTexture(gl.TEXTURE3);
    	gl.bindTexture(gl.TEXTURE_2D, fftPlan.twiddlesI.texture);

        gl.activeTexture(gl.TEXTURE4);
    	gl.bindTexture(gl.TEXTURE_2D, fftPlan.read.texture);


    	fftProgs.stageProgramInfo.setters.u_image_r(0);
    	fftProgs.stageProgramInfo.setters.u_image_i(1);
    	fftProgs.stageProgramInfo.setters.u_twiddles_r(2);
    	fftProgs.stageProgramInfo.setters.u_twiddles_i(3);
    	fftProgs.stageProgramInfo.setters.u_read(4);
    	fftProgs.stageProgramInfo.setters.u_reduce(fftPlan.reduce);
    	fftProgs.stageProgramInfo.setters.u_numStages(stages);
    	fftProgs.stageProgramInfo.setters.u_n(size);
        
        for(var i = 0; i < stages; i++) {
            gl.activeTexture(gl.TEXTURE0);
        	gl.bindTexture(gl.TEXTURE_2D, getFromBufferReal(direction).texture);
            
            gl.activeTexture(gl.TEXTURE1);
        	gl.bindTexture(gl.TEXTURE_2D, getFromBufferImag(direction).texture);
    
        	fftProgs.stageProgramInfo.setters.u_stage(i);
            

            //Real
            gl.bindFramebuffer(gl.FRAMEBUFFER, getToBufferReal(direction).frameBuffer);
        	
            fftProgs.stageProgramInfo.setters.u_outputReal(1);
            
            gl.viewport(0, 0, size, size); 
        
	    	gl.drawArrays(gl.TRIANGLES, 0, 6);
            
            //Imag
            gl.bindFramebuffer(gl.FRAMEBUFFER, getToBufferImag(direction).frameBuffer);

            fftProgs.stageProgramInfo.setters.u_outputReal(0);

            gl.viewport(0, 0, size, size); 
        
	    	gl.drawArrays(gl.TRIANGLES, 0, 6);
            
            
            
            direction = swapDirection(direction);
        }
        return direction;
    }

    function transposeBuffers(bufferIn, bufferOut, straightCopy) {
    	gl.useProgram(fftProgs.transformProgramInfo.program);
    
        gl.bindFramebuffer(gl.FRAMEBUFFER, bufferOut.frameBuffer);
        gl.viewport(0, 0, size, size); 
    
        glUtils.bindRectBuffer(gl, fftProgs.transformProgramInfo, fftProgs.unitRectBuffer);

        gl.activeTexture(gl.TEXTURE0);
    	gl.bindTexture(gl.TEXTURE_2D, bufferIn.texture);
    
        fftProgs.transformProgramInfo.setters.u_image(0);
        fftProgs.transformProgramInfo.setters.u_transpose(straightCopy ? 0 : 1);
    
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    
    function transpose(direction, straightCopy) {
        transposeBuffers(getFromBufferReal(direction), getToBufferReal(direction), straightCopy);
        transposeBuffers(getFromBufferImag(direction), getToBufferImag(direction), straightCopy);
        
        return swapDirection(direction);
    }

    bitReverse(dataReal, tempFrameBufferReal);
    bitReverse(dataImag, tempFrameBufferImag);
    var dir = directions.BACKWARD;
    
    dir = transform(dir);
    dir = transpose(dir, false);
    
    bitReverse(getFromBufferReal(dir), getToBufferReal(dir));
    bitReverse(getFromBufferImag(dir), getToBufferImag(dir));
    dir = swapDirection(dir);

    dir = transform(dir);
    dir = transpose(dir, false);

    if(dir == directions.BACKWARD)
        transpose(dir, true);
}

fft.colorMap = function(fftProgs, colorMap, inputBuffer0, inputBuffer1, inputBuffer2, outputBuffer) {
    var gl = fftProgs.gl;
	
    gl.useProgram(fftProgs.colorMapProgramInfo.program);

    gl.bindFramebuffer(gl.FRAMEBUFFER, outputBuffer.frameBuffer);
    gl.viewport(0, 0, outputBuffer.width, outputBuffer.height); 

    glUtils.bindRectBuffer(gl, fftProgs.colorMapProgramInfo, fftProgs.unitRectBuffer);

    gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, inputBuffer0.texture);

    gl.activeTexture(gl.TEXTURE1);
	gl.bindTexture(gl.TEXTURE_2D, inputBuffer1.texture);

    gl.activeTexture(gl.TEXTURE2);
	gl.bindTexture(gl.TEXTURE_2D, inputBuffer2.texture);

    gl.activeTexture(gl.TEXTURE3);
	gl.bindTexture(gl.TEXTURE_2D, colorMap.texture);

    fftProgs.colorMapProgramInfo.setters.u_image_0(0);
    fftProgs.colorMapProgramInfo.setters.u_image_1(1);
    fftProgs.colorMapProgramInfo.setters.u_image_2(2);
    fftProgs.colorMapProgramInfo.setters.u_colorMap(3);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
}

fft.scale = function(fftProgs, scaleFactor, inputBuffer, outputBuffer) {
    var gl = fftProgs.gl;
	
    gl.useProgram(fftProgs.scaleProgramInfo.program);

    gl.bindFramebuffer(gl.FRAMEBUFFER, outputBuffer.frameBuffer);
    gl.viewport(0, 0, outputBuffer.width, outputBuffer.height); 

    glUtils.bindRectBuffer(gl, fftProgs.scaleProgramInfo, fftProgs.unitRectBuffer);

    gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, inputBuffer.texture);

    fftProgs.scaleProgramInfo.setters.u_image(0);
    fftProgs.scaleProgramInfo.setters.u_scale(scaleFactor);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
}

fft.bicubic = function(fftProgs, inputBuffer, outputBuffer) {
    var gl = fftProgs.gl;
	
    gl.useProgram(fftProgs.bicubicProgramInfo.program);

    gl.bindFramebuffer(gl.FRAMEBUFFER, outputBuffer.frameBuffer);
    gl.viewport(0, 0, outputBuffer.width, outputBuffer.height); 

    glUtils.bindRectBuffer(gl, fftProgs.bicubicProgramInfo, fftProgs.unitRectBuffer);

    gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, inputBuffer.texture);

    fftProgs.bicubicProgramInfo.setters.u_image(0);
    fftProgs.bicubicProgramInfo.setters.u_size([inputBuffer.width, inputBuffer.height]);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
}

fft.gradient = function(fftProgs, directionVector, dist, inputBuffer, outputBuffer) {
    var gl = fftProgs.gl;
	
    gl.useProgram(fftProgs.gradientProgramInfo.program);

    gl.bindFramebuffer(gl.FRAMEBUFFER, outputBuffer.frameBuffer);
    gl.viewport(0, 0, outputBuffer.width, outputBuffer.height); 

    glUtils.bindRectBuffer(gl, fftProgs.gradientProgramInfo, fftProgs.unitRectBuffer);

    gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, inputBuffer.texture);

    fftProgs.gradientProgramInfo.setters.u_image(0);
    fftProgs.gradientProgramInfo.setters.u_size([inputBuffer.width, inputBuffer.height]);
    fftProgs.gradientProgramInfo.setters.u_gradVec(directionVector);
    fftProgs.gradientProgramInfo.setters.u_dist(dist);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
}

fft.noise = function(fftProgs, seed, outputBuffer) {
    var gl = fftProgs.gl;
	
    gl.useProgram(fftProgs.noiseProgramInfo.program);

    gl.bindFramebuffer(gl.FRAMEBUFFER, outputBuffer.frameBuffer);
    gl.viewport(0, 0, outputBuffer.width, outputBuffer.height); 

    glUtils.bindRectBuffer(gl, fftProgs.noiseProgramInfo, fftProgs.unitRectBuffer);
    
    fftProgs.noiseProgramInfo.setters.u_seed(seed);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
}

fft.gaussianNoise = function(fftProgs, seed, scale, outputBuffer) {
    var gl = fftProgs.gl;
	
    gl.useProgram(fftProgs.gaussianNoiseProgramInfo.program);

    gl.bindFramebuffer(gl.FRAMEBUFFER, outputBuffer.frameBuffer);
    gl.viewport(0, 0, outputBuffer.width, outputBuffer.height); 

    glUtils.bindRectBuffer(gl, fftProgs.gaussianNoiseProgramInfo, fftProgs.unitRectBuffer);
    
    fftProgs.gaussianNoiseProgramInfo.setters.u_seed(seed);
    fftProgs.gaussianNoiseProgramInfo.setters.u_scale(scale);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
}


fft.runCustomProgram = function(gl, programInfo, inputBuffer, outputBuffer, u_1, u_2, u_3) {
	gl.useProgram(programInfo.program);

    gl.bindFramebuffer(gl.FRAMEBUFFER, outputBuffer.frameBuffer);
    gl.viewport(0, 0, outputBuffer.width, outputBuffer.height); 

    glUtils.bindRectBuffer(gl, programInfo, programInfo.unitRectBuffer);

    gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, inputBuffer.texture);

    programInfo.setters.u_image(0);
    
    if(u_1 !== undefined)
        programInfo.setters.u_1(u_1);
    
    if(u_2 !== undefined)
        programInfo.setters.u_2(u_2);
    
    if(u_3 !== undefined)
        programInfo.setters.u_3(u_3);
    
        

    gl.drawArrays(gl.TRIANGLES, 0, 6);
}

fft.runCustomProgram2 = function(gl, programInfo, inputBuffer0, inputBuffer1, outputBuffer, u_1, u_2, u_3, u_4) {
	gl.useProgram(programInfo.program);

    gl.bindFramebuffer(gl.FRAMEBUFFER, outputBuffer.frameBuffer);
    gl.viewport(0, 0, outputBuffer.width, outputBuffer.height); 

    glUtils.bindRectBuffer(gl, programInfo, programInfo.unitRectBuffer);

    gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, inputBuffer0.texture);
    
    gl.activeTexture(gl.TEXTURE1);
	gl.bindTexture(gl.TEXTURE_2D, inputBuffer1.texture);

    programInfo.setters.u_image0(0);
    programInfo.setters.u_image1(1);

    if(u_1 !== undefined)
        programInfo.setters.u_1(u_1);
    
    if(u_2 !== undefined)
        programInfo.setters.u_2(u_2);
    
    if(u_3 !== undefined)
        programInfo.setters.u_3(u_3);
    
    if(u_4 !== undefined)
        programInfo.setters.u_3(u_4);
    

    gl.drawArrays(gl.TRIANGLES, 0, 6);
}