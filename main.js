//Matthew Seymour, matthew dot seymour at gmail.com

"use strict";

const SUB_TILE_WIDTH = 8;
const SUB_TILE_HEIGHT = 6;
const Z_SCALE = Math.sqrt(1 - Math.pow(SUB_TILE_HEIGHT / SUB_TILE_WIDTH, 2));
const SCROLL_RATE = 6;
var UPDATE_PERIOD = 100;
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

var instancedArraysExtension = gl.getExtension("ANGLE_instanced_arrays");
if (!instancedArraysExtension) {
    alert("instanced arrays not supported");
}

var glParameters = {};
glParameters.MAX_TEXTURE_SIZE = gl.getParameter(gl.MAX_TEXTURE_SIZE);

console.log("Max texture size: " + glParameters.MAX_TEXTURE_SIZE.toString());

function changeScissorDims() {
    graphicsPrograms.gl.scissor(ScreenLayout.left, ScreenLayout.bottom, ScreenLayout.right - ScreenLayout.left, ScreenLayout.top - ScreenLayout.bottom);
}

ScreenLayout.onResize.push(changeScissorDims);

var graphicsPrograms = Graphics.getGraphicsPrograms(gl, instancedArraysExtension);
var computeProgs = Compute.getPrograms(gl);









function initAssets() {
    var assets = {};
    
    function genOutline(spriteSheet) {
        gl.flush();
        for(var i = 0; i < spriteSheet.textures.length; i++) {
            Asset.generateOutline(graphicsPrograms, spriteSheet.textures[i]);
        }
    }
    
    assets.mediumTankBase   = Asset.loadSpriteSheet(gl, ["medtankbase_0.png"  , "medtankbase_1.png"  , "medtankbase_2.png"  , "medtankbase_3.png"  ], 
                                                        {numRotations: 72, spriteWidth: 60,  spriteHeight: 60}, genOutline);
    assets.mediumTankTurret = Asset.loadSpriteSheet(gl, ["medtankturret_0.png", "medtankturret_1.png", "medtankturret_2.png", "medtankturret_3.png"], 
                                                        {numRotations: 72, spriteWidth: 60,  spriteHeight: 60}, genOutline);
    assets.excavator        = Asset.loadSpriteSheet(gl, ["excavator_0.png"    , "excavator_1.png"    , "excavator_2.png"    , "excavator_3.png"    ], 
                                                        {numRotations: 72, spriteWidth: 110, spriteHeight: 134}, genOutline);
    assets.heavyTankBase    = Asset.loadSpriteSheet(gl, ["heavytankbase_0.png"  , "heavytankbase_1.png"  , "heavytankbase_2.png"  , "heavytankbase_3.png"  ], 
                                                        {numRotations: 72, spriteWidth: 60,  spriteHeight: 60}, genOutline);
    assets.heavyTankTurret  = Asset.loadSpriteSheet(gl, ["heavytankturret_0.png", "heavytankturret_1.png", "heavytankturret_2.png", "heavytankturret_3.png"], 
                                                        {numRotations: 72, spriteWidth: 60,  spriteHeight: 60}, genOutline);
    
    return assets;
}

var assets = initAssets();
var unitTypes = UnitTypes.getUnitTypes(assets);
var game = Game.makeNewGame(computeProgs, 225, unitTypes);//375);

var lastTime = 0;
var timeAcc = 0;
var viewOptions = {
    showPassable: false,
    showPathfind: false,
    showObstacles: false,
    showUnitId: false,
    flashUpdate: false,
};
var fpsMeasure = {
    samples: 0,
    total: 0,
    lastFps: 0
}
var pause = false;
var view = {xOffset: 0, yOffset: 0, worldWidth: game.map.width, worldHeight: game.map.height}
centerView(view, game.playerStartPositions[0]);

var textWriters = Text.buildDefaultWriters(graphicsPrograms);

var keyState = [];
for(var key in KeyCodeEnum) {
    keyState[KeyCodeEnum[key]] = KeyStateEnum.KEY_UP;
}

var MouseStateEnum = {
    NO_BUTTON: 0,
    LMB_DRAG: 1,
};

var mouseState = {
    currentPosition: {x: 0, y: 0},
    dragStartPosition: {x: 0, y: 0},
    state: MouseStateEnum.NO_BUTTON,
};


ScreenLayout.onResize.push(fixViewOnResize);

function fixViewOnResize() {
    enforceBounds(view);
}

function onContextMenu(e) {
	e.preventDefault();
}


