function convertToScreen(position, view){
    return {x: (position.x - view.xOffset) * SUB_TILE_WIDTH, y: (position.y - view.yOffset) * SUB_TILE_HEIGHT}
}

function convertToWorld(position, view){
    return {x: position.x / SUB_TILE_WIDTH + view.xOffset, y: position.y / SUB_TILE_HEIGHT + view.yOffset}
}

function getViewWindow(view) {
    var xL = view.xOffset + screen.sideBarRight / SUB_TILE_WIDTH;
    var yB = view.yOffset;
    var xR = xL + (screen.right - screen.sideBarRight) / SUB_TILE_WIDTH;
    var yT = yB + (screen.top - screen.bottom) / SUB_TILE_HEIGHT;
    
    return {left: xL, right: xR, top: yT, bottom: yB};
}

function enforceBounds(view) {
    //Order matters here, if the game screen is larger than the entire map we want
    // the map pinned to the top left.
    if(view.yOffset < 0) {
        view.yOffset = 0;
    }
    
    var maxY = view.worldHeight - screen.top / SUB_TILE_HEIGHT;
    if(view.yOffset > maxY) {
        view.yOffset = maxY;
    }
    
    var maxX = view.worldWidth - screen.right / SUB_TILE_WIDTH;
    if(view.xOffset > maxX) {
        view.xOffset = maxX;
    }

    var minX = -screen.sideBarRight / SUB_TILE_WIDTH;
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
    var screenWidthInTiles = (screen.right - screen.sideBarRight) / SUB_TILE_WIDTH;
    var screenHeightInTiles = (screen.top - screen.bottom) / SUB_TILE_HEIGHT;
    
    view.xOffset = point.x - screenWidthInTiles / 2 - screen.sideBarRight / SUB_TILE_WIDTH;
    view.yOffset = point.y - screenHeightInTiles / 2;

    enforceBounds(view);
}