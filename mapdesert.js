"use strict";




function largeNoise(graphicsPrograms, fftProgs, size) {
    var num = Math.ceil(size / 256);
    var bufferNoise = Compute.makeComputeBuffer(fftProgs.gl, 256, 256);
    var bufferOut   = Compute.makeComputeBuffer(fftProgs.gl, size, size);
    
    graphicsPrograms.gl.disable(gl.BLEND);
    
    for(var i = 0; i < num; i++) {
        for(var j = 0; j < num; j++) {
            Compute.gaussianNoise(fftProgs, Math.floor(Math.random() * 65535), 1, bufferNoise);
            
            graphicsPrograms.gl.bindFramebuffer(gl.FRAMEBUFFER, bufferOut.frameBuffer);
            graphicsPrograms.gl.viewport(0, 0, size, size);
            graphicsPrograms.gl.disable(graphicsPrograms.gl.SCISSOR_TEST);
            graphicsPrograms.resolution = {width: size, height: size};
    

            Graphics.drawImage(graphicsPrograms, 
                0, 0, 256, 256, 
                256 * i, 256 * j, 256, 256, 
                bufferNoise, 
                [1,1,1,1]);
            
            
        }
    }
    return bufferOut;
    
}


function genTestHeightMap(graphicsPrograms, fftProgs, stages, scale, reduceFactor) {
    const N = 1 << stages;
    
    var buffer1    = largeNoise(graphicsPrograms, fftProgs, N);
    var buffer2    = Compute.makeComputeBuffer(fftProgs.gl, N, N);
    var tempBuffer = Compute.makeComputeBuffer(fftProgs.gl, N, N);

    //u_1 x-dir bias
    //u_1 y-dir bias
    //u_3 magnitude of angular factor
    //u_4 magnitude of isotropic factor 
    var shapeNoise = Compute.buildCustomProgram(fftProgs.gl, `
        float kMag = length(k);
        float mag;
        float angularFactor;
        if(kMag < 0.002) { //Sets the feature length scale
            mag = 0.0;
        } else {
            vec2 dir = vec2(u_1, u_2);
            float cosAngle = dot(k, dir) / kMag;
            angularFactor = cosAngle * u_3 + u_4;
            mag = 0.1 * angularFactor * pow(2.0 * 8.0, 1.7) / pow(kMag * 2.0 * 110.0 * 8.0, 1.7);
        }  
        b = a * mag;
        `
    );

    //var angularDirAngle = Math.PI / 2;
    var angularDirAngle = Math.PI / 2 + 2 * (Math.random() - .5) * (Math.PI / 6);
    var angularDirX = Math.cos(angularDirAngle);
    var angularDirY = Math.sin(angularDirAngle);
    var angularFactor = 1;//Math.random();
    Compute.runCustomProgram(fftProgs.gl, shapeNoise, buffer1, buffer2, angularDirX, angularDirY, 2 * angularFactor, 1 - angularFactor);//2, 0);
    
    var fftPlan = Compute.makePlan(fftProgs, stages, Compute.FFT_DIRECTIONS.BACKWARD, Math.pow(N, reduceFactor));
    
    //Buffer 1 will get the output
    Compute.computeFft(fftProgs, fftPlan, buffer2, buffer1, tempBuffer);
    
    //Discard the imaginary part of the output (buffer 2) and overwrite it:
    Compute.scale(fftProgs, scale, buffer1, buffer2);
    
    return {heightMapBuffer: buffer2 };
}



