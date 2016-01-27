//Matthew Seymour, matthew dot seymour at gmail.com

"use strict";

var fft = {};

fft.FFT_DIRECTIONS = {FORWARD: 1, BACKWARD: 2};


fft.getPrograms = function(gl) {
    var fft = {};
    
    fft.unitRectBuffer = glUtils.generateSimpleUnitRectangleBuffer(gl);
    

    
    fft.transformProgramInfo = glUtils.makeProgram(
        gl, fftVertexSource, transposeFragmentSource, 
        ["a_position", "a_texCoord"], 
        ["u_image", "u_transpose"]
    );

    fft.scaleProgramInfo = glUtils.makeProgram(
        gl, fftVertexSource, scaleFragmentSource, 
        ["a_position", "a_texCoord"], 
        ["u_image", "u_scale"]
    );

    fft.bitReverseProgramInfo = glUtils.makeProgram(
        gl, fftVertexSource, bitReverseFragmentSource, 
        ["a_position", "a_texCoord"], 
        ["u_image", "u_bitReverse", "u_n"]
    );

    fft.stageProgramInfo = glUtils.makeProgram(
        gl, fftVertexSource, stageFragmentSource, 
        ["a_position", "a_texCoord"], 
        ["u_image", "u_twiddles", "u_read", "u_numStages", "u_n", "u_stage", "u_reduce"]
    );

    fft.colorMapProgramInfo = glUtils.makeProgram(
        gl, fftVertexSource, colorMapFragmentSource, 
        ["a_position", "a_texCoord"], 
        ["u_image_0", "u_image_1", "u_image_2", "u_colorMap"]
    );

    fft.bicubicProgramInfo = glUtils.makeProgram(
        gl, fftVertexSource, bicubicFragmentSource, 
        ["a_position", "a_texCoord"], 
        ["u_image", "u_size"]
    );

    fft.gradientProgramInfo = glUtils.makeProgram(
        gl, fftVertexSource, gradientFragmentSource, 
        ["a_position", "a_texCoord"], 
        ["u_image", "u_size", "u_gradVec", "u_dist"]
    );
    
    fft.noiseProgramInfo = glUtils.makeProgram(
        gl, fftVertexSource, noiseFragmentSource, 
        ["a_position", "a_texCoord"], 
        ["u_seed"]
    );
    
    fft.gaussianNoiseProgramInfo = glUtils.makeProgram(
        gl, fftVertexSource, gaussianNoiseFragmentSource, 
        ["a_position", "a_texCoord"], 
        ["u_seed", "u_scale"]
    );
    
    
    
    return fft;
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
        ["u_image0", "u_image1"]
    );
    programInfo.unitRectBuffer = glUtils.generateSimpleUnitRectangleBuffer(gl);
    return programInfo;
}

fft.deleteCustomProgram = function(gl, programInfo) {
    gl.deleteBuffer(programInfo.unitRectBuffer);
    gl.deleteProgram(programInfo.program);
    
}

fft.deletePrograms = function(gl, fftProgs) {
    gl.deleteBuffer(fftProgs.unitRectBuffer);
    
    gl.deleteProgram(fftProgs.transformProgramInfo.program );
    gl.deleteProgram(fftProgs.scaleProgramInfo.program     );
    gl.deleteProgram(fftProgs.bitReverseProgramInfo.program);
    gl.deleteProgram(fftProgs.stageProgramInfo.program     );
    
}

fft.packNumber = function(x) { //range [-1, 1.00003...]
    var xScaled = Math.round(x * 32767) + 32767;
    return [Math.floor(xScaled / 256), xScaled % 256];
}

fft.packComplexNumber = function(real, imag) {
    var realPacked = fft.packNumber(real);
    var imagPacked = fft.packNumber(imag);
    
    return [realPacked[0], imagPacked[0], realPacked[1], imagPacked[1]];
}

fft.unpackNumber = function(v) { //range [(0, 0), (255, 255)]
    var x = v[0] * 256 + v[1];   //Range [0, 65535]
    
    return (x - 32767) / 32767; //Range [-1, 1.00003...]
}

fft.unpackComplexNumber = function(v) {
    var realUnpacked = fft.unpackNumber([v[0], v[2]]);
    var imagUnpacked = fft.unpackNumber([v[1], v[3]]);
    
    return [realUnpacked, imagUnpacked];
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
    
        imageDataBitReverse[i * 4]     = j % 256;
        imageDataBitReverse[i * 4 + 1] = Math.floor(j / 256);
        imageDataBitReverse[i * 4 + 2] = 0;
        imageDataBitReverse[i * 4 + 3] = 0;
    }

    var imageDataTwiddle = new Uint8Array(N * stages * 4);
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
                
                var packed;
                packed = fft.packComplexNumber(twiddle_r, twiddle_i);
                
                imageDataTwiddle[getIndex(i1, row, N) + 0] = packed[0];
                imageDataTwiddle[getIndex(i1, row, N) + 1] = packed[1];
                imageDataTwiddle[getIndex(i1, row, N) + 2] = packed[2];
                imageDataTwiddle[getIndex(i1, row, N) + 3] = packed[3];
                
                //Even
                imageDataRead[getIndex(i2, row, N) + 0] = Math.floor(i1 / 256);
                imageDataRead[getIndex(i2, row, N) + 1] = i1 % 256;
                //Odd
                imageDataRead[getIndex(i2, row, N) + 2] = Math.floor(i2 / 256);
                imageDataRead[getIndex(i2, row, N) + 3] = i2 % 256;
                
                packed = fft.packComplexNumber(-twiddle_r, -twiddle_i);
                
                imageDataTwiddle[getIndex(i2, row, N) + 0] = packed[0];
                imageDataTwiddle[getIndex(i2, row, N) + 1] = packed[1];
                imageDataTwiddle[getIndex(i2, row, N) + 2] = packed[2];
                imageDataTwiddle[getIndex(i2, row, N) + 3] = packed[3];
                
            }
        }
        outputSize *= 2;
        row++;
    }
    
    return {
        N          : N, 
        reduce     : reduceFactor,
        stages     : stages, 
        bitReverse : makeSpriteData(imageDataBitReverse, N, 1     ),
        twiddles   : makeSpriteData(imageDataTwiddle   , N, stages),
        read       : makeSpriteData(imageDataRead      , N, stages),        
    }
        
    
}

