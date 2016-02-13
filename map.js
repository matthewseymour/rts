var WAVE_SPEED = 40;
var WAVE_PERIOD = 60;
var SEA_LEVEL = 100; //Level on the heightmap (0-255) at which there is water
var TANK_DRIVE_DEPTH = 10; //Level below sealevel where tanks can still drive



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
    var seaLevel = SEA_LEVEL;
    var land;
    var water;
    var landMask;
    
	
	if(value < seaLevel + 5) //Land
	{
		var tempValue = value - seaLevel;
        land = [Math.max(0, Math.round(tempValue * 300 / (255 - seaLevel)) + 75),
				Math.max(0, Math.round(tempValue * 300 / (255 - seaLevel)) + 75),
				0,
                255];
    }               
	else
	{
		var tempValue = value - seaLevel;
		land = [Math.round(tempValue * 45 / (255 - seaLevel)) + 80,
				Math.round(tempValue * 45 / (255 - seaLevel)) + 130,
				Math.round(tempValue * 25 / (255 - seaLevel)) + 40,
                255];
	}
    
    
    if(value < seaLevel) 
    {
        var transparency = 0;
        if(value > seaLevel - 5) {
            transparency = Math.floor(255 * (value - (seaLevel + 5)) / 5);
        }
        water = [Math.round(value *  45 / seaLevel) +  0,
    			 Math.round(value *  75 / seaLevel) + 75,
    			 Math.round(value *  85 / seaLevel) + 85,
                 255 - transparency];
    } 
    else 
    {
        water = [0,0,0,0];
    }
    
	if(value < seaLevel) 
    {
        var mask = Math.floor(255 * value / seaLevel);
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
        
        
        //Put the "standard passibility" in the red channel, and the tank passibility (tanks can drive in shallow water) in the blue channel. Also put the "standard passibility" in the alpha channel so we can draw this easily for debugging purposes.
        glUtils.setPixelValue(colorMapPassablePixels, i, 0, colorMapSize, [(i >= SEA_LEVEL ? 0 : 255), 0, 0, (i >= SEA_LEVEL ? 0 : 255)]);
        glUtils.setPixelValue(colorMapPassablePixels, i, 1, colorMapSize, [0, 0, (i >= SEA_LEVEL - TANK_DRIVE_DEPTH ? 0 : 255), 0]);
        glUtils.setPixelValue(colorMapPassablePixels, i, 2, colorMapSize, [0,0,0,0]);
    }
    
    
    var colorMapHeight   = makeSpriteData(colorMapHeightPixels  , colorMapSize, 3);
    var colorMapLand     = makeSpriteData(colorMapLandPixels    , colorMapSize, 3);
    var colorMapWater    = makeSpriteData(colorMapWaterPixels   , colorMapSize, 3);
    var colorMapLandMask = makeSpriteData(colorMapLandMaskPixels, colorMapSize, 3);
    var colorMapPassable = makeSpriteData(colorMapPassablePixels, colorMapSize, 3);
    
    var passableBuffer = glUtils.makeFrameBuffer(N, N, gl.NEAREST);
    fft.colorMap(gl, fftProgs, colorMapPassable, heightMap.heightMapBuffer, heightMap.heightMapBuffer, heightMap.heightMapBuffer, passableBuffer);

    var passableBufferPixels = new Uint8Array(N * N * 4);
    gl.readPixels(0, 0, N, N, gl.RGBA, gl.UNSIGNED_BYTE, passableBufferPixels);

    //Map pass is just whether a point is passable or not:
    //Read from the red and blue channels
    var mapPass = new Uint8Array(N * N);
    var mapPassTank = new Uint8Array(N * N);
    for(var i = 0; i < N * N; i++) {
        mapPass[i]     = passableBufferPixels[i * 4 + 0] == 255 ? 0 : 1;
        mapPassTank[i] = passableBufferPixels[i * 4 + 2] == 255 ? 0 : 1;
    }
    


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
        mapPass: mapPassTank,
        waves: waves,
        waveTime: 0
    };
    
}

function drawLineBox(a, b, size, gl, view) {
    function drawHorizontalLine(xL, xR, y) {
        var topLeft = convertToScreen({x: xL, y: y}, view);
        var bottomRight = convertToScreen({x: xR, y: y + 1}, view);
        drawBox(gl, topLeft.x, topLeft.y, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y, [0,1,0,.5]);
    }
    
    function drawVerticalLine(yL, yU, x) {
        var topLeft = convertToScreen({x: x, y: yL}, view);
        var bottomRight = convertToScreen({x: x + 1, y: yU}, view);
        drawBox(gl, topLeft.x, topLeft.y, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y, [0,1,0,.5]);
    }
    
    function drawSimpleLine(a, b) {
        var pos1 = convertToScreen(a, view);
        var pos2 = convertToScreen(b, view);
    
        drawLine(gl, pos1.x, pos1.y, pos2.x, pos2.y, [1,1,1,1]);
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
    
    var X1 = start.x - size;
    var X2 = start.x + size;
    var X3 =   end.x - size;
    var X4 =   end.x + size;

    var Y1 = start.y - size;
    var Y2 = start.y + size;
    var Y3 =   end.y - size;
    var Y4 =   end.y + size;
    
    drawSimpleLine({x: X1, y: Y1}, {x: X3, y: Y3});
    drawSimpleLine({x: X2, y: Y1}, {x: X4, y: Y3});
    drawSimpleLine({x: X1, y: Y2}, {x: X3, y: Y4});
    drawSimpleLine({x: X2, y: Y2}, {x: X4, y: Y4});

    var x1 = Math.floor(X1);
    var x2 =  Math.ceil(X2);
    var x3 = Math.floor(X3);
    var x4 =  Math.ceil(X4);

    var y1 = Math.floor(Y1);
    var y2 =  Math.ceil(Y2);
    var y3 = Math.floor(Y3);
    var y4 =  Math.ceil(Y4);
    
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


function drawMap(gl, map, time, view, options) {
    
    var waveSpeed = WAVE_SPEED;
    var waveTextureNumber = Math.floor(time / waveSpeed) % WAVE_PERIOD;
    
    var offset = convertToScreen({x: 0, y: 0}, view);
    var xOffset = offset.x;
    var yOffset = offset.y;
    
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
            map.passableBuffer, [1,1,1,.5]);
    }
    
    
    
    
}