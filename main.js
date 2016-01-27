//Matthew Seymour, matthew dot seymour at gmail.com

"use strict";

var WIDTH  = document.body.offsetWidth;
var HEIGHT = document.body.offsetHeight;



var canvas = document.getElementById("canvas");
canvas.width = WIDTH;
canvas.height = HEIGHT;


var gl = canvas.getContext("experimental-webgl", 
    {
        alpha: false,
        //antialias: true
    });
gl.disable(gl.BLEND);





function setPixelValue(array, x, y, width, color) {
    array[(y * width + x) * 4    ] = color[0];
    array[(y * width + x) * 4 + 1] = color[1];
    array[(y * width + x) * 4 + 2] = color[2];
    array[(y * width + x) * 4 + 3] = color[3];
}

var spriteProgramInfo = (function () {
    var programInfo = glUtils.makeProgram(
        gl, spriteVertexSource, spriteFragmentSource, 
        ["a_position", "a_texCoord", "u_resolution", "u_position", "u_size", "u_texResolution", "u_texPosition", "u_texSize"], 
        ["u_image", "u_mask"]
    );
    
	//set resolution:
	gl.useProgram(programInfo.program);
    programInfo.setters.u_resolution([canvas.width, canvas.height]);
    
    programInfo.spriteVertexBuffer = glUtils.generateSimpleUnitRectangleBuffer(gl);
    
	
    return programInfo;
})();

var spriteMaskProgramInfo = (function () {
    var programInfo = glUtils.makeProgram(
        gl, spriteMaskVertexSource, spriteMaskFragmentSource, 
        ["a_position", "a_texCoord"], 
        ["u_image", "u_mask", "u_resolution", "u_position", "u_size", "u_texResolution", 
         "u_texPosition", "u_texSize", "u_maskTexResolution", "u_maskTexPosition", "u_maskTexSize"]
    );
    
	//set resolution:
	gl.useProgram(programInfo.program);
    programInfo.setters.u_resolution([canvas.width, canvas.height]);
    
    programInfo.spriteVertexBuffer = glUtils.generateSimpleUnitRectangleBuffer(gl);
    
	
    return programInfo;
})();

var fftProgs = fft.getPrograms(gl);

function makeSpriteData(data, width, height) {
    return glUtils.makeTexture(width, height, gl.NEAREST, gl.CLAMP_TO_EDGE, data);
}

function drawSprite(gl, sx, sy, sw, sh, x, y, w, h, sprite, mask) {
	gl.useProgram(spriteProgramInfo.program);
	
    glUtils.bindRectBuffer(gl, spriteProgramInfo, spriteProgramInfo.spriteVertexBuffer);

	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, sprite.texture);

	spriteProgramInfo.setters.u_position([x, y]);
	spriteProgramInfo.setters.u_size([w, h]);
	spriteProgramInfo.setters.u_image(0);
	spriteProgramInfo.setters.u_texResolution([sprite.width, sprite.height]);
	spriteProgramInfo.setters.u_texPosition([sx, sy]);
	spriteProgramInfo.setters.u_texSize([sw, sh]);
	spriteProgramInfo.setters.u_mask(mask);
	
	//draw
	gl.drawArrays(gl.TRIANGLES, 0, 6);
	
}

//The mask is another sprite
function drawSpriteMask(gl, sx, sy, sw, sh, mx, my, mw, mh, x, y, w, h, sprite, mask) {
	gl.useProgram(spriteMaskProgramInfo.program);
	
    glUtils.bindRectBuffer(gl, spriteMaskProgramInfo, spriteMaskProgramInfo.spriteVertexBuffer);

	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, sprite.texture);

	gl.activeTexture(gl.TEXTURE1);
	gl.bindTexture(gl.TEXTURE_2D, mask.texture);

	spriteMaskProgramInfo.setters.u_position([x, y]);
	spriteMaskProgramInfo.setters.u_size([w, h]);
	spriteMaskProgramInfo.setters.u_image(0);
	spriteMaskProgramInfo.setters.u_texResolution([sprite.width, sprite.height]);
	spriteMaskProgramInfo.setters.u_texPosition([sx, sy]);
	spriteMaskProgramInfo.setters.u_texSize([sw, sh]);

	spriteMaskProgramInfo.setters.u_maskTexResolution([mask.width, mask.height]);
	spriteMaskProgramInfo.setters.u_maskTexPosition([mx, my]);
	spriteMaskProgramInfo.setters.u_maskTexSize([mw, mh]);
	spriteMaskProgramInfo.setters.u_mask(1);
	
	//draw
	gl.drawArrays(gl.TRIANGLES, 0, 6);
	
}



