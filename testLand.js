//Matthew Seymour, matthew dot seymour at gmail.com

"use strict";

const SUB_TILE_WIDTH = 8;
const SUB_TILE_HEIGHT = 6;



var gl = screen.canvas.getContext("experimental-webgl", 
{
    alpha: false,
    antialias: true
});
var depthTextureExtension = gl.getExtension("WEBGL_depth_texture");
if (!depthTextureExtension) {
    alert("depth textures not supported");
}
var floatTextureExtension = gl.getExtension("OES_texture_float");
if (!floatTextureExtension) {
    alert("float textures not supported");
}
var samples = gl.getParameter(gl.SAMPLES);
console.log(samples);


gl.depthFunc(gl.LEQUAL);



var primitive3dProgramInfo = glUtils.makeProgram(
    gl, primitive3dVertexSource, primitive3dFragmentSource, 
    ["a_position", "a_normal"], 
    []
);

var primitive3dShadowProgramInfo = glUtils.makeProgram(
    gl, primitive3dShadowVertexSource, primitive3dShadowFragmentSource, 
    ["a_position", "a_normal"], 
    []
);

var texture3dShadowProgramInfo = glUtils.makeProgram(
    gl, texture3dShadowVertexSource, texture3dShadowFragmentSource, 
    ["a_position", "a_normal", "a_texCoord"], 
    []
);

