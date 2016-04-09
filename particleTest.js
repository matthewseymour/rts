//Matthew Seymour, matthew dot seymour at gmail.com

"use strict";

var height = document.body.offsetHeight;
var width = document.body.offsetWidth;



var WIND_X = .1;
var WIND_Y = .02;
var WIND_Z_FACTOR = .02;




var V_INIT = 5;
var V_REDUCE = .75;
var FIELD_V = 115; 
var TIME_SCALE = 1.2;
var TIME_START_SCALE = 150;
var TIME_START_INIT = -37.5;
var VORTEX_U_INIT = .6;
var VORTEX_U_DRAG = .996;
var VORTEX_SPEED_INIT = .8;
var VORTEX_DRAG = .998;
var VORTEX_RADIUS = 20;
var w = 128;
var h = 128;

/*

var V_INIT = 7;
var V_REDUCE = .75;
var FIELD_V = 100; 
var TIME_SCALE = 1.0;
var TIME_START_SCALE = 150;
var TIME_START_INIT = -37.5;
var VORTEX_U_INIT = .6;
var VORTEX_U_DRAG = .996;
var VORTEX_SPEED_INIT = .8;
var VORTEX_DRAG = .999;
var VORTEX_RADIUS = 30;
var w = 128;
var h = 256;

/*


var V_INIT = 18;
var V_REDUCE = .8;
var FIELD_V = 100; 
var TIME_SCALE = .8;
var TIME_START_SCALE = 150;
var TIME_START_INIT = -37.5;
var VORTEX_U_INIT = 1.0;
var VORTEX_U_DRAG = .997;
var VORTEX_SPEED_INIT = 1.2;
var VORTEX_DRAG = .999;
var VORTEX_RADIUS = 60;
var w = 256;
var h = 256;
//*/



var timePeriod = 400;



var canvas = document.getElementById("canvas");
canvas.width = width;
canvas.height = height;
var fpsDiv = document.getElementById("fps");


var gl = canvas.getContext("webgl", 
{
    alpha: false,
    antialias: true
});

var floatTextureExtension = gl.getExtension("OES_texture_float");
if (!floatTextureExtension) {
    alert("float textures not supported");
}
var floatLinearExtension = gl.getExtension("OES_texture_float_linear");
if (!floatLinearExtension) {
    alert("float linear filtering textures not supported");
}


var depthTextureExtension = gl.getExtension("WEBGL_depth_texture");
if (!depthTextureExtension) {
    alert("depth textures not supported");
}

var instancedArraysExtension = gl.getExtension("ANGLE_instanced_arrays");
if (!instancedArraysExtension) {
    alert("instanced arrays not supported");
}

var graphicsPrograms = Graphics.getGraphicsPrograms(gl, instancedArraysExtension);
var computeProgs = Compute.getPrograms(gl);











var lastTime = 0;
var fpsMeasure = {
    samples: 0,
    total: 0,
    lastFps: 0
}




/*
UPDATE:
*/
var particleUpdateVertexSource = `
precision highp float;

attribute vec2 a_position; //used for both the texture and the coordinate

varying vec2 v_texCoord;

void main() {
	gl_Position = vec4((a_position * 2.0 - 1.0), 0, 1);

	v_texCoord = a_position;
}
`;