function genHeightMapInfo(graphicsPrograms, fftProgs, size, scaling) {
    var gl = graphicsPrograms.gl;
    //Next power of 2 to incorporate the map size:
    const stages = Math.ceil(Math.log(size) / Math.log(2));
    const N = 1 << stages; //the resized size

    var n = 1.5;
    var reduceFactor = 1;
    var heightMap = genTestHeightMap(graphicsPrograms, fftProgs, stages, (Math.pow(1024 / size, n) / 64) * Math.pow(N, 2 * reduceFactor), reduceFactor);
    
    gl.bindFramebuffer(gl.FRAMEBUFFER, heightMap.heightMapBuffer.frameBuffer);
    
    var heightBufferPixels = new Float32Array(N * N * 4);
    gl.readPixels(0, 0, N, N, gl.RGBA, gl.FLOAT, heightBufferPixels);
    
    
    
    
    var heights = [];
    var meanHeight = 0;
    for(var i = 0; i < 500; i++) {
        var index = Math.floor(Math.random() * N * N);
        var h = heightBufferPixels[index * 4];
        meanHeight += h;
        heights.push(h);
    }
    meanHeight /= heights.length;
    var varHeight = 0;
    for(var i = 0; i < heights.length; i++) {
        varHeight += Math.pow(heights[i] - meanHeight, 2);
    }
    varHeight /= (heights.length - 1);//Bessel's correction
    var stdHeight = Math.sqrt(varHeight);
    
    console.log("Mean height: " + meanHeight.toString());
    console.log("Std height: " + stdHeight.toString());
    
    var minHeight = meanHeight + stdHeight;
    
    var bufferTemp1    = Compute.makeComputeBuffer(fftProgs.gl, N, N);
    
    
    //Now subtract off the minheight and rescale:
    //u_1: minHeight
    //u_2: scaling power
    //u_3: scale
    var rescale = Compute.buildCustomProgram(fftProgs.gl, `
        float val = u_3 * pow(max(a.x - u_1, 0.0), u_2);
        b = vec4(val, 0, 0, 1.0);
        `
    );
    
    Compute.runCustomProgram(fftProgs.gl, rescale, heightMap.heightMapBuffer, bufferTemp1, minHeight, 1.2, .8 * scaling); //.75, .3 * scaling); //Not bad!

    gl.readPixels(0, 0, N, N, gl.RGBA, gl.FLOAT, heightBufferPixels);
    
    
    
    
    
    
    return {
        heightMap: bufferTemp1,
        heightBufferPixels: heightBufferPixels,
    }
}

function genPassableMap(graphicsPrograms, fftProgs, heightMap, viewRange) {
    var viewSizeWidth = viewRange.colEnd - viewRange.colStart;
    var viewSizeHeight = viewRange.rowEnd - viewRange.rowStart;
    var tileHeightBuffer = Compute.makeComputeBuffer(fftProgs.gl, viewRange.width, viewRange.height);
    var passableViewBuffer   = glUtils.makeFrameBuffer(fftProgs.gl, viewRange.width, viewRange.height, fftProgs.gl.NEAREST);
    gl.bindFramebuffer(gl.FRAMEBUFFER, tileHeightBuffer.frameBuffer);
    
    //Crop the range we want to see:
    //(also invert the y axis):
    Graphics.drawImage(graphicsPrograms, 
        viewRange.colStart, viewRange.rowStart + viewSizeHeight, viewSizeWidth, -viewSizeHeight, 
        0, 0, viewRange.width, viewRange.height, 
        heightMap,
        [1,1,1,1]
    );

    
    var mapPassableColor = Compute.buildCustomProgram(fftProgs.gl, `
        float val = 0.0;
        if(a.x > u_1) 
            val = 1.0;
        
        b = vec4(1.0, 1.0, 1.0, val);
        `
    );
    
    var threshold = .002;
    Compute.runCustomProgram(fftProgs.gl, mapPassableColor, tileHeightBuffer, passableViewBuffer, threshold);
    
    var passableBufferPixels = new Uint8Array(viewRange.width * viewRange.height * 4);
    var mapPass = new Uint8Array(viewRange.width * viewRange.height);
    var mapPassTank = new Uint8Array(viewRange.width * viewRange.height);
    
    gl.readPixels(0, 0, viewRange.width, viewRange.height, gl.RGBA, gl.UNSIGNED_BYTE, passableBufferPixels);
    
    //They are the same in this map:
    for(var i = 0; i < viewRange.width * viewRange.height; i++) {
        mapPass[i]     = passableBufferPixels[i * 4 + 3] == 255 ? 0 : 1;
        mapPassTank[i] = passableBufferPixels[i * 4 + 3] == 255 ? 0 : 1;
    }
    
    
    return {
        passableBuffer: passableViewBuffer,
        tileHeightBuffer: tileHeightBuffer,
        mapPass: mapPass,
        mapPassTank: mapPassTank,
        distPass: getObstacleDistanceMap(mapPass, viewRange.width, viewRange.height),
        distPassTank: getObstacleDistanceMap(mapPassTank, viewRange.width, viewRange.height),
        width: viewRange.width,
        height: viewRange.height
        
    }
    
    
}

