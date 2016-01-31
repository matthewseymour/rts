"use strict";

var glUtils = {};

glUtils.generateSimpleUnitRectangleBuffer = function(gl) {
	var spriteVertexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, spriteVertexBuffer);
	//Create a buffer and put a single clipspace rectangle in it (2 tris)
	gl.bufferData(
		gl.ARRAY_BUFFER,
		new Float32Array([
			0.0, 0.0,
			1.0, 0.0,
			0.0, 1.0,
			0.0, 1.0,
			1.0, 0.0,
			1.0, 1.0]),
		gl.STATIC_DRAW);	
    return spriteVertexBuffer;
}

glUtils.bindRectBuffer = function(gl, program, buffer) {
	gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
	gl.vertexAttribPointer(program.attribsUniforms.a_position, 2, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(program.attribsUniforms.a_position);
	
    gl.vertexAttribPointer(program.attribsUniforms.a_texCoord, 2, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(program.attribsUniforms.a_texCoord);
}


glUtils.getAttribsUniforms = function(gl, program, attribs, uniforms) {
    var data = {};
    attribs.forEach(function (attrib) {
        data[attrib] = gl.getAttribLocation(program, attrib);
    });
    
    uniforms.forEach(function (uniform) {
        data[uniform] = gl.getUniformLocation(program, uniform);
    });
    
    return data;
}

glUtils.makeProgram = function(gl, vertexShaderSource, fragmentShaderSource, attribs, uniforms) {
	var vertexShader   = loadShader(gl, vertexShaderSource  , gl.VERTEX_SHADER  );
	var fragmentShader = loadShader(gl, fragmentShaderSource, gl.FRAGMENT_SHADER);
    
    var info = {};
	info.program = createProgram(gl, [vertexShader, fragmentShader]);

    info.attribsUniforms = glUtils.getAttribsUniforms(gl, info.program, attribs, uniforms);
    
    info.setters = createUniformSetters(gl, info.program);

    return info;
}


glUtils.makeTexture = function(width, height, filterType, wrapType, data) {
	var texture = gl.createTexture();
	
    gl.activeTexture(gl.TEXTURE0); 
	gl.bindTexture(gl.TEXTURE_2D, texture);
	
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrapType);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrapType);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filterType);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filterType);
    
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
	
	gl.bindTexture(gl.TEXTURE_2D, null);
	
    return {texture: texture, width: width, height: height};
}


glUtils.makeFrameBufferTexture = function(textureInfo) {
    var fbTexture = textureInfo.texture;
    
	var framebuffer = gl.createFramebuffer();
	gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    
	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, textureInfo.texture, 0);
	
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);

	return {width: textureInfo.width, height: textureInfo.height, texture: textureInfo.texture, frameBuffer: framebuffer};
}

//filterType: gl.NEAREST or gl.LINEAR
glUtils.makeFrameBuffer = function(width, height, filterType) {
    var textureInfo = glUtils.makeTexture(width, height, filterType, gl.CLAMP_TO_EDGE, null);
	
    return glUtils.makeFrameBufferTexture(textureInfo);
}

glUtils.deleteFrameBuffer = function(buffer) {
    gl.deleteFrameBuffer(buffer.frameBuffer);
    gl.deleteTexture(buffer.fbTexture);
}