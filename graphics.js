const Graphics = {};


Graphics.getGraphicsPrograms = function(gl) {
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

    graphicsPrograms.imageProgramInfo = glUtils.makeProgram(
        gl, imageVertexSource, imageFragmentSource, 
        ["a_position", "a_texCoord"], 
        ["u_image", "u_mask", "u_resolution", "u_position", "u_size", "u_texResolution", "u_texPosition", "u_texSize"]
    );

    graphicsPrograms.imageDepthProgramInfo = glUtils.makeProgram(
        gl, imageDepthVertexSource, imageDepthFragmentSource, 
        ["a_position", "a_texCoord", "a_depthTexCoord"], 
        ["u_image", "u_mask", "u_resolution", "u_position", "u_size", "u_texResolution", "u_texPosition", "u_texSize", "u_depthTexResolution", "u_depthTexPosition", "u_depthTexSize", "u_depthImage", "u_depth"]
    );

    graphicsPrograms.imageMaskProgramInfo = glUtils.makeProgram(
        gl, imageMaskVertexSource, imageMaskFragmentSource, 
        ["a_position", "a_texCoord"], 
        ["u_image", "u_mask", "u_resolution", "u_position", "u_size", "u_texResolution", 
         "u_texPosition", "u_texSize", "u_maskTexResolution", "u_maskTexPosition", "u_maskTexSize"]
    );
    
    graphicsPrograms.primitive3dProgramInfo = glUtils.makeProgram(
        gl, primitive3dVertexSource, primitive3dFragmentSource, 
        ["a_position", "a_normal"], 
        []
    );

    graphicsPrograms.primitive3dShadowProgramInfo = glUtils.makeProgram(
        gl, primitive3dShadowVertexSource, primitive3dShadowFragmentSource, 
        ["a_position", "a_normal"], 
        []
    );

    graphicsPrograms.texture3dShadowProgramInfo = glUtils.makeProgram(
        gl, texture3dShadowVertexSource, texture3dShadowFragmentSource, 
        ["a_position", "a_normal", "a_texCoord"], 
        []
    );
    
    return graphicsPrograms;
}

