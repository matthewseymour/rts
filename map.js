var WAVE_SPEED = 40;
var WAVE_PERIOD = 60;
var NOISE_THRESHOLD = 100;

var SUB_TILE_WIDTH = 8;
var SUB_TILE_HEIGHT = 6;


function getWaveTextures(fft, size, period) {
    var stages = Math.ceil(Math.log(size) / Math.log(2));
    var N = 1 << stages; //the resized size
    
    var initNoise = glUtils.makeFrameBuffer(N, N, gl.NEAREST);
    var buffer1   = glUtils.makeFrameBuffer(N, N, gl.NEAREST);
    var buffer2   = glUtils.makeFrameBuffer(N, N, gl.NEAREST);
    var buffer3   = glUtils.makeFrameBuffer(N, N, gl.NEAREST);
    
    var yx_ratio = SUB_TILE_HEIGHT / SUB_TILE_WIDTH;
    


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
        glUtils.setPixelValue(colorMapPixels, i, 0, colorMapSize, [255,255,255, Math.floor(i * .5)]);
        glUtils.setPixelValue(colorMapPixels, i, 1, colorMapSize, [0  ,0  ,0  , 0]);
        glUtils.setPixelValue(colorMapPixels, i, 2, colorMapSize, [0  ,0  ,0  , 0]);
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
    
    return {waveTextures: outputTextures};
}