function drawTriangles(gl, triangleBuffer, normalsBuffer, numberOfTriangles, matrixWorld, matrixCamera, color, zColor, lightDir, ambient) {
	gl.useProgram(primitive3dProgramInfo.program);

	gl.bindBuffer(gl.ARRAY_BUFFER, triangleBuffer);
	gl.vertexAttribPointer(primitive3dProgramInfo.attribsUniforms.a_position, 3, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(primitive3dProgramInfo.attribsUniforms.a_position);

	gl.bindBuffer(gl.ARRAY_BUFFER, normalsBuffer);
	gl.vertexAttribPointer(primitive3dProgramInfo.attribsUniforms.a_normal, 3, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(primitive3dProgramInfo.attribsUniforms.a_normal);

    primitive3dProgramInfo.setters.u_matrix_world(matrixWorld);
    primitive3dProgramInfo.setters.u_matrix_camera(matrixCamera);
	primitive3dProgramInfo.setters.u_color(color);
	primitive3dProgramInfo.setters.u_zColor(zColor);
	primitive3dProgramInfo.setters.u_light(lightDir);
	primitive3dProgramInfo.setters.u_ambient(ambient);
    
	//draw
	gl.drawArrays(gl.TRIANGLES, 0, numberOfTriangles * 3);
	
}

function drawTrianglesShadow(gl, triangleBuffer, normalsBuffer, numberOfTriangles, shadowMapTexture, matrixWorld, matrixCamera, matrixLight, color, zColor, lightDir, ambient) {
	gl.useProgram(primitive3dShadowProgramInfo.program);

	gl.bindBuffer(gl.ARRAY_BUFFER, triangleBuffer);
	gl.vertexAttribPointer(primitive3dShadowProgramInfo.attribsUniforms.a_position, 3, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(primitive3dShadowProgramInfo.attribsUniforms.a_position);

	gl.bindBuffer(gl.ARRAY_BUFFER, normalsBuffer);
	gl.vertexAttribPointer(primitive3dShadowProgramInfo.attribsUniforms.a_normal, 3, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(primitive3dShadowProgramInfo.attribsUniforms.a_normal);

	
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, shadowMapTexture);
    
    primitive3dShadowProgramInfo.setters.u_shadowMap(0);

    primitive3dShadowProgramInfo.setters.u_matrix_world(matrixWorld);
    primitive3dShadowProgramInfo.setters.u_matrix_camera(matrixCamera);
    primitive3dShadowProgramInfo.setters.u_matrix_light(matrixLight);
	primitive3dShadowProgramInfo.setters.u_color(color);
	primitive3dShadowProgramInfo.setters.u_zColor(zColor);
	primitive3dShadowProgramInfo.setters.u_light(lightDir);
	primitive3dShadowProgramInfo.setters.u_ambient(ambient);
    
	//draw
	gl.drawArrays(gl.TRIANGLES, 0, numberOfTriangles * 3);
	
}


function drawTrianglesTextureShadow(gl, triangleBuffer, normalsBuffer, textureCoordsBuffer, numberOfTriangles, texture, shadowMapTexture, matrixWorld, matrixCamera, matrixLight, lightDir, ambient) {
	gl.useProgram(texture3dShadowProgramInfo.program);

	gl.bindBuffer(gl.ARRAY_BUFFER, triangleBuffer);
	gl.vertexAttribPointer(texture3dShadowProgramInfo.attribsUniforms.a_position, 3, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(texture3dShadowProgramInfo.attribsUniforms.a_position);

	gl.bindBuffer(gl.ARRAY_BUFFER, normalsBuffer);
	gl.vertexAttribPointer(texture3dShadowProgramInfo.attribsUniforms.a_normal, 3, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(texture3dShadowProgramInfo.attribsUniforms.a_normal);

	gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordsBuffer);
	gl.vertexAttribPointer(texture3dShadowProgramInfo.attribsUniforms.a_texCoord, 2, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(texture3dShadowProgramInfo.attribsUniforms.a_texCoord);

	
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, shadowMapTexture);
    texture3dShadowProgramInfo.setters.u_shadowMap(0);


	gl.activeTexture(gl.TEXTURE1);
	gl.bindTexture(gl.TEXTURE_2D, texture);
    texture3dShadowProgramInfo.setters.u_texture(1);


    texture3dShadowProgramInfo.setters.u_matrix_world(matrixWorld);
    texture3dShadowProgramInfo.setters.u_matrix_camera(matrixCamera);
    texture3dShadowProgramInfo.setters.u_matrix_light(matrixLight);
	texture3dShadowProgramInfo.setters.u_light(lightDir);
	texture3dShadowProgramInfo.setters.u_ambient(ambient);
    
	//draw
	gl.drawArrays(gl.TRIANGLES, 0, numberOfTriangles * 3);
	
}


function changeScissorDims() {
    graphicsPrograms.gl.scissor(screen.left, screen.bottom, screen.right - screen.left, screen.top - screen.bottom);
}

screen.onResize.push(changeScissorDims);

var graphicsPrograms = graphics.getGraphicsPrograms(gl);
var fftProgs = fft.getPrograms(gl);

function largeNoise(graphicsPrograms, fftProgs, size) {
    var num = Math.ceil(size / 256);
    var bufferNoise = fft.makeComputeBuffer(fftProgs.gl, 256, 256);
    var bufferOut   = fft.makeComputeBuffer(fftProgs.gl, size, size);
    
    graphicsPrograms.gl.disable(gl.BLEND);
    
    for(var i = 0; i < num; i++) {
        for(var j = 0; j < num; j++) {
            fft.gaussianNoise(fftProgs, Math.floor(Math.random() * 65535), 1, bufferNoise);
            
            graphicsPrograms.gl.bindFramebuffer(gl.FRAMEBUFFER, bufferOut.frameBuffer);
            graphicsPrograms.gl.viewport(0, 0, size, size);
            graphicsPrograms.gl.disable(graphicsPrograms.gl.SCISSOR_TEST);
            graphicsPrograms.resolution = {width: size, height: size};
    

            graphics.drawSprite(graphicsPrograms, 
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
    var buffer2    = fft.makeComputeBuffer(fftProgs.gl, N, N);
    var tempBuffer = fft.makeComputeBuffer(fftProgs.gl, N, N);


    var shapeNoise = fft.buildCustomProgram(fftProgs.gl, `
        float kMag = sqrt(k.x * k.x + k.y * k.y);
        float mag;
        float angularFactor;
        if(kMag < 0.002) { //Sets the feature length scale
            angularFactor = 0.0;//u_2 + u_3;
        } else {
            float dir_x = u_1;
            float dir_y = sqrt(1.0 - u_1 * u_1);
            float cosAngle = (k.x * dir_x + k.y * dir_y) / kMag;
            angularFactor = cosAngle * u_2 + u_3;
            //mag = angularFactor / pow(kMag * 110.0 * 1.0, 1.7);
        }  
        //mag = 0.1 * angularFactor * pow(2.0 * 8.0, 1.7) / (1.0 + pow(kMag * 2.0 * 110.0 * 8.0, 1.7));
        mag = 0.1 * angularFactor * pow(2.0 * 8.0, 1.7) / pow(kMag * 2.0 * 110.0 * 8.0, 1.7);
        b = a * mag;
        `
    );

    //Buffers 1 and 2 have noise. Shape the noise and output into buffers 3 and 4, these
    //will be the real and imaginary components to put into the fft
    var angularDir = 0;//Math.cos(Math.random(0, 2 * Math.PI));
    fft.runCustomProgram(fftProgs.gl, shapeNoise, buffer1, buffer2, angularDir, 2, 0);
    
    var fftPlan = fft.makePlan(fftProgs, stages, fft.FFT_DIRECTIONS.BACKWARD, Math.pow(N, reduceFactor));
    
    //Buffer 1 will get the output
    fft.computeFft(fftProgs, fftPlan, buffer2, buffer1, tempBuffer);
    
    //Discard the imaginary part of the output (buffer 2) and overwrite it:
    fft.scale(fftProgs, scale, buffer1, buffer2);
    
    return {heightMapBuffer: buffer2 };
}



function genHeightMapInfo(graphicsPrograms, fftProgs, size) {
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
    
    var heightViewBuffer   = glUtils.makeFrameBuffer(fftProgs.gl, N, N, fftProgs.gl.NEAREST);

    var mapColor = fft.buildCustomProgram(fftProgs.gl, `
        float val = (a.x + 1.0) / 2.0;
        b = vec4(val, val, val, 1.0);
        `
    );
    
    fft.runCustomProgram(fftProgs.gl, mapColor, heightMap.heightMapBuffer, heightViewBuffer);
    
    
    
    
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
    
    //var minHeight = meanHeight;
    var minHeight = meanHeight + stdHeight;
    
    return {
        heightMap: heightMap,
        heightViewBuffer: heightViewBuffer,
        heightBufferPixels: heightBufferPixels,
        minHeight: minHeight
    }
}

function generateGeometry(heightBufferPixels, minHeight, geometryScaling, N, triangles, normals, range) {
    var triangleIndex = 0;

    function unitVec(vec) {
        var mag = Math.sqrt(vec.x * vec.x + vec.y * vec.y + vec.z * vec.z);
        return {x: vec.x / mag, y: vec.y / mag, z: vec.z / mag};
    }
    
    function normal(p1x, p1y, p1z, p2x, p2y, p2z, p3x, p3y, p3z) {
        var cp = crossProduct(p2x - p1x, p2y - p1y, p2z - p1z, p3x - p1x, p3y - p1y, p3z - p1z);
        return unitVec(cp);
    }
    
    
    function crossProduct(v1x, v1y, v1z, v2x, v2y, v2z) {
        return { 
            x: v1y * v2z - v1z * v2y,
            y: v1z * v2x - v1x * v2z,
            z: v1x * v2y - v1y * v2x
        };
    }
    
    function pos(i) {return (2 * i / N - 1) * geometryScaling;}
    
    function scalingFunctionLinear(h) {
        return h;
    }
    
    function scalingFunctionSqrt(h) {
        return Math.sqrt(h);
    }
    function scalingFunctionPower(p) {
        return function(h) {
            if(h < 0)
                return -Math.pow(-h, p);
            else
                return Math.pow(h, p)
        };
    }
    /*
    function fallOff(i, j) {
        var x = 2 * i / N - 1;
        var y = 2 * j / N - 1;
        var r2 = x*x + y*y;
        return 3 * Math.pow(r2, 4);
    }
    */
    
    var scalingFunc = scalingFunctionPower(1.2);

    function height(i, j) {
        var index = (((i)%N) + ((j)%N) * N) * 4;
        var value = heightBufferPixels[index];
        return (scalingFunc(value - minHeight) /*- fallOff(i, j)*/) * geometryScaling;
    };
    
    function getNormal(i, j) {
        var p1x = pos(i);
        var p1y = pos(j);
        var p1z = height(i, j);
        
        var p2x = pos(i + 1);
        var p2y = pos(j);
        var p2z = height(i + 1, j);
        
        var p3x = pos(i);
        var p3y = pos(j + 1);
        var p3z = height(i, j + 1);
        
        var p4x = pos(i - 1);
        var p4y = pos(j);
        var p4z = height(i - 1, j);
        
        var p5x = pos(i);
        var p5y = pos(j - 1);
        var p5z = height(i, j - 1);
        
        var norm1 = normal(p1x, p1y, p1z, p2x, p2y, p2z, p3x, p3y, p3z);
        var norm2 = normal(p1x, p1y, p1z, p3x, p3y, p3z, p4x, p4y, p4z);
        var norm3 = normal(p1x, p1y, p1z, p4x, p4y, p4z, p5x, p5y, p5z);
        var norm4 = normal(p1x, p1y, p1z, p5x, p5y, p5z, p2x, p2y, p2z);
        
        return unitVec({
            x: (norm1.x + norm2.x + norm3.x + norm4.x) / 4,
            y: (norm1.y + norm2.y + norm3.y + norm4.y) / 4,
            z: (norm1.z + norm2.z + norm3.z + norm4.z) / 4
        });
            
    }
    
    function pushTriAndNormFlat(triangles, normals, p1x, p1y, p1z, p2x, p2y, p2z, p3x, p3y, p3z) {
        
        var norm = normal(p1x, p1y, p1z, p2x, p2y, p2z, p3x, p3y, p3z);
        
        
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
    /*
    function pushTriAndNormSmooth(triangles, normals, p1x, p1y, p1z, p2x, p2y, p2z, p3x, p3y, p3z, norm1, norm2, norm3) {
        if(p1z <= 0 && p2z <= 0 && p3z <= 0)
            return;
        
        triangles.push(p1x, p1y, p1z, p2x, p2y, p2z, p3x, p3y, p3z);
        var norm = normal(p1x, p1y, p1z, p2x, p2y, p2z, p3x, p3y, p3z);
        
        //Assume the triangle is flat:
        normals.push(norm1.x, norm1.y, norm1.z);
        normals.push(norm2.x, norm2.y, norm2.z);
        normals.push(norm3.x, norm3.y, norm3.z);
    }
    
    function pushTrisAndNormsSmooth(triangles, normals, p1x, p1y, p1z, p2x, p2y, p2z, p3x, p3y, p3z, p4x, p4y, p4z, norm1, norm2, norm3, norm4) {
        var p5x = (p1x + p2x + p3x + p4x) / 4;
        var p5y = (p1y + p2y + p3y + p4y) / 4;
        var p5z = (p1z + p2z + p3z + p4z) / 4;
        
        var norm5 = unitVec({
            x: (norm1.x + norm2.x + norm3.x + norm4.x) / 4,
            y: (norm1.y + norm2.y + norm3.y + norm4.y) / 4,
            z: (norm1.z + norm2.z + norm3.z + norm4.z) / 4
        });
        
        pushTriAndNormSmooth(
            triangles, normals, 
            p1x, p1y, p1z,
            p2x, p2y, p2z,
            p5x, p5y, p5z,
            norm1, norm2, norm5
        );
        pushTriAndNormSmooth(
            triangles, normals, 
            p2x, p2y, p2z,
            p3x, p3y, p3z,
            p5x, p5y, p5z,
            norm2, norm3, norm5
        );
        pushTriAndNormSmooth(
            triangles, normals, 
            p3x, p3y, p3z,
            p4x, p4y, p4z,
            p5x, p5y, p5z,
            norm3, norm4, norm5
        );
        pushTriAndNormSmooth(
            triangles, normals, 
            p4x, p4y, p4z,
            p1x, p1y, p1z,
            p5x, p5y, p5z,
            norm4, norm1, norm5
        );
        
    }
    */
    
    
    for(var i = range.colStart; i < range.colEnd; i++) {
        for(var j = range.rowStart; j < range.rowEnd; j++) {
            var p1z = height(i, j);
            var p2z = height(i + 1, j);
            var p3z = height(i + 1, j + 1);
            var p4z = height(i, j + 1);
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
    var TR = 2 * (N / 1024); //Texture repeat. 
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

function getFloor(size) {
    var TR = 2; //Texture repeat. 
    //The "floor"
    var floorTris = [];
    var floorNormals = [];
    var floorTextureCoords = [];
    floorTris.push(-size, -size, 0, -size, size, 0, size, -size, 0);
    floorNormals.push(0, 0, 1, 0, 0, 1, 0, 0, 1);
    floorTextureCoords.push(0, 0, 0, TR, TR, 0);
    floorTris.push(-size, size, 0, size, size, 0, size, -size, 0);
    floorNormals.push(0, 0, 1, 0, 0, 1, 0, 0, 1);
    floorTextureCoords.push(0, TR, TR, TR, TR, 0);
    
    
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
        floorTrisBuffer: floorTrisBuffer,
        floorNormsBuffer: floorNormsBuffer,
        floorTexCoordsBuffer: floorTexCoordsBuffer,
        numFloorTris: 2,
    }
}

function getShadowBuffer(size) {
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

function getMapViewBuffer(size, ratio) {
    var width = size;
    var height = Math.floor(size * ratio);
    
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
    
    return buffer;
}

function drawShadows(buffer, features, offsetX, offsetY) {
    
    gl.bindFramebuffer(gl.FRAMEBUFFER, buffer.frameBuffer);
    gl.viewport(0, 0, buffer.width, buffer.height);
    
    gl.enable(gl.DEPTH_TEST);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    for(var i = 0; i < features.length; i++) {
        var worldMatrix = makeTranslation(offsetX, offsetY, 0);

        drawTriangles(gl, features[i].trianglesVertexBuffer, features[i].normalsVertexBuffer, features[i].numTriangles, worldMatrix, lightViewMatrix, [.5,.5,.25,1], [.5,.5,.25,1], lightDir, 0.2);
        drawTriangles(gl, features[i].floorTrisBuffer, features[i].floorNormsBuffer, features[i].numFloorTris, worldMatrix, lightViewMatrix, [.5,.5,.25,1], [.5,.5,.25,1], lightDir, 0.3);
    
    }
}

function drawOntoBuffer(feature, buffer, shadowBuffer) {
    

    
    
    var screenRatio = buffer.width / buffer.height;
    
    var cameraAngle = Math.acos(1 / screenRatio);
    //Camera rotates:
    var cameraMatrix = multiplyManyMatrices([
        makeScale(1, screenRatio, .25),
        makeXRotation(Math.PI + cameraAngle)
        //, //Bird's eye view
    ]);
        
    //for(var i = 0; i < features.length; i++) {
        //drawShadows(shadowBuffer, features, -features[i].x, -features[i].y);
    
        gl.bindFramebuffer(gl.FRAMEBUFFER, buffer.frameBuffer);
        gl.viewport(0, 0, buffer.width, buffer.height);
        gl.enable(gl.DEPTH_TEST);


        var translateMat = makeTranslation(-feature.x, -feature.y, 0);
        var worldMatrixMap = makeTranslation(0, 0 /*2 * y*/, 0);
        drawTrianglesShadow(gl, feature.trianglesVertexBuffer, feature.normalsVertexBuffer, feature.numTriangles, 
            shadowBuffer.depthTexture, 
            worldMatrixMap, cameraMatrix, multiplyManyMatrices([lightViewMatrix, translateMat]), 
            feature.color, feature.color,
            lightDir, 0.3);

        drawTrianglesTextureShadow(gl, feature.floorTrisBuffer, feature.floorNormsBuffer, feature.floorTexCoordsBuffer, feature.numFloorTris, 
            testSand.texture, shadowBuffer.depthTexture, 
            worldMatrixMap, cameraMatrix, multiplyManyMatrices([lightViewMatrix, translateMat]), 
            lightDir, 0.3);
    //}
}


function makeSandTexture(size, scale, scaleSpeckle, speckleDiff, green, blue) {
    var buffer1 = largeNoise(graphicsPrograms, fftProgs, size);
    var buffer3 = fft.makeComputeBuffer(gl, size, size);
    var buffer4 = fft.makeComputeBuffer(gl, size, size);
    var textureOut = glUtils.makeTexture(gl, size, size, gl.NEAREST, gl.REPEAT, null);
    var bufferOut = glUtils.makeFrameBufferTexture(gl, textureOut);
    
    var shapeNoise = fft.buildCustomProgram(fftProgs.gl, `
        if(a.x < u_2)
            a.x -= u_3;
        b = a * u_1;
        `
    );

    fft.runCustomProgram(fftProgs.gl, shapeNoise, buffer1, buffer3, scale, scaleSpeckle, speckleDiff);
    
    var mapColor = fft.buildCustomProgram(fftProgs.gl, `
        float val = (a.x + 1.0) / 2.0;
        b = vec4(val * u_1, val * u_2, val * u_3, 1.0);
        `
    );
    
    fft.runCustomProgram(fftProgs.gl, mapColor, buffer3, bufferOut, 1, green, blue);
    
    return textureOut;
}


var sandscale = 0.0375;
var sandcalespeckle = -1.2;
var speckleDiff = 1.5;
var sandgreen = .95;
var sandblue = .48;
var testSand = makeSandTexture(1024, sandscale, sandcalespeckle, speckleDiff, sandgreen, sandblue);



var lightAzimuth = 13 * Math.PI / 8;
//var lightElevation = Math.PI / 6;
var lightElevation = Math.PI / 3;

var lightDir = [Math.sin(lightAzimuth) * Math.cos(lightElevation), Math.cos(lightAzimuth) * Math.cos(lightElevation), Math.sin(lightElevation)];
var lightViewMatrix = multiplyManyMatrices([makeScale(1,1,.25), makeXRotation(Math.PI + (Math.PI/2 - lightElevation)), makeZRotation(lightAzimuth)]);



var mapSize = 2048;
var chunkSize = 256;
var numChunks = 5;
var scaling = mapSize / (chunkSize * numChunks);




var info = genHeightMapInfo(graphicsPrograms, fftProgs, mapSize);
//For each point in the heightmap there are 4 triangles. Each has 3 points, and each point has 3 numbers (x,y,z):
var trianglesTempBuffer = new Float32Array(chunkSize * chunkSize * 4 * 3 * 3);
var normalsTempBuffer = new Float32Array(chunkSize * chunkSize * 4 * 3 * 3);

var mapBuffer = getMapViewBuffer(3000, 6 / 8);
gl.bindFramebuffer(gl.FRAMEBUFFER, mapBuffer.frameBuffer);
gl.viewport(0, 0, mapBuffer.width, mapBuffer.height);
gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);


var miniMapBuffer = getMapViewBuffer(250, 1);
gl.bindFramebuffer(gl.FRAMEBUFFER, miniMapBuffer.frameBuffer);
gl.viewport(0, 0, mapBuffer.width, miniMapBuffer.height);
gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

var shadowBuffer = getShadowBuffer(2048);

for(var col = 0; col < numChunks; col++) {
    for(var row = 0; row < numChunks + 1; row++) {
        var features = [];
        var toDraw;
        //Because of the way the shadows work, we need the col to the left and the row below:

        for(var i = col - 1; i <= col; i++) {
            for(var j = row; j <= row + 1; j++) {
                var start = (mapSize - numChunks * chunkSize) / 2;
                var range = {
                    colStart: start + i * chunkSize, colEnd: start + (i + 1) * chunkSize, 
                    rowStart: start + j * chunkSize, rowEnd: start + (j + 1) * chunkSize
                };
                var newFeature = generateGeometry(info.heightBufferPixels, info.minHeight, scaling, mapSize, trianglesTempBuffer, normalsTempBuffer, range);
                newFeature.x = (range.colEnd + range.colStart) / mapSize - 1;
                newFeature.y = (range.rowEnd + range.rowStart) / mapSize - 1;
                newFeature.color = [.5,.5,.25, 1];
                features.push(newFeature);
                if(i == col && j == row)
                    toDraw = newFeature;
            }
        }
        drawShadows(shadowBuffer, features, -toDraw.x, -toDraw.y);
        drawOntoBuffer(toDraw, mapBuffer, shadowBuffer);
        drawOntoBuffer(toDraw, miniMapBuffer, shadowBuffer);
        console.log(row, col);
    }
}

//drawOntoBuffer(features, mapBuffer, shadowBuffer);





//Note: All matrices are in column major order
function makeTranslation(tx, ty, tz) {
    return [
        1,  0,  0,  0,
        0,  1,  0,  0,
        0,  0,  1,  0,
        tx, ty, tz, 1
    ];
}
    
function makeXRotation(angleInRadians) {
    var c = Math.cos(angleInRadians);
    var s = Math.sin(angleInRadians);

    return [
        1, 0, 0, 0,
        0, c, s, 0,
        0, -s, c, 0,
        0, 0, 0, 1
    ];
};

function makeYRotation(angleInRadians) {
    var c = Math.cos(angleInRadians);
    var s = Math.sin(angleInRadians);

    return [
        c, 0, -s, 0,
        0, 1, 0, 0,
        s, 0, c, 0,
        0, 0, 0, 1
    ];
};

function makeZRotation(angleInRadians) {
    var c = Math.cos(angleInRadians);
    var s = Math.sin(angleInRadians);

    return [
        c, s, 0, 0,
        -s, c, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1,
    ];
}

function makeScale(sx, sy, sz) {
    return [
        sx, 0, 0, 0,
        0, sy, 0, 0,
        0, 0, sz, 0,
        0, 0, 0,  1
    ];
}


function multiplyMatrices(b, a) {
    //Note the order of the inputs. This is because they are in column major order
    return [
        a[0] *b[0] + a[1] *b[4] + a[2] *b[8]  + a[3] *b[12], a[0] *b[1] + a[1] *b[5] + a[2] *b[9] + a[3] *b[13], a[0] *b[2] + a[1] *b[6] + a[2] *b[10] + a[3] *b[14], a[0] *b[3] + a[1] *b[7] + a[2] *b[11] + a[3] *b[15],
        a[4] *b[0] + a[5] *b[4] + a[6] *b[8]  + a[7] *b[12], a[4] *b[1] + a[5] *b[5] + a[6] *b[9] + a[7] *b[13], a[4] *b[2] + a[5] *b[6] + a[6] *b[10] + a[7] *b[14], a[4] *b[3] + a[5] *b[7] + a[6] *b[11] + a[7] *b[15],
        a[8] *b[0] + a[9] *b[4] + a[10]*b[8]  + a[11]*b[12], a[8] *b[1] + a[9] *b[5] + a[10]*b[9] + a[11]*b[13], a[8] *b[2] + a[9] *b[6] + a[10]*b[10] + a[11]*b[14], a[8] *b[3] + a[9] *b[7] + a[10]*b[11] + a[11]*b[15],
        a[12]*b[0] + a[13]*b[4] + a[14]*b[8]  + a[15]*b[12], a[12]*b[1] + a[13]*b[5] + a[14]*b[9] + a[15]*b[13], a[12]*b[2] + a[13]*b[6] + a[14]*b[10] + a[15]*b[14], a[12]*b[3] + a[13]*b[7] + a[14]*b[11] + a[15]*b[15],
    ]
}

function multiplyManyMatrices(mats) {
    var m = mats[0];
    for(var i = 1; i < mats.length; i++)
        m = multiplyMatrices(m, mats[i]);
    return m;
}

var offsetX = 0;
var offsetY = 0;
var zRotate = 0;
var zoom = 1;

function onKeyDown(args) {
    
    function redoTexture() {
        console.log([sandscale, sandcalespeckle, speckleDiff, sandgreen, sandblue]);
        testSand = makeSandTexture(1024, sandscale, sandcalespeckle, speckleDiff, sandgreen, sandblue);
        
    }
    
    switch(args.keyCode) {
        case KeyCodeEnum.LEFT:
            offsetX += 50;
            break;
        case KeyCodeEnum.RIGHT:
            offsetX -= 50;
            break;
        case KeyCodeEnum.UP:
            offsetY -= 50;
            break;
        case KeyCodeEnum.DOWN:
            offsetY += 50;
            break;
            
            
        
        
    }
    requestAnimationFrame(frame);
    
    
}

document.onkeydown = onKeyDown;
        

function frame(timestamp) {
    
    graphicsPrograms.gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    
    graphicsPrograms.gl.disable(gl.BLEND);
    graphicsPrograms.gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    graphicsPrograms.gl.viewport(screen.left, screen.bottom, screen.right - screen.left, screen.top - screen.bottom);
    
    graphicsPrograms.gl.scissor(screen.left, screen.bottom, screen.right - screen.left, screen.top - screen.bottom);
    graphicsPrograms.gl.enable(graphicsPrograms.gl.SCISSOR_TEST);
    gl.disable(gl.DEPTH_TEST);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    
    graphicsPrograms.resolution = {width: gl.drawingBufferWidth, height: gl.drawingBufferHeight};
    

    graphics.drawBox(graphicsPrograms, 
        screen.left, screen.bottom, screen.right - screen.left, screen.top - screen.bottom, 
        [.25,.75,.75,1]);
    
    graphics.drawSprite(graphicsPrograms, 
        0, 0, mapBuffer.width, mapBuffer.height, 
        offsetX, offsetY, mapBuffer.width, mapBuffer.height, 
        mapBuffer, 
        [1,1,1,1]);

    graphics.drawBox(graphicsPrograms, 
        0, screen.top - miniMapBuffer.height - 1, miniMapBuffer.width + 1, screen.top, 
        [0,0,0,1]);

    graphics.drawSprite(graphicsPrograms, 
        0, 0, miniMapBuffer.width, miniMapBuffer.height, 
        0, screen.top - miniMapBuffer.height, miniMapBuffer.width, miniMapBuffer.height, 
        miniMapBuffer, 
        [1,1,1,1]);

    
    /*
    graphics.drawSprite(graphicsPrograms, 
        0, 0, testSand.width, testSand.height, 
        0, 0, testSand.width, testSand.height, 
        testSand, 
        [1,1,1,1]);
    */
    /*
    graphics.drawSprite(graphicsPrograms, 
        0, 0, features[0].shadows.frameBuffer.width, features[0].shadows.frameBuffer.height, 
        0, 0, features[0].shadows.frameBuffer.width / 8, features[0].shadows.frameBuffer.height / 8, 
        //{texture: testShadows.depthTexture, width: testShadows.frameBuffer.width, height: testShadows.frameBuffer.height},
        features[0].shadows.frameBuffer,
        [1,1,1,1]);
    //*/
    /*
    graphics.drawSprite(graphicsPrograms, 
        0, 0, testMap.heightViewBuffer.width, testMap.heightViewBuffer.height, 
        0, 0, testMap.heightViewBuffer.width, testMap.heightViewBuffer.height, 
        testMap.heightViewBuffer, 
        [1,1,1,1]);
    //*/
    /*
    gl.enable(gl.DEPTH_TEST);
    
    var screenRatio = (screen.right - screen.left) / (screen.top - screen.bottom);
    
    //Camera rotates:
    var cameraMatrix = multiplyManyMatrices([
        makeScale(1, screenRatio, .25),
        //makeXRotation(Math.PI + Math.PI / 4),
        makeXRotation(Math.PI + 0.848062079), // 6/8th view
        //makeXRotation(Math.PI), //Bird's eye view
        makeScale(zoom,zoom,zoom), 
        makeZRotation(zRotate), 
        makeTranslation(offsetX, offsetY, 0), 
    ]);
        
    for(var i = 0; i < features.length; i++) {
        var translateMat = makeTranslation(-features[i].x, -features[i].y, 0);
        var worldMatrixMap = makeScale(1, 1, 1);
        drawTrianglesShadow(gl, features[i].trianglesVertexBuffer, features[i].normalsVertexBuffer, features[i].numTriangles, 
            features[i].shadows.depthTexture, 
            worldMatrixMap, cameraMatrix, multiplyManyMatrices([lightViewMatrix, translateMat]), 
            features[i].color, features[i].color,
            lightDir, 0.3);
        
        drawTrianglesTextureShadow(gl, features[i].floorTrisBuffer, features[i].floorNormsBuffer, features[i].floorTexCoordsBuffer, features[i].numFloorTris, 
            testSand.texture, features[i].shadows.depthTexture, 
            worldMatrixMap, cameraMatrix, multiplyManyMatrices([lightViewMatrix, translateMat]), 
            lightDir, 0.3);
    }
    */
}



requestAnimationFrame(frame);


