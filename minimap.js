"use strict";

function getMiniMap(graphicsPrograms, terrainGraphcs) {
    var miniMapBuffer = glUtils.makeFrameBuffer(MINI_MAP_SIZE, MINI_MAP_SIZE, gl.NEAREST);
    
    
    graphicsPrograms.gl.bindFramebuffer(gl.FRAMEBUFFER, miniMapBuffer.frameBuffer);
    graphicsPrograms.gl.enable(gl.BLEND);
    graphicsPrograms.gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    graphicsPrograms.gl.viewport(0, 0, MINI_MAP_SIZE, MINI_MAP_SIZE);
    
    graphicsPrograms.resolution = {width: MINI_MAP_SIZE, height: MINI_MAP_SIZE};
    
    graphics.drawSprite(graphicsPrograms, 
        0, 0, terrainGraphcs.landBuffer.width, terrainGraphcs.landBuffer.height, 
        0, 0, miniMapBuffer.width, miniMapBuffer.height, 
        terrainGraphcs.landBuffer, 
        [1,1,1,1]);
        
    graphics.drawSprite(graphicsPrograms, 
        0, 0, terrainGraphcs.waterBuffer.width, terrainGraphcs.waterBuffer.height, 
        0, 0, miniMapBuffer.width, miniMapBuffer.height, 
        terrainGraphcs.waterBuffer, [1,1,1,1]);

        
    return {miniMapBuffer: miniMapBuffer};
}

function drawMiniMap(graphicsPrograms, miniMap, view) {
    
    var miniMapWidth = miniMap.miniMapBuffer.width;
    var miniMapHeight = miniMap.miniMapBuffer.height;
    
    graphics.drawBox(graphicsPrograms, 
        screen.miniMapLeft, screen.miniMapTop - (miniMapHeight + 2), miniMapWidth + 2, miniMapHeight + 2, 
        [1,1,1,1]);
         
   graphics.drawSprite(graphicsPrograms, 
        0, 0, miniMapWidth, miniMapHeight, 
        screen.miniMapLeft + 1, screen.miniMapTop - (miniMapHeight + 2) + 1, miniMapWidth, miniMapHeight, 
        miniMap.miniMapBuffer, 
        [1,1,1,1]);
        
    var screenView = getViewWindow(view);
    
    var coords = {
        left: Math.floor(screenView.left * miniMapWidth / view.worldWidth + (screen.miniMapLeft + 1)),
        right: Math.ceil(screenView.right * miniMapWidth / view.worldWidth + (screen.miniMapLeft + 1)),
        top: Math.floor(screenView.top * miniMapHeight / view.worldHeight + screen.miniMapTop - (miniMapHeight + 2) + 1),
        bottom: Math.ceil(screenView.bottom * miniMapHeight / view.worldHeight + screen.miniMapTop - (miniMapHeight + 2) + 1)
    };
    
    var screenViewColor = [1,1,1,.75];
    graphics.drawLine(graphicsPrograms, coords.left, coords.bottom, coords.right, coords.bottom, screenViewColor);
    graphics.drawLine(graphicsPrograms, coords.right, coords.bottom, coords.right, coords.top, screenViewColor);
    graphics.drawLine(graphicsPrograms, coords.right, coords.top, coords.left, coords.top, screenViewColor);
    graphics.drawLine(graphicsPrograms, coords.left, coords.top, coords.left, coords.bottom, screenViewColor);
    

}