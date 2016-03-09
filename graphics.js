const graphics = {};


graphics.getGraphicsPrograms = function(gl) {
    var graphicsPrograms = {};
    graphicsPrograms.gl = gl;
    graphicsPrograms.resolution = {width: 0, height: 0};
    
    graphicsPrograms.unitRectBuffer = glUtils.generateSimpleUnitRectangleBuffer(gl);
    
    graphicsPrograms.lineVertexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, graphicsPrograms.lineVertexBuffer);

	gl.bufferData(
		gl.ARRAY_BUFFER,
		new Float32Array([
			0.0, 0.0,
			1.0, 1.0]),
		gl.STATIC_DRAW);	


    graphicsPrograms.primitiveProgramInfo = glUtils.makeProgram(
        gl, primitiveVertexSource, primitiveFragmentSource, 
        ["a_position"], 
        ["u_resolution", "u_position", "u_size", "u_color"]
    );

    graphicsPrograms.spriteProgramInfo = glUtils.makeProgram(
        gl, spriteVertexSource, spriteFragmentSource, 
        ["a_position", "a_texCoord"], 
        ["u_image", "u_mask", "u_resolution", "u_position", "u_size", "u_texResolution", "u_texPosition", "u_texSize"]
    );

    graphicsPrograms.spriteMaskProgramInfo = glUtils.makeProgram(
        gl, spriteMaskVertexSource, spriteMaskFragmentSource, 
        ["a_position", "a_texCoord"], 
        ["u_image", "u_mask", "u_resolution", "u_position", "u_size", "u_texResolution", 
         "u_texPosition", "u_texSize", "u_maskTexResolution", "u_maskTexPosition", "u_maskTexSize"]
    );
    
    return graphicsPrograms;
}

graphics.drawBox = function(programs, x, y, w, h, color) {
    var gl = programs.gl;
	gl.useProgram(programs.primitiveProgramInfo.program);

	gl.bindBuffer(gl.ARRAY_BUFFER, programs.unitRectBuffer);
	gl.vertexAttribPointer(programs.primitiveProgramInfo.attribsUniforms.a_position, 2, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(programs.primitiveProgramInfo.attribsUniforms.a_position);

    programs.primitiveProgramInfo.setters.u_resolution([programs.resolution.width, programs.resolution.height]);
	programs.primitiveProgramInfo.setters.u_position([x, y]);
	programs.primitiveProgramInfo.setters.u_size([w, h]);
	programs.primitiveProgramInfo.setters.u_color(color);
	
	//draw
	gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
	
}

graphics.drawLine = function(programs, x1, y1, x2, y2, color) {
    var gl = programs.gl;
	gl.useProgram(programs.primitiveProgramInfo.program);

	gl.bindBuffer(gl.ARRAY_BUFFER, programs.lineVertexBuffer);
	gl.vertexAttribPointer(programs.primitiveProgramInfo.attribsUniforms.a_position, 2, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(programs.primitiveProgramInfo.attribsUniforms.a_position);

    programs.primitiveProgramInfo.setters.u_resolution([programs.resolution.width, programs.resolution.height]);
	programs.primitiveProgramInfo.setters.u_position([x1, y1]);
	programs.primitiveProgramInfo.setters.u_size([x2 - x1, y2 - y1]);
	programs.primitiveProgramInfo.setters.u_color(color);
	
	//draw
	gl.drawArrays(gl.LINES, 0, 2);
}

graphics.drawLines = function(programs, linesBuffer, numberOfLines, offsetX, offsetY, scaleX, scaleY, color) {
    var gl = programs.gl;
	gl.useProgram(programs.primitiveProgramInfo.program);

	gl.bindBuffer(gl.ARRAY_BUFFER, linesBuffer);
	gl.vertexAttribPointer(programs.primitiveProgramInfo.attribsUniforms.a_position, 2, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(programs.primitiveProgramInfo.attribsUniforms.a_position);

    programs.primitiveProgramInfo.setters.u_resolution([programs.resolution.width, programs.resolution.height]);
	programs.primitiveProgramInfo.setters.u_position([offsetX, offsetY]);
	programs.primitiveProgramInfo.setters.u_size([scaleX, scaleY]);
	programs.primitiveProgramInfo.setters.u_color(color);
	
	//draw
	gl.drawArrays(gl.LINES, 0, numberOfLines * 2);
}

graphics.drawSprite = function(programs, sx, sy, sw, sh, x, y, w, h, sprite, mask) {
    var gl = programs.gl;
	gl.useProgram(programs.spriteProgramInfo.program);
	
    glUtils.bindRectBuffer(gl, programs.spriteProgramInfo, programs.unitRectBuffer);

	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, sprite.texture);

    programs.spriteProgramInfo.setters.u_resolution([programs.resolution.width, programs.resolution.height]);
	programs.spriteProgramInfo.setters.u_position([x, y]);
	programs.spriteProgramInfo.setters.u_size([w, h]);
	programs.spriteProgramInfo.setters.u_image(0);
	programs.spriteProgramInfo.setters.u_texResolution([sprite.width, sprite.height]);
	programs.spriteProgramInfo.setters.u_texPosition([sx, sy]);
	programs.spriteProgramInfo.setters.u_texSize([sw, sh]);
	programs.spriteProgramInfo.setters.u_mask(mask);
	
	//draw
	gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
	
}

//The mask is another sprite
graphics.drawSpriteMask = function(programs, sx, sy, sw, sh, mx, my, mw, mh, x, y, w, h, sprite, mask) {
    var gl = programs.gl;
	gl.useProgram(programs.spriteMaskProgramInfo.program);
	
    glUtils.bindRectBuffer(gl, programs.spriteMaskProgramInfo, programs.unitRectBuffer);

	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, sprite.texture);

	gl.activeTexture(gl.TEXTURE1);
	gl.bindTexture(gl.TEXTURE_2D, mask.texture);

    programs.spriteMaskProgramInfo.setters.u_resolution([programs.resolution.width, programs.resolution.height]);
	programs.spriteMaskProgramInfo.setters.u_position([x, y]);
	programs.spriteMaskProgramInfo.setters.u_size([w, h]);
	programs.spriteMaskProgramInfo.setters.u_image(0);
	programs.spriteMaskProgramInfo.setters.u_texResolution([sprite.width, sprite.height]);
	programs.spriteMaskProgramInfo.setters.u_texPosition([sx, sy]);
	programs.spriteMaskProgramInfo.setters.u_texSize([sw, sh]);

	programs.spriteMaskProgramInfo.setters.u_maskTexResolution([mask.width, mask.height]);
	programs.spriteMaskProgramInfo.setters.u_maskTexPosition([mx, my]);
	programs.spriteMaskProgramInfo.setters.u_maskTexSize([mw, mh]);
	programs.spriteMaskProgramInfo.setters.u_mask(1);
	
	//draw
	gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
	
}
