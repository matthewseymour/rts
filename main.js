//Matthew Seymour, matthew dot seymour at gmail.com

"use strict";

const SUB_TILE_WIDTH = 8;
const SUB_TILE_HEIGHT = 6;
const SCROLL_RATE = 6;
const UPDATE_PERIOD = 100;
const UNIT_SIZE = 2;





var gl = ScreenLayout.canvas.getContext("webgl", 
{
    alpha: false,
    antialias: true
});

var floatTextureExtension = gl.getExtension("OES_texture_float");
if (!floatTextureExtension) {
    alert("float textures not supported");
}
var depthTextureExtension = gl.getExtension("WEBGL_depth_texture");
if (!depthTextureExtension) {
    alert("depth textures not supported");
}

var glParameters = {};
glParameters.MAX_TEXTURE_SIZE = gl.getParameter(gl.MAX_TEXTURE_SIZE);

console.log("Max texture size: " + glParameters.MAX_TEXTURE_SIZE.toString());

function changeScissorDims() {
    graphicsPrograms.gl.scissor(ScreenLayout.left, ScreenLayout.bottom, ScreenLayout.right - ScreenLayout.left, ScreenLayout.top - ScreenLayout.bottom);
}

ScreenLayout.onResize.push(changeScissorDims);

var graphicsPrograms = Graphics.getGraphicsPrograms(gl);
var fftProgs = Compute.getPrograms(gl);





function makeNewGame(mapSize){
    var game = {};
    game.map = genMap(fftProgs, mapSize);
    game.pathfindView = buildNodeListView(gl, game.map.pathfindNodeInfo);
    
    game.units = [];
    
    for(var i = 0; i < 10; i++) {
        var position = {x:0, y: 0};
        do {
            position.x = Math.random() * game.map.width;
            position.y = Math.random() * game.map.height;
        } while(!Pathfind.canPlace(game.map, position, UNIT_SIZE));
        
        game.units.push(Unit.makeNewUnit(position, game));
    }
    
    return game;
}

var assets = {};

function initAssets() {
    assets.mediumTankBaseTexture0 = Asset.loadTexture(gl, "medtankbase_0.png");
    assets.mediumTankBaseTexture1 = Asset.loadTexture(gl, "medtankbase_1.png");
    assets.mediumTankBaseTexture2 = Asset.loadTexture(gl, "medtankbase_2.png");
    assets.mediumTankBaseTexture3 = Asset.loadTexture(gl, "medtankbase_3.png");
    assets.mediumTankTurretTexture0 = Asset.loadTexture(gl, "medtankturret_0.png");
    assets.mediumTankTurretTexture1 = Asset.loadTexture(gl, "medtankturret_1.png");
    assets.mediumTankTurretTexture2 = Asset.loadTexture(gl, "medtankturret_2.png");
    assets.mediumTankTurretTexture3 = Asset.loadTexture(gl, "medtankturret_3.png");

}

initAssets();
var game = makeNewGame(300);//375);

var lastTime = 0;
var timeAcc = 0;
var showPassable = false;
var showPathfind = false;
var pause = false;
var view = {xOffset: 0, yOffset: 0, worldWidth: game.map.width, worldHeight: game.map.height}

var textWriters = Text.buildDefaultWriters(graphicsPrograms);

var keyState = [];
keyState[KeyCodeEnum.LEFT]  = keyStateEnum.KEY_UP;
keyState[KeyCodeEnum.RIGHT] = keyStateEnum.KEY_UP;
keyState[KeyCodeEnum.UP]    = keyStateEnum.KEY_UP;
keyState[KeyCodeEnum.DOWN]  = keyStateEnum.KEY_UP;

//centerView(view, pathfindStart);
ScreenLayout.onResize.push(fixViewOnResize);

function fixViewOnResize() {
    enforceBounds(view);
}

function onMouseDown() {
}

function onMouseMove(e) {
	//currentMousePos = getMousePosition(e, ScreenLayout.canvas);
}

function onKeyDown(args) {
    switch(args.keyCode) {
        case KeyCodeEnum.LEFT:
            keyState[KeyCodeEnum.LEFT] = keyStateEnum.KEY_DOWN;
            break;
        case KeyCodeEnum.RIGHT:
            keyState[KeyCodeEnum.RIGHT] = keyStateEnum.KEY_DOWN;
            break;
        case KeyCodeEnum.UP:
            keyState[KeyCodeEnum.UP]  = keyStateEnum.KEY_DOWN;
            break;
        case KeyCodeEnum.DOWN:
            keyState[KeyCodeEnum.DOWN]  = keyStateEnum.KEY_DOWN;
            break;
            
        case KeyCodeEnum.M:
            showPassable = !showPassable;
            break;
        case KeyCodeEnum.N:
            showPathfind = !showPathfind;
            break;
        case KeyCodeEnum.P:
            pause = !pause;
            break;
    }
}


