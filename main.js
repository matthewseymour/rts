//Matthew Seymour, matthew dot seymour at gmail.com

"use strict";

const SUB_TILE_WIDTH = 8;
const SUB_TILE_HEIGHT = 6;
const SCROLL_RATE = 8;
const UPDATE_PERIOD = 100;
const UNIT_SIZE = 2;





var gl = screen.canvas.getContext("experimental-webgl", 
{
    alpha: false,
    antialias: true
});

var floatTextureExtension = gl.getExtension("OES_texture_float");
if (!floatTextureExtension) {
    alert("float textures not supported");
}



function changeScissorDims() {
    graphicsPrograms.gl.scissor(screen.left, screen.bottom, screen.right - screen.left, screen.top - screen.bottom);
}

screen.onResize.push(changeScissorDims);

var graphicsPrograms = graphics.getGraphicsPrograms(gl);
var fftProgs = fft.getPrograms(gl);



function makeNewGame(mapSize){
    var game = {};
    game.map = genMap(fftProgs, mapSize);
    game.pathfindView = buildNodeListView(gl, game.map.pathfindNodeInfo);
    
    return game;
}




var game = makeNewGame(256);

var testObs = getObstacle(90, 90, 6);
var testObsPosition = {x: 90, y: 90};
addObstacle(game.map.obstacleStore, testObs);
var testPathfinder = getPathfinder(game.map.pathfindNodeInfo);

var pathfindStart = {x: 128.7, y: 128.3};
var pathfindEnd = {x: 0, y: 0};
var path = [];

var currentMousePos = {x: 0, y: 0};

var lastTime = 0;
var timeAcc = 0;
var showPassable = false;
var showPathfind = false;
var view = {xOffset: 0, yOffset: 0, worldWidth: game.map.width, worldHeight: game.map.height}

centerView(view, pathfindStart);
screen.onResize.push(fixViewOnResize);

function fixViewOnResize() {
    enforceBounds(view);
}

function onMouseDown() {
}

function onMouseMove(e) {
	currentMousePos = getMousePosition(e, screen.canvas);
}

function onKeyDown(args) {
    switch(args.keyCode) {
        case KeyCodeEnum.LEFT:
            moveView(view, {x: -SCROLL_RATE, y: 0});
            break;
        case KeyCodeEnum.RIGHT:
            moveView(view, {x:  SCROLL_RATE, y: 0});
            break;
        case KeyCodeEnum.UP:
            moveView(view, {x: 0, y: SCROLL_RATE});
            break;
        case KeyCodeEnum.DOWN:
            moveView(view, {x: 0, y: -SCROLL_RATE});
            break;
            
        case KeyCodeEnum.M:
            showPassable = !showPassable;
            break;
        case KeyCodeEnum.P:
            showPathfind = !showPathfind;
            break;
        
    }
    
    
}

screen.canvas.addEventListener("mousedown", onMouseDown, false);
screen.canvas.addEventListener("mousemove", onMouseMove, false);
document.onkeydown = onKeyDown;

function drawMapElements(graphicsPrograms, game, view, timeDiff) {
    var scissorBoxDims = graphicsPrograms.gl.getParameter(graphicsPrograms.gl.SCISSOR_BOX);
    
    graphicsPrograms.gl.scissor(screen.sideBarRight, screen.bottom, screen.right - screen.sideBarRight, screen.top - screen.bottom);
    
    drawMap(graphicsPrograms, game.map.terrainGraphics, timeDiff, view);
    
    if(showPassable) {
        drawPassablityMap(graphicsPrograms, game.map.passabilityMap, view);
    }
    
    if(showPathfind) {
        drawNodeListView(graphicsPrograms, game.pathfindView, view);
    }
    drawObstacleStore(graphicsPrograms, game.map.obstacleStore, view);
    
    
    
    
    for(var i = 0; i < path.length - 1; i++) {
        var p1 = convertToScreen(path[i], view);
        var p2 = convertToScreen(path[i + 1], view);
    
        var color = testPathfinder.finished ? [1,1,0,1] : [1,0,0,1];
        graphics.drawLine(graphicsPrograms, p1.x, p1.y, p2.x, p2.y, color);
    }
    
    
    graphicsPrograms.gl.scissor(scissorBoxDims[0], scissorBoxDims[1], scissorBoxDims[2], scissorBoxDims[3]);
}


function frame(timestamp) {
    var timeDiff = timestamp - lastTime;
    lastTime = timestamp;
    
    timeAcc += timeDiff;
    if(timeAcc > UPDATE_PERIOD) {
        while(timeAcc > UPDATE_PERIOD)
            timeAcc -= UPDATE_PERIOD;
        
        testObsPosition.y += .1;
        moveObstacle(game.map.obstacleStore, testObs, testObsPosition.x, testObsPosition.y);
        
    }
    
    
    
      
    graphicsPrograms.gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    graphicsPrograms.gl.enable(gl.BLEND);
    graphicsPrograms.gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    
    graphicsPrograms.gl.viewport(screen.left, screen.bottom, screen.right - screen.left, screen.top - screen.bottom);
    
    graphicsPrograms.gl.scissor(screen.left, screen.bottom, screen.right - screen.left, screen.top - screen.bottom);
    graphicsPrograms.gl.enable(graphicsPrograms.gl.SCISSOR_TEST);
    
    
    graphicsPrograms.resolution = {width: gl.drawingBufferWidth, height: gl.drawingBufferHeight};
    
    drawMapElements(graphicsPrograms, game, view, timeDiff);
    
    
    var size = 2;
    var a = {x: 80.5, y: 80.5};
    
    var b = convertToWorld(currentMousePos, view);
    
    if(b.x != pathfindEnd.x || b.y != pathfindEnd.y) {
        pathfindEnd = b;
        startNewPath(testPathfinder, game.map.pathfindNodeInfo, pathfindStart, pathfindEnd)
    }
    

    if(!testPathfinder.finished) {
        iteratePath(testPathfinder, game.map.pathfindNodeInfo, game.map.obstacleStore);
    }
    
    path = getPath(testPathfinder, game.map.pathfindNodeInfo, game.map.obstacleStore, game.map.passabilityMap);

    
    drawMiniMap(graphicsPrograms, game.map.miniMap, view);
    
    
    
    requestAnimationFrame(frame);
}



requestAnimationFrame(frame);


