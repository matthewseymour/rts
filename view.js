function convertToScreen(position, view){
    return {x: (position.x - view.xOffset) * SUB_TILE_WIDTH, y: (position.y - view.yOffset) * SUB_TILE_HEIGHT}
}

function convertToWorld(position, view){
    return {x: position.x / SUB_TILE_WIDTH + view.xOffset, y: position.y / SUB_TILE_HEIGHT + view.yOffset}
}