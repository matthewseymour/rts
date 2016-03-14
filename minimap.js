"use strict";



function drawMiniMap(graphicsPrograms, miniMap, view) {
    
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
        
    var screenView = getViewWindow(view);
    
    var coords = {
        left: Math.floor(screenView.left * miniMapWidth / view.worldWidth + (ScreenLayout.miniMapLeft + 1)),
        right: Math.ceil(screenView.right * miniMapWidth / view.worldWidth + (ScreenLayout.miniMapLeft + 1)),
        top: Math.floor(screenView.top * miniMapHeight / view.worldHeight + ScreenLayout.miniMapTop - (miniMapHeight + 1) + 1),
        bottom: Math.ceil(screenView.bottom * miniMapHeight / view.worldHeight + ScreenLayout.miniMapTop - (miniMapHeight + 1) + 1)
    };
    
    var screenViewColor = [1,1,1,.75];
    Graphics.drawLine(graphicsPrograms, coords.left, coords.bottom, coords.right, coords.bottom, screenViewColor);
    Graphics.drawLine(graphicsPrograms, coords.right, coords.bottom, coords.right, coords.top, screenViewColor);
    Graphics.drawLine(graphicsPrograms, coords.right, coords.top, coords.left, coords.top, screenViewColor);
    Graphics.drawLine(graphicsPrograms, coords.left, coords.top, coords.left, coords.bottom, screenViewColor);
    

}
