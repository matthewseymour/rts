"use strict";

const WAVE_SPEED = 60;
const WAVE_PERIOD = 60;
const SEA_LEVEL = 100; //Level on the heightmap (0-255) at which there is water
const TANK_DRIVE_DEPTH = 10; //Level below sealevel where tanks can still drive


function getWaveTextures(fftProgs, size, period) {
    const stages = Math.ceil(Math.log(size) / Math.log(2));
    const N = 1 << stages; //the resized size
    
    var initNoiseR = glUtils.makeFrameBuffer(N, N, fftProgs.gl.NEAREST);
    var initNoiseI = glUtils.makeFrameBuffer(N, N, fftProgs.gl.NEAREST);
    var buffer1    = glUtils.makeFrameBuffer(N, N, fftProgs.gl.NEAREST);
    var buffer2    = glUtils.makeFrameBuffer(N, N, fftProgs.gl.NEAREST);
    var buffer3    = glUtils.makeFrameBuffer(N, N, fftProgs.gl.NEAREST);
    var buffer4    = glUtils.makeFrameBuffer(N, N, fftProgs.gl.NEAREST);
    var buffer5    = glUtils.makeFrameBuffer(N, N, fftProgs.gl.NEAREST);
    var buffer6    = glUtils.makeFrameBuffer(N, N, fftProgs.gl.NEAREST);
    
    const yx_ratio = SUB_TILE_HEIGHT / SUB_TILE_WIDTH;
    


    //Have to scale down because the peak of the power spectrum function is high
    
    //u_1: l
    //u_2: L
    //u_3: y/x ratio
    var shapeNoise = fft.buildCustomProgram(fftProgs.gl, `
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
    fft.gaussianNoise(fftProgs, Math.floor(Math.random() * 65535), .04, buffer1);
    fft.runCustomProgram(fftProgs.gl, shapeNoise, buffer1, initNoiseR, 5, 50, yx_ratio);

    fft.gaussianNoise(fftProgs, Math.floor(Math.random() * 65535), .04, buffer1);
    fft.runCustomProgram(fftProgs.gl, shapeNoise, buffer1, initNoiseI, 5, 50, yx_ratio);
    
    //The angular frequency is given by w^2 = gk, so w = 2pi f = sqrt(gk). 
    //Bury the constant in g and we get f_k = sqrt(g'k)
    //f_k must be an integer multiple of a fundamental frequency f_0, or the animation won't loop correctly. 
    //f_0 is just 1/period, the number of frames in the animation loop.
	
    const f_0 = 1 / period; //The fundamental period
    
    //u_1: f_0
    //u_2: 2 * PI * t
    //u_3: y/x ratio
    //u_4: output real or imaginary. 1 for real, 0 for imaginary
    var noiseAtTime = fft.buildCustomProgram2(fftProgs.gl, `
		float lightX = -.8;
		float lightY = .6;
        float g = 0.002; //Gravitational constant
        
        float kMag = sqrt(k.x * k.x + (k.y * u_3) * (k.y * u_3));
        float f_k = ceil(sqrt(g * kMag) / u_1) * u_1; //See above
        float wkt = u_2 * f_k;
        
        vec2 timeFac = vec2(cos(wkt), sin(wkt));
        
        vec2 h = vec2(a0 * timeFac.r - a1 * timeFac.g, a0 * timeFac.g + a1 * timeFac.r);
        
        //b = i k.l * a
        //k.l = k.x * lightX + k.y * lightY
        vec2 result = vec2(-h.g * (k.x * lightX + k.y * lightY), h.r * (k.x * lightX + k.y * lightY));
        
        //Output real or imaginary part:
        b = result.r * u_4 + result.g * (1.0 - u_4);`
    );
    
    //u_1 sets scaling:
    var chop = fft.buildCustomProgram(fftProgs.gl, `
    	float maxVal = .1;		
    	float minVal = -.01;
        b = min(max((a * u_1 - minVal) / (maxVal - minVal), 0.0), 1.0) * 2.0 - 1.0;
        `
    );
    
    const colorMapSize = 255;
    var colorMapPixels = new Uint8Array(colorMapSize * 3 * 4);
    for(var i = 0; i < colorMapSize; i++) {
        glUtils.setPixelValue(colorMapPixels, i, 0, colorMapSize, [255,255,255, Math.floor(i * .5)]);
        glUtils.setPixelValue(colorMapPixels, i, 1, colorMapSize, [0  ,0  ,0  , 0]);
        glUtils.setPixelValue(colorMapPixels, i, 2, colorMapSize, [0  ,0  ,0  , 0]);
    }
    var colorMap = glUtils.makeSimpleTexture(colorMapSize, 3, colorMapPixels);
    
    var outputTextures = [];

    var fftPlan = fft.makePlan(stages, fft.FFT_DIRECTIONS.BACKWARD, Math.sqrt(N));
    for(var t = 0; t < period; t++) {
        outputTextures[t] = glUtils.makeTexture(N, N, fftProgs.gl.NEAREST, fftProgs.gl.REPEAT, null);
        var outputBuffer = glUtils.makeFrameBufferTexture(outputTextures[t]);
        
        
        fft.runCustomProgram2(fftProgs.gl, noiseAtTime, initNoiseR, initNoiseI, buffer1, f_0, 2 * Math.PI * t, yx_ratio, 1.0);
        fft.runCustomProgram2(fftProgs.gl, noiseAtTime, initNoiseR, initNoiseI, buffer2, f_0, 2 * Math.PI * t, yx_ratio, 0.0);
    
        fft.computeFft(fftProgs, fftPlan, buffer1, buffer2, buffer3, buffer4, buffer5, buffer6);
        //Outputs are in buffers 3 and 4
        //Use only the real part of the output
        fft.runCustomProgram(fftProgs.gl, chop, buffer3, buffer1, 10);
    
        fft.colorMap(fftProgs, colorMap, buffer1, buffer1, buffer1, outputBuffer);
    }
    
    return {waveTextures: outputTextures};
}


function generateHeightMap(fftProgs, stages, scale) {
    const N = 1 << stages;
    
    var buffer1 = glUtils.makeFrameBuffer(N, N, fftProgs.gl.NEAREST);
    var buffer2 = glUtils.makeFrameBuffer(N, N, fftProgs.gl.NEAREST);
    var buffer3 = glUtils.makeFrameBuffer(N, N, fftProgs.gl.NEAREST);
    var buffer4 = glUtils.makeFrameBuffer(N, N, fftProgs.gl.NEAREST);
    var buffer5 = glUtils.makeFrameBuffer(N, N, fftProgs.gl.NEAREST);
    var buffer6 = glUtils.makeFrameBuffer(N, N, fftProgs.gl.NEAREST);
    

    fft.gaussianNoise(fftProgs, Math.floor(Math.random() * 65535), 1, buffer1);
    fft.gaussianNoise(fftProgs, Math.floor(Math.random() * 65535), 1, buffer2);
    
    var shapeNoise = fft.buildCustomProgram(fftProgs.gl, `
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

    //Buffers 3 and 4 will contain the real and imaginary parts of the noise:
    fft.runCustomProgram(fftProgs.gl, shapeNoise, buffer1, buffer3);
    fft.runCustomProgram(fftProgs.gl, shapeNoise, buffer2, buffer4);

    var fftPlan = fft.makePlan(stages, fft.FFT_DIRECTIONS.BACKWARD, Math.sqrt(N));
    
    //Buffers 1 and 2 will get the output
    fft.computeFft(fftProgs, fftPlan, buffer3, buffer4, buffer1, buffer2, buffer5, buffer6);
    
    //Discard the imaginary part of the output (buffer 2) and overwrite it:
    fft.scale(fftProgs, scale, buffer1, buffer2);
    
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
    var colorMapPassablePixels = new Uint8Array(colorMapSize * 3 * 4);
    for(var i = 0; i < colorMapSize; i++) {
        //Put the "standard passibility" in the red channel, and the tank passibility (tanks can drive in shallow water) in the blue channel. Also put the "standard passibility" in the alpha channel so we can draw this easily for debugging purposes.
        var pass = (i >= SEA_LEVEL ? 0 : 255);
        var tankPass = (i >= SEA_LEVEL - TANK_DRIVE_DEPTH ? 0 : 255);
        glUtils.setPixelValue(colorMapPassablePixels, i, 0, colorMapSize, [pass, 0, tankPass, pass]);
        glUtils.setPixelValue(colorMapPassablePixels, i, 1, colorMapSize, [0, 0, 0, 0]);
        glUtils.setPixelValue(colorMapPassablePixels, i, 2, colorMapSize, [0, 0, 0, 0]);
    }
    
    var colorMapPassable = glUtils.makeSimpleTexture(colorMapSize, 3, colorMapPassablePixels);
    
    var passableBuffer = glUtils.makeFrameBuffer(width, height, gl.NEAREST);
    fft.colorMap(fftProgs, colorMapPassable, heightMap.heightMapBuffer, heightMap.heightMapBuffer, heightMap.heightMapBuffer, passableBuffer);

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
    var colorMapLandPixels     = new Uint8Array(colorMapSize * 3 * 4);
    var colorMapWaterPixels    = new Uint8Array(colorMapSize * 3 * 4);
    var colorMapLandMaskPixels = new Uint8Array(colorMapSize * 3 * 4);
    
    for(var i = 0; i < colorMapSize; i++) {
        var colorValues = getMapBackgroundGrass(i);
        glUtils.setPixelValue(colorMapLandPixels, i, 0, colorMapSize, colorValues.land);
        //glUtils.setPixelValue(colorMapLandPixels, i, 1, colorMapSize, [i / 7, i / 7, i / 7, 255]);
        glUtils.setPixelValue(colorMapLandPixels, i, 1, colorMapSize, [0,0,0, 255]);
        glUtils.setPixelValue(colorMapLandPixels, i, 2, colorMapSize, [(25 / 255) * i, (25 / 255) * i, (25 / 255) * i, 255]);

        glUtils.setPixelValue(colorMapWaterPixels, i, 0, colorMapSize,    colorValues.water);
        glUtils.setPixelValue(colorMapWaterPixels, i, 1, colorMapSize,    [0,0,0,0]);
        glUtils.setPixelValue(colorMapWaterPixels, i, 2, colorMapSize,    [0,0,0,0]);
        
        glUtils.setPixelValue(colorMapLandMaskPixels, i, 0, colorMapSize, colorValues.landMask);
        glUtils.setPixelValue(colorMapLandMaskPixels, i, 1, colorMapSize, [0,0,0,0]);
        glUtils.setPixelValue(colorMapLandMaskPixels, i, 2, colorMapSize, [0,0,0,0]);
        
        
    }
    
    
    var colorMapLand     = glUtils.makeSimpleTexture(colorMapSize, 3, colorMapLandPixels    );
    var colorMapWater    = glUtils.makeSimpleTexture(colorMapSize, 3, colorMapWaterPixels   );
    var colorMapLandMask = glUtils.makeSimpleTexture(colorMapSize, 3, colorMapLandMaskPixels);
    

    var finalLargeHeightBuffer   = glUtils.makeFrameBuffer(width * SUB_TILE_WIDTH, height * SUB_TILE_HEIGHT, fftProgs.gl.NEAREST);
    var finalLargeGradBuffer     = glUtils.makeFrameBuffer(width * SUB_TILE_WIDTH, height * SUB_TILE_HEIGHT, fftProgs.gl.NEAREST);
    var finalLargeNoiseBuffer    = glUtils.makeFrameBuffer(width * SUB_TILE_WIDTH, height * SUB_TILE_HEIGHT, fftProgs.gl.NEAREST);
    var finalLargeTempBuffer     = glUtils.makeFrameBuffer(width * SUB_TILE_WIDTH, height * SUB_TILE_HEIGHT, fftProgs.gl.NEAREST);
    var finalLargeWaterBuffer    = glUtils.makeFrameBuffer(width * SUB_TILE_WIDTH, height * SUB_TILE_HEIGHT, fftProgs.gl.NEAREST);
    var finalLargeLandMaskBuffer = glUtils.makeFrameBuffer(width * SUB_TILE_WIDTH, height * SUB_TILE_HEIGHT, fftProgs.gl.NEAREST);

    fft.bicubic(fftProgs, heightMap.heightMapBuffer, finalLargeHeightBuffer);
    
    fft.gradient(fftProgs, [15, -20], 4, finalLargeHeightBuffer, finalLargeGradBuffer);
    //fft.gradient(fftProgs, [SUB_TILE_WIDTH * 2, -SUB_TILE_HEIGHT * 3], 4, finalLargeHeightBuffer, finalLargeGradBuffer);
    
    fft.noise(fftProgs, Math.floor(Math.random() * 65535), finalLargeNoiseBuffer);
    

    fft.colorMap(fftProgs, colorMapLand, finalLargeHeightBuffer, finalLargeGradBuffer, finalLargeNoiseBuffer, finalLargeTempBuffer);

    fft.colorMap(fftProgs, colorMapWater, finalLargeHeightBuffer, finalLargeHeightBuffer, finalLargeHeightBuffer, finalLargeWaterBuffer);

    fft.colorMap(fftProgs, colorMapLandMask, finalLargeHeightBuffer, finalLargeHeightBuffer, finalLargeHeightBuffer, finalLargeLandMaskBuffer);
    
    var waves = getWaveTextures(fftProgs, 512, WAVE_PERIOD);
    
    return {
        landBuffer: finalLargeTempBuffer,
        waterBuffer: finalLargeWaterBuffer,
        landMaskBuffer: finalLargeLandMaskBuffer,
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


//returns true if it passes, false otherwise
function passLineBox(aX, aY, bX, bY, size, passabilityMap) {
    function testHorizontalLine(xL, xR, y) {
        var pass = (y >= 0 && y < passabilityMap.height && xL >= 0 && passabilityMap.distPassTank.horizontal[xL + y * passabilityMap.width] >= (xR - xL));
        return pass;
    }
    
    function testVerticalLine(yL, yU, x) {
        var pass = (x >= 0 && x < passabilityMap.width && yL >= 0 && passabilityMap.distPassTank.vertical[x + yL * passabilityMap.width] >= (yU - yL));
        return pass;
    }
    
    var dx = bX - aX;
    var dy = bY - aY;
    
    var startX, startY, endX, endY;
    if(Math.abs(dx) > Math.abs(dy)) {
        if(aX < bX) {
            startX = aX;
            startY = aY;
            endX   = bX;
            endY   = bY;
        } else {
            startX = bX;
            startY = bY;
            endX   = aX;
            endY   = aY;
        }
    } else {
        if(aY < bY) {
            startX = aX;
            startY = aY;
            endX   = bX;
            endY   = bY;
        } else {
            startX = bX;
            startY = bY;
            endX   = aX;
            endY   = aY;
        }
    }        
    
    const X1 = startX - size;
    const X2 = startX + size;
    const X3 =   endX - size;
    const X4 =   endX + size;

    const Y1 = startY - size;
    const Y2 = startY + size;
    const Y3 =   endY - size;
    const Y4 =   endY + size;
    
    const x1 = Math.floor(X1);
    const x2 =  Math.ceil(X2);
    const x3 = Math.floor(X3);
    const x4 =  Math.ceil(X4);

    const y1 = Math.floor(Y1);
    const y2 =  Math.ceil(Y2);
    const y3 = Math.floor(Y3);
    const y4 =  Math.ceil(Y4);
    
    if(Math.abs(dx) > Math.abs(dy)) {
        if(startY <= endY) {
            for(var yi = y1; yi < y4; yi++) {
                var xL = yi <  y2 ? x1 : Math.floor(X1 + (X3 - X1) * (yi     - Y2) / (Y4 - Y2));
                var xR = y3 <= yi ? x4 :  Math.ceil(X2 + (X4 - X2) * (yi + 1 - Y1) / (Y3 - Y1));
                if(!testHorizontalLine(xL, xR, yi))
                    return false;
            }
        } else {
            for(var yi = y3; yi < y2; yi++) {
                var xL = y1 <= yi ? x1 : Math.floor(X1 + (X3 - X1) * (yi + 1 - Y1) / (Y3 - Y1));
                var xR = yi <  y4 ? x4 :  Math.ceil(X2 + (X4 - X2) * (yi     - Y2) / (Y4 - Y2));
                if(!testHorizontalLine(xL, xR, yi)) 
                    return false;
            }
        }
    } else {
        if(startX <= endX) {
            for(var xi = x1; xi < x4; xi++) {
                var yL = xi <  x2 ? y1 : Math.floor(Y1 + (Y3 - Y1) * (xi     - X2) / (X4 - X2));
                var yU = x3 <= xi ? y4 :  Math.ceil(Y2 + (Y4 - Y2) * (xi + 1 - X1) / (X3 - X1));
                if(!testVerticalLine(yL, yU, xi))
                    return false;
            }
        } else {
            for(var xi = x3; xi < x2; xi++) {
                var yL = x1 <= xi ? y1 : Math.floor(Y1 + (Y3 - Y1) * (xi + 1 - X1) / (X3 - X1));
                var yU = xi <  x4 ? y4 :  Math.ceil(Y2 + (Y4 - Y2) * (xi     - X2) / (X4 - X2));
                if(!testVerticalLine(yL, yU, xi))
                    return false;
            }
        }
    }
    return true;
}


function drawLineBox(a, b, size, passabilityMap, graphicsPrograms, view) {
    function drawHorizontalLine(xL, xR, y) {
        var topLeft = convertToScreen({x: xL, y: y}, view);
        var bottomRight = convertToScreen({x: xR, y: y + 1}, view);
        var pass = (y >= 0 && y < passabilityMap.height && xL >= 0 && passabilityMap.distPassTank.horizontal[xL + y * passabilityMap.width] >= (xR - xL));
        var color = pass ? [0, 1, 0, .5] : [1, 0, 0, .5];
        graphics.drawBox(graphicsPrograms, topLeft.x, topLeft.y, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y, color);
    }
    
    function drawVerticalLine(yL, yU, x) {
        var topLeft = convertToScreen({x: x, y: yL}, view);
        var bottomRight = convertToScreen({x: x + 1, y: yU}, view);
        var pass = (x >= 0 && x < passabilityMap.width && yL >= 0 && passabilityMap.distPassTank.vertical[x + yL * passabilityMap.width] >= (yU - yL));
        var color = pass ? [0, 1, 0, .5] : [1, 0, 0, .5];
        graphics.drawBox(graphicsPrograms, topLeft.x, topLeft.y, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y, color);
    }
    
    function drawLine(a, b) {
        var pos1 = convertToScreen(a, view);
        var pos2 = convertToScreen(b, view);
    
        graphics.drawLine(graphicsPrograms, pos1.x, pos1.y, pos2.x, pos2.y, [1,1,1,1]);
    }
    
        
    var dx = b.x - a.x;
    var dy = b.y - a.y;
    
    var start, end;
    if(Math.abs(dx) > Math.abs(dy)) {
        if(a.x < b.x) {
            start = a;
            end   = b;
        } else {
            start = b;
            end   = a;
        }
    } else {
        if(a.y < b.y) {
            start = a;
            end   = b;
        } else {
            start = b;
            end   = a;
        }
    }        
    
    const X1 = start.x - size;
    const X2 = start.x + size;
    const X3 =   end.x - size;
    const X4 =   end.x + size;

    const Y1 = start.y - size;
    const Y2 = start.y + size;
    const Y3 =   end.y - size;
    const Y4 =   end.y + size;
    
    drawLine({x: X1, y: Y1}, {x: X3, y: Y3});
    drawLine({x: X2, y: Y1}, {x: X4, y: Y3});
    drawLine({x: X1, y: Y2}, {x: X3, y: Y4});
    drawLine({x: X2, y: Y2}, {x: X4, y: Y4});

    const x1 = Math.floor(X1);
    const x2 =  Math.ceil(X2);
    const x3 = Math.floor(X3);
    const x4 =  Math.ceil(X4);

    const y1 = Math.floor(Y1);
    const y2 =  Math.ceil(Y2);
    const y3 = Math.floor(Y3);
    const y4 =  Math.ceil(Y4);
    
    if(Math.abs(dx) > Math.abs(dy)) {
        if(start.y <= end.y) {
            for(var yi = y1; yi < y4; yi++) {
                var xL = yi <  y2 ? x1 : Math.floor(X1 + (X3 - X1) * (yi     - Y2) / (Y4 - Y2));
                var xR = y3 <= yi ? x4 :  Math.ceil(X2 + (X4 - X2) * (yi + 1 - Y1) / (Y3 - Y1));
                drawHorizontalLine(xL, xR, yi);
            }
        } else {
            for(var yi = y3; yi < y2; yi++) {
                var xL = y1 <= yi ? x1 : Math.floor(X1 + (X3 - X1) * (yi + 1 - Y1) / (Y3 - Y1));
                var xR = yi <  y4 ? x4 :  Math.ceil(X2 + (X4 - X2) * (yi     - Y2) / (Y4 - Y2));
                drawHorizontalLine(xL, xR, yi);
            }
        }
    } else {
        if(start.x <= end.x) {
            for(var xi = x1; xi < x4; xi++) {
                var yL = xi <  x2 ? y1 : Math.floor(Y1 + (Y3 - Y1) * (xi     - X2) / (X4 - X2));
                var yU = x3 <= xi ? y4 :  Math.ceil(Y2 + (Y4 - Y2) * (xi + 1 - X1) / (X3 - X1));
                drawVerticalLine(yL, yU, xi);
            }
        } else {
            for(var xi = x3; xi < x2; xi++) {
                var yL = x1 <= xi ? y1 : Math.floor(Y1 + (Y3 - Y1) * (xi + 1 - X1) / (X3 - X1));
                var yU = xi <  x4 ? y4 :  Math.ceil(Y2 + (Y4 - Y2) * (xi     - X2) / (X4 - X2));
                drawVerticalLine(yL, yU, xi);
            }
        }
    }
    
    
}


function drawMap(graphicsPrograms, terrainGraphics, timeDiff, view) {
    
    terrainGraphics.waveTime += timeDiff;
    var waveTextureNumber = Math.floor(terrainGraphics.waveTime / WAVE_SPEED) % WAVE_PERIOD;


    var offset = convertToScreen({x: 0, y: 0}, view);
    var xOffset = offset.x;
    var yOffset = offset.y;
    
    graphics.drawSprite(graphicsPrograms, 
        0, 0, terrainGraphics.landBuffer.width, terrainGraphics.landBuffer.height, 
        xOffset, yOffset, terrainGraphics.landBuffer.width, terrainGraphics.landBuffer.height, 
        terrainGraphics.landBuffer, 
        [1,1,1,1]);
    
    graphics.drawSprite(graphicsPrograms, 
        0, 0, terrainGraphics.waterBuffer.width, terrainGraphics.waterBuffer.height, 
        xOffset, yOffset, terrainGraphics.waterBuffer.width, terrainGraphics.waterBuffer.height, 
        terrainGraphics.waterBuffer, [1,1,1,1]);

    graphics.drawSpriteMask(graphicsPrograms, 
        0, 0, terrainGraphics.landMaskBuffer.width, terrainGraphics.landMaskBuffer.height, 
        0, 0, terrainGraphics.landMaskBuffer.width, terrainGraphics.landMaskBuffer.height, 
        xOffset, yOffset, terrainGraphics.landMaskBuffer.width, terrainGraphics.landMaskBuffer.height, 
        terrainGraphics.landMaskBuffer, 
        terrainGraphics.waves.waveTextures[waveTextureNumber]
    );
    
}

function drawPassablityMap(graphicsPrograms, passabilityMap, view ) {
    var offset = convertToScreen({x: 0, y: 0}, view);
    var xOffset = offset.x;
    var yOffset = offset.y;
    
    graphics.drawSprite(graphicsPrograms, 
        0, 0, passabilityMap.passableBuffer.width, passabilityMap.passableBuffer.height, 
        xOffset, yOffset, passabilityMap.passableBuffer.width * SUB_TILE_WIDTH, passabilityMap.passableBuffer.height * SUB_TILE_HEIGHT, 
        passabilityMap.passableBuffer, [1,1,1,.5]);
}