function onMouseDown(e) {
    var position = getMousePosition(e, ScreenLayout.canvas);
    if(e.button == MouseClickEnum.left && positionInMapView(position)) {
	    mouseState.dragStartPosition = position;
        mouseState.state = MouseStateEnum.LMB_DRAG;
    }
    if(e.button == MouseClickEnum.right && positionInMapView(position)) {
        for(var i = 0; i < game.selectedUnits.length; i++) {
            var unit = game.selectedUnits[i];
            Unit.commandMove(unit, game, convertToWorld(position, view));
        }
    }
    
}

function onMouseUp(e) {
    if(e.button == MouseClickEnum.left && mouseState.state == MouseStateEnum.LMB_DRAG) {
        mouseState.state = MouseStateEnum.NO_BUTTON;
        SelectUnits.selectBox(game, convertToWorld(mouseState.dragStartPosition, view), convertToWorld(mouseState.currentPosition, view), timeAcc / UPDATE_PERIOD);
    }
    
}

function onMouseMove(e) {
    var position = getMousePosition(e, ScreenLayout.canvas);
    if(mouseState.state == MouseStateEnum.LMB_DRAG)
        forcePositionInMapView(position);
	
    mouseState.currentPosition = position;
}

function onKeyDown(args) {
    if(keyState[args.keyCode]) 
        keyState[args.keyCode] = KeyStateEnum.KEY_DOWN;
    
    switch(args.keyCode) {
        case KeyCodeEnum.PLUS: 
            UPDATE_PERIOD = Math.max(10, UPDATE_PERIOD - 10);
            break;
        case KeyCodeEnum.MINUS: 
            UPDATE_PERIOD += 10;
            break;
        case KeyCodeEnum.F: 
            viewOptions.flashUpdate = !viewOptions.flashUpdate;
            break;
        case KeyCodeEnum.I:
            if(keyState[KeyCodeEnum.V] == KeyStateEnum.KEY_DOWN) {
                viewOptions.showUnitId = !viewOptions.showUnitId;
            }
            break;
        case KeyCodeEnum.M:
            if(keyState[KeyCodeEnum.V] == KeyStateEnum.KEY_DOWN) {
                viewOptions.showPassable = !viewOptions.showPassable;
            }
            break;
        case KeyCodeEnum.O:
            if(keyState[KeyCodeEnum.V] == KeyStateEnum.KEY_DOWN) {
                viewOptions.showObstacles = !viewOptions.showObstacles;
            }
            break;
        case KeyCodeEnum.P:
            if(keyState[KeyCodeEnum.V] == KeyStateEnum.KEY_DOWN) {
                viewOptions.showPathfind = !viewOptions.showPathfind;
            } else {
                pause = !pause;
            }
            break;
        
        case KeyCodeEnum.Q: 
            if(keyState[KeyCodeEnum.NUM_1] == KeyStateEnum.KEY_DOWN) {
                game.teams[3].color[0][0] += 10/255;
            } else if(keyState[KeyCodeEnum.NUM_2] == KeyStateEnum.KEY_DOWN) {
                game.teams[3].color[1][0] += 10/255;
            } else if(keyState[KeyCodeEnum.NUM_3] == KeyStateEnum.KEY_DOWN) {
                game.teams[3].color[2][0] += 10/255;
            }
            for(var i = 0; i < 3; i ++) {
                game.teams[3].color[i][0] = Math.min(1, game.teams[3].color[i][0]);
            }
            console.log(game.teams[3].color);
            break;
        case KeyCodeEnum.W: 
            if(keyState[KeyCodeEnum.NUM_1] == KeyStateEnum.KEY_DOWN) {
                game.teams[3].color[0][0] -= 10/255;
            } else if(keyState[KeyCodeEnum.NUM_2] == KeyStateEnum.KEY_DOWN) {
                game.teams[3].color[1][0] -= 10/255;
            } else if(keyState[KeyCodeEnum.NUM_3] == KeyStateEnum.KEY_DOWN) {
                game.teams[3].color[2][0] -= 10/255;
            }
            for(var i = 0; i < 3; i ++) {
                game.teams[3].color[i][0] = Math.max(0, game.teams[3].color[i][0]);
            }
            console.log(game.teams[3].color);
            break;
        case KeyCodeEnum.A: 
            if(keyState[KeyCodeEnum.NUM_1] == KeyStateEnum.KEY_DOWN) {
                game.teams[3].color[0][1] += 10/255;
            } else if(keyState[KeyCodeEnum.NUM_2] == KeyStateEnum.KEY_DOWN) {
                game.teams[3].color[1][1] += 10/255;
            } else if(keyState[KeyCodeEnum.NUM_3] == KeyStateEnum.KEY_DOWN) {
                game.teams[3].color[2][1] += 10/255;
            }
            for(var i = 0; i < 3; i ++) {
                game.teams[3].color[i][1] = Math.min(1, game.teams[3].color[i][1]);
            }
            console.log(game.teams[3].color);
            break;
        case KeyCodeEnum.S: 
            if(keyState[KeyCodeEnum.NUM_1] == KeyStateEnum.KEY_DOWN) {
                game.teams[3].color[0][1] -= 10/255;
            } else if(keyState[KeyCodeEnum.NUM_2] == KeyStateEnum.KEY_DOWN) {
                game.teams[3].color[1][1] -= 10/255;
            } else if(keyState[KeyCodeEnum.NUM_3] == KeyStateEnum.KEY_DOWN) {
                game.teams[3].color[2][1] -= 10/255;
            }
            for(var i = 0; i < 3; i ++) {
                game.teams[3].color[i][1] = Math.max(0, game.teams[3].color[i][1]);
            }
            console.log(game.teams[3].color);
            break;
        case KeyCodeEnum.Z: 
            if(keyState[KeyCodeEnum.NUM_1] == KeyStateEnum.KEY_DOWN) {
                game.teams[3].color[0][2] += 10/255;
            } else if(keyState[KeyCodeEnum.NUM_2] == KeyStateEnum.KEY_DOWN) {
                game.teams[3].color[1][2] += 10/255;
            } else if(keyState[KeyCodeEnum.NUM_3] == KeyStateEnum.KEY_DOWN) {
                game.teams[3].color[2][2] += 10/255;
            }
            for(var i = 0; i < 3; i ++) {
                game.teams[3].color[i][2] = Math.min(1, game.teams[3].color[i][2]);
            }
            console.log(game.teams[3].color);
            break;
        case KeyCodeEnum.X: 
            if(keyState[KeyCodeEnum.NUM_1] == KeyStateEnum.KEY_DOWN) {
                game.teams[3].color[0][2] -= 10/255;
            } else if(keyState[KeyCodeEnum.NUM_2] == KeyStateEnum.KEY_DOWN) {
                game.teams[3].color[1][2] -= 10/255;
            } else if(keyState[KeyCodeEnum.NUM_3] == KeyStateEnum.KEY_DOWN) {
                game.teams[3].color[2][2] -= 10/255;
            }
            for(var i = 0; i < 3; i ++) {
                game.teams[3].color[i][2] = Math.max(0, game.teams[3].color[i][2]);
            }
            console.log(game.teams[3].color);
            break;
        
    }
}