var particleUpdateFragmentSource = `
precision highp float;

varying vec2 v_texCoord;

uniform vec3 u_vortexCenter;
uniform float u_vortexSpeed;
uniform float u_vortexRadius;

uniform vec3 u_wind;

uniform sampler2D u_inputPosition;
uniform sampler2D u_inputVelocity;
uniform sampler2D u_velocityField1;
uniform sampler2D u_velocityField2;
uniform sampler2D u_velocityField3;

uniform float u_t;
uniform mat4 u_velocityTransformMatrix;
uniform float u_speedReduceFactor;


void main() {
    
    vec4 inputVal           = texture2D(u_inputPosition, v_texCoord);
    vec4 inputVelocityVal   = texture2D(u_inputVelocity, v_texCoord);
    vec2 velocityReadXY     = (u_velocityTransformMatrix * vec4(inputVal.x, inputVal.y, 0, 1.0)).xy;
    vec2 velocityReadYZ     = (u_velocityTransformMatrix * vec4(inputVal.y, inputVal.z, 0, 1.0)).xy;
    vec2 velocityReadXZ     = (u_velocityTransformMatrix * vec4(inputVal.x, inputVal.z, 0, 1.0)).xy;
    
    float boost = 1.0/sqrt(2.0 * u_t * u_t - 2.0 * u_t + 1.0); //Keep the average velocity unchanged
    
    
    
    //Hill's spherical vortex!
    float dist = length(inputVal.xyz - u_vortexCenter);
    float r = length(inputVal.xy - u_vortexCenter.xy);
    vec2 r_dir;
    if(r == 0.0) {
        r_dir = vec2(0.0);
    } else {
        r_dir = normalize(inputVal.xy - u_vortexCenter.xy);
    }
    float z = inputVal.z - u_vortexCenter.z;
    
    float u0 = u_vortexSpeed;
    float a = u_vortexRadius;
    
    float u, v;
    if(dist < a) {
        u = 1.5 * u0 * (1.0 - (2.0 * r*r + z*z) / (a*a)) + u0;
        v = 1.5 * u0 * z * r / (a*a);
    } else {
        float f = pow(a * a / (z*z + r*r), 2.5); 
        u = u0 * f * (2.0 * z*z - r*r) / (2.0 * a*a);
        v = 1.5 * u0 * z * r / (a*a) * f;
    }
    
    inputVal.xy += r_dir * v;
    inputVal.z  += u;
    
    inputVal.xy += u_wind.xy * u_wind.z * inputVal.z;
    
    inputVal.xy += boost * (u_t * texture2D(u_velocityField1, velocityReadXY).xy + sqrt(pow(1.0 - u_t, 2.0)) * texture2D(u_velocityField1, velocityReadXY).zw); 
    inputVal.yz += boost * (u_t * texture2D(u_velocityField2, velocityReadYZ).xy + sqrt(pow(1.0 - u_t, 2.0)) * texture2D(u_velocityField2, velocityReadYZ).zw); 
    inputVal.xz += boost * (u_t * texture2D(u_velocityField3, velocityReadXZ).xy + sqrt(pow(1.0 - u_t, 2.0)) * texture2D(u_velocityField3, velocityReadXZ).zw); 
    
    inputVal.xyz += inputVelocityVal.xyz * exp(u_speedReduceFactor * inputVal.w / inputVelocityVal.w);
    
    //inputVal.z = max(0.0, inputVal.z);
    
    inputVal.w += inputVelocityVal.w;
    
    gl_FragColor = inputVal;
}
`;

var particleVelocityUpdateFragmentSource = `
precision highp float;

varying vec2 v_texCoord;

uniform sampler2D u_inputVelocity;

uniform float u_reduce;

void main() {
    
    vec4 inputVal = texture2D(u_inputVelocity, v_texCoord);
    gl_FragColor = vec4(inputVal.xyz * u_reduce, inputVal.w);
}
`;


var particleUpdateProgramInfo = glUtils.makeProgram(
    gl, particleUpdateVertexSource, particleUpdateFragmentSource, 
    ["a_position"], 
    []
);

var particleVelocityUpdateProgramInfo = glUtils.makeProgram(
    gl, particleUpdateVertexSource, particleVelocityUpdateFragmentSource, 
    ["a_position"], 
    []
);

var unitRectBuffer = glUtils.generateSimpleUnitRectangleBuffer(gl);