function generateHeightMap(fft, stages, scale) {
    var N = 1 << stages;
    
    var buffer1 = glUtils.makeFrameBuffer(N, N, gl.NEAREST);
    var buffer2 = glUtils.makeFrameBuffer(N, N, gl.NEAREST);
    var buffer3 = glUtils.makeFrameBuffer(N, N, gl.NEAREST);


    //fft.noise(gl, fftProgs, Math.floor(Math.random() * 65535), buffer1);
    fft.gaussianNoise(gl, fftProgs, Math.floor(Math.random() * 65535), 1, buffer1);

    var shapeNoise = fft.buildCustomProgram(gl, `
        float kMag = sqrt(k.x * k.x + k.y * k.y);
        float mag;
        if(kMag < .0001) {
            mag = 0.0;
        } else {
            mag = 1.0 / pow(kMag * 110.0, 1.7);
        }  
        //b = (a * 2.0 - 1.0) * mag;
        b = a * mag;
        `
    );

    fft.runCustomProgram(gl, shapeNoise, buffer1, buffer2);

    var fftPlan = fft.makePlan(stages, fft.FFT_DIRECTIONS.BACKWARD, Math.sqrt(N));
    fft.computeFft(gl, fftProgs, fftPlan, buffer2, buffer1, buffer3);
    
    fft.scale(gl, fftProgs, scale, buffer1, buffer2);
    
    return {heightMapBuffer: buffer2 };
    
    
}




var grassNoiseThreshold = 100;

function getMapBackgroundGrass(value) {
    var noiseThreshold = grassNoiseThreshold;
    var land;
    var water;
    var landMask;
    
	
	if(value < noiseThreshold + 5) //Land
	{
		var tempValue = value - noiseThreshold;
        land = [Math.max(0, Math.round(tempValue * 300 / (255 - noiseThreshold)) + 75),
				Math.max(0, Math.round(tempValue * 300 / (255 - noiseThreshold)) + 75),
				0,
                255];
    }               
	else
	{
		var tempValue = value - noiseThreshold;
		land = [Math.round(tempValue * 45 / (255 - noiseThreshold)) + 80,
				Math.round(tempValue * 45 / (255 - noiseThreshold)) + 130,
				Math.round(tempValue * 25 / (255 - noiseThreshold)) + 40,
                255];
	}
    if(value < noiseThreshold) 
    {
        water = [Math.round(value *  45 / noiseThreshold) +  0,
    			 Math.round(value *  75 / noiseThreshold) + 75,
    			 Math.round(value *  85 / noiseThreshold) + 85,
                 255];
    } 
    else 
    {
        water = [0,0,0,0];
    }
    
	if(value < noiseThreshold) 
    {
        var mask = Math.floor(255 * value / noiseThreshold);
		landMask = [255, 255, 255, 255 - mask];
	} 
    else 
    {
		landMask = [0, 0, 0, 0];
    }
    
    
    
    return {land: land, water: water, landMask: landMask};
}



var upscale = {x: 8, y: 6};

