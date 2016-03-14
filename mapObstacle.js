"use strict";

function getObstacleDistanceMap(passibilityMap, width, height) {
    /*
    For the horizontal map, the value at a given row,col is the distance to the next obstacle on that row when moving right
    For the vertical map, the value at a given row,col is the distance to the next obstacle on that col when moving down
    */
    var distMapHorizontal = new Uint16Array(width * height);
    
    for(var row = 0; row < height; row++) {
        var dist = 0;
        for(var x = width - 1; x >= 0; x--) {
            if(passibilityMap[x + row * width] == 0) {
                dist = 0;
            } else {
                dist++;
            }
            distMapHorizontal[x + row * width] = dist;
        }
        
    }
        
    var distMapVertical   = new Uint16Array(width * height);
    for(var col = 0; col < width; col++) {
        var dist = 0;
        for(var y = height - 1; y >= 0; y--) {
            if(passibilityMap[col + y * width] == 0) {
                dist = 0;
            } else {
                dist++;
            }
            distMapVertical[col + y * width] = dist;
        }
    }
    
    return {
        horizontal: distMapHorizontal,
        vertical: distMapVertical
    }
}


//returns true if it passes, false otherwise
function passLineBox(aX, aY, bX, bY, size, passabilityMap) {
    function testHorizontalLine(xL, xR, y) {
        var pass = (y >= 0 && y < passabilityMap.height && xL >= 0 && passabilityMap.distPassTank.horizontal[xL + y * passabilityMap.width] >= (xR - xL));
        return pass;
    }
    
    function testVerticalLine(yL, yU, x) {
        var pass = (x >= 0 && x < passabilityMap.width && yL >= 0 && passabilityMap.distPassTank.vertical[x + yL * passabilityMap.width] >= (yU - yL));
        return pass;
    }
    
    var dx = bX - aX;
    var dy = bY - aY;
    
    var startX, startY, endX, endY;
    if(Math.abs(dx) > Math.abs(dy)) {
        if(aX < bX) {
            startX = aX;
            startY = aY;
            endX   = bX;
            endY   = bY;
        } else {
            startX = bX;
            startY = bY;
            endX   = aX;
            endY   = aY;
        }
    } else {
        if(aY < bY) {
            startX = aX;
            startY = aY;
            endX   = bX;
            endY   = bY;
        } else {
            startX = bX;
            startY = bY;
            endX   = aX;
            endY   = aY;
        }
    }        
    
    const X1 = startX - size;
    const X2 = startX + size;
    const X3 =   endX - size;
    const X4 =   endX + size;

    const Y1 = startY - size;
    const Y2 = startY + size;
    const Y3 =   endY - size;
    const Y4 =   endY + size;
    
    const x1 = Math.floor(X1);
    const x2 =  Math.ceil(X2);
    const x3 = Math.floor(X3);
    const x4 =  Math.ceil(X4);

    const y1 = Math.floor(Y1);
    const y2 =  Math.ceil(Y2);
    const y3 = Math.floor(Y3);
    const y4 =  Math.ceil(Y4);
    
    if(Math.abs(dx) > Math.abs(dy)) {
        if(startY <= endY) {
            for(var yi = y1; yi < y4; yi++) {
                var xL = yi <  y2 ? x1 : Math.floor(X1 + (X3 - X1) * (yi     - Y2) / (Y4 - Y2));
                var xR = y3 <= yi ? x4 :  Math.ceil(X2 + (X4 - X2) * (yi + 1 - Y1) / (Y3 - Y1));
                if(!testHorizontalLine(xL, xR, yi))
                    return false;
            }
        } else {
            for(var yi = y3; yi < y2; yi++) {
                var xL = y1 <= yi ? x1 : Math.floor(X1 + (X3 - X1) * (yi + 1 - Y1) / (Y3 - Y1));
                var xR = yi <  y4 ? x4 :  Math.ceil(X2 + (X4 - X2) * (yi     - Y2) / (Y4 - Y2));
                if(!testHorizontalLine(xL, xR, yi)) 
                    return false;
            }
        }
    } else {
        if(startX <= endX) {
            for(var xi = x1; xi < x4; xi++) {
                var yL = xi <  x2 ? y1 : Math.floor(Y1 + (Y3 - Y1) * (xi     - X2) / (X4 - X2));
                var yU = x3 <= xi ? y4 :  Math.ceil(Y2 + (Y4 - Y2) * (xi + 1 - X1) / (X3 - X1));
                if(!testVerticalLine(yL, yU, xi))
                    return false;
            }
        } else {
            for(var xi = x3; xi < x2; xi++) {
                var yL = x1 <= xi ? y1 : Math.floor(Y1 + (Y3 - Y1) * (xi + 1 - X1) / (X3 - X1));
                var yU = xi <  x4 ? y4 :  Math.ceil(Y2 + (Y4 - Y2) * (xi     - X2) / (X4 - X2));
                if(!testVerticalLine(yL, yU, xi))
                    return false;
            }
        }
    }
    return true;
}


function drawPassablityMap(graphicsPrograms, passabilityMap, view ) {
    var offset = convertToScreen({x: 0, y: 0}, view);
    var xOffset = offset.x;
    var yOffset = offset.y;
    
    Graphics.drawImage(graphicsPrograms, 
        0, 0, passabilityMap.passableBuffer.width, passabilityMap.passableBuffer.height, 
        xOffset, yOffset, passabilityMap.passableBuffer.width * SUB_TILE_WIDTH, passabilityMap.passableBuffer.height * SUB_TILE_HEIGHT, 
        passabilityMap.passableBuffer, [1,1,1,.5]);
}