function updateParticles(inputPositionTexture, inputVelocityTexture, velocityTexture1, velocityTexture2, velocityTexture3, t, velocityTransformMatrix, vortexCenter, vortexSpeed, speedReduce, outputBuffer) {
    var programInfo = particleUpdateProgramInfo;
	gl.useProgram(programInfo.program);
    
    gl.bindFramebuffer(gl.FRAMEBUFFER, outputBuffer.frameBuffer);
    gl.viewport(0, 0, outputBuffer.width, outputBuffer.height); 
    
	gl.bindBuffer(gl.ARRAY_BUFFER, unitRectBuffer);
	gl.vertexAttribPointer(programInfo.attribsUniforms.a_position, 2, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(programInfo.attribsUniforms.a_position);

    gl.activeTexture(gl.TEXTURE0); 
	gl.bindTexture(gl.TEXTURE_2D, inputPositionTexture.texture);
	programInfo.setters.u_inputPosition(0);

    gl.activeTexture(gl.TEXTURE1); 
	gl.bindTexture(gl.TEXTURE_2D, inputVelocityTexture.texture);
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
    
    programInfo.setters.u_vortexCenter(vortexCenter);
    programInfo.setters.u_vortexSpeed(vortexSpeed);
    programInfo.setters.u_vortexRadius(VORTEX_RADIUS);
        
    programInfo.setters.u_velocityTransformMatrix(velocityTransformMatrix);

    programInfo.setters.u_speedReduceFactor(Math.log(speedReduce));

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

function updateParticlesVelocity(inputVelocityTexture, reduce, outputBuffer) {
    var programInfo = particleVelocityUpdateProgramInfo;
	gl.useProgram(programInfo.program);
    
    gl.bindFramebuffer(gl.FRAMEBUFFER, outputBuffer.frameBuffer);
    gl.viewport(0, 0, outputBuffer.width, outputBuffer.height); 
    
	gl.bindBuffer(gl.ARRAY_BUFFER, unitRectBuffer);
	gl.vertexAttribPointer(programInfo.attribsUniforms.a_position, 2, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(programInfo.attribsUniforms.a_position);

    gl.activeTexture(gl.TEXTURE1); 
	gl.bindTexture(gl.TEXTURE_2D, inputVelocityTexture.texture);
	programInfo.setters.u_inputVelocity(1);

	programInfo.setters.u_reduce(reduce);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}




/*
CURL:
*/




var curlFragmentSource = `
precision highp float;

varying vec2 v_texCoord;

uniform sampler2D u_input;

uniform float u_dx;


void main() {
    
    float x = v_texCoord.x;
    float y = v_texCoord.y;
    
    
    float d_dx1 = (texture2D(u_input, vec2(x + u_dx, y)).r - texture2D(u_input, vec2(x - u_dx, y)).r) / (2.0 * u_dx);
    float d_dy1 = (texture2D(u_input, vec2(x, y + u_dx)).r - texture2D(u_input, vec2(x, y - u_dx)).r) / (2.0 * u_dx);

    float d_dx2 = (texture2D(u_input, vec2(x + u_dx, y)).g - texture2D(u_input, vec2(x - u_dx, y)).g) / (2.0 * u_dx);
    float d_dy2 = (texture2D(u_input, vec2(x, y + u_dx)).g - texture2D(u_input, vec2(x, y - u_dx)).g) / (2.0 * u_dx);
    
    gl_FragColor = vec4(d_dy1, -d_dx1, d_dy2, -d_dx2);
}
`;


var curlProgramInfo = glUtils.makeProgram(
    gl, particleUpdateVertexSource, curlFragmentSource, 
    ["a_position"], 
    []
);



function curl(inputTexture, dx, outputBuffer) {
    var programInfo = curlProgramInfo;
	gl.useProgram(programInfo.program);
    
    gl.bindFramebuffer(gl.FRAMEBUFFER, outputBuffer.frameBuffer);
    gl.viewport(0, 0, outputBuffer.width, outputBuffer.height); 
    
	gl.bindBuffer(gl.ARRAY_BUFFER, unitRectBuffer);
	gl.vertexAttribPointer(programInfo.attribsUniforms.a_position, 2, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(programInfo.attribsUniforms.a_position);

    gl.activeTexture(gl.TEXTURE0); 
	gl.bindTexture(gl.TEXTURE_2D, inputTexture.texture);
	programInfo.setters.u_input(0);

    programInfo.setters.u_dx(dx);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}







var particleProgramInfo = glUtils.makeProgram(
    gl, particleVertexSource, particleFragmentSource, 
    ["a_index"], 
    []
);



function drawParticles(indexBuffer, positionTexture, num, transformMatrix, color) {
    var programInfo = particleProgramInfo;
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





/////////////////Stuff that is constant for all explosions:

var v_stages = 9;

var v_width = 1 << v_stages;
var v_height = 1 << v_stages;



function genPotentialMap(graphicsPrograms, computeProgs, stages, scale, reduceFactor) {
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



var velocityFieldTexture1 = glUtils.makeTextureGeneric(gl, v_width, v_height, gl.FLOAT, gl.LINEAR, gl.REPEAT, null);
var velocityFieldBuffer1 = glUtils.makeFrameBufferTexture(gl, velocityFieldTexture1);

var velocityFieldTexture2 = glUtils.makeTextureGeneric(gl, v_width, v_height, gl.FLOAT, gl.LINEAR, gl.REPEAT, null);
var velocityFieldBuffer2 = glUtils.makeFrameBufferTexture(gl, velocityFieldTexture2);

var velocityFieldTexture3 = glUtils.makeTextureGeneric(gl, v_width, v_height, gl.FLOAT, gl.LINEAR, gl.REPEAT, null);
var velocityFieldBuffer3 = glUtils.makeFrameBufferTexture(gl, velocityFieldTexture3);

var potential = genPotentialMap(graphicsPrograms, computeProgs, v_stages, FIELD_V);
curl(potential, .001, velocityFieldBuffer1)

var potential = genPotentialMap(graphicsPrograms, computeProgs, v_stages, FIELD_V);
curl(potential, .001, velocityFieldBuffer2)

var potential = genPotentialMap(graphicsPrograms, computeProgs, v_stages, FIELD_V);
curl(potential, .001, velocityFieldBuffer3)


var screenRatio = 8 / 5;
var cameraAngle = Math.acos(1 / screenRatio);

var transformMatrix         = Matrix.multiplyManyMatrices([Matrix.makeXRotation(Math.PI + cameraAngle), Matrix.makeTranslation(-1, -1, 0), Matrix.makeScale(2/width, 2/height, 2/height)]);
var transformVelocityMatrix = Matrix.multiplyManyMatrices([Matrix.makeTranslation(0, 0, 0), Matrix.makeScale(1/v_width, 1/v_height, 1)]);
























//This can be made constant for every explosion of the same size:

var indexArray = [];
for(var i = 0; i < w * h; i++) {
    var indexX = i % w;
    var indexY = Math.floor(i / w);
    indexArray.push(indexX / w);
    indexArray.push(indexY / h);
}

var particles = new Float32Array(indexArray);

var vb = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, vb);
gl.bufferData(gl.ARRAY_BUFFER, particles, gl.STATIC_DRAW);












//Explosion specific:
var positionData = [];
var velocityData = [];
var center = [width / 2, 3 * height / 4, 0];
for(var i = 0; i < w * h; i++) {
    //var indexX = Math.floor(i / w);
    //var indexY = i % w;
    
    do{
        var vx = (2 * Math.random() - 1) * V_INIT;
        var vy = (2 * Math.random() - 1) * V_INIT;
        var vz = Math.random() * V_INIT;//(2 * Math.random() - 1) * V_INIT;
        var vz = (2 * Math.random() - 1) * V_INIT;
        var v = Math.sqrt(vx * vx + vy * vy + vz * vz);
    } while(v >= V_INIT);
    
    positionData.push(width / 2);
    positionData.push(3 * height / 4);
    positionData.push(0);
    var tStart = TIME_START_SCALE * Math.max(v / V_INIT, .2) + TIME_START_INIT;
    positionData.push(tStart); //Time

    //Multiply the initial velocity so that when it's computed in the shader it gives the value we want:
    
    var vFactor = Math.exp(-tStart * Math.log(V_REDUCE) / TIME_SCALE)
    velocityData.push(vx * vFactor);
    velocityData.push(vy * vFactor);
    velocityData.push(vz * vFactor);
    velocityData.push(TIME_SCALE);
    
}

var positionTexture1 = glUtils.makeTextureGeneric(gl, w, h, gl.FLOAT, gl.NEAREST, gl.CLAMP_TO_EDGE, new Float32Array(positionData));
var positionBuffer1 = glUtils.makeFrameBufferTexture(gl, positionTexture1);

var positionTexture2 = glUtils.makeTextureGeneric(gl, w, h, gl.FLOAT, gl.NEAREST, gl.CLAMP_TO_EDGE, new Float32Array(positionData));
var positionBuffer2 = glUtils.makeFrameBufferTexture(gl, positionTexture2);

var velocityTexture1 = glUtils.makeTextureGeneric(gl, w, h, gl.FLOAT, gl.NEAREST, gl.CLAMP_TO_EDGE, new Float32Array(velocityData));
var velocityBuffer1 = glUtils.makeFrameBufferTexture(gl, velocityTexture1);

var vortexSpeed = VORTEX_SPEED_INIT;
var vortexU = VORTEX_U_INIT;


















var dir = true;

var time = Math.floor(Math.random() * timePeriod);
var timeDir = 1;

function frame(timestamp) {
    var timeDiff = timestamp - lastTime;
    lastTime = timestamp;
    
    fpsMeasure.samples++;
    fpsMeasure.total += timeDiff;
    if(fpsMeasure.samples == 10) {
        fpsMeasure.lastFps = 1000 / (fpsMeasure.total / fpsMeasure.samples);
        fpsMeasure.samples = 0;
        fpsMeasure.total = 0;
        
    }
    
    gl.disable(gl.BLEND);
    
    
    time += timeDir;
    if(time >= timePeriod)
        timeDir = -1;
    if(time <= 0)
        timeDir = 1;
    
    fpsDiv.innerHTML = Math.round(fpsMeasure.lastFps).toString() + "fps      time: " + time.toString();
    
    vortexSpeed *= VORTEX_DRAG;
    vortexU *= VORTEX_U_DRAG;
    center[0] += WIND_X * WIND_Z_FACTOR * center[2];
    center[1] += WIND_Y * WIND_Z_FACTOR * center[2];
    center[2] += vortexSpeed;
    
    if(dir) {
        updateParticles(positionTexture1, velocityTexture1, velocityFieldTexture1, velocityFieldTexture2, velocityFieldTexture3, time / timePeriod, transformVelocityMatrix, center, vortexU, V_REDUCE, positionBuffer2);
    } else {
        updateParticles(positionTexture2, velocityTexture1, velocityFieldTexture1, velocityFieldTexture2, velocityFieldTexture3, time / timePeriod, transformVelocityMatrix, center, vortexU, V_REDUCE, positionBuffer1);
    }
      
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    
    gl.disable(gl.DEPTH_TEST);
    
    //gl.viewport(0, 0, width + 30, height + 30); //This fixes the problem with points going offscreen
    gl.viewport(0, 0, width, height);
    gl.clearColor(.6,.5,.2,1);  
    gl.clear(gl.COLOR_BUFFER_BIT);
    
    graphicsPrograms.resolution = {width: width, height: height};
    
    

    //Graphics.drawImage(graphicsPrograms, 0, 0, width, height, 0, 0, width, height, testPotential, [0,0,0,1]);
    drawParticles(vb, dir ? positionTexture2 : positionTexture1, w * h, transformMatrix, [1,1,1,1]);
    dir = !dir;
    
    
    requestAnimationFrame(frame);
}



requestAnimationFrame(frame);