function genMap(fft, size) {
    
    //Next power of 2 to incorporate the map size:
    var stages = Math.ceil(Math.log(size) / Math.log(2));
    var N = 1 << stages; //the resized size

    var heightMap = generateHeightMap(fft, stages, 15);



    var colorMapSize = 255;
    var colorMapLandPixels     = new Uint8Array(colorMapSize * 3 * 4);
    var colorMapWaterPixels    = new Uint8Array(colorMapSize * 3 * 4);
    var colorMapLandMaskPixels = new Uint8Array(colorMapSize * 3 * 4);
    
    for(var i = 0; i < colorMapSize; i++) {
        var colorValues = getMapBackgroundGrass(i);
        setPixelValue(colorMapLandPixels, i, 0, colorMapSize, colorValues.land);
        setPixelValue(colorMapLandPixels, i, 1, colorMapSize, [i / 7, i / 7, i / 7, 255]);
        setPixelValue(colorMapLandPixels, i, 2, colorMapSize, [(25 / 255) * i, (25 / 255) * i, (25 / 255) * i, 255]);

        setPixelValue(colorMapWaterPixels, i, 0, colorMapSize,    colorValues.water);
        setPixelValue(colorMapWaterPixels, i, 1, colorMapSize,    [0,0,0,0]);
        setPixelValue(colorMapWaterPixels, i, 2, colorMapSize,    [0,0,0,0]);
        
        setPixelValue(colorMapLandMaskPixels, i, 0, colorMapSize, colorValues.landMask);
        setPixelValue(colorMapLandMaskPixels, i, 1, colorMapSize, [0,0,0,0]);
        setPixelValue(colorMapLandMaskPixels, i, 2, colorMapSize, [0,0,0,0]);
    }
    var colorMapLand     = makeSpriteData(colorMapLandPixels    , colorMapSize, 3);
    var colorMapWater    = makeSpriteData(colorMapWaterPixels   , colorMapSize, 3);
    var colorMapLandMask = makeSpriteData(colorMapLandMaskPixels, colorMapSize, 3);


    var finalLargeHeightBuffer   = glUtils.makeFrameBuffer(N * upscale.x, N * upscale.y, gl.NEAREST);
    var finalLargeGradBuffer     = glUtils.makeFrameBuffer(N * upscale.x, N * upscale.y, gl.NEAREST);
    var finalLargeNoiseBuffer    = glUtils.makeFrameBuffer(N * upscale.x, N * upscale.y, gl.NEAREST);
    var finalLargeTempBuffer     = glUtils.makeFrameBuffer(N * upscale.x, N * upscale.y, gl.NEAREST);
    var finalLargeWaterBuffer    = glUtils.makeFrameBuffer(N * upscale.x, N * upscale.y, gl.NEAREST);
    var finalLargeLandMaskBuffer = glUtils.makeFrameBuffer(N * upscale.x, N * upscale.y, gl.NEAREST);

    fft.bicubic(gl,  fftProgs, heightMap.heightMapBuffer, finalLargeHeightBuffer);
    
    fft.gradient(gl, fftProgs, [15, -20], 4, finalLargeHeightBuffer, finalLargeGradBuffer);
    
    fft.noise(gl, fftProgs, Math.floor(Math.random() * 65535), finalLargeNoiseBuffer);
    

    fft.colorMap(gl, fftProgs, colorMapLand, finalLargeHeightBuffer, finalLargeGradBuffer, finalLargeNoiseBuffer, finalLargeTempBuffer);

    fft.colorMap(gl, fftProgs, colorMapWater, finalLargeHeightBuffer, finalLargeHeightBuffer, finalLargeHeightBuffer, finalLargeWaterBuffer);

    fft.colorMap(gl, fftProgs, colorMapLandMask, finalLargeHeightBuffer, finalLargeHeightBuffer, finalLargeHeightBuffer, finalLargeLandMaskBuffer);
    
    return {
        landBuffer: finalLargeTempBuffer,
        waterBuffer: finalLargeWaterBuffer,
        landMaskBuffer: finalLargeLandMaskBuffer
    };
    
}

