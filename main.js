//Matthew Seymour, matthew dot seymour at gmail.com

"use strict";

var SUB_TILE_WIDTH = 8;
var SUB_TILE_HEIGHT = 6;


var WIDTH  = document.body.offsetWidth;
var HEIGHT = document.body.offsetHeight;

function getMousePosition(e, canvas) {
	var x;
    var y;
    if (e.pageX || e.pageY) {
      x = e.pageX;
      y = e.pageY;
    }
    else {
      x = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
      y = e.clientY + document.body.scrollTop + document.documentElement.scrollTop;
    }

	x -= canvas.offsetLeft;
	y -= canvas.offsetTop;
	return {x: x, y: y};
}

function mouseToMap(mousePos) {
    return {x: mousePos.x, y: HEIGHT - mousePos.y};
}


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
    
    programInfo.lineVertexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, programInfo.lineVertexBuffer);

	gl.bufferData(
		gl.ARRAY_BUFFER,
		new Float32Array([
			0.0, 0.0,
			1.0, 1.0]),
		gl.STATIC_DRAW);	
	
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

function drawLine(gl, x1, y1, x2, y2, color) {
	gl.useProgram(primitiveProgramInfo.program);

	gl.bindBuffer(gl.ARRAY_BUFFER, primitiveProgramInfo.lineVertexBuffer);
	gl.vertexAttribPointer(primitiveProgramInfo.attribsUniforms.a_position, 2, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(primitiveProgramInfo.attribsUniforms.a_position);

	primitiveProgramInfo.setters.u_position([x1, y1]);
	primitiveProgramInfo.setters.u_size([x2 - x1, y2 - y1]);
	primitiveProgramInfo.setters.u_color(color);
	
	//draw
	gl.drawArrays(gl.LINES, 0, 2);
	
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







var fftProgs = fft.getPrograms(gl);


var map = genMap(fft, 512);
var currentMousePos = {x: 0, y: 0};

var startTime = null;
var showPassable = false;
var view = {xOffset: 0, yOffset: 0}

function onMouseDown() {
}

function onMouseMove(e) {
	currentMousePos = getMousePosition(e, canvas);
}

function onKeyDown(args) {
    var SCROLL_RATE = 4;
    switch(args.keyCode) {
        case KeyCodeEnum.LEFT:
            view.xOffset -= SCROLL_RATE;
            break;
        case KeyCodeEnum.RIGHT:
            view.xOffset += SCROLL_RATE;
            break;
        case KeyCodeEnum.UP:
            view.yOffset += SCROLL_RATE;
            break;
        case KeyCodeEnum.DOWN:
            view.yOffset -= SCROLL_RATE;
            break;
            
        case KeyCodeEnum.P:
            showPassable = !showPassable;
            break;
        
    }
}

canvas.addEventListener("mousedown", onMouseDown, false);
canvas.addEventListener("mousemove", onMouseMove, false);
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
    
    
    
    function test(a, b) {
        var pos1 = convertToScreen(a, view);
        var pos2 = convertToScreen(b, view);
    
        drawLineBox(a, b, 2, gl, view)
        drawLine(gl, pos1.x, pos1.y, pos2.x, pos2.y, [1,0,0,1]);
    }
    
    var b = convertToWorld(mouseToMap(currentMousePos), view);
    //test({x: 80.5, y: 80.5}, b);
    test({x: Math.random() * 512, y: Math.random() * 512}, {x: Math.random() * 512, y: Math.random() * 512});
    
    requestAnimationFrame(frame);
}



requestAnimationFrame(frame);