Graphics.drawBox = function(programs, x, y, w, h, color) {
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

Graphics.drawLine = function(programs, x1, y1, x2, y2, color) {
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

Graphics.drawLines = function(programs, linesBuffer, numberOfLines, offsetX, offsetY, scaleX, scaleY, color) {
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

Graphics.drawImage = function(programs, sx, sy, sw, sh, x, y, w, h, image, mask) {
    var gl = programs.gl;
	gl.useProgram(programs.imageProgramInfo.program);
	
    glUtils.bindRectBuffer(gl, programs.imageProgramInfo, programs.unitRectBuffer);

	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, image.texture);

    programs.imageProgramInfo.setters.u_resolution([programs.resolution.width, programs.resolution.height]);
	programs.imageProgramInfo.setters.u_position([x, y]);
	programs.imageProgramInfo.setters.u_size([w, h]);
	programs.imageProgramInfo.setters.u_image(0);
	programs.imageProgramInfo.setters.u_texResolution([image.width, image.height]);
	programs.imageProgramInfo.setters.u_texPosition([sx, sy]);
	programs.imageProgramInfo.setters.u_texSize([sw, sh]);
	programs.imageProgramInfo.setters.u_mask(mask);
	
	//draw
	gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
	
}

//The mask is another image
Graphics.drawImageMask = function(programs, sx, sy, sw, sh, mx, my, mw, mh, x, y, w, h, image, mask) {
    var gl = programs.gl;
	gl.useProgram(programs.imageMaskProgramInfo.program);
	
    glUtils.bindRectBuffer(gl, programs.imageMaskProgramInfo, programs.unitRectBuffer);

	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, image.texture);

	gl.activeTexture(gl.TEXTURE1);
	gl.bindTexture(gl.TEXTURE_2D, mask.texture);

    programs.imageMaskProgramInfo.setters.u_resolution([programs.resolution.width, programs.resolution.height]);
	programs.imageMaskProgramInfo.setters.u_position([x, y]);
	programs.imageMaskProgramInfo.setters.u_size([w, h]);
	programs.imageMaskProgramInfo.setters.u_image(0);
	programs.imageMaskProgramInfo.setters.u_texResolution([image.width, image.height]);
	programs.imageMaskProgramInfo.setters.u_texPosition([sx, sy]);
	programs.imageMaskProgramInfo.setters.u_texSize([sw, sh]);

	programs.imageMaskProgramInfo.setters.u_maskTexResolution([mask.width, mask.height]);
	programs.imageMaskProgramInfo.setters.u_maskTexPosition([mx, my]);
	programs.imageMaskProgramInfo.setters.u_maskTexSize([mw, mh]);
	programs.imageMaskProgramInfo.setters.u_mask(1);
	
	//draw
	gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
	
}

Graphics.drawImageDepth = function(programs, sx, sy, sw, sh, dx, dy, dw, dh, x, y, w, h, depth, image, depthImage, mask) {
    var gl = programs.gl;
	gl.useProgram(programs.imageDepthProgramInfo.program);
	
    glUtils.bindRectBuffer(gl, programs.imageDepthProgramInfo, programs.unitRectBuffer);
    
	gl.bindBuffer(gl.ARRAY_BUFFER, programs.unitRectBuffer);
    gl.vertexAttribPointer(programs.imageDepthProgramInfo.attribsUniforms.a_depthTexCoord, 2, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(programs.imageDepthProgramInfo.attribsUniforms.a_depthTexCoord);
    
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, image.texture);

	gl.activeTexture(gl.TEXTURE1);
	gl.bindTexture(gl.TEXTURE_2D, depthImage.texture);

    programs.imageDepthProgramInfo.setters.u_resolution([programs.resolution.width, programs.resolution.height]);
	programs.imageDepthProgramInfo.setters.u_position([x, y]);
	programs.imageDepthProgramInfo.setters.u_size([w, h]);
	programs.imageDepthProgramInfo.setters.u_image(0);
	programs.imageDepthProgramInfo.setters.u_texResolution([image.width, image.height]);
	programs.imageDepthProgramInfo.setters.u_texPosition([sx, sy]);
	programs.imageDepthProgramInfo.setters.u_texSize([sw, sh]);

	programs.imageDepthProgramInfo.setters.u_depthTexResolution([depthImage.width, depthImage.height]);
	programs.imageDepthProgramInfo.setters.u_depthTexPosition([dx, dy]);
	programs.imageDepthProgramInfo.setters.u_depthTexSize([dw, dh]);
	programs.imageDepthProgramInfo.setters.u_depth(depth);
	programs.imageDepthProgramInfo.setters.u_depthImage(1);
	programs.imageDepthProgramInfo.setters.u_mask(mask);
	
	//draw
	gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
	
}

Graphics.drawTriangles = function(programs, triangleBuffer, normalsBuffer, numberOfTriangles, matrixWorld, matrixCamera, color, zColor, lightDir, ambient) {
    var gl = programs.gl;
	gl.useProgram(programs.primitive3dProgramInfo.program);

	gl.bindBuffer(gl.ARRAY_BUFFER, triangleBuffer);
	gl.vertexAttribPointer(programs.primitive3dProgramInfo.attribsUniforms.a_position, 3, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(programs.primitive3dProgramInfo.attribsUniforms.a_position);

	gl.bindBuffer(gl.ARRAY_BUFFER, normalsBuffer);
	gl.vertexAttribPointer(programs.primitive3dProgramInfo.attribsUniforms.a_normal, 3, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(programs.primitive3dProgramInfo.attribsUniforms.a_normal);

    programs.primitive3dProgramInfo.setters.u_matrix_world(matrixWorld);
    programs.primitive3dProgramInfo.setters.u_matrix_camera(matrixCamera);
	programs.primitive3dProgramInfo.setters.u_color(color);
	programs.primitive3dProgramInfo.setters.u_zColor(zColor);
	programs.primitive3dProgramInfo.setters.u_light(lightDir);
	programs.primitive3dProgramInfo.setters.u_ambient(ambient);
    
	//draw
	gl.drawArrays(gl.TRIANGLES, 0, numberOfTriangles * 3);
	
}

Graphics.drawTrianglesShadow = function(programs, triangleBuffer, normalsBuffer, numberOfTriangles, shadowMapTexture, matrixWorld, matrixCamera, matrixLight, color, zColor, lightDir, ambient) {
    var gl = programs.gl;
	gl.useProgram(programs.primitive3dShadowProgramInfo.program);

	gl.bindBuffer(gl.ARRAY_BUFFER, triangleBuffer);
	gl.vertexAttribPointer(programs.primitive3dShadowProgramInfo.attribsUniforms.a_position, 3, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(programs.primitive3dShadowProgramInfo.attribsUniforms.a_position);

	gl.bindBuffer(gl.ARRAY_BUFFER, normalsBuffer);
	gl.vertexAttribPointer(programs.primitive3dShadowProgramInfo.attribsUniforms.a_normal, 3, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(programs.primitive3dShadowProgramInfo.attribsUniforms.a_normal);

	
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, shadowMapTexture);
    
    programs.primitive3dShadowProgramInfo.setters.u_shadowMap(0);
    programs.primitive3dShadowProgramInfo.setters.u_matrix_world(matrixWorld);
    programs.primitive3dShadowProgramInfo.setters.u_matrix_camera(matrixCamera);
    programs.primitive3dShadowProgramInfo.setters.u_matrix_light(matrixLight);
	programs.primitive3dShadowProgramInfo.setters.u_color(color);
	programs.primitive3dShadowProgramInfo.setters.u_zColor(zColor);
	programs.primitive3dShadowProgramInfo.setters.u_light(lightDir);
	programs.primitive3dShadowProgramInfo.setters.u_ambient(ambient);
    
	//draw
	gl.drawArrays(gl.TRIANGLES, 0, numberOfTriangles * 3);
	
}


Graphics.drawTrianglesTextureShadow = function(programs, triangleBuffer, normalsBuffer, textureCoordsBuffer, numberOfTriangles, texture, shadowMapTexture, matrixWorld, matrixCamera, matrixLight, lightDir, ambient) {
    var gl = programs.gl;
	gl.useProgram(programs.texture3dShadowProgramInfo.program);

	gl.bindBuffer(gl.ARRAY_BUFFER, triangleBuffer);
	gl.vertexAttribPointer(programs.texture3dShadowProgramInfo.attribsUniforms.a_position, 3, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(programs.texture3dShadowProgramInfo.attribsUniforms.a_position);

	gl.bindBuffer(gl.ARRAY_BUFFER, normalsBuffer);
	gl.vertexAttribPointer(programs.texture3dShadowProgramInfo.attribsUniforms.a_normal, 3, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(programs.texture3dShadowProgramInfo.attribsUniforms.a_normal);

	gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordsBuffer);
	gl.vertexAttribPointer(programs.texture3dShadowProgramInfo.attribsUniforms.a_texCoord, 2, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(programs.texture3dShadowProgramInfo.attribsUniforms.a_texCoord);

	
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, shadowMapTexture);
    programs.texture3dShadowProgramInfo.setters.u_shadowMap(0);


	gl.activeTexture(gl.TEXTURE1);
	gl.bindTexture(gl.TEXTURE_2D, texture);
    programs.texture3dShadowProgramInfo.setters.u_texture(1);


    programs.texture3dShadowProgramInfo.setters.u_matrix_world(matrixWorld);
    programs.texture3dShadowProgramInfo.setters.u_matrix_camera(matrixCamera);
    programs.texture3dShadowProgramInfo.setters.u_matrix_light(matrixLight);
	programs.texture3dShadowProgramInfo.setters.u_light(lightDir);
	programs.texture3dShadowProgramInfo.setters.u_ambient(ambient);
    
	//draw
	gl.drawArrays(gl.TRIANGLES, 0, numberOfTriangles * 3);
	
}