function getWaveBuffer(fft, size, period) {
    var stages = Math.ceil(Math.log(size) / Math.log(2));
    var N = 1 << stages; //the resized size
    
    var initNoise = glUtils.makeFrameBuffer(N, N, gl.NEAREST);
    var buffer1   = glUtils.makeFrameBuffer(N, N, gl.NEAREST);
    var buffer2   = glUtils.makeFrameBuffer(N, N, gl.NEAREST);
    var buffer3   = glUtils.makeFrameBuffer(N, N, gl.NEAREST);
    
    var yx_ratio = upscale.y / upscale.x;
    


    //Have to scale down because the peak of the power spectrum function is high
    fft.gaussianNoise(gl, fftProgs, Math.floor(Math.random() * 65535), .04, buffer1);
    
    //u_1: l
    //u_2: L
    //u_3: y/x ratio
    var shapeNoise = fft.buildCustomProgram(gl, `
        float k2 = k.x * k.x + (k.y * u_3) * (k.y * u_3);
    	float l = u_1;
    	float l2 = l * l;
        float L = u_2;
    	float L2 = L * L;
        
        float mag;
        if(k2 == 0.0) {//const mode
    		mag = 0.0;
        } else {
    		mag = exp(- l2 * k2) * exp(- l2 * k2) * exp(- 1.0 / (k2 * L2)) / (k2 * k2);
    	}
        b = a * sqrt(mag);
        `
    );
    
    fft.runCustomProgram(gl, shapeNoise, buffer1, initNoise, 5, 50, yx_ratio);
    
    //The angular frequency is given by w^2 = gk, so w = 2pi f = sqrt(gk). 
    //Bury the constant in g and we get f_k = sqrt(g'k)
    //f_k must be an integer multiple of a fundamental frequency f_0, or the animation won't loop correctly. 
    //f_0 is just 1/period, the number of frames in the animation loop.
	
    var f_0 = 1 / period; //The fundamental period
    
    //u_1: f_0
    //u_2: 2 * PI * t
    //u_3: y/x ratio
    var noiseAtTime = fft.buildCustomProgram(gl, `
		float lightX = -.8;
		float lightY = .6;
        float g = 0.002; //Gravitational constant
        
        float kMag = sqrt(k.x * k.x + (k.y * u_3) * (k.y * u_3));
        float f_k = ceil(sqrt(g * kMag) / u_1) * u_1; //See above
        float wkt = u_2 * f_k;
        
        vec2 timeFac = vec2(cos(wkt), sin(wkt));
        
        vec2 h = vec2(a.r * timeFac.r - a.g * timeFac.g, a.r * timeFac.g + a.g * timeFac.r);
        
        //b = i k.l * a
        //k.l = k.x * lightX + k.y * lightY
        b = vec2(-h.g * (k.x * lightX + k.y * lightY), h.r * (k.x * lightX + k.y * lightY));`
    );

    //u_1 sets scaling:
    var chop = fft.buildCustomProgram(gl, `
    	float maxVal = .1;		
    	float minVal = -.01;
        b = min(max((a * u_1 - minVal) / (maxVal - minVal), 0.0), 1.0) * 2.0 - 1.0;
        `
    );
    
    var colorMapSize = 255;
    var colorMapPixels = new Uint8Array(colorMapSize * 3 * 4);
    for(var i = 0; i < colorMapSize; i++) {
        setPixelValue(colorMapPixels, i, 0, colorMapSize, [255,255,255, Math.floor(i * .5)]);
        setPixelValue(colorMapPixels, i, 1, colorMapSize, [0  ,0  ,0  , 0]);
        setPixelValue(colorMapPixels, i, 2, colorMapSize, [0  ,0  ,0  , 0]);
    }
    var colorMap = makeSpriteData(colorMapPixels, colorMapSize, 3);
    
    var outputTextures = [];
    
    for(var t = 0; t < period; t++) {
        outputTextures[t] = glUtils.makeTexture(N, N, gl.NEAREST, gl.REPEAT, null);
        var outputBuffer = glUtils.makeFrameBufferTexture(outputTextures[t]);
        
        
        fft.runCustomProgram(gl, noiseAtTime, initNoise, buffer1, f_0, 2 * Math.PI * t, yx_ratio);
    
        var fftPlan = fft.makePlan(stages, fft.FFT_DIRECTIONS.BACKWARD, Math.sqrt(N));
        fft.computeFft(gl, fftProgs, fftPlan, buffer1, buffer2, buffer3);
    
    
        fft.runCustomProgram(gl, chop, buffer2, buffer1, 15);
    
        fft.colorMap(gl, fftProgs, colorMap, buffer1, buffer1, buffer1, outputBuffer);
    }
    
    return {initNoise: initNoise, waveTextures: outputTextures};
}

var map = genMap(fft, 256);
var waveBuff = getWaveBuffer(fft, 512, 60);




var startTime = null;
function drawWaveBuff(timestamp) {
    if (!startTime) 
        startTime = timestamp;
    
    var progress = timestamp - startTime;
    
    var waveSpeed = 40;
    
    var t = Math.floor(progress / waveSpeed) % 60;
      
    //t = (t + 1) % 60;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    gl.useProgram(spriteProgramInfo.program);
    gl.viewport(0, 0, WIDTH, HEIGHT);
    gl.uniform2f(spriteProgramInfo.u_resolution, WIDTH, HEIGHT);
    drawSprite(gl, 0, 0, map.landBuffer.width, map.landBuffer.height, 5, 5, map.landBuffer.width, map.landBuffer.height, map.landBuffer, [1,1,1,1]);
    drawSprite(gl, 0, 0, map.waterBuffer.width, map.waterBuffer.height, 5, 5, map.waterBuffer.width, map.waterBuffer.height, map.waterBuffer, [1,1,1,1]);

    drawSpriteMask(gl, 
        0, 0, map.landMaskBuffer.width, map.landMaskBuffer.height, 
        0, 0, map.landMaskBuffer.width, map.landMaskBuffer.height, 
        5, 5, map.landMaskBuffer.width, map.landMaskBuffer.height, 
        map.landMaskBuffer, 
        waveBuff.waveTextures[t]
    );
    requestAnimationFrame(drawWaveBuff);
}

requestAnimationFrame(drawWaveBuff);
//setInterval(drawWaveBuff, 1000 / 30);