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









var map = genMap(fft, 256);
//var waveBuff = getWaveBuffer(fft, 512, 60);

var boxes = [];

for(var i = 0; i < 256; i++) {
    for(var j = 0; j < 256; j++) {
        if(map.mapPass[i * 256 + j] == 0)
            boxes.push({x: j, y: i});
    }
}


var startTime = null;
var showPassable = false;
var view = {xOffset: 0, yOffset: 0}

function onMouseDown() {
}

function onKeyDown(args) {
    switch(args.keyCode) {
        case KeyCodeEnum.LEFT:
            view.xOffset--;
            break;
        case KeyCodeEnum.RIGHT:
            view.xOffset++;
            break;
        case KeyCodeEnum.UP:
            view.yOffset++;
            break;
        case KeyCodeEnum.DOWN:
            view.yOffset--;
            break;
            
        case KeyCodeEnum.P:
            showPassable = !showPassable;
            break;
        
    }
}

canvas.addEventListener("mousedown", onMouseDown, false);
document.onkeydown = onKeyDown;


function frame(timestamp) {
    if (!startTime) 
        startTime = timestamp;
    
    var timeDiff = timestamp - startTime;
    
      
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    
    gl.useProgram(spriteProgramInfo.program);
    gl.viewport(0, 0, WIDTH, HEIGHT);
    gl.uniform2f(spriteProgramInfo.u_resolution, WIDTH, HEIGHT);
    
    drawMap(gl, map, timeDiff, view, {showPassable: showPassable});
    
    requestAnimationFrame(frame);
}



requestAnimationFrame(frame);