function generateGeometry(heightBufferPixels, scaling, N, triangles, normals, range) {
    var triangleIndex = 0;


    function pos(i) {return (2 * i / N - 1) * scaling;}
    
    function getNormal(i, j) {
        var p1x = pos(i);
        var p1y = pos(j);
        var p1z = heightBufferPixels[(i + j * N) * 4];
        
        var p2x = pos(i + 1);
        var p2y = pos(j);
        var p2z = heightBufferPixels[(i + 1 + j * N) * 4];
        
        var p3x = pos(i);
        var p3y = pos(j + 1);
        var p3z = heightBufferPixels[(i + (j + 1) * N) * 4];
        
        var p4x = pos(i - 1);
        var p4y = pos(j);
        var p4z = heightBufferPixels[(i - 1 + j * N) * 4];
        
        var p5x = pos(i);
        var p5y = pos(j - 1);
        var p5z = heightBufferPixels[(i + (j - 1) * N) * 4];
        
        var norm1 = Geometry.normal(p1x, p1y, p1z, p2x, p2y, p2z, p3x, p3y, p3z);
        var norm2 = Geometry.normal(p1x, p1y, p1z, p3x, p3y, p3z, p4x, p4y, p4z);
        var norm3 = Geometry.normal(p1x, p1y, p1z, p4x, p4y, p4z, p5x, p5y, p5z);
        var norm4 = Geometry.normal(p1x, p1y, p1z, p5x, p5y, p5z, p2x, p2y, p2z);
        
        return Geometry.unitVec({
            x: (norm1.x + norm2.x + norm3.x + norm4.x) / 4,
            y: (norm1.y + norm2.y + norm3.y + norm4.y) / 4,
            z: (norm1.z + norm2.z + norm3.z + norm4.z) / 4
        });
            
    }
    
    function pushTriAndNormFlat(triangles, normals, p1x, p1y, p1z, p2x, p2y, p2z, p3x, p3y, p3z) {
        
        var norm = Geometry.normal(p1x, p1y, p1z, p2x, p2y, p2z, p3x, p3y, p3z);
        
        
        triangles[triangleIndex + 0] = p1x;
        triangles[triangleIndex + 1] = p1y;
        triangles[triangleIndex + 2] = p1z;
        triangles[triangleIndex + 3] = p2x;
        triangles[triangleIndex + 4] = p2y;
        triangles[triangleIndex + 5] = p2z;
        triangles[triangleIndex + 6] = p3x;
        triangles[triangleIndex + 7] = p3y;
        triangles[triangleIndex + 8] = p3z;
        
        
        //Assume the triangle is flat:
        normals[triangleIndex + 0] = norm.x;
        normals[triangleIndex + 1] = norm.y;
        normals[triangleIndex + 2] = norm.z;
        normals[triangleIndex + 3] = norm.x;
        normals[triangleIndex + 4] = norm.y;
        normals[triangleIndex + 5] = norm.z;
        normals[triangleIndex + 6] = norm.x;
        normals[triangleIndex + 7] = norm.y;
        normals[triangleIndex + 8] = norm.z;
        
        triangleIndex += 9;
    }

    function pushTrisAndNormsFlat(triangles, normals, p1x, p1y, p1z, p2x, p2y, p2z, p3x, p3y, p3z, p4x, p4y, p4z) {
        var p5x = (p1x + p2x + p3x + p4x) / 4;
        var p5y = (p1y + p2y + p3y + p4y) / 4;
        var p5z = (p1z + p2z + p3z + p4z) / 4;
        pushTriAndNormFlat(
            triangles, normals, 
            p1x, p1y, p1z,
            p2x, p2y, p2z,
            p5x, p5y, p5z
        );
        pushTriAndNormFlat(
            triangles, normals, 
            p2x, p2y, p2z,
            p3x, p3y, p3z,
            p5x, p5y, p5z
        );
        pushTriAndNormFlat(
            triangles, normals, 
            p3x, p3y, p3z,
            p4x, p4y, p4z,
            p5x, p5y, p5z
        );
        pushTriAndNormFlat(
            triangles, normals, 
            p4x, p4y, p4z,
            p1x, p1y, p1z,
            p5x, p5y, p5z
        );
        
    }
    
    
    for(var i = range.colStart; i < range.colEnd; i++) {
        for(var j = range.rowStart; j < range.rowEnd; j++) {
            var p1z = heightBufferPixels[(i + j * N) * 4];
            var p2z = heightBufferPixels[(i + 1 + j * N) * 4];
            var p3z = heightBufferPixels[(i + 1 + (j + 1) * N) * 4];
            var p4z = heightBufferPixels[(i + (j + 1) * N) * 4];
            if(p1z <= 0 && p2z <= 0 && p3z <= 0 && p4z <= 0)
                continue;
            
            
            
            pushTrisAndNormsFlat(
                triangles, normals, 
                pos(i), pos(j), p1z, //1
                pos(i + 1), pos(j), p2z, //2
                pos(i + 1), pos(j + 1), p3z, //3
                pos(i), pos(j + 1), p4z, //4
                getNormal(i, j),
                getNormal(i + 1, j),
                getNormal(i + 1, j + 1),
                getNormal(i, j + 1)
            );
            
            
        }
    }
    
    var trianglesVertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, trianglesVertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, triangles.subarray(0, triangleIndex), gl.STATIC_DRAW);

    var normalsVertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normalsVertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, normals.subarray(0, triangleIndex), gl.STATIC_DRAW);
    
    
    
    
    
    
    
    //The floor:
    var TR = 3 * (N / 1024); //Texture repeat. 
    //The "floor"
    var floorTris = [];
    var floorNormals = [];
    var floorTextureCoords = [];
    floorTris.push(
        pos(range.colStart), pos(range.rowStart), 0, 
        pos(range.colStart), pos(range.rowEnd)  , 0, 
        pos(range.colEnd)  , pos(range.rowStart), 0);
    floorNormals.push(0, 0, 1, 0, 0, 1, 0, 0, 1);
    floorTextureCoords.push(
        TR * range.colStart / N, TR * range.rowStart / N, 
        TR * range.colStart / N, TR * range.rowEnd   / N, 
        TR * range.colEnd   / N, TR * range.rowStart / N);
    
    floorTris.push(
        pos(range.colStart), pos(range.rowEnd)  , 0, 
        pos(range.colEnd)  , pos(range.rowEnd)  , 0, 
        pos(range.colEnd)  , pos(range.rowStart), 0);
    floorNormals.push(0, 0, 1, 0, 0, 1, 0, 0, 1);
    floorTextureCoords.push(
        TR * range.colStart / N, TR * range.rowEnd   / N, 
        TR * range.colEnd   / N, TR * range.rowEnd   / N, 
        TR * range.colEnd   / N, TR * range.rowStart / N);
    
    
    var floorTrisBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, floorTrisBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(floorTris), gl.STATIC_DRAW);
    
    
    var floorNormsBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, floorNormsBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(floorNormals), gl.STATIC_DRAW);
    
    
    var floorTexCoordsBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, floorTexCoordsBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(floorTextureCoords), gl.STATIC_DRAW);
    
    
    
    
    
    return {
        trianglesVertexBuffer: trianglesVertexBuffer,
        normalsVertexBuffer: normalsVertexBuffer,
        numTriangles: triangleIndex / 9,
        floorTrisBuffer: floorTrisBuffer,
        floorNormsBuffer: floorNormsBuffer,
        floorTexCoordsBuffer: floorTexCoordsBuffer,
        numFloorTris: 2,
    };
}

