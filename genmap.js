"use strict";

const WAVE_SPEED = 60;
const WAVE_PERIOD = 60;
const SEA_LEVEL = 100; //Level on the heightmap (0-255) at which there is water
const TANK_DRIVE_DEPTH = 10; //Level below sealevel where tanks can still drive


function getWaveTextures(fftProgs, size, period) {
    const stages = Math.ceil(Math.log(size) / Math.log(2));
    const N = 1 << stages; //the resized size
    
    var initNoise  = Compute.makeComputeBuffer(fftProgs.gl, N, N);
    var buffer1    = Compute.makeComputeBuffer(fftProgs.gl, N, N);
    var buffer2    = Compute.makeComputeBuffer(fftProgs.gl, N, N);
    var buffer3    = Compute.makeComputeBuffer(fftProgs.gl, N, N);
    
    const yx_ratio = SUB_TILE_HEIGHT / SUB_TILE_WIDTH;
    


    //Have to scale down because the peak of the power spectrum function is high
    
    //u_1: l
    //u_2: L
    //u_3: y/x ratio
    var shapeNoise = Compute.buildCustomProgram(fftProgs.gl, `
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
    Compute.gaussianNoise(fftProgs, Math.floor(Math.random() * 65535), .04, buffer1);
    Compute.runCustomProgram(fftProgs.gl, shapeNoise, buffer1, initNoise, 5, 50, yx_ratio);

    //The angular frequency is given by w^2 = gk, so w = 2pi f = sqrt(gk). 
    //Bury the constant in g and we get f_k = sqrt(g'k)
    //f_k must be an integer multiple of a fundamental frequency f_0, or the animation won't loop correctly. 
    //f_0 is just 1/period, the number of frames in the animation loop.
	
    const f_0 = 1 / period; //The fundamental period
    
    //u_1: f_0
    //u_2: 2 * PI * t
    //u_3: y/x ratio
    var noiseAtTime = Compute.buildCustomProgram(fftProgs.gl, `
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
        vec2 result = vec2(-h.g * (k.x * lightX + k.y * lightY), h.r * (k.x * lightX + k.y * lightY));
        
        //Output real or imaginary part:
        b = vec4(result.r, result.g, 0, 0);
        `
    );
    
    //u_1 sets scaling:
    var chop = Compute.buildCustomProgram(fftProgs.gl, `
    	float maxVal = .1;		
    	float minVal = -.01;
        vec4 scaled = (a * u_1 - vec4(minVal)) / (maxVal - minVal);
        b = clamp(scaled, 0.0, 1.0);
        `
    );

    var colorMap = Compute.buildCustomProgram(fftProgs.gl, `
        b = vec4(1.0, 1.0, 1.0, 0.5 * a.x);
        `
    );
    
    var outputTextures = [];

    var fftPlan = Compute.makePlan(fftProgs, stages, Compute.FFT_DIRECTIONS.BACKWARD, Math.sqrt(N));
    for(var t = 0; t < period; t++) {
        outputTextures[t] = glUtils.makeTexture(fftProgs.gl, N, N, fftProgs.gl.NEAREST, fftProgs.gl.REPEAT, null);
        var outputBuffer = glUtils.makeFrameBufferTexture(fftProgs.gl, outputTextures[t]);
        
        Compute.runCustomProgram(fftProgs.gl, noiseAtTime, initNoise, buffer1, f_0, 2 * Math.PI * t, yx_ratio);
    
        Compute.computeFft(fftProgs, fftPlan, buffer1, buffer2, buffer3);
        //Output is in buffer 2

        Compute.runCustomProgram(fftProgs.gl, chop, buffer2, buffer1, 10);
    
        Compute.runCustomProgram(fftProgs.gl, colorMap, buffer1, outputBuffer);
    }
    
    return {waveTextures: outputTextures};
}


function generateHeightMap(fftProgs, stages, scale) {
    const N = 1 << stages;
    
    var buffer1 = Compute.makeComputeBuffer(fftProgs.gl, N, N);
    var buffer2 = Compute.makeComputeBuffer(fftProgs.gl, N, N);
    var buffer3 = Compute.makeComputeBuffer(fftProgs.gl, N, N);
    

    Compute.gaussianNoise(fftProgs, Math.floor(Math.random() * 65535), 1, buffer1);
    
    var shapeNoise = Compute.buildCustomProgram(fftProgs.gl, `
        float kMag = sqrt(k.x * k.x + k.y * k.y);
        float mag;
        if(kMag == 0.0) {
            mag = 1.0;
        } else {
            mag = min(1.0, 1.0 / pow(kMag * 110.0, 1.7));
        }  
        b = a * mag;
        `
    );

    Compute.runCustomProgram(fftProgs.gl, shapeNoise, buffer1, buffer2);

    var fftPlan = Compute.makePlan(fftProgs, stages, Compute.FFT_DIRECTIONS.BACKWARD, Math.sqrt(N));
    
    //Buffer 1 will get the output
    Compute.computeFft(fftProgs, fftPlan, buffer2, buffer1, buffer3);
    
    //u_1 is the scaling factor:
    var rescale = Compute.buildCustomProgram(fftProgs.gl, `
        b = vec4((a.x * u_1 + 1.0) / 2.0, 0.0, 0.0, 0.0);
        `
    );
    Compute.runCustomProgram(fftProgs.gl, rescale, buffer1, buffer2, scale);
    //Compute.scale(fftProgs, scale, buffer1, buffer2);
    
    
    return {heightMapBuffer: buffer2 };
}

function getMapBackgroundGrass(value) {
    const mudLevel = SEA_LEVEL + 5;
    const seeUnderwater = 9;
    var land;
    var water;
    var landMask;
    
	
    //Land:
	if(value < mudLevel)
	{
		var tempValue = value - SEA_LEVEL;
        land = [Math.max(0, Math.round(tempValue * 300 / (255 - SEA_LEVEL)) + 75),
				Math.max(0, Math.round(tempValue * 300 / (255 - SEA_LEVEL)) + 75),
				0,
                255];
        if(value < SEA_LEVEL) {
            land[0] = Math.floor(land[0] * .8);
            land[1] = Math.floor(land[1] * .8);
        }
        
    }               
	else
	{
		var tempValue = value - SEA_LEVEL;
		land = [Math.round(tempValue * 45 / (255 - SEA_LEVEL)) + 80,
				Math.round(tempValue * 45 / (255 - SEA_LEVEL)) + 130,
				Math.round(tempValue * 25 / (255 - SEA_LEVEL)) + 40,
                255];
	}
    
    //Water:
    if(value < SEA_LEVEL) 
    {
        var transparency = 0;
        if(value > SEA_LEVEL - seeUnderwater) {
            transparency = Math.floor(255 * (value - (SEA_LEVEL - seeUnderwater)) / seeUnderwater);
        }
        water = [Math.round(value *  45 / SEA_LEVEL) +  0,
    			 Math.round(value *  75 / SEA_LEVEL) + 75,
    			 Math.round(value *  85 / SEA_LEVEL) + 85,
                 255 - transparency];
    } 
    else 
    {
        water = [0,0,0,0];
    }
    
    //Land mask:
	if(value < SEA_LEVEL) 
    {
        var mask = Math.floor(255 * value / SEA_LEVEL);
		landMask = [255, 255, 255, 255 - mask];
	} 
    else 
    {
		landMask = [0, 0, 0, 0];
    }
    
    
    
    return {land: land, water: water, landMask: landMask};
}

function genPassableMap(heightMap, width, height, gl) {
    const colorMapSize = 255;
    var colorMapPassablePixels = new Uint8Array(colorMapSize * 4 * 4);
    for(var i = 0; i < colorMapSize; i++) {
        //Put the "standard passibility" in the red channel, and the tank passibility (tanks can drive in shallow water) in the blue channel. Also put the "standard passibility" in the alpha channel so we can draw this easily for debugging purposes.
        var pass = (i >= SEA_LEVEL ? 0 : 255);
        var tankPass = (i >= SEA_LEVEL - TANK_DRIVE_DEPTH ? 0 : 255);
        glUtils.setPixelValue(colorMapPassablePixels, i, 0, colorMapSize, [pass, 0, tankPass, pass]);
    }
    
    var colorMapPassable = glUtils.makeSimpleTexture(gl, colorMapSize, 4, colorMapPassablePixels);
    
    var passableBuffer = glUtils.makeFrameBuffer(gl, width, height, gl.NEAREST);
    Compute.colorMap(fftProgs, colorMapPassable, heightMap.heightMapBuffer, passableBuffer);

    var passableBufferPixels = new Uint8Array(width * height * 4);
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, passableBufferPixels);

    //Map pass is just whether a point is passable or not:
    //Read from the red and blue channels
    var mapPass = new Uint8Array(width * height);
    var mapPassTank = new Uint8Array(width * height);
    for(var i = 0; i < width * height; i++) {
        mapPass[i]     = passableBufferPixels[i * 4 + 0] == 255 ? 0 : 1;
        mapPassTank[i] = passableBufferPixels[i * 4 + 2] == 255 ? 0 : 1;
    }
    
    return {
        passableBuffer: passableBuffer,
        mapPass: mapPass,
        mapPassTank: mapPassTank,
        distPass: getObstacleDistanceMap(mapPass, width, height),
        distPassTank: getObstacleDistanceMap(mapPassTank, width, height),
        width: width,
        height: height
        
    }
}

function getObstacleDistanceMap(passibilityMap, width, height) {
    /*
    For the horizontal map, the value at a given row,col is the distance to the next obstacle on that row when moving right
    For the vertical map, the value at a given row,col is the distance to the next obstacle on that col when moving down
    */
    var distMapHorizontal = new Uint16Array(width * height);
    
    for(var row = 0; row < height; row++) {
        var dist = 0;
        for(var x = width - 1; x >= 0; x--) {
            if(passibilityMap[x + row * width] == 0) {
                dist = 0;
            } else {
                dist++;
            }
            distMapHorizontal[x + row * width] = dist;
        }
        
    }
        
    var distMapVertical   = new Uint16Array(width * height);
    for(var col = 0; col < width; col++) {
        var dist = 0;
        for(var y = height - 1; y >= 0; y--) {
            if(passibilityMap[col + y * width] == 0) {
                dist = 0;
            } else {
                dist++;
            }
            distMapVertical[col + y * width] = dist;
        }
    }
    
    return {
        horizontal: distMapHorizontal,
        vertical: distMapVertical
    }
}

function genMapTerrainGraphics(fftProgs, heightMap, width, height) {
    const colorMapSize = 255;
    var colorMapLandPixels     = new Uint8Array(colorMapSize * 4 * 4);
    var colorMapWaterPixels    = new Uint8Array(colorMapSize * 4 * 4);
    var colorMapLandMaskPixels = new Uint8Array(colorMapSize * 4 * 4);
    
    for(var i = 0; i < colorMapSize; i++) {
        var colorValues = getMapBackgroundGrass(i);
        glUtils.setPixelValue(colorMapLandPixels, i, 0, colorMapSize, colorValues.land);
        glUtils.setPixelValue(colorMapLandPixels, i, 1, colorMapSize, [(25 / 255) * i, (25 / 255) * i, (25 / 255) * i, 255]);

        glUtils.setPixelValue(colorMapWaterPixels, i, 0, colorMapSize,    colorValues.water);
        
        glUtils.setPixelValue(colorMapLandMaskPixels, i, 0, colorMapSize, colorValues.landMask);
        
        
    }
    
    
    var colorMapLand     = glUtils.makeSimpleTexture(fftProgs.gl, colorMapSize, 4, colorMapLandPixels    );
    var colorMapWater    = glUtils.makeSimpleTexture(fftProgs.gl, colorMapSize, 4, colorMapWaterPixels   );
    var colorMapLandMask = glUtils.makeSimpleTexture(fftProgs.gl, colorMapSize, 4, colorMapLandMaskPixels);
    

    var largeHeightBuffer   = Compute.makeComputeBuffer(fftProgs.gl, width * SUB_TILE_WIDTH, height * SUB_TILE_HEIGHT);
    var largeTempBuffer     = Compute.makeComputeBuffer(fftProgs.gl, width * SUB_TILE_WIDTH, height * SUB_TILE_HEIGHT);
    var largeNoiseBuffer    = Compute.makeComputeBuffer(fftProgs.gl, width * SUB_TILE_WIDTH, height * SUB_TILE_HEIGHT);
    
    var largeLandBuffer     = glUtils.makeFrameBuffer(fftProgs.gl, width * SUB_TILE_WIDTH, height * SUB_TILE_HEIGHT, fftProgs.gl.NEAREST);
    var largeWaterBuffer    = glUtils.makeFrameBuffer(fftProgs.gl, width * SUB_TILE_WIDTH, height * SUB_TILE_HEIGHT, fftProgs.gl.NEAREST);
    var largeLandMaskBuffer = glUtils.makeFrameBuffer(fftProgs.gl, width * SUB_TILE_WIDTH, height * SUB_TILE_HEIGHT, fftProgs.gl.NEAREST);

    Compute.bicubic(fftProgs, heightMap.heightMapBuffer, largeTempBuffer);
    
    //Compute.gradient(fftProgs, [15, -20], 4, finalLargeHeightBuffer, finalLargeGradBuffer);
    //Compute.gradient(fftProgs, [SUB_TILE_WIDTH * 2, -SUB_TILE_HEIGHT * 3], 4, finalLargeHeightBuffer, finalLargeGradBuffer);
    
    Compute.noise(fftProgs, Math.floor(Math.random() * 65535), largeNoiseBuffer);
    
    
    var addNoiseToHeight = Compute.buildCustomProgram2(fftProgs.gl, `
        b = vec4(a0.x, a1.y, 0, 0);
        `
    );
    Compute.runCustomProgram2(fftProgs.gl, addNoiseToHeight, largeTempBuffer, largeNoiseBuffer, largeHeightBuffer);
    

    Compute.colorMap(fftProgs, colorMapLand    , largeHeightBuffer, largeLandBuffer);

    Compute.colorMap(fftProgs, colorMapWater   , largeHeightBuffer, largeWaterBuffer);

    Compute.colorMap(fftProgs, colorMapLandMask, largeHeightBuffer, largeLandMaskBuffer);
    
    var waves = getWaveTextures(fftProgs, 512, WAVE_PERIOD);
    
    return {
        landBuffer: largeLandBuffer,
        waterBuffer: largeWaterBuffer,
        landMaskBuffer: largeLandMaskBuffer,
        waves: waves,
        waveTime: 0
    };
    
}


function genMap(fftProgs, size) {
    
    //Next power of 2 to incorporate the map size:
    const stages = Math.ceil(Math.log(size) / Math.log(2));
    const N = 1 << stages; //the resized size

    var heightMap = generateHeightMap(fftProgs, stages, 15);



    
    
    var passabilityMap = genPassableMap(heightMap, N, N, fftProgs.gl);
    
    var terrainGraphics = genMapTerrainGraphics(fftProgs, heightMap, N, N);
    
    var miniMap = getMiniMap(graphicsPrograms, terrainGraphics);
    
    
    var pathfindNodeInfo = buildPathfindNodeInfo(passabilityMap, UNIT_SIZE);
    var obstacleStore = getObstacleStore();
    
    return {
        terrainGraphics: terrainGraphics,
        passabilityMap: passabilityMap,
        miniMap: miniMap,
        pathfindNodeInfo: pathfindNodeInfo,
        obstacleStore: obstacleStore,
        width: N,
        height: N,
    };
    
}
