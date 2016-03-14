"use strict";

const Asset = {};

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
            onLoad();
    }
    return loadedTexture;
}
