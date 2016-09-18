//Matthew Seymour, matthew dot seymour at gmail.com

"use strict";

const SUB_TILE_WIDTH = 8;
const SUB_TILE_HEIGHT = 6;



var gl = ScreenLayout.canvas.getContext("experimental-webgl", 
{
    alpha: false,
    antialias: true
});
var depthTextureExtension = gl.getExtension("WEBGL_depth_texture");
if (!depthTextureExtension) {
    alert("depth textures not supported");
}
var floatTextureExtension = gl.getExtension("OES_texture_float");
if (!floatTextureExtension) {
    alert("float textures not supported");
}

var instancedArraysExtension = gl.getExtension("ANGLE_instanced_arrays");
if (!instancedArraysExtension) {
    alert("instanced arrays not supported");
}


var samples = gl.getParameter(gl.SAMPLES);
console.log(samples);


gl.depthFunc(gl.LEQUAL);







function changeScissorDims() {
    graphicsPrograms.gl.scissor(ScreenLayout.left, ScreenLayout.bottom, ScreenLayout.right - ScreenLayout.left, ScreenLayout.top - ScreenLayout.bottom);
}

ScreenLayout.onResize.push(changeScissorDims);

var graphicsPrograms = Graphics.getGraphicsPrograms(gl, instancedArraysExtension);
var computeProgs = Compute.getPrograms(gl);













var map = genMap(computeProgs, 225);





var offsetX = 0;
var offsetY = 0;
var showPassable = false;
var showRotated = false;
var showDepth = false;

function onKeyDown(args) {
    
    
    switch(args.keyCode) {
        case KeyCodeEnum.LEFT:
            offsetX += 50;
            break;
        case KeyCodeEnum.RIGHT:
            offsetX -= 50;
            break;
        case KeyCodeEnum.UP:
            offsetY -= 50;
            break;
        case KeyCodeEnum.DOWN:
            offsetY += 50;
            break;
        case KeyCodeEnum.M:
            showPassable = !showPassable;
            break;
        case KeyCodeEnum.R:
            showRotated = !showRotated;
            break;
        
    }
    requestAnimationFrame(frame);
    
    
}

document.onkeydown = onKeyDown;
        

function frame(timestamp) {
    
    graphicsPrograms.gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    
    graphicsPrograms.gl.enable(gl.BLEND);
    graphicsPrograms.gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    graphicsPrograms.gl.viewport(ScreenLayout.left, ScreenLayout.bottom, ScreenLayout.right - ScreenLayout.left, ScreenLayout.top - ScreenLayout.bottom);
    
    graphicsPrograms.gl.scissor(ScreenLayout.left, ScreenLayout.bottom, ScreenLayout.right - ScreenLayout.left, ScreenLayout.top - ScreenLayout.bottom);
    graphicsPrograms.gl.enable(graphicsPrograms.gl.SCISSOR_TEST);
    gl.disable(gl.DEPTH_TEST);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    
    graphicsPrograms.resolution = {width: gl.drawingBufferWidth, height: gl.drawingBufferHeight};
    
    var view = {xOffset: offsetX, yOffset: offsetY, worldWidth: map.width, worldHeight: map.height};
    drawMap(graphicsPrograms, map.terrainGraphics, 0, view);
    
    if(showPassable) {
        drawPassablityMap(graphicsPrograms, map.passabilityMap, view);
    }
    

    /*
    Graphics.drawBox(graphicsPrograms, 
        ScreenLayout.left, ScreenLayout.bottom, ScreenLayout.right - ScreenLayout.left, ScreenLayout.top - ScreenLayout.bottom, 
        [.25,.75,.75,1]);
    
    if(showRotated) { 
        Graphics.drawImage(graphicsPrograms, 
            0, 0, mapBuffer.width, mapBuffer.height, 
            offsetX, offsetY, mapBuffer.width, mapBuffer.height, 
            mapBuffer, 
            [1,1,1,1]);
    } else {
        Graphics.drawImage(graphicsPrograms, 
            0, 0, mapBufferRot.width, mapBufferRot.height, 
            offsetX, offsetY, mapBufferRot.width, mapBufferRot.height, 
            mapBufferRot, 
            [1,1,1,1]);
    }

    Graphics.drawBox(graphicsPrograms, 
        0, ScreenLayout.top - miniMapBuffer.height - 1, miniMapBuffer.width + 1, ScreenLayout.top, 
        [0,0,0,1]);

    if(showPassable) {
        Graphics.drawImage(graphicsPrograms, 
            0, 0, info.passableViewBuffer.width, info.passableViewBuffer.height, 
            offsetX, offsetY, mapBuffer.width, mapBuffer.height, 
            info.passableViewBuffer, 
            [1,0,0,.5]);
    }
    Graphics.drawImage(graphicsPrograms, 
        0, 0, miniMapBuffer.width, miniMapBuffer.height, 
        0, ScreenLayout.top - miniMapBuffer.height, miniMapBuffer.width, miniMapBuffer.height, 
        miniMapBuffer, 
        [1,1,1,1]);

    */
    
}



requestAnimationFrame(frame);


