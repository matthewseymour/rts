function convertToScreen(position, view){
    return {x: (position.x - view.xOffset) * SUB_TILE_WIDTH, y: (position.y - view.yOffset) * SUB_TILE_HEIGHT}
}

function convertToWorld(position, view){
    return {x: position.x / SUB_TILE_WIDTH + view.xOffset, y: position.y / SUB_TILE_HEIGHT + view.yOffset}
}

function getViewWindow(view) {
    var xL = view.xOffset + ScreenLayout.sideBarRight / SUB_TILE_WIDTH;
    var yB = view.yOffset;
    var xR = xL + (ScreenLayout.right - ScreenLayout.sideBarRight) / SUB_TILE_WIDTH;
    var yT = yB + (ScreenLayout.top - ScreenLayout.bottom) / SUB_TILE_HEIGHT;
    
    return {left: xL, right: xR, top: yT, bottom: yB};
}

function enforceBounds(view) {
    //Order matters here, if the game ScreenLayout is larger than the entire map we want
    // the map pinned to the top left.
    if(view.yOffset < 0) {
        view.yOffset = 0;
    }
    
    var maxY = view.worldHeight - ScreenLayout.top / SUB_TILE_HEIGHT;
    if(view.yOffset > maxY) {
        view.yOffset = maxY;
    }
    
    var maxX = view.worldWidth - ScreenLayout.right / SUB_TILE_WIDTH;
    if(view.xOffset > maxX) {
        view.xOffset = maxX;
    }

    var minX = -ScreenLayout.sideBarRight / SUB_TILE_WIDTH;
    if(view.xOffset < minX) {
        view.xOffset = minX;
    }
}

function moveView(view, dir) {
    view.xOffset += dir.x;
    view.yOffset += dir.y;
    
    enforceBounds(view);
}

function centerView(view, point) {
    var screenWidthInTiles = (ScreenLayout.right - ScreenLayout.sideBarRight) / SUB_TILE_WIDTH;
    var screenHeightInTiles = (ScreenLayout.top - ScreenLayout.bottom) / SUB_TILE_HEIGHT;
    
    view.xOffset = point.x - screenWidthInTiles / 2 - ScreenLayout.sideBarRight / SUB_TILE_WIDTH;
    view.yOffset = point.y - screenHeightInTiles / 2;

    enforceBounds(view);
}