function generateHeightMap(fft, stages, scale) {
    var N = 1 << stages;
    
    var buffer1 = glUtils.makeFrameBuffer(N, N, gl.NEAREST);
    var buffer2 = glUtils.makeFrameBuffer(N, N, gl.NEAREST);
    var buffer3 = glUtils.makeFrameBuffer(N, N, gl.NEAREST);


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

function getMapBackgroundGrass(value) {
    var noiseThreshold = NOISE_THRESHOLD;
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
        var transparency = 0;
        if(value > noiseThreshold - 5) {
            transparency = Math.floor(255 * (value - (noiseThreshold + 5)) / 5);
        }
        water = [Math.round(value *  45 / noiseThreshold) +  0,
    			 Math.round(value *  75 / noiseThreshold) + 75,
    			 Math.round(value *  85 / noiseThreshold) + 85,
                 255 - transparency];
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



function genMap(fft, size) {
    
    //Next power of 2 to incorporate the map size:
    var stages = Math.ceil(Math.log(size) / Math.log(2));
    var N = 1 << stages; //the resized size

    var heightMap = generateHeightMap(fft, stages, 15);



    var colorMapSize = 255;
    var colorMapHeightPixels   = new Uint8Array(colorMapSize * 3 * 4);
    var colorMapLandPixels     = new Uint8Array(colorMapSize * 3 * 4);
    var colorMapWaterPixels    = new Uint8Array(colorMapSize * 3 * 4);
    var colorMapLandMaskPixels = new Uint8Array(colorMapSize * 3 * 4);
    var colorMapPassablePixels = new Uint8Array(colorMapSize * 3 * 4);
    
    for(var i = 0; i < colorMapSize; i++) {
        glUtils.setPixelValue(colorMapHeightPixels, i, 0, colorMapSize, [i, 0, 0, 0]);
        glUtils.setPixelValue(colorMapHeightPixels, i, 1, colorMapSize, [0, 0, 0, 0]);
        glUtils.setPixelValue(colorMapHeightPixels, i, 2, colorMapSize, [0, 0, 0, 0]);
        
        var colorValues = getMapBackgroundGrass(i);
        glUtils.setPixelValue(colorMapLandPixels, i, 0, colorMapSize, colorValues.land);
        glUtils.setPixelValue(colorMapLandPixels, i, 1, colorMapSize, [i / 7, i / 7, i / 7, 255]);
        glUtils.setPixelValue(colorMapLandPixels, i, 2, colorMapSize, [(25 / 255) * i, (25 / 255) * i, (25 / 255) * i, 255]);

        glUtils.setPixelValue(colorMapWaterPixels, i, 0, colorMapSize,    colorValues.water);
        glUtils.setPixelValue(colorMapWaterPixels, i, 1, colorMapSize,    [0,0,0,0]);
        glUtils.setPixelValue(colorMapWaterPixels, i, 2, colorMapSize,    [0,0,0,0]);
        
        glUtils.setPixelValue(colorMapLandMaskPixels, i, 0, colorMapSize, colorValues.landMask);
        glUtils.setPixelValue(colorMapLandMaskPixels, i, 1, colorMapSize, [0,0,0,0]);
        glUtils.setPixelValue(colorMapLandMaskPixels, i, 2, colorMapSize, [0,0,0,0]);
        
        
        glUtils.setPixelValue(colorMapPassablePixels, i, 0, colorMapSize, [255, 255, 255, (i >= NOISE_THRESHOLD ? 0 : 255)]);
        glUtils.setPixelValue(colorMapPassablePixels, i, 1, colorMapSize, [0,0,0,0]);
        glUtils.setPixelValue(colorMapPassablePixels, i, 2, colorMapSize, [0,0,0,0]);
    }
    
    
    var colorMapHeight   = makeSpriteData(colorMapHeightPixels  , colorMapSize, 3);
    var colorMapLand     = makeSpriteData(colorMapLandPixels    , colorMapSize, 3);
    var colorMapWater    = makeSpriteData(colorMapWaterPixels   , colorMapSize, 3);
    var colorMapLandMask = makeSpriteData(colorMapLandMaskPixels, colorMapSize, 3);
    var colorMapPassable = makeSpriteData(colorMapPassablePixels, colorMapSize, 3);
    
    //Map the height to the 0-255 range in red, then read off the pixels
    /*
    var heightBuffer = glUtils.makeFrameBuffer(N, N, gl.NEAREST);
    fft.colorMap(gl, fftProgs, colorMapHeight, heightMap.heightMapBuffer, heightMap.heightMapBuffer, heightMap.heightMapBuffer, heightBuffer);
    
    var heightBufferPixels = new Uint8Array(N * N * 4);
    gl.readPixels(0, 0, N, N, gl.RGBA, gl.UNSIGNED_BYTE, heightBufferPixels);
    
    //Now just copy out the red channel to get a height map:
    var mapHeight = new Uint8Array(N * N);
    for(var i = 0; i < N * N; i++)
        mapHeight[i] = heightBufferPixels[i * 4];
    */  
    var passableBuffer = glUtils.makeFrameBuffer(N, N, gl.NEAREST);
    fft.colorMap(gl, fftProgs, colorMapPassable, heightMap.heightMapBuffer, heightMap.heightMapBuffer, heightMap.heightMapBuffer, passableBuffer);

    var passableBufferPixels = new Uint8Array(N * N * 4);
    gl.readPixels(0, 0, N, N, gl.RGBA, gl.UNSIGNED_BYTE, passableBufferPixels);

    //Map pass is just whether a point is passable or not:
    //Read from the alpha channel
    var mapPass = new Uint8Array(N * N);
    for(var i = 0; i < N * N; i++)
        mapPass[i] = passableBufferPixels[i * 4 + 3] == 255 ? 0 : 1;
    


    var finalLargeHeightBuffer   = glUtils.makeFrameBuffer(N * SUB_TILE_WIDTH, N * SUB_TILE_HEIGHT, gl.NEAREST);
    var finalLargeGradBuffer     = glUtils.makeFrameBuffer(N * SUB_TILE_WIDTH, N * SUB_TILE_HEIGHT, gl.NEAREST);
    var finalLargeNoiseBuffer    = glUtils.makeFrameBuffer(N * SUB_TILE_WIDTH, N * SUB_TILE_HEIGHT, gl.NEAREST);
    var finalLargeTempBuffer     = glUtils.makeFrameBuffer(N * SUB_TILE_WIDTH, N * SUB_TILE_HEIGHT, gl.NEAREST);
    var finalLargeWaterBuffer    = glUtils.makeFrameBuffer(N * SUB_TILE_WIDTH, N * SUB_TILE_HEIGHT, gl.NEAREST);
    var finalLargeLandMaskBuffer = glUtils.makeFrameBuffer(N * SUB_TILE_WIDTH, N * SUB_TILE_HEIGHT, gl.NEAREST);

    fft.bicubic(gl,  fftProgs, heightMap.heightMapBuffer, finalLargeHeightBuffer);
    
    fft.gradient(gl, fftProgs, [15, -20], 4, finalLargeHeightBuffer, finalLargeGradBuffer);
    
    fft.noise(gl, fftProgs, Math.floor(Math.random() * 65535), finalLargeNoiseBuffer);
    

    fft.colorMap(gl, fftProgs, colorMapLand, finalLargeHeightBuffer, finalLargeGradBuffer, finalLargeNoiseBuffer, finalLargeTempBuffer);

    fft.colorMap(gl, fftProgs, colorMapWater, finalLargeHeightBuffer, finalLargeHeightBuffer, finalLargeHeightBuffer, finalLargeWaterBuffer);

    fft.colorMap(gl, fftProgs, colorMapLandMask, finalLargeHeightBuffer, finalLargeHeightBuffer, finalLargeHeightBuffer, finalLargeLandMaskBuffer);
    
    var waves = getWaveTextures(fft, 512, WAVE_PERIOD);
    
    return {
        landBuffer: finalLargeTempBuffer,
        waterBuffer: finalLargeWaterBuffer,
        landMaskBuffer: finalLargeLandMaskBuffer,
        passableBuffer: passableBuffer,
        mapPass: mapPass,
        waves: waves,
        waveTime: 0
    };
    
}


function drawMap(gl, map, time, view, options) {
    
    var waveSpeed = WAVE_SPEED;
    var waveTextureNumber = Math.floor(time / waveSpeed) % WAVE_PERIOD;
    
    var xOffset = -view.xOffset * SUB_TILE_WIDTH;
    var yOffset = -view.yOffset * SUB_TILE_HEIGHT;
    
    drawSprite(gl, 
        0, 0, map.landBuffer.width, map.landBuffer.height, 
        xOffset, yOffset, map.landBuffer.width, map.landBuffer.height, 
        map.landBuffer, 
        [1,1,1,1]);
    
    drawSprite(gl, 
        0, 0, map.waterBuffer.width, map.waterBuffer.height, 
        xOffset, yOffset, map.waterBuffer.width, map.waterBuffer.height, 
        map.waterBuffer, [1,1,1,1]);

    drawSpriteMask(gl, 
        0, 0, map.landMaskBuffer.width, map.landMaskBuffer.height, 
        0, 0, map.landMaskBuffer.width, map.landMaskBuffer.height, 
        xOffset, yOffset, map.landMaskBuffer.width, map.landMaskBuffer.height, 
        map.landMaskBuffer, 
        map.waves.waveTextures[waveTextureNumber]
    );
    
    if(options.showPassable) {
        drawSprite(gl, 
            0, 0, map.passableBuffer.width, map.passableBuffer.height, 
            xOffset, yOffset, map.passableBuffer.width * SUB_TILE_WIDTH, map.passableBuffer.height * SUB_TILE_HEIGHT, 
            map.passableBuffer, [1,0,0,.5]);
    }
    
    
    
}