function onKeyUp(args) {
    switch(args.keyCode) {
        case KeyCodeEnum.LEFT:
            keyState[KeyCodeEnum.LEFT] = keyStateEnum.KEY_UP;
            break;
        case KeyCodeEnum.RIGHT:
            keyState[KeyCodeEnum.RIGHT] = keyStateEnum.KEY_UP;
            break;
        case KeyCodeEnum.UP:
            keyState[KeyCodeEnum.UP]  = keyStateEnum.KEY_UP;
            break;
        case KeyCodeEnum.DOWN:
            keyState[KeyCodeEnum.DOWN]  = keyStateEnum.KEY_UP;
            break;
    }
}


ScreenLayout.canvas.addEventListener("mousedown", onMouseDown, false);
ScreenLayout.canvas.addEventListener("mousemove", onMouseMove, false);
document.onkeydown = onKeyDown;
document.onkeyup = onKeyUp;

var fpsMeasure = {
    samples: 0,
    total: 0,
    lastFps: 0
}

function updateGame(game) {
    for(var i = 0; i < game.units.length; i++) {
        Unit.updateUnit(game.units[i], game);
    }
}

function drawMapElements(graphicsPrograms, game, view, timeDiff, timeAccRatio) {
    var scissorBoxDims = graphicsPrograms.gl.getParameter(graphicsPrograms.gl.SCISSOR_BOX);
    
    graphicsPrograms.gl.scissor(ScreenLayout.sideBarRight, ScreenLayout.bottom, ScreenLayout.right - ScreenLayout.sideBarRight, ScreenLayout.top - ScreenLayout.bottom);
    
    drawMap(graphicsPrograms, game.map.terrainGraphics, timeDiff, view);
    
    if(showPassable) {
        drawPassablityMap(graphicsPrograms, game.map.passabilityMap, view);
    }
    
    if(showPathfind) {
        drawNodeListView(graphicsPrograms, game.pathfindView, view);
    }
    //drawObstacleStore(graphicsPrograms, game.map.obstacleStore, view);
    
    for(var i = 0; i < game.units.length; i++) {
        Unit.drawUnit(game.units[i], game.map, view, timeAccRatio, gl, assets);
    }
    
    graphicsPrograms.gl.scissor(scissorBoxDims[0], scissorBoxDims[1], scissorBoxDims[2], scissorBoxDims[3]);
}


function frame(timestamp) {
    var timeDiff = timestamp - lastTime;
    lastTime = timestamp;
    
    fpsMeasure.samples++;
    fpsMeasure.total += timeDiff;
    if(fpsMeasure.samples == 10) {
        fpsMeasure.lastFps = 1000 / (fpsMeasure.total / fpsMeasure.samples);
        fpsMeasure.samples = 0;
        fpsMeasure.total = 0;
    }
    
    



    if(keyState[KeyCodeEnum.LEFT] == keyStateEnum.KEY_DOWN) {
        moveView(view, {x: -SCROLL_RATE, y: 0});
    }
    if(keyState[KeyCodeEnum.RIGHT] == keyStateEnum.KEY_DOWN) {
        moveView(view, {x:  SCROLL_RATE, y: 0});
    }
    if(keyState[KeyCodeEnum.UP] == keyStateEnum.KEY_DOWN) {
        moveView(view, {x: 0, y: SCROLL_RATE});
    }
    if(keyState[KeyCodeEnum.DOWN] == keyStateEnum.KEY_DOWN) {
        moveView(view, {x: 0, y: -SCROLL_RATE});
    }

    
    
    
    
    
    
    
    
    
    if(!pause) {
        timeAcc += timeDiff;
    }
    
    if(timeAcc > UPDATE_PERIOD) {
        while(timeAcc > UPDATE_PERIOD)
            timeAcc -= UPDATE_PERIOD;
        
        updateGame(game);
    }
    
    
    
      
    graphicsPrograms.gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    
    graphicsPrograms.gl.enable(gl.BLEND);
    graphicsPrograms.gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    
    gl.disable(gl.DEPTH_TEST);
    
    graphicsPrograms.gl.viewport(ScreenLayout.left, ScreenLayout.bottom, ScreenLayout.right - ScreenLayout.left, ScreenLayout.top - ScreenLayout.bottom);
    
    graphicsPrograms.gl.scissor(ScreenLayout.left, ScreenLayout.bottom, ScreenLayout.right - ScreenLayout.left, ScreenLayout.top - ScreenLayout.bottom);
    graphicsPrograms.gl.enable(graphicsPrograms.gl.SCISSOR_TEST);
    
    
    
    graphicsPrograms.resolution = {width: gl.drawingBufferWidth, height: gl.drawingBufferHeight};
    
    drawMapElements(graphicsPrograms, game, view, timeDiff, timeAcc / UPDATE_PERIOD);
    
    drawMiniMap(graphicsPrograms, game.map.miniMap, view);
    
    
    
    
    graphicsPrograms.gl.scissor(ScreenLayout.left, ScreenLayout.bottom, ScreenLayout.right - ScreenLayout.left, ScreenLayout.top - ScreenLayout.bottom);
    textWriters[16].writeTextRight(Math.round(fpsMeasure.lastFps.toString()) + " FPS", [1,1,1,1], ScreenLayout.right - 10, ScreenLayout.top - 10);
    
    
    requestAnimationFrame(frame);
}



requestAnimationFrame(frame);


