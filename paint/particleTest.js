//Matthew Seymour, matthew dot seymour at gmail.com

"use strict";

var height = document.body.offsetHeight;
var width = document.body.offsetWidth;

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

uniform sampler2D u_inputPosition;
uniform sampler2D u_inputVelocity;
uniform sampler2D u_velocityField1;
uniform sampler2D u_velocityField2;

uniform float u_t;
uniform mat4 u_velocityTransformMatrix;


void main() {
    
    vec4 inputVal         = texture2D(u_inputPosition, v_texCoord);
    vec4 inputVelocityVal = texture2D(u_inputVelocity, v_texCoord);
    vec2 velocityRead = (u_velocityTransformMatrix * vec4(inputVal.x, inputVal.y, 0, 1.0)).xy;
    
    float boost = 1.0/sqrt(2.0 * u_t * u_t - 2.0 * u_t + 1.0); //Keep the average velocity unchanged
    
    vec2 velocity = boost * (u_t * texture2D(u_velocityField1, velocityRead).xy + sqrt(pow(1.0 - u_t, 2.0)) * texture2D(u_velocityField2, velocityRead).xy); 
    
    inputVal.xy += velocity + inputVelocityVal.xy;
    
    gl_FragColor = inputVal;
}
`;



var particleUpdateProgramInfo = glUtils.makeProgram(
    gl, particleUpdateVertexSource, particleUpdateFragmentSource, 
    ["a_position"], 
    []
);

var unitRectBuffer = glUtils.generateSimpleUnitRectangleBuffer(gl);

function updateParticles(inputPositionTexture, inputVelocityTexture, velocityTexture1, velocityTexture2, t, velocityTransformMatrix, outputBuffer) {
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
        
	programInfo.setters.u_t(t);
        
        
    programInfo.setters.u_velocityTransformMatrix(velocityTransformMatrix);

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
    
    
    float d_dx = (texture2D(u_input, vec2(x + u_dx, y)).r - texture2D(u_input, vec2(x - u_dx, y)).r) / (2.0 * u_dx);
    float d_dy = (texture2D(u_input, vec2(x, y + u_dx)).r - texture2D(u_input, vec2(x, y - u_dx)).r) / (2.0 * u_dx);
    
    gl_FragColor = vec4(d_dy, -d_dx, 0, 1.0);
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



function drawParticles(indexBuffer, positionTexture, colorTexture, num, transformMatrix, color) {
    var programInfo = particleProgramInfo;
	gl.useProgram(programInfo.program);

	gl.bindBuffer(gl.ARRAY_BUFFER, indexBuffer);
	gl.vertexAttribPointer(programInfo.attribsUniforms.a_index, 2, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(programInfo.attribsUniforms.a_index);

    gl.activeTexture(gl.TEXTURE0); 
	gl.bindTexture(gl.TEXTURE_2D, positionTexture.texture);
	programInfo.setters.u_inputPosition(0);
	
    gl.activeTexture(gl.TEXTURE1); 
	gl.bindTexture(gl.TEXTURE_2D, colorTexture.texture);
	programInfo.setters.u_inputColor(1);

	//programInfo.setters.u_color(color);
	
    programInfo.setters.u_matrix(transformMatrix);
	
	gl.drawArrays(gl.POINTS, 0, num);
}

var w = 512;
var h = 512;

var indexArray = [];
for(var i = 0; i < w * h; i++) {
    var indexX = Math.floor(i / w);
    var indexY = i % w;
    indexArray.push(indexX / w);
    indexArray.push(indexY / h);
}

var particles = new Float32Array(indexArray);

var vb = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, vb);
gl.bufferData(gl.ARRAY_BUFFER, particles, gl.STATIC_DRAW);

var positionData = [];
var velocityData = [];
var colorData    = [];
for(var i = 0; i < w * h; i++) {
    var indexX = Math.floor(i / w);
    var indexY = i % w;
    //positionData.push(200 * (indexY / h) * Math.cos(2 * Math.PI * (indexX + 15.5 * indexY / h) / w));
    //positionData.push(200 * (indexY / h) * Math.sin(2 * Math.PI * (indexX + 15.5 * indexY / h) / w));
    //positionData.push(indexX * width / w);
    //positionData.push(indexY * height / h);
    positionData.push(width / 2);// + (i % 2 == 0 ? -width/4 : width/4));
    positionData.push(height / 2);
    positionData.push(0);
    positionData.push(0);
    
    var angle = Math.random() * 2 * Math.PI;
    var v = Math.random()/3;
    
    velocityData.push(v * Math.cos(angle));
    velocityData.push(v * Math.sin(angle));
    velocityData.push(0);
    velocityData.push(0);
    
    var colorR = 0.5 + Math.cos(angle);
    var colorG = 0.5 + Math.cos(angle + 2 * Math.PI / 3);
    var colorB = 0.5 + Math.cos(angle + 4 * Math.PI / 3);
    colorData.push(colorR);
    colorData.push(colorG);
    colorData.push(colorB);
    colorData.push(1);
}

var positionTexture1 = glUtils.makeTextureGeneric(gl, w, h, gl.FLOAT, gl.NEAREST, gl.CLAMP_TO_EDGE, new Float32Array(positionData));
var positionBuffer1 = glUtils.makeFrameBufferTexture(gl, positionTexture1);

var positionTexture2 = glUtils.makeTextureGeneric(gl, w, h, gl.FLOAT, gl.NEAREST, gl.CLAMP_TO_EDGE, new Float32Array(positionData));
var positionBuffer2 = glUtils.makeFrameBufferTexture(gl, positionTexture2);

var velocityTexture1 = glUtils.makeTextureGeneric(gl, w, h, gl.FLOAT, gl.NEAREST, gl.CLAMP_TO_EDGE, new Float32Array(velocityData));
var velocityBuffer1 = glUtils.makeFrameBufferTexture(gl, velocityTexture1);

var velocityTexture2 = glUtils.makeTextureGeneric(gl, w, h, gl.FLOAT, gl.NEAREST, gl.CLAMP_TO_EDGE, new Float32Array(velocityData));
var velocityBuffer2 = glUtils.makeFrameBufferTexture(gl, velocityTexture2);

var colorTexture = glUtils.makeTextureGeneric(gl, w, h, gl.FLOAT, gl.NEAREST, gl.CLAMP_TO_EDGE, new Float32Array(colorData));

var v_stages = 9;

var v_width = 1 << v_stages;
var v_height = 1 << v_stages;



function genPotentialMap(computeProgs, stages, scale, reduceFactor) {
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


var testPotential1 = genPotentialMap(computeProgs, v_stages, 500);
var testPotential2 = genPotentialMap(computeProgs, v_stages, 500);





var velocityFieldTexture1 = glUtils.makeTextureGeneric(gl, v_width, v_height, gl.FLOAT, gl.LINEAR, gl.REPEAT, null);
var velocityFieldBuffer1 = glUtils.makeFrameBufferTexture(gl, velocityFieldTexture1);

var velocityFieldTexture2 = glUtils.makeTextureGeneric(gl, v_width, v_height, gl.FLOAT, gl.LINEAR, gl.REPEAT, null);
var velocityFieldBuffer2 = glUtils.makeFrameBufferTexture(gl, velocityFieldTexture2);

curl(testPotential1, .001, velocityFieldBuffer1)
curl(testPotential2, .001, velocityFieldBuffer2)


var transformMatrix         = Matrix.multiplyManyMatrices([Matrix.makeTranslation(-1, -1, 0), Matrix.makeScale(2/width, 2/height, 2)]);
var transformVelocityMatrix = Matrix.multiplyManyMatrices([Matrix.makeTranslation(0, 0, 0), Matrix.makeScale(1/v_width, 1/v_height, 1)]);

var dir = true;

var time = 0;
var timeDir = 1;
var timePeriod = 100;

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
    
    if(dir) {
        updateParticles(positionTexture1, velocityTexture1, velocityFieldTexture1, velocityFieldTexture2, time / timePeriod, transformVelocityMatrix, positionBuffer2);
    } else {
        updateParticles(positionTexture2, velocityTexture1, velocityFieldTexture1, velocityFieldTexture2, time / timePeriod, transformVelocityMatrix, positionBuffer1);
    }
      
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    
    gl.disable(gl.DEPTH_TEST);
    
    //gl.viewport(0, 0, width + 30, height + 30); //This fixes the problem with points going offscreen
    gl.viewport(0, 0, width, height);
    drawParticles(vb, dir ? positionTexture2 : positionTexture1, colorTexture, w * h, transformMatrix, [1,1,1,1]);
    dir = !dir;
    
    
    requestAnimationFrame(frame);
}



requestAnimationFrame(frame);