function onKeyUp(args) {
    if(keyState[args.keyCode]) 
        keyState[args.keyCode] = KeyStateEnum.KEY_UP;
}


ScreenLayout.canvas.addEventListener("contextmenu", onContextMenu, false); 
ScreenLayout.canvas.addEventListener("mousedown", onMouseDown, false);
ScreenLayout.canvas.addEventListener("mouseup",   onMouseUp,   false);
ScreenLayout.canvas.addEventListener("mousemove", onMouseMove, false);
document.onkeydown = onKeyDown;
document.onkeyup = onKeyUp;


function drawMapElements(graphicsPrograms, game, view, timeDiff, timeAccRatio) {
    var scissorBoxDims = graphicsPrograms.gl.getParameter(graphicsPrograms.gl.SCISSOR_BOX);
    
    graphicsPrograms.gl.scissor(ScreenLayout.sideBarRight, ScreenLayout.bottom, ScreenLayout.right - ScreenLayout.sideBarRight, ScreenLayout.top - ScreenLayout.bottom);
    
    drawMap(graphicsPrograms, game.map.terrainGraphics, timeDiff, view);
    
    if(viewOptions.showPassable) {
        drawPassablityMap(graphicsPrograms, game.map.passabilityMap, view);
    }
    if(viewOptions.showPathfind) {
        drawNodeListView(graphicsPrograms, game.pathfindView, view);
    }
    if(viewOptions.showObstacles) {
        drawObstacleStore(graphicsPrograms, game.map.obstacleStore, view);
    }
    
    for(var i = 0; i < game.units.length; i++) {
        Unit.drawUnit(game.units[i], game.map, view, timeAccRatio, graphicsPrograms, viewOptions);
    }
    
    Bullet.draw(game.bullets, timeAccRatio, view, graphicsPrograms);
    
    for(var i = 0; i < game.selectedUnits.length; i++) {
        Unit.drawUnitSelected(game.selectedUnits[i], game.map, view, timeAccRatio, graphicsPrograms, viewOptions);
    }
    
    graphicsPrograms.gl.scissor(scissorBoxDims[0], scissorBoxDims[1], scissorBoxDims[2], scissorBoxDims[3]);
}

function drawMiniMapElements(graphicsPrograms, game, view, timeAccRatio) {
    
    
    
    drawMiniMap(graphicsPrograms, game.map.miniMap, view);
    
    for(var i = 0; i < game.units.length; i++) {
        Unit.drawUnitMiniMap(game.units[i], view, timeAccRatio, graphicsPrograms);
    }
    
    drawMiniMapViewPort(graphicsPrograms, view);
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
    
    



    if(keyState[KeyCodeEnum.LEFT] == KeyStateEnum.KEY_DOWN) {
        moveView(view, {x: -SCROLL_RATE, y: 0});
    }
    if(keyState[KeyCodeEnum.RIGHT] == KeyStateEnum.KEY_DOWN) {
        moveView(view, {x:  SCROLL_RATE, y: 0});
    }
    if(keyState[KeyCodeEnum.UP] == KeyStateEnum.KEY_DOWN) {
        moveView(view, {x: 0, y: SCROLL_RATE});
    }
    if(keyState[KeyCodeEnum.DOWN] == KeyStateEnum.KEY_DOWN) {
        moveView(view, {x: 0, y: -SCROLL_RATE});
    }

    
    
    
    
    
    
    
    
    
    if(!pause) {
        timeAcc += timeDiff;
    }
    var flash = false;
    if(timeAcc > UPDATE_PERIOD) {
        if(viewOptions.flashUpdate)
            flash = true;
        
        while(timeAcc > UPDATE_PERIOD)
            timeAcc -= UPDATE_PERIOD;
        
        Game.update(game);
    } 
    
    
    
      
    graphicsPrograms.gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    
    graphicsPrograms.gl.enable(gl.BLEND);
    graphicsPrograms.gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    
    gl.disable(gl.DEPTH_TEST);
    
    graphicsPrograms.gl.viewport(ScreenLayout.left, ScreenLayout.bottom, ScreenLayout.right - ScreenLayout.left, ScreenLayout.top - ScreenLayout.bottom);

    if(flash) {
        gl.clearColor(1,1,1,1);
    } else {
        gl.clearColor(0,0,0,1);
    }
    
    gl.clear(gl.COLOR_BUFFER_BIT);
    
    graphicsPrograms.gl.scissor(ScreenLayout.left, ScreenLayout.bottom, ScreenLayout.right - ScreenLayout.left, ScreenLayout.top - ScreenLayout.bottom);
    graphicsPrograms.gl.enable(graphicsPrograms.gl.SCISSOR_TEST);
    
    
    
    graphicsPrograms.resolution = {width: gl.drawingBufferWidth, height: gl.drawingBufferHeight};
    
    
    drawMapElements(graphicsPrograms, game, view, timeDiff, timeAcc / UPDATE_PERIOD);
    
    drawMiniMapElements(graphicsPrograms, game, view, timeAcc / UPDATE_PERIOD);
    
    
    
    graphicsPrograms.gl.scissor(ScreenLayout.left, ScreenLayout.bottom, ScreenLayout.right - ScreenLayout.left, ScreenLayout.top - ScreenLayout.bottom);
    
    
    if(mouseState.state == MouseStateEnum.LMB_DRAG) {
        Graphics.drawLine(graphicsPrograms,   mouseState.currentPosition.x,   mouseState.currentPosition.y,   mouseState.currentPosition.x, mouseState.dragStartPosition.y, [1,1,1,1]);
        Graphics.drawLine(graphicsPrograms,   mouseState.currentPosition.x, mouseState.dragStartPosition.y, mouseState.dragStartPosition.x, mouseState.dragStartPosition.y, [1,1,1,1]);
        Graphics.drawLine(graphicsPrograms, mouseState.dragStartPosition.x, mouseState.dragStartPosition.y, mouseState.dragStartPosition.x,   mouseState.currentPosition.y, [1,1,1,1]);
        Graphics.drawLine(graphicsPrograms, mouseState.dragStartPosition.x,   mouseState.currentPosition.y,   mouseState.currentPosition.x,   mouseState.currentPosition.y, [1,1,1,1]);
    }
    
    
    textWriters[16].writeTextRight(Math.round(fpsMeasure.lastFps.toString()) + " FPS", [1,1,1,1], ScreenLayout.right - 10, ScreenLayout.top - 10);
    textWriters[16].writeTextRight(UPDATE_PERIOD.toString() + " ms", [1,1,1,1], ScreenLayout.right - 10, ScreenLayout.top - 30);
    
    if(pause)
        textWriters[20].writeTextCenter("PAUSED", [1,1,1,1], ScreenLayout.centerHorizontal, ScreenLayout.centerVertical);
    
    requestAnimationFrame(frame);
}



requestAnimationFrame(frame);


