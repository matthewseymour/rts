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

var primitiveProgramInfo = (function () {
    var programInfo = glUtils.makeProgram(
        gl, primitiveVertexSource, primitiveFragmentSource, 
        ["a_position"], 
        ["u_resolution", "u_position", "u_size", "u_color"]
    );
    
	//set resolution:
	gl.useProgram(programInfo.program);
    programInfo.setters.u_resolution([canvas.width, canvas.height]);
    
    programInfo.vertexBuffer = glUtils.generateSimpleUnitRectangleBuffer(gl);
    
	
    return programInfo;
})();

var spriteProgramInfo = (function () {
    var programInfo = glUtils.makeProgram(
        gl, spriteVertexSource, spriteFragmentSource, 
        ["a_position", "a_texCoord"], 
        ["u_image", "u_mask", "u_resolution", "u_position", "u_size", "u_texResolution", "u_texPosition", "u_texSize"]
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

function drawBox(gl, x, y, w, h, color) {
	gl.useProgram(primitiveProgramInfo.program);

	gl.bindBuffer(gl.ARRAY_BUFFER, primitiveProgramInfo.vertexBuffer);
	gl.vertexAttribPointer(primitiveProgramInfo.attribsUniforms.a_position, 2, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(primitiveProgramInfo.attribsUniforms.a_position);

	primitiveProgramInfo.setters.u_position([x, y]);
	primitiveProgramInfo.setters.u_size([w, h]);
	primitiveProgramInfo.setters.u_color(color);
	
	//draw
	gl.drawArrays(gl.TRIANGLES, 0, 6);
	
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





var map = genMap(fft, 256);
//var waveBuff = getWaveBuffer(fft, 512, 60);

var boxes = [];

for(var i = 0; i < 256; i++) {
    for(var j = 0; j < 256; j++) {
        if(map.mapHeight[i * 256 + j] < NOISE_THRESHOLD)
            boxes.push({x: j, y: i});
    }
}


var startTime = null;
var showBoxes = false;

function onMouseDown() {
    showBoxes = !showBoxes;
}

canvas.addEventListener("mousedown", onMouseDown, false);

function frame(timestamp) {
    if (!startTime) 
        startTime = timestamp;
    
    var timeDiff = timestamp - startTime;
    
      
    //t = (t + 1) % 60;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    
    gl.useProgram(spriteProgramInfo.program);
    gl.viewport(0, 0, WIDTH, HEIGHT);
    gl.uniform2f(spriteProgramInfo.u_resolution, WIDTH, HEIGHT);
    
    drawMap(gl, map, timeDiff);
    
    if(showBoxes) {
        for(var i = 0; i < boxes.length; i++) {
            drawBox(gl, (boxes[i].x -.5) * upscale.x, (boxes[i].y - .5) * upscale.y, upscale.x, upscale.y, [1, 0, 0, .5]);
        }
    }
    requestAnimationFrame(frame);
}



requestAnimationFrame(frame);


