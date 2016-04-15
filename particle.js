"use strict";

var WIND_X = .1;
var WIND_Y = .02;
var WIND_Z_FACTOR = .02;
var FIELD_V = 115; 


var GLARE_MAX_TIME = 30;
var GLARE_RAMP_TIME = 10;
var GLARE_PEAK = .5;


var TIME_PERIOD_SMALL = 100;
var TIME_PERIOD_LARGE = 400;



var Particle = {};

Particle.ExpTypes = {
    SHELL       : 0,
    LARGE_SHELL : 1,
    SMALL       : 2,
    MEDIUM      : 3,
};




Particle.ExpInfo = [];
Particle.ExpInfo[Particle.ExpTypes.SHELL] = {
    IS_LARGE            : false  ,
    V_INIT              :   3    ,
    V_REDUCE            :   0.4  ,
    TIME_SCALE          :   5    ,
    TIME_START_SCALE    : 100    ,
    TIME_START_INIT     : -37.5  ,
    VORTEX_U_INIT       :   0.4  ,
    VORTEX_U_DRAG       :   0.99 ,
    VORTEX_SPEED_INIT   :   0.5  ,
    VORTEX_DRAG         :   0.998,
    VORTEX_RADIUS       :   5    ,
    GLARE_SIZE          :   5    ,
    W                   :  32    ,
    H                   :  32    ,
};

Particle.ExpInfo[Particle.ExpTypes.LARGE_SHELL] = {
    IS_LARGE            : false  ,
    V_INIT              :   3    ,
    V_REDUCE            :   0.65 ,
    TIME_SCALE          :   3    ,
    TIME_START_SCALE    : 150    ,
    TIME_START_INIT     : -37.5  ,
    VORTEX_U_INIT       :   0.3  ,
    VORTEX_U_DRAG       :   0.995,
    VORTEX_SPEED_INIT   :   0.5  ,
    VORTEX_DRAG         :   0.998,
    VORTEX_RADIUS       :   7    ,
    GLARE_SIZE          :   5    ,
    W                   :  32    ,
    H                   :  32    ,
};


Particle.ExpInfo[Particle.ExpTypes.SMALL] = {
    IS_LARGE            : true   ,
    V_INIT              :   5    ,
    V_REDUCE            :   0.75 ,
    TIME_SCALE          :   1.2  ,
    TIME_START_SCALE    : 150    ,
    TIME_START_INIT     : -37.5  ,
    VORTEX_U_INIT       :   0.6  ,
    VORTEX_U_DRAG       :   0.996,
    VORTEX_SPEED_INIT   :   0.8  ,
    VORTEX_DRAG         :   0.998,
    VORTEX_RADIUS       :  20    ,
    GLARE_SIZE          :  40    ,
    W                   : 128    ,
    H                   : 128    ,
};

Particle.ExpInfo[Particle.ExpTypes.MEDIUM] = {
    IS_LARGE            : true   ,
    V_INIT              :   7    ,
    V_REDUCE            :   0.75 ,
    TIME_SCALE          :   0.8  ,
    TIME_START_SCALE    : 150    ,
    TIME_START_INIT     : -37.5  ,
    VORTEX_U_INIT       :   0.8  ,
    VORTEX_U_DRAG       :   0.996,
    VORTEX_SPEED_INIT   :   1.0  ,
    VORTEX_DRAG         :   0.999,
    VORTEX_RADIUS       :  30    ,
    GLARE_SIZE          :  50    ,
    W                   : 128    ,
    H                   : 256    ,
};



Particle.getPrograms = function(gl) {
    var particleProgs = {};
    
    particleProgs.unitRectBuffer = glUtils.generateSimpleUnitRectangleBuffer(gl);
    
    particleProgs.particleUpdateProgramInfo = glUtils.makeProgram(
        gl, particleUpdateVertexSource, particleUpdateFragmentSource, 
        ["a_position"], 
        []
    );

    particleProgs.curlProgramInfo = glUtils.makeProgram(
        gl, particleUpdateVertexSource, curlFragmentSource, 
        ["a_position"], 
        []
    );

    particleProgs.particleProgramInfo = glUtils.makeProgram(
        gl, particleVertexSource, particleFragmentSource, 
        ["a_index"], 
        []
    );

    particleProgs.glareProgramInfo = glUtils.makeProgram(
        gl, glareVertexSource, glareFragmentSource, 
        ["a_position"], 
        []
    );
    
    particleProgs.gl = gl;
    
    return particleProgs;
}


