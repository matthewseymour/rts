"use strict";

const Unit = {};

var NEXT_UNIT_ID = 0;

Unit.makeNewUnit = function(position, game) {
    var unit = {
        lastPosition: {x: position.x, y: position.y},
        position: {x: position.x, y: position.y},
        destination: {x: Math.random() * game.map.width, y: Math.random() * game.map.height},
        lastRotation: 0,
        rotation: 0,
        pathfinder: getPathfinder(game.map.pathfindNodeInfo),
        id: NEXT_UNIT_ID,

    };
    
    NEXT_UNIT_ID++;
    return unit;
}

Unit.updateUnit = function(unit, game) {
    unit.lastPosition.x = unit.position.x;
    unit.lastPosition.y = unit.position.y;
    unit.lastRotation = unit.rotation;


    if(Math.random() * 100 < 2) {
        unit.destination.x = Math.random() * game.map.width;
        unit.destination.y = Math.random() * game.map.height;
        startNewPath(unit.pathfinder, game.map.pathfindNodeInfo, game.map.obstacleStore, game.map.passabilityMap, unit.position, unit.destination);
    }
    

    if(!unit.pathfinder.finished) {
        iteratePath(unit.pathfinder, game.map.pathfindNodeInfo, game.map.obstacleStore);
    }
    
    var tempDestination = getTarget(unit.pathfinder, game.map.pathfindNodeInfo, game.map.obstacleStore, game.map.passabilityMap);
    
    const rotationSpeed = .2;
    
    //Rotate to face target:
	var dx = (tempDestination.x - unit.position.x);
	var dy = (tempDestination.y - unit.position.y);
	var rotatedDx = dx * Math.cos(-unit.rotation) - dy * Math.sin(-unit.rotation);
	var rotatedDy = dx * Math.sin(-unit.rotation) + dy * Math.cos(-unit.rotation);
	var targetRotation = Math.atan2(rotatedDy, rotatedDx);
	if(Math.abs(targetRotation) <= rotationSpeed) {
		unit.rotation += targetRotation;
	} else {
		unit.rotation += rotationSpeed * Math.sign(targetRotation);
	}
    unit.rotation = Geometry.fixAngle(unit.rotation);
    
    var newPosition = {
        x: unit.position.x + 1 * Math.cos(unit.rotation),
        y: unit.position.y + 1 * Math.sin(unit.rotation)
    };
    
    if(Pathfind.canMove(game.map, unit.position, newPosition, UNIT_SIZE)) {
        unit.position.x = newPosition.x;
        unit.position.y = newPosition.y;
    } else {
        startNewPath(unit.pathfinder, game.map.pathfindNodeInfo, game.map.obstacleStore, game.map.passabilityMap, unit.position, unit.destination)
    }
}

Unit.drawUnit = function(unit, map, view, timeAccRatio, gl, assets) {
    
    var position = Geometry.interpolatePosition(unit.lastPosition, unit.position, timeAccRatio);
    
    var point = convertToScreen(position, view);
    var bottomLeft = convertToScreen({x: 0, y: 0}, view);
    
    var rotation = Geometry.fixAngle(-Geometry.interpolateAngle(unit.lastRotation, unit.rotation, timeAccRatio));
    var n = Math.round(72 * (rotation / (2 * Math.PI))) % 72;
    
    var sheetNum = Math.floor(n / 18);
    var spriteNum = n % 18;
    
    var sheetBase = 
        sheetNum == 0 ? assets.mediumTankBaseTexture0 :
        sheetNum == 1 ? assets.mediumTankBaseTexture1 :
        sheetNum == 2 ? assets.mediumTankBaseTexture2 :
        sheetNum == 3 ? assets.mediumTankBaseTexture3 :
        null;

    var sheetTurret = 
        sheetNum == 0 ? assets.mediumTankTurretTexture0 :
        sheetNum == 1 ? assets.mediumTankTurretTexture1 :
        sheetNum == 2 ? assets.mediumTankTurretTexture2 :
        sheetNum == 3 ? assets.mediumTankTurretTexture3 :
        null;
    
    if(sheetBase.ready && sheetTurret.ready) {
        //Factors: 
        //.25: z scaling used when the map was drawn
        //0.5: The "middle" of the z buffer
        //position.y - 2: offset the position so that the unit isn't drawn half underground.
        
        var depth = (0.25) * Math.sin(Math.acos(SUB_TILE_HEIGHT / SUB_TILE_WIDTH)) * (position.y - 2 - map.height / 2) / map.height + 0.5;
        
        Graphics.drawImageDepth(graphicsPrograms, 
            60 * spriteNum, 180, 60, 60,
            point.x - bottomLeft.x - 30, point.y - bottomLeft.y - 30, 60, 60,
            point.x - 30, point.y - 30, 60, 60,
            depth, sheetBase, map.terrainGraphics.terrainDepthTexture, 
            [1,1,1,1]);
        Graphics.drawImageDepth(graphicsPrograms, 
            60 * spriteNum, 180, 60, 60,
            point.x - bottomLeft.x - 30, point.y - bottomLeft.y - 30, 60, 60,
            point.x - 30, point.y - 30, 60, 60,
            depth, sheetTurret, map.terrainGraphics.terrainDepthTexture, 
            [1,1,1,1]);
    }
    /*
    var p1 = convertToScreen({x: position.x - UNIT_SIZE, y: position.y - UNIT_SIZE}, view);
    var p2 = convertToScreen({x: position.x + UNIT_SIZE, y: position.y + UNIT_SIZE}, view);
    Graphics.drawBox(graphicsPrograms, p1.x, p1.y, p2.x - p1.x, p2.y - p1.y, [0,1,.3,.1]);
    textWriters[8].writeTextRight(unit.id.toString(), [1,1,1,1], p1.x, p1.y);
    
    var path = getPath(unit.pathfinder, game.map.pathfindNodeInfo, game.map.obstacleStore, game.map.passabilityMap);
    for(var i = 0; i < path.length - 1; i++) {
        var p1 = convertToScreen(path[i], view);
        var p2 = convertToScreen(path[i + 1], view);
    
        var color = unit.pathfinder.finished ? [1,1,0,1] : [1,0,0,1];
        Graphics.drawLine(graphicsPrograms, p1.x, p1.y, p2.x, p2.y, color);
    }
    */
    
}