function getShadowBuffer(gl, size) {
    var depthTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, depthTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT, size, size, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_SHORT, null);
    
    
    var frameBuffer = glUtils.makeFrameBuffer(gl, size, size, gl.NEAREST);
    
    gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer.frameBuffer);
	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, depthTexture, 0);
    
    return {
        depthTexture: depthTexture,
        frameBuffer: frameBuffer.frameBuffer,
        width: size,
        height: size
    }
    
}

function getMapViewBuffer(width, height) {
    
    var depthTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, depthTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT, width, height, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_SHORT, null);
    
    
    var buffer = glUtils.makeFrameBuffer(gl, width, height, gl.NEAREST)
    
    gl.bindFramebuffer(gl.FRAMEBUFFER, buffer.frameBuffer);
	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, depthTexture, 0);
    
    return {
        buffer: buffer, 
        depthTexture: {texture: depthTexture, width: width, height: height},
    };
}

function drawShadows(buffer, features, lightViewMatrix, lightDir, offsetX, offsetY) {
    
    gl.bindFramebuffer(gl.FRAMEBUFFER, buffer.frameBuffer);
    gl.viewport(0, 0, buffer.width, buffer.height);
    
    gl.enable(gl.DEPTH_TEST);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    for(var i = 0; i < features.length; i++) {
        var worldMatrix = Matrix.makeTranslation(offsetX, offsetY, 0);

        Graphics.drawTriangles(graphicsPrograms, features[i].trianglesVertexBuffer, features[i].normalsVertexBuffer, features[i].numTriangles, worldMatrix, lightViewMatrix, [.5,.5,.25,1], [.5,.5,.25,1], lightDir, 0.2);
        Graphics.drawTriangles(graphicsPrograms, features[i].floorTrisBuffer, features[i].floorNormsBuffer, features[i].numFloorTris, worldMatrix, lightViewMatrix, [.5,.5,.25,1], [.5,.5,.25,1], lightDir, 0.3);
    
    }
}