fft.computeFft = function(gl, fftProgs, fftPlan, data, outputFrameBuffer, tempFrameBuffer) {
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
    

    function getFromBuffer(direction) {
        if(direction == directions.FORWARD) {
            return outputFrameBuffer;
        } else if(direction == directions.BACKWARD) {
            return tempFrameBuffer;
        }
    }
    
    function getToBuffer(direction) {
        if(direction == directions.FORWARD) {
            return tempFrameBuffer;
        } else if(direction == directions.BACKWARD) {
            return outputFrameBuffer;
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
    
        gl.activeTexture(gl.TEXTURE1);
    	gl.bindTexture(gl.TEXTURE_2D, fftPlan.twiddles.texture);

        gl.activeTexture(gl.TEXTURE2);
    	gl.bindTexture(gl.TEXTURE_2D, fftPlan.read.texture);


    	fftProgs.stageProgramInfo.setters.u_image(0);
    	fftProgs.stageProgramInfo.setters.u_twiddles(1);
    	fftProgs.stageProgramInfo.setters.u_read(2);
    	fftProgs.stageProgramInfo.setters.u_reduce(fftPlan.reduce);
    	fftProgs.stageProgramInfo.setters.u_numStages(stages);
    	fftProgs.stageProgramInfo.setters.u_n(size);
        
        for(var i = 0; i < stages; i++) {
            gl.activeTexture(gl.TEXTURE0);
        	gl.bindTexture(gl.TEXTURE_2D, getFromBuffer(direction).texture);
    
        	fftProgs.stageProgramInfo.setters.u_stage(i);

            gl.bindFramebuffer(gl.FRAMEBUFFER, getToBuffer(direction).frameBuffer);
            gl.viewport(0, 0, size, size); 
        
	    	gl.drawArrays(gl.TRIANGLES, 0, 6);
            
            direction = swapDirection(direction);
        }
        return direction;
    }
    
    function transpose(direction, straightCopy) {
    	gl.useProgram(fftProgs.transformProgramInfo.program);
    
        gl.bindFramebuffer(gl.FRAMEBUFFER, getToBuffer(direction).frameBuffer);
        gl.viewport(0, 0, size, size); 
    
        glUtils.bindRectBuffer(gl, fftProgs.transformProgramInfo, fftProgs.unitRectBuffer);

        gl.activeTexture(gl.TEXTURE0);
    	gl.bindTexture(gl.TEXTURE_2D, getFromBuffer(direction).texture);
    
        fftProgs.transformProgramInfo.setters.u_image(0);
        fftProgs.transformProgramInfo.setters.u_transpose(straightCopy ? 0 : 1);
    
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        
        return swapDirection(direction);
    }

    bitReverse(data, tempFrameBuffer);
    var dir = directions.BACKWARD;
    dir = transform(dir);
    dir = transpose(dir, false);
    
    bitReverse(getFromBuffer(dir), getToBuffer(dir));
    dir = swapDirection(dir);
    
    dir = transform(dir);
    dir = transpose(dir, false);
    
    if(dir == directions.BACKWARD)
        transpose(dir, true);
    
}

fft.colorMap = function(gl, fftProgs, colorMap, inputBuffer0, inputBuffer1, inputBuffer2, outputBuffer) {
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

fft.scale = function(gl, fftProgs, scaleFactor, inputBuffer, outputBuffer) {
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

fft.bicubic = function(gl, fftProgs, inputBuffer, outputBuffer) {
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

fft.gradient = function(gl, fftProgs, directionVector, dist, inputBuffer, outputBuffer) {
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

fft.noise = function(gl, fftProgs, seed, outputBuffer) {
	gl.useProgram(fftProgs.noiseProgramInfo.program);

    gl.bindFramebuffer(gl.FRAMEBUFFER, outputBuffer.frameBuffer);
    gl.viewport(0, 0, outputBuffer.width, outputBuffer.height); 

    glUtils.bindRectBuffer(gl, fftProgs.noiseProgramInfo, fftProgs.unitRectBuffer);
    
    fftProgs.noiseProgramInfo.setters.u_seed(seed);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
}

fft.gaussianNoise = function(gl, fftProgs, seed, scale, outputBuffer) {
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

fft.runCustomProgram2 = function(gl, programInfo, inputBuffer0, inputBuffer1, outputBuffer) {
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

    gl.drawArrays(gl.TRIANGLES, 0, 6);
}