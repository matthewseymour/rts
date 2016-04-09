"use strict";

function drawMiniMapViewPort(graphicsPrograms, view) {
    var screenView = getViewWindow(view);
    
    var topLeft = convertWorldToMinimap({x: screenView.left, y: screenView.top}, view);
    var bottomRight = convertWorldToMinimap({x: screenView.right, y: screenView.bottom}, view);
    
    var coords = {
        left: Math.floor(topLeft.x),
        right: Math.ceil(bottomRight.x),
        top: Math.floor(topLeft.y),
        bottom: Math.ceil(bottomRight.y)
    };
    
    var screenViewColor = [1,1,1,.75];
    Graphics.drawLine(graphicsPrograms, coords.left, coords.bottom, coords.right, coords.bottom, screenViewColor);
    Graphics.drawLine(graphicsPrograms, coords.right, coords.bottom, coords.right, coords.top, screenViewColor);
    Graphics.drawLine(graphicsPrograms, coords.right, coords.top, coords.left, coords.top, screenViewColor);
    Graphics.drawLine(graphicsPrograms, coords.left, coords.top, coords.left, coords.bottom, screenViewColor);
    
}

function drawMiniMap(graphicsPrograms, miniMap) {
    
    var miniMapWidth = miniMap.miniMapBuffer.width;
    var miniMapHeight = miniMap.miniMapBuffer.height;
    //Note, cutting off the top row and right column of pixels because they can be empty it seems:
    Graphics.drawBox(graphicsPrograms, 
        ScreenLayout.miniMapLeft, ScreenLayout.miniMapTop - (miniMapHeight + 1), miniMapWidth + 1, miniMapHeight + 1, 
        [1,1,1,1]);
         
   Graphics.drawImage(graphicsPrograms, 
        0, 0, miniMapWidth - 1, miniMapHeight - 1, 
        ScreenLayout.miniMapLeft + 1, ScreenLayout.miniMapTop - (miniMapHeight + 1) + 1, miniMapWidth - 1, miniMapHeight - 1, 
        miniMap.miniMapBuffer, 
        [1,1,1,1]);
        
    

}