function drawOntoBuffer(feature, buffer, shadowBuffer, sandTexture, lightViewMatrix, lightDir) {
    var screenRatio = buffer.width / buffer.height;
    
    var cameraAngle = Math.acos(1 / screenRatio);
    //Camera rotates:
    var cameraMatrix = Matrix.multiplyManyMatrices([
        Matrix.makeScale(1, screenRatio, .25),
        Matrix.makeXRotation(Math.PI + cameraAngle)
    ]);
        
    gl.bindFramebuffer(gl.FRAMEBUFFER, buffer.frameBuffer);
    gl.viewport(0, 0, buffer.width, buffer.height);
    gl.enable(gl.DEPTH_TEST);


    var translateMat = Matrix.makeTranslation(-feature.x, -feature.y, 0);
    var worldMatrixMap = Matrix.makeIdentity();
    Graphics.drawTrianglesShadow(graphicsPrograms, feature.trianglesVertexBuffer, feature.normalsVertexBuffer, feature.numTriangles, 
        shadowBuffer.depthTexture, 
        worldMatrixMap, cameraMatrix, Matrix.multiplyManyMatrices([lightViewMatrix, translateMat]), 
        feature.color, feature.color,
        lightDir, 0.3);

    Graphics.drawTrianglesTextureShadow(graphicsPrograms, feature.floorTrisBuffer, feature.floorNormsBuffer, feature.floorTexCoordsBuffer, feature.numFloorTris, 
        sandTexture.texture, shadowBuffer.depthTexture, 
        worldMatrixMap, cameraMatrix, Matrix.multiplyManyMatrices([lightViewMatrix, translateMat]), 
        lightDir, 0.3);
}


function makeSandTexture(fftProgs, size, scale, scaleSpeckle, speckleDiff, brightness, green, blue) {
    var gl = fftProgs.gl;
    var buffer1 = largeNoise(graphicsPrograms, fftProgs, size);
    var buffer3 = Compute.makeComputeBuffer(gl, size, size);
    var buffer4 = Compute.makeComputeBuffer(gl, size, size);
    var textureOut = glUtils.makeTexture(gl, size, size, gl.NEAREST, gl.REPEAT, null);
    var bufferOut = glUtils.makeFrameBufferTexture(gl, textureOut);
    
    var shapeNoise = Compute.buildCustomProgram(fftProgs.gl, `
        if(a.x < u_2)
            a.x -= u_3;
        b = a * u_1;
        `
    );

    Compute.runCustomProgram(fftProgs.gl, shapeNoise, buffer1, buffer3, scale, scaleSpeckle, speckleDiff);
    
    var mapColor = Compute.buildCustomProgram(fftProgs.gl, `
        float val = (a.x + 1.0) / 2.0;
        b = vec4(val * u_1, val * u_2, val * u_3, 1.0);
        `
    );
    
    Compute.runCustomProgram(fftProgs.gl, mapColor, buffer3, bufferOut, brightness, green * brightness, blue * brightness);
    
    return textureOut;
}