Particle.updateParticles = function(particleProgs, explosion, forwards, velocityTexture1, velocityTexture2, velocityTexture3, t, velocityTransformMatrix) {    
    
    var inputPositionTexture = forwards ? explosion.positionTexture1 : explosion.positionTexture2;
    var outputBuffer = forwards ? explosion.positionBuffer2 : explosion.positionBuffer1;
    
    var programInfo = particleProgs.particleUpdateProgramInfo;
    var gl = particleProgs.gl;
	gl.useProgram(programInfo.program);
    
    gl.bindFramebuffer(gl.FRAMEBUFFER, outputBuffer.frameBuffer);
    gl.viewport(0, 0, outputBuffer.width, outputBuffer.height); 
    
	gl.bindBuffer(gl.ARRAY_BUFFER, particleProgs.unitRectBuffer);
	gl.vertexAttribPointer(programInfo.attribsUniforms.a_position, 2, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(programInfo.attribsUniforms.a_position);

    gl.activeTexture(gl.TEXTURE0); 
	gl.bindTexture(gl.TEXTURE_2D, inputPositionTexture.texture);
	programInfo.setters.u_inputPosition(0);

    gl.activeTexture(gl.TEXTURE1); 
	gl.bindTexture(gl.TEXTURE_2D, explosion.velocityTexture.texture);
	programInfo.setters.u_inputVelocity(1);

    gl.activeTexture(gl.TEXTURE2); 
	gl.bindTexture(gl.TEXTURE_2D, velocityTexture1.texture);
	programInfo.setters.u_velocityField1(2);

    gl.activeTexture(gl.TEXTURE3); 
	gl.bindTexture(gl.TEXTURE_2D, velocityTexture2.texture);
	programInfo.setters.u_velocityField2(3);
    
    gl.activeTexture(gl.TEXTURE4); 
	gl.bindTexture(gl.TEXTURE_2D, velocityTexture3.texture);
	programInfo.setters.u_velocityField3(4);
        
	programInfo.setters.u_t(t);

	programInfo.setters.u_wind([WIND_X, WIND_Y, WIND_Z_FACTOR]);
    
    programInfo.setters.u_vortexCenter(explosion.center);
    programInfo.setters.u_vortexSpeed(explosion.vortexU);
    programInfo.setters.u_vortexRadius(explosion.vortexRadius);
        
    programInfo.setters.u_velocityTransformMatrix(velocityTransformMatrix);

    programInfo.setters.u_speedReduceFactor(Math.log(explosion.vReduce));

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}











Particle.curl = function(particleProgs, inputTexture, dx, outputBuffer) {
    var programInfo = particleProgs.curlProgramInfo;
    var gl = particleProgs.gl;
	gl.useProgram(programInfo.program);
    
    gl.bindFramebuffer(gl.FRAMEBUFFER, outputBuffer.frameBuffer);
    gl.viewport(0, 0, outputBuffer.width, outputBuffer.height); 
    
	gl.bindBuffer(gl.ARRAY_BUFFER, particleProgs.unitRectBuffer);
	gl.vertexAttribPointer(programInfo.attribsUniforms.a_position, 2, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(programInfo.attribsUniforms.a_position);

    gl.activeTexture(gl.TEXTURE0); 
	gl.bindTexture(gl.TEXTURE_2D, inputTexture.texture);
	programInfo.setters.u_input(0);

    programInfo.setters.u_dx(dx);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}









Particle.drawParticles = function(particleProgs, indexBuffer, positionTexture, num, transformMatrix, color) {
    var programInfo = particleProgs.particleProgramInfo;
    var gl = particleProgs.gl;
    
	gl.useProgram(programInfo.program);

	gl.bindBuffer(gl.ARRAY_BUFFER, indexBuffer);
	gl.vertexAttribPointer(programInfo.attribsUniforms.a_index, 2, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(programInfo.attribsUniforms.a_index);

    gl.activeTexture(gl.TEXTURE0); 
	gl.bindTexture(gl.TEXTURE_2D, positionTexture.texture);
	programInfo.setters.u_inputPosition(0);
	
	
    programInfo.setters.u_matrix(transformMatrix);
	
	gl.drawArrays(gl.POINTS, 0, num);
}










Particle.drawGlare = function(particleProgs, position, size, color, transformMatrix) {
    var programInfo = particleProgs.glareProgramInfo;
    var gl = particleProgs.gl;
    
	gl.useProgram(programInfo.program);

	gl.vertexAttribPointer(programInfo.attribsUniforms.a_position, 3, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(programInfo.attribsUniforms.a_position);

    programInfo.setters.u_matrix(transformMatrix);
    programInfo.setters.u_position(position);
    programInfo.setters.u_size(size);
    programInfo.setters.u_color(color);
	
	gl.drawArrays(gl.POINTS, 0, 1);
}

Particle.genPotentialMap = function(graphicsPrograms, computeProgs, stages, scale, reduceFactor) {
    const N = 1 << stages;
    
    var buffer1    = Compute.makeComputeBuffer(computeProgs.gl, N, N);
    var buffer2    = Compute.makeComputeBuffer(computeProgs.gl, N, N);
    var tempBuffer = Compute.makeComputeBuffer(computeProgs.gl, N, N);
            
    Compute.gaussianNoise(computeProgs, Math.floor(Math.random() * 65535), 1, buffer1);

    var shapeNoise = Compute.buildCustomProgram(computeProgs.gl, `
        float kMag = length(k);
        float mag;
        if(kMag < 0.005) { //Sets the feature length scale
            mag = 0.0;
        } else {
            mag = (.00004)/ pow(kMag, 2.0);
        }  
        b = a * mag;
        `
    );

    Compute.runCustomProgram(computeProgs.gl, shapeNoise, buffer1, buffer2);
    
    var fftPlan = Compute.makePlan(computeProgs, stages, Compute.FFT_DIRECTIONS.BACKWARD, N);
    
    //Buffer 1 will get the output
    Compute.computeFft(computeProgs, fftPlan, buffer2, buffer1, tempBuffer);
    
    var bufferOutTexture = glUtils.makeTextureGeneric(gl, N, N, gl.FLOAT, gl.LINEAR, gl.REPEAT, null);
    var bufferOut = glUtils.makeFrameBufferTexture(gl, bufferOutTexture);
    
    //Discard the imaginary part of the output (buffer 2) and overwrite it:
    Compute.scale(computeProgs, scale, buffer1, bufferOut);
    
    return bufferOut;
}


Particle.makeExplosion = function(position, velocityBias, expType, explosionStore) {
    var expInfo = Particle.ExpInfo[expType];
    
    var explosion = {};

    var positionData = [];
    var velocityData = [];
    explosion.center = [position.x * SUB_TILE_WIDTH, position.y * SUB_TILE_WIDTH, position.z * SUB_TILE_WIDTH];
    var w = expInfo.W;
    var h = expInfo.H;
    for(var i = 0; i < w * h; i++) {
        do{
            var vx = (2 * Math.random() - 1) * expInfo.V_INIT;
            var vy = (2 * Math.random() - 1) * expInfo.V_INIT;
            var vz = (2 * Math.random() - 1) * expInfo.V_INIT;
            var v = Math.sqrt(vx * vx + vy * vy + vz * vz);
        } while(v >= expInfo.V_INIT);
    
        positionData.push(position.x * SUB_TILE_WIDTH);
        positionData.push(position.y * SUB_TILE_WIDTH);
        positionData.push(position.z * SUB_TILE_WIDTH);
        var tStart = expInfo.TIME_START_SCALE * Math.max(v / expInfo.V_INIT, .2) + expInfo.TIME_START_INIT;
        positionData.push(tStart); //Time

        //Multiply the initial velocity so that when it's computed in the shader it gives the value we want:
        var vFactor = Math.exp(-tStart * Math.log(expInfo.V_REDUCE) / expInfo.TIME_SCALE)
        velocityData.push((vx + velocityBias.x) * vFactor);
        velocityData.push((vy + velocityBias.y) * vFactor);
        velocityData.push((vz + velocityBias.z) * vFactor);
        velocityData.push(expInfo.TIME_SCALE);
    
    }
    explosion.center[0] += -velocityBias.x / Math.log(expInfo.V_REDUCE);
    explosion.center[1] += -velocityBias.y / Math.log(expInfo.V_REDUCE);
    explosion.center[2] += -velocityBias.z / Math.log(expInfo.V_REDUCE);

    var gl = explosionStore.gl;
    explosion.positionTexture1 = glUtils.makeTextureGeneric(gl, w, h, gl.FLOAT, gl.NEAREST, gl.CLAMP_TO_EDGE, new Float32Array(positionData));
    explosion.positionBuffer1 = glUtils.makeFrameBufferTexture(gl, explosion.positionTexture1);

    explosion.positionTexture2 = glUtils.makeTextureGeneric(gl, w, h, gl.FLOAT, gl.NEAREST, gl.CLAMP_TO_EDGE, new Float32Array(positionData));
    explosion.positionBuffer2 = glUtils.makeFrameBufferTexture(gl, explosion.positionTexture2);

    explosion.velocityTexture = glUtils.makeTextureGeneric(gl, w, h, gl.FLOAT, gl.NEAREST, gl.CLAMP_TO_EDGE, new Float32Array(velocityData));
    explosion.velocityBuffer = glUtils.makeFrameBufferTexture(gl, explosion.velocityTexture);

    explosion.vortexSpeed = expInfo.VORTEX_SPEED_INIT;
    explosion.vortexU = expInfo.VORTEX_U_INIT;
    explosion.vReduce = expInfo.V_REDUCE;
    explosion.vortexRadius = expInfo.VORTEX_RADIUS;
    
    explosion.glare = 1.0;
    explosion.glareSize = expInfo.GLARE_SIZE;
    
    
    explosion.time = 0;
    explosion.maxTime = (650 - expInfo.TIME_START_INIT) / expInfo.TIME_SCALE;
    explosion.expType = expType;
    
    explosionStore.explosions.push(explosion);
    explosionStore.explosions.sort(function(a, b) {
        return b.center[1] - a.center[1];
    });
}


Particle.getExplosionStore = function(particleProgs, graphicsPrograms, computeProgs) {
    var gl = particleProgs.gl;
    
    var expStore = {};
    expStore.gl = gl;
    expStore.explosions = [];
    expStore.dir = true;
    expStore.timeLarge = 0;
    expStore.timeDirLarge = 1;
    expStore.timeSmall = 0;
    expStore.timeDirSmall = 1;
    
    
    
    //This can be made constant for every explosion of the same size:
    expStore.indexBuffers = [];
    for(var j = 0; j < Particle.ExpInfo.length; j++) {
        var w = Particle.ExpInfo[j].W;
        var h = Particle.ExpInfo[j].H;
    
        var indexArray = new Float32Array(w * h * 2);
        for(var i = 0; i < w * h; i++) {
            var indexX = i % w;
            var indexY = Math.floor(i / w);
            indexArray[i * 2]     = indexX / w;
            indexArray[i * 2 + 1] = indexY / h;
        }

        var indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, indexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, indexArray, gl.STATIC_DRAW);
        expStore.indexBuffers[j] = indexBuffer;
    }
    
    
    
    
    
    
    
    
    
    var v_stages = 9;

    var v_width = 1 << v_stages;
    var v_height = 1 << v_stages;

    

    expStore.velocityFieldTexture1 = glUtils.makeTextureGeneric(gl, v_width, v_height, gl.FLOAT, gl.LINEAR, gl.REPEAT, null);
    var velocityFieldBuffer1 = glUtils.makeFrameBufferTexture(gl, expStore.velocityFieldTexture1);

    expStore.velocityFieldTexture2 = glUtils.makeTextureGeneric(gl, v_width, v_height, gl.FLOAT, gl.LINEAR, gl.REPEAT, null);
    var velocityFieldBuffer2 = glUtils.makeFrameBufferTexture(gl, expStore.velocityFieldTexture2);

    expStore.velocityFieldTexture3 = glUtils.makeTextureGeneric(gl, v_width, v_height, gl.FLOAT, gl.LINEAR, gl.REPEAT, null);
    var velocityFieldBuffer3 = glUtils.makeFrameBufferTexture(gl, expStore.velocityFieldTexture3);

    var potential = Particle.genPotentialMap(graphicsPrograms, computeProgs, v_stages, FIELD_V);
    Particle.curl(particleProgs, potential, .001, velocityFieldBuffer1)

    var potential = Particle.genPotentialMap(graphicsPrograms, computeProgs, v_stages, FIELD_V);
    Particle.curl(particleProgs, potential, .001, velocityFieldBuffer2)

    var potential = Particle.genPotentialMap(graphicsPrograms, computeProgs, v_stages, FIELD_V);
    Particle.curl(particleProgs, potential, .001, velocityFieldBuffer3)

    expStore.transformVelocityMatrix = Matrix.multiplyManyMatrices([Matrix.makeTranslation(0, 0, 0), Matrix.makeScale(1/v_width, 1/v_height, 1)]);
    
    
    
    return expStore;
}


Particle.updateExplosions = function(particleProgs, explosionStore) {
    var explosions = explosionStore.explosions;
    explosionStore.timeLarge += explosionStore.timeDirLarge;
    if(explosionStore.timeLarge >= TIME_PERIOD_LARGE)
        explosionStore.timeDirLarge = -1;
    if(explosionStore.timeLarge <= 0)
        explosionStore.timeDirLarge = 1;

    explosionStore.timeSmall += explosionStore.timeDirSmall;
    if(explosionStore.timeSmall >= TIME_PERIOD_SMALL)
        explosionStore.timeDirSmall = -1;
    if(explosionStore.timeSmall <= 0)
        explosionStore.timeDirSmall = 1;
    
    
    explosionStore.dir = !explosionStore.dir;
    
    for(var i = 0; i < explosions.length; i++) {
        var expInfo = Particle.ExpInfo[explosions[i].expType];
    
        explosions[i].time++;
        explosions[i].vortexSpeed *= expInfo.VORTEX_DRAG;
        explosions[i].vortexU *= expInfo.VORTEX_U_DRAG;
        explosions[i].center[0] += WIND_X * WIND_Z_FACTOR * explosions[i].center[2];
        explosions[i].center[1] += WIND_Y * WIND_Z_FACTOR * explosions[i].center[2];
        explosions[i].center[2] += explosions[i].vortexSpeed;
    
        var t = expInfo.IS_LARGE ? explosionStore.timeLarge / TIME_PERIOD_LARGE : explosionStore.timeSmall / TIME_PERIOD_SMALL;
    
        Particle.updateParticles(
            particleProgs, 
            explosions[i], 
            explosionStore.dir, 
            explosionStore.velocityFieldTexture1, 
            explosionStore.velocityFieldTexture2, 
            explosionStore.velocityFieldTexture3, 
            t, 
            explosionStore.transformVelocityMatrix);
        
        if(explosions[i].time > explosions[i].maxTime) {
            explosions.splice(i, 1);
            i--;
        }
    }
    
    particleProgs.gl.bindFramebuffer(particleProgs.gl.FRAMEBUFFER, null);
    
}

Particle.drawExplosions = function(particleProgs, graphicsPrograms, view, explosionStore) {
    var screenRatio = SUB_TILE_WIDTH / SUB_TILE_HEIGHT;
    var cameraAngle = Math.acos(1 / screenRatio);
    
    var screenWidthInTiles = graphicsPrograms.resolution.width / SUB_TILE_WIDTH;
    var screenHeightInTiles = graphicsPrograms.resolution.height / SUB_TILE_WIDTH;
    
    var expSpaceToTileSpaceTransform = Matrix.multiplyManyMatrices(
        [
            Matrix.makeScale(1 / SUB_TILE_WIDTH, 1 / SUB_TILE_WIDTH, 1 / SUB_TILE_WIDTH),
            Matrix.makeScale(1, 1, -1),
        ]
    );

    var transformMatrix = Matrix.multiplyManyMatrices(
        [
         //Convert to pixel space units
         Matrix.makeTranslation(-1, -1, 0),  
         Matrix.makeScale(2 / screenWidthInTiles, 2 / screenHeightInTiles, .001), 
            
         //Camera angle and offset:
         Matrix.makeXRotation(cameraAngle),
         Matrix.makeTranslation(-view.xOffset, -view.yOffset, 0), //These offsets are in tile units
    
         expSpaceToTileSpaceTransform
        ]
    );
    
    
    var explosions = explosionStore.explosions;
    for(var i = 0; i < explosions.length; i++) {
        Particle.drawParticles(
            particleProgs, 
            explosionStore.indexBuffers[explosions[i].expType], 
            explosionStore.dir ? explosions[i].positionTexture2 : explosions[i].positionTexture1, 
            Particle.ExpInfo[explosions[i].expType].W * Particle.ExpInfo[explosions[i].expType].H, 
            transformMatrix, [1,1,1,1]);
        
		var glare;
		if(explosions[i].time < GLARE_RAMP_TIME) {
			glare = GLARE_PEAK * explosions[i].time / GLARE_RAMP_TIME;
		} else {
			glare = GLARE_PEAK * (1 - (explosions[i].time - GLARE_RAMP_TIME) / (GLARE_MAX_TIME - GLARE_RAMP_TIME));
		}
		
        Particle.drawGlare(particleProgs, explosions[i].center, explosions[i].glareSize, [1,1,1,glare], transformMatrix);
    }
}
