"use strict";

const Asset = {};

//Assumes spriteSheet has two rows of sprites
Asset.generateOutline = function(graphicsPrograms, spriteSheet) {
    var gl = graphicsPrograms.gl;
    var width = spriteSheet.width;
    var height = spriteSheet.height;// / 2;
    
    gl.disable(gl.SCISSOR_TEST);
    
    var newTexture = glUtils.makeTextureGeneric(gl, width, height, gl.UNSIGNED_BYTE, gl.LINEAR, gl.CLAMP_TO_EDGE, null);
    var frameBuffer = glUtils.makeFrameBufferTexture(gl, newTexture);
    
	gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer.frameBuffer);
    gl.viewport(0, 0, width, height);
    
    var oldRes = graphicsPrograms.resolution;
    graphicsPrograms.resolution = {width: width, height: height};
    
    
    Graphics.drawSpriteEdgeDetect(graphicsPrograms, 
        0, 0, width, height,
        0, 0, width, height, 
        spriteSheet,
        .5
    );
    
    graphicsPrograms.resolution = oldRes;
    
    spriteSheet.outline = newTexture;
}

Asset.loadSpriteSheet = function(gl, filenames, sheetInfo, onLoad) {
    var sheet = {
        textures: [],
        ready: false,
        info: sheetInfo,
    };
    
    var loaded = 0;
    var onLoadTexture = function() {
        loaded++;
        if(loaded == filenames.length) {
            sheet.ready = true;
            if(onLoad)
                onLoad(sheet);
        }
    }
    
    for(var i = 0; i < filenames.length; i++) {
        sheet.textures.push(Asset.loadTexture(gl, filenames[i], onLoadTexture));
    }
    
    return sheet;
}

Asset.loadTexture = function(gl, filename, onLoad) {
    var image = new Image();
    image.onload = handleImageLoaded;
    image.src = filename;
    
    var loadedTexture = {ready: false};

    function handleImageLoaded() {
        var textureInfo = glUtils.makeTextureFromImage(gl, image);
        loadedTexture.texture = textureInfo.texture;
        loadedTexture.width = textureInfo.width;
        loadedTexture.height = textureInfo.height;
        loadedTexture.ready = true;
        if(onLoad)
            onLoad(loadedTexture);
    }
    return loadedTexture;
}