function genMap(fftProgs, size) {
    
    
    //const sandscale = 0.0375;
    const sandscale = 0.05;
    const sandcalespeckle = -1.2;
    const speckleDiff = 1.5;
    const sandBrightness = 1.2;
    const sandgreen = .95;
    const sandblue = .48;
    var sandTexture = makeSandTexture(fftProgs, 1024, sandscale, sandcalespeckle, speckleDiff, sandBrightness, sandgreen, sandblue);



    const lightAzimuth = 13 * Math.PI / 8;
    //const lightElevation = Math.PI / 6; //sunset
    const lightElevation = Math.PI / 3;

    var lightDir = [Math.sin(lightAzimuth) * Math.cos(lightElevation), Math.cos(lightAzimuth) * Math.cos(lightElevation), Math.sin(lightElevation)];
    var lightViewMatrix = Matrix.multiplyManyMatrices([Matrix.makeScale(1,1,.25), Matrix.makeXRotation(Math.PI + (Math.PI/2 - lightElevation)), Matrix.makeZRotation(lightAzimuth)]);


    var mapSizeTiles = Math.ceil(size / 75) * 75;
    var mapWidth = mapSizeTiles;
    var mapHeight = mapSizeTiles;
    var numChunks = mapSizeTiles / 75;
    var chunkSize = 256;
    var mapSize = 2048; //To do: Round up to nearest POT (numChunks+2) * chunkSize
    var scaling = mapSize / (chunkSize * numChunks);
    var startPoint = (mapSize - numChunks * chunkSize) / 2;


    var heightMapRange = {
        colStart: startPoint, colEnd: startPoint + chunkSize * numChunks,
        rowStart: startPoint, rowEnd: startPoint + chunkSize * numChunks,
        width: mapWidth,
        height: mapHeight
    };

    var info = genHeightMapInfo(graphicsPrograms, fftProgs, mapSize, scaling);
    
    var passabilityMap = genPassableMap(graphicsPrograms, fftProgs, info.heightMap, heightMapRange);
    
    //For each point in the heightmap there are 4 triangles. Each has 3 points, and each point has 3 numbers (x,y,z):
    var trianglesTempBuffer = new Float32Array(chunkSize * chunkSize * 4 * 3 * 3);
    var normalsTempBuffer = new Float32Array(chunkSize * chunkSize * 4 * 3 * 3);

    var mapBufferObject = getMapViewBuffer(mapWidth * SUB_TILE_WIDTH, mapHeight * SUB_TILE_HEIGHT);
    var mapBuffer = mapBufferObject.buffer;
    gl.bindFramebuffer(gl.FRAMEBUFFER, mapBuffer.frameBuffer);
    gl.viewport(0, 0, mapBuffer.width, mapBuffer.height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);


    var miniMapBufferObject = getMapViewBuffer(MINI_MAP_SIZE, MINI_MAP_SIZE);
    var miniMapBuffer = miniMapBufferObject.buffer;
    gl.bindFramebuffer(gl.FRAMEBUFFER, miniMapBuffer.frameBuffer);
    gl.viewport(0, 0, miniMapBuffer.width, miniMapBuffer.height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    var shadowBuffer = getShadowBuffer(gl, 2048);
    
    var pathfindNodeInfo = buildPathfindNodeInfo(passabilityMap, UNIT_SIZE);
    var obstacleStore = getObstacleStore();
    
    var mapWork = [];

    for(var col = 0; col < numChunks; col++) {
        for(var row = 0; row < numChunks + 1; row++) {
            var work = (function(row, col) {
                return function() {
                    var features = [];
                    var toDraw;
                    //Because of the way the shadows work, we need the col to the left and the row below:

                    for(var i = col - 1; i <= col; i++) {
                        for(var j = row; j <= row + 1; j++) {
                            var range = {
                                colStart: Math.max(startPoint + i * chunkSize, 0), colEnd: Math.min(startPoint + (i + 1) * chunkSize, mapSize), 
                                rowStart: Math.max(startPoint + j * chunkSize, 0), rowEnd: Math.min(startPoint + (j + 1) * chunkSize, mapSize)
                            };
                            var newFeature = generateGeometry(info.heightBufferPixels, scaling, mapSize, trianglesTempBuffer, normalsTempBuffer, range);
                            newFeature.x = (range.colEnd + range.colStart) / mapSize - 1;
                            newFeature.y = (range.rowEnd + range.rowStart) / mapSize - 1;
                            //newFeature.color = [.5,.5,.25, 1];
                            newFeature.color = [.54,.48,.25, 1];
                            features.push(newFeature);
                            if(i == col && j == row)
                                toDraw = newFeature;
                        }
                    }
                    drawShadows(shadowBuffer, features, lightViewMatrix, lightDir, -toDraw.x, -toDraw.y);
                    drawOntoBuffer(toDraw, mapBuffer, shadowBuffer, sandTexture, lightViewMatrix, lightDir);
                    drawOntoBuffer(toDraw, miniMapBuffer, shadowBuffer, sandTexture, lightViewMatrix, lightDir);
                    console.log(row, col);
                };
            })(row, col);
            
            mapWork.push(work);
            
        }
    }
    
    
    for(var i = 0; i < mapWork.length; i++) {
        mapWork[i]();
    }
    
    return {
        terrainGraphics: {
            terrainBuffer: mapBuffer,
            terrainDepthTexture: mapBufferObject.depthTexture,
        },
        passabilityMap: passabilityMap,
        miniMap: {miniMapBuffer: miniMapBuffer},
        pathfindNodeInfo: pathfindNodeInfo,
        obstacleStore: obstacleStore,
        width: mapWidth,
        height: mapHeight,
    };
    
}


function drawMap(graphicsPrograms, terrainGraphics, timeDiff, view) {
    
    var offset = convertToScreen({x: 0, y: 0}, view);
    var xOffset = offset.x;
    var yOffset = offset.y;
    
    /*
    Graphics.drawImage(graphicsPrograms, 
        0, 0, terrainGraphics.terrainBuffer.width, terrainGraphics.terrainBuffer.height, 
        xOffset, yOffset, terrainGraphics.terrainBuffer.width, terrainGraphics.terrainBuffer.height, 
        terrainGraphics.terrainDepthTexture,
        [1,1,1,1]);
    */
    Graphics.drawImage(graphicsPrograms, 
        0, 0, terrainGraphics.terrainBuffer.width, terrainGraphics.terrainBuffer.height, 
        xOffset, yOffset, terrainGraphics.terrainBuffer.width, terrainGraphics.terrainBuffer.height, 
        terrainGraphics.terrainBuffer, 
        [1,1,1,1]);
}
