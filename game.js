"use strict";

const NUM_BULLETS = 1000;

const Game = {};

Game.makeNewGame = function(computeProgs, mapSize, unitTypes){
    var gl = computeProgs.gl;
    var game = {};
    game.map = genMap(computeProgs, mapSize);
    game.pathfindView = buildNodeListView(gl, game.map.pathfindNodeInfo);
    
    game.bullets = Bullet.getBulletStore(NUM_BULLETS);
    Bullet.makeBulletVertexBuffer(gl, game.bullets);
    
    game.units = [];
    
    game.playerStartPositions = [];
    
    game.teams = [
        {color: TEAM_COLORS[0], mapColor: TEAM_MAP_COLORS[0]},
        {color: TEAM_COLORS[1], mapColor: TEAM_MAP_COLORS[1]},
        {color: TEAM_COLORS[2], mapColor: TEAM_MAP_COLORS[2]},
        {color: TEAM_COLORS[3], mapColor: TEAM_MAP_COLORS[3]},
    ];
    
    var teamInit = [
        {unitType: UnitTypes.UnitTypeEnum.MEDIUM_TANK, number: 3},
        {unitType: UnitTypes.UnitTypeEnum.EXCAVATOR,   number: 2},
    ];
    
    for(var team = 0; team < 4; team++) {
        var teamStartX = Math.random() * game.map.width;
        var teamStartY = Math.random() * game.map.height;
        game.playerStartPositions.push({x: teamStartX, y: teamStartY});
        for(var i = 0; i < teamInit.length; i++) {
            for(var j = 0; j < teamInit[i].number; j++) {
                var tries = 0;
                var position = {x: 0, y: 0};
                do {
                    tries++;
                    position.x = (Math.random() - .5) * 30 + teamStartX;
                    position.y = (Math.random() - .5) * 30 + teamStartY;
                } while(!Pathfind.canPlace(game.map, position, unitTypes[teamInit[i].unitType].size) && tries < 100);
                position.rotation = Math.atan2(position.y - teamStartY, position.x - teamStartX);
                if(tries < 100) {
                    game.units.push(Unit.makeNewUnit(position, unitTypes[teamInit[i].unitType], game.teams[team], game));
                }
            }
        }
    }
    
    game.selectedUnits = [];
    
    return game;
}

Game.update = function(game) {
    for(var i = 0; i < game.units.length; i++) {
        Unit.updateUnit(game.units[i], game);
    }
    Bullet.update(game);
    
}

Game.findUnitsInRange = function(game, position, range, conditions) {
    var unitsInRange = [];
    for(var i = 0; i < game.units.length; i++) {
        if(Geometry.distance(position.x, position.y, game.units[i].position.x, game.units[i].position.y) < range + game.units[i].type.size 
            && conditions(game.units[i])) 
        {
            unitsInRange.push(game.units[i]);
        }
    }
    return unitsInRange;
}

Game.findUnitsInRangeLine = function(game, line, range, conditions) {
    var unitsInRange = [];
    for(var i = 0; i < game.units.length; i++) {
        if(Geometry.distancePointLineSegment(game.units[i].position, line.p1, line.p2) < range + game.units[i].type.size && conditions(game.units[i])) 
        {
            unitsInRange.push(game.units[i]);
        }
    }
    return unitsInRange;
}