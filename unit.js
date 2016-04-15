"use strict";

const Unit = {};

var NEXT_UNIT_ID = 0;

Unit.makeNewUnit = function(position, type, team, game) {
    var obstacle = getObstacle(position.x, position.y, type.size);
    var unit = {
        type: type,
        team: team,
        lastPosition: {x: position.x, y: position.y},
        position: {x: position.x, y: position.y},
        mapObstacle: obstacle,
        hp: type.hitpoints,
        id: NEXT_UNIT_ID,
        alive: true,

    };
    
    addObstacle(game.map.obstacleStore, obstacle);
    
    for(var i = 0; i < type.components.length; i++) {
        if(type.components[i].init !== undefined) {
            type.components[i].init(unit, game, position);
        }
    }
    
    
    NEXT_UNIT_ID++;
    return unit;
}

Unit.takeDamage = function(unit, damage, attackerId) {
    unit.hp = Math.max(0, unit.hp - damage);
    for(var i = 0; i < unit.type.components.length; i++) {
        if(unit.type.components[i].attacked !== undefined) { 
            unit.type.components[i].attacked(attackerId);
        }
    }
    
}

Unit.updateUnit = function(unit, game) {
    for(var i = 0; i < unit.type.components.length; i++) {
        if(unit.type.components[i].update !== undefined) { 
            unit.type.components[i].update(unit, game);
        }
    }
    if(unit.hp <= 0) {
        removeObstacle(game.map.obstacleStore, unit.mapObstacle);
        
        Particle.makeExplosion(
            {x: unit.position.x, y: unit.position.y, z: 0}, 
            {x: 0, y: 0, z: 0}, Particle.ExpTypes.SMALL, game.explosionStore)
        unit.alive = false;
    }
}

Unit.drawUnit = function(unit, map, view, timeAccRatio, graphicsPrograms, options) {
    for(var i = 0; i < unit.type.components.length; i++) {
        if(unit.type.components[i].draw !== undefined) { 
            unit.type.components[i].draw(unit, map, view, timeAccRatio, graphicsPrograms, options);
        }
    }
}

Unit.drawUnitSelected = function(unit, map, view, timeAccRatio, graphicsPrograms, options) {
    for(var i = 0; i < unit.type.components.length; i++) {
        if(unit.type.components[i].drawSelected !== undefined) { 
            unit.type.components[i].drawSelected(unit, map, view, timeAccRatio, graphicsPrograms, options);
        }
    }
}

Unit.drawUnitMiniMap = function(unit, view, timeAccRatio, graphicsPrograms) {
    for(var i = 0; i < unit.type.components.length; i++) {
        if(unit.type.components[i].drawMiniMap !== undefined) { 
            unit.type.components[i].drawMiniMap(unit, view, timeAccRatio, graphicsPrograms);
        }
    }
}

Unit.commandMove = function(unit, game, clickPos) {
    for(var i = 0; i < unit.type.components.length; i++) {
        if(unit.type.components[i].commandMove !== undefined) { 
            unit.type.components[i].commandMove(unit, game, clickPos);
        }
    }
}

Unit.isUnitInBox = function (unit, x1, y1, x2, y2, timeAccRatio) {
    var position = Geometry.interpolatePosition(unit.lastPosition, unit.position, timeAccRatio);
    
    return position.x - unit.type.size / 2                                   < Math.max(x1, x2) && position.x + unit.type.size / 2                                   > Math.min(x1, x2) && 
           position.y - unit.type.size / 2 /*- sharedState.pos.z * Z_RATIO*/ < Math.max(y1, y2) && position.y + unit.type.size / 2 /*- sharedState.pos.z * Z_RATIO*/ > Math.min(y1, y2);
}
