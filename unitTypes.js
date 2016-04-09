"use strict";

const UnitTypes = {};

const DEFAULT_DEST_TOLERANCE = 0.1;

UnitTypes.calcuateDepth = function(position, unit, map) {
    //Factors: 
    //.25: z scaling used when the map was drawn
    //0.5: The "middle" of the z buffer
    //position.y - size: offset the position so that the unit isn't drawn half underground.
    return (0.25) * Math.sin(Math.acos(SUB_TILE_HEIGHT / SUB_TILE_WIDTH)) * (position.y - unit.type.zOffset - map.height / 2) / map.height + 0.5;
}

UnitTypes.drawUnitSprite = function(graphicsPrograms, view, spriteSheet, terrainDepthTexture, rotation, position, depth, teamColor, outlineColor, snapToPixel) {
    var gl = graphicsPrograms.gl;
    
    var point = convertToScreen(position, view);
    if(snapToPixel) {
        point.x = Math.round(point.x);
        point.y = Math.round(point.y);
    }
    
    var bottomLeft = convertToScreen({x: 0, y: 0}, view);
    
    var numRotations    = spriteSheet.info.numRotations;
    var numSheets       = spriteSheet.textures.length;
    var spritesPerSheet = (numRotations / numSheets);
    var n = Math.round(numRotations * (rotation / (2 * Math.PI))) % numRotations;
    
    var sheetNum  = Math.floor(n / spritesPerSheet);
    var spriteNum = n % spritesPerSheet;

    var sheet = spriteSheet.textures[sheetNum];

    
    if(spriteSheet.ready) {
        var spriteWidth = spriteSheet.info.spriteWidth;
        var spriteHeight = spriteSheet.info.spriteHeight;
        
        Graphics.drawSpriteTeamDepth(graphicsPrograms,
            spriteWidth * spriteNum, spriteHeight, spriteWidth, spriteHeight, spriteWidth * spriteNum, 0,
            point.x - bottomLeft.x - spriteWidth / 2, point.y - bottomLeft.y - spriteHeight / 2, spriteWidth, spriteHeight,
            point.x - spriteWidth / 2, point.y - spriteHeight / 2, spriteWidth, spriteHeight,
            depth, 
            sheet,
            sheet.outline,
            terrainDepthTexture,
            teamColor,
            outlineColor,
            [1,1,1,1]);
    }
    
}


UnitTypes.components = {};

UnitTypes.components.move = {
    
    moveStates: {
        IDLE: 0,
        MOVING: 1
    },
    
    init: function(unit, game, position) {
        unit.speed = 0;
        unit.destination = {x: unit.position.x, y: unit.position.y},
        unit.pathfinder = getPathfinder(game.map.pathfindNodeInfo, unit.mapObstacle);
        unit.lastRotation = position.rotation;
        unit.rotation = position.rotation;
        unit.destinationReached = false;
        unit.moveState = UnitTypes.components.move.moveStates.IDLE;
        startNewPath(unit.pathfinder, game.map, unit.position, unit.destination);
    },
    
    update: function(unit, game) {
        unit.lastPosition.x = unit.position.x;
        unit.lastPosition.y = unit.position.y;
        unit.lastRotation = unit.rotation;
        
        switch(unit.moveState) {
            case UnitTypes.components.move.moveStates.IDLE:
                unit.speed = 0;
                unit.destinationReached = false;
                break;
            case UnitTypes.components.move.moveStates.MOVING:
                if(!unit.pathfinder.finished) {
                    iteratePath(unit.pathfinder, game.map.pathfindNodeInfo, game.map.obstacleStore);
                }
    
                var newPosition = { x: unit.position.x, y: unit.position.y };
    
                if(Geometry.distance(unit.position.x, unit.position.y, unit.destination.x, unit.destination.y) <= DEFAULT_DEST_TOLERANCE) {
                    unit.speed = 0;
                    unit.destinationReached = true;
                } else {
                    unit.destinationReached = false;
    
                    var tempDestination = getTarget(unit.pathfinder, game.map);
    
    
                    //Rotate to face target:
                	var dx = (tempDestination.x - unit.position.x);
                	var dy = (tempDestination.y - unit.position.y);
                    var mag = Geometry.vectorMagnitude(dx, dy);
                	var targetRotation = Geometry.getTargetRotation(dx, dy, unit.rotation);

                    var rotate = Geometry.rotateAngle(unit.rotation, targetRotation, unit.type.rotationSpeed);
                    unit.rotation = rotate.angle;
        
            		if(rotate.matchAngle) {
            			if(mag < unit.type.speed) {
            				unit.speed = mag;
            				newPosition = tempDestination;
            				//countDownToNextPathfind = 0;
            			} else {
            				unit.speed = unit.type.speed;
                            newPosition.x += unit.speed * Math.cos(unit.rotation);
                            newPosition.y += unit.speed * Math.sin(unit.rotation);
            			}
            		} else {
            			if(Geometry.pointCanBeReached(dx, dy, targetRotation, unit.type.speed, unit.type.rotationSpeed)) {
            				if(mag < unit.type.speed) { //This probably shouldn't happen?
            					unit.speed = mag;
            				} else {
            					unit.speed = unit.type.speed;
            				}
                            newPosition.x += unit.speed * Math.cos(unit.rotation);
                            newPosition.y += unit.speed * Math.sin(unit.rotation);
            			} else {
            				unit.speed = 0;
            			}
            		}	
		
                }
    
                if(newPosition.x != unit.position.x || newPosition.y != unit.position.y) {
                    if(Pathfind.canMove(game.map, unit.position, newPosition, unit.type.size * .999, unit.mapObstacle)) {
                        unit.position.x = newPosition.x;
                        unit.position.y = newPosition.y;
                        moveObstacle(game.map.obstacleStore, unit.mapObstacle, newPosition.x, newPosition.y);
                    } else {
                        startNewPath(unit.pathfinder, game.map, unit.position, unit.destination)
                    }
                }
                break;
        }
    },

    draw: function(unit, map, view, timeAccRatio, graphicsPrograms, options) {
        var gl = graphicsPrograms.gl;
    
        if(options.showPathfind) {
            var path = getPath(unit.pathfinder, game.map);
            for(var i = 0; i < path.length - 1; i++) {
                var p1 = convertToScreen(path[i], view);
                var p2 = convertToScreen(path[i + 1], view);
    
                var color = unit.pathfinder.finished ? [1,1,0,1] : [1,0,0,1];
                Graphics.drawLine(graphicsPrograms, p1.x, p1.y, p2.x, p2.y, color);
            }
        }
        
        if(options.showUnitId) {
            var position = Geometry.interpolatePosition(unit.lastPosition, unit.position, timeAccRatio);
            var p1 = convertToScreen({x: position.x - unit.type.size, y: position.y - unit.type.size}, view);
            var text = (unit.moveState == UnitTypes.components.move.moveStates.IDLE ? "I" : "M");
            textWriters[8].writeTextRight(text, [1,1,1,1], p1.x, p1.y + 9);
        }
    }
};

UnitTypes.components.turretFireController = {
    turretStates: {
        IDLE: 0,
        TARGET: 1,
    },
    
    init: function(unit, game) {
        unit.turretRotation = 0;
        unit.lastTurretRotation = 0;
        unit.turretState = this.turretStates.IDLE;
        unit.cooldown = 0;
    },
    
    update: function(unit, game) {
        unit.lastTurretRotation = unit.turretRotation;
        unit.cooldown--;
        
        switch(unit.turretState) {
            case this.turretStates.IDLE:
                var targetRotation = Geometry.getTargetRotation(1, 0, unit.turretRotation);
                var rotate = Geometry.rotateAngle(unit.turretRotation, targetRotation, unit.type.turretRotationSpeed);
                unit.turretRotation = rotate.angle;
                break;
            case this.turretStates.TARGET:
                var dx = unit.target.position.x - unit.position.x;
                var dy = unit.target.position.y - unit.position.y;
                var targetRotation = Geometry.getTargetRotation(dx, dy, unit.rotation + unit.turretRotation);
                
                var rotate = Geometry.rotateAngle(unit.turretRotation, targetRotation, unit.type.turretRotationSpeed);
                unit.turretRotation = rotate.angle;
                
                
                if(rotate.matchAngle && unit.cooldown <= 0) {
                    unit.cooldown = unit.type.cooldownTime;// + randomInt(-1, 2);
                    
    				var dir = {x: Math.cos(unit.rotation + unit.turretRotation), y: Math.sin(unit.rotation + unit.turretRotation)};
                    
                    
                    Bullet.addBullet(game.bullets, 
                        unit.position.x + dir.x * unit.type.turretLength, 
                        unit.position.y + dir.y * unit.type.turretLength,
                        unit.type.turretHeight, 
                        dir.x * unit.type.bulletSpeed, dir.y * unit.type.bulletSpeed, 
                        unit.type.bulletAirTime,
                        unit.type.damage, 
                        unit.id);
                    
                }
                
                break;
        }
        
        if(unit.cooldown < 0)
            unit.cooldown = 0;
    },
};

UnitTypes.components.tankController = {
    
    tankStates: {
        IDLE: 0,
        MOVE: 1,
        MOVE_ATTACK: 2, //Moving, but with a target to attack
        ATTACK: 3,
    },
    
    init: function(unit, game) {
        unit.tankState = this.tankStates.IDLE;
        unit.target = null;
    },
    
    update: function(unit, game) {
        function notFriendly(u) {
            return u.team != unit.team;
        }
        
        var mStates = UnitTypes.components.move.moveStates;
        var tStates = UnitTypes.components.turretFireController.turretStates;
        var iterations = 5;
        do {
            var oldState = unit.tankState;
            
            switch(unit.tankState) {
                case this.tankStates.IDLE:
                    unit.moveState = mStates.IDLE;
                    unit.turretState = tStates.IDLE;
                    
                    var unitsInRange = Game.findUnitsInRange(game, unit.position, unit.type.visualRange, notFriendly);
                    if(unitsInRange.length > 0) {
                        unit.target = unitsInRange[0];
                        unit.tankState = this.tankStates.ATTACK;
                    }
                    break;
                case this.tankStates.MOVE:
                    unit.turretState = tStates.IDLE;
                    unit.moveState = mStates.MOVING;
                    
                    if(unit.destinationReached) {
                        unit.tankState = this.tankStates.IDLE;
                    } else {
                        var unitsInRange = Game.findUnitsInRange(game, unit.position, unit.type.range, notFriendly);
                        if(unitsInRange.length > 0) {
                            unit.target = unitsInRange[0];
                            unit.tankState = this.tankStates.MOVE_ATTACK;
                        }
                        
                    }
                    break;
                case this.tankStates.MOVE_ATTACK:
                    unit.turretState = tStates.TARGET;
                    unit.moveState = mStates.MOVING;
                    
                    if(unit.destinationReached) {
                        unit.tankState = this.tankStates.ATTACK;
                    } else {
                        var distanceToTarget = Geometry.distance(unit.position.x, unit.position.y, unit.target.position.x, unit.target.position.y);
                        if(distanceToTarget > unit.type.range) {
                            unit.tankState = this.tankStates.MOVE;
                        }
                    }
                    break;
                case this.tankStates.ATTACK:
                    unit.turretState = tStates.TARGET;
                    var distanceToTarget = Geometry.distance(unit.position.x, unit.position.y, unit.target.position.x, unit.target.position.y);
                    if(distanceToTarget > unit.type.range) {
                        //This needs to be a function:
                        unit.destination.x = unit.target.position.x;
                        unit.destination.y = unit.target.position.y;
                        startNewPath(unit.pathfinder, game.map, unit.position, unit.destination);
                        
                        unit.moveState = mStates.MOVING;
                    } else {
                        unit.moveState = mStates.IDLE;
                    }
                    break;
            }
            
        } while(unit.tankState != oldState && iterations-- > 0);
        
    },
    
    commandMove: function(unit, game, clickPos) {
        unit.destination.x = clickPos.x;
        unit.destination.y = clickPos.y;
        startNewPath(unit.pathfinder, game.map, unit.position, unit.destination);
        switch(unit.tankState) {
            case this.tankStates.IDLE:
            case this.tankStates.MOVE:
                unit.tankState = this.tankStates.MOVE;
                break;
            case this.tankStates.MOVE_ATTACK:
            case this.tankStates.ATTACK:
                unit.tankState = this.tankStates.MOVE_ATTACK;
                break;
            
        }
    },
    
    draw: function(unit, map, view, timeAccRatio, graphicsPrograms, options) {
        var gl = graphicsPrograms.gl;
    
        if(options.showUnitId) {
            
            var position = Geometry.interpolatePosition(unit.lastPosition, unit.position, timeAccRatio);
            
            
            var p1 = convertToScreen({x: position.x - unit.type.size, y: position.y - unit.type.size}, view);
            var text = (unit.tankState == this.tankStates.IDLE   ? "IDLE" : 
                        unit.tankState == this.tankStates.MOVE   ? "MOVE" : 
                        unit.tankState == this.tankStates.ATTACK ? "ATT"  : 
                                                                   "OTHER" );
            textWriters[8].writeTextRight(text, [1,1,1,1], p1.x, p1.y + 18);
        }
    },
    
    
}

UnitTypes.components.excavatorController = {
    commandMove: function(unit, game, clickPos) {
        unit.destination.x = clickPos.x;
        unit.destination.y = clickPos.y;
        startNewPath(unit.pathfinder, game.map, unit.position, unit.destination);
        unit.moveState = UnitTypes.components.move.moveStates.MOVING;
    },
    
}

UnitTypes.components.basicDraw = {
    draw: function(unit, map, view, timeAccRatio, graphicsPrograms, options) {
        var gl = graphicsPrograms.gl;
    
        var position = Geometry.interpolatePosition(unit.lastPosition, unit.position, timeAccRatio);
        var rotation = Geometry.fixAngle(-Geometry.interpolateAngle(unit.lastRotation, unit.rotation, timeAccRatio));
    
        var depth = UnitTypes.calcuateDepth(position, unit, map);
    
        var snapToPixel = (unit.speed !== undefined && unit.speed == 0);
    
        UnitTypes.drawUnitSprite(graphicsPrograms, view, unit.type.spriteSheet, map.terrainGraphics.terrainDepthTexture, 
            rotation, position, depth, unit.team.color, unit.team.mapColor, snapToPixel);
    }
};


UnitTypes.components.drawTurretWithBase = {
    draw: function(unit, map, view, timeAccRatio, graphicsPrograms, options) {
        var gl = graphicsPrograms.gl;
    
        var position = Geometry.interpolatePosition(unit.lastPosition, unit.position, timeAccRatio);
        var rotation = Geometry.fixAngle(-Geometry.interpolateAngle(unit.lastRotation, unit.rotation, timeAccRatio));
        var turretRotation = Geometry.fixAngle(-Geometry.interpolateAngle(unit.lastRotation + unit.lastTurretRotation, unit.rotation + unit.turretRotation, timeAccRatio));
        
        var depth = UnitTypes.calcuateDepth(position, unit, map);
    
        var snapToPixel = (unit.speed !== undefined && unit.speed == 0);
    
        UnitTypes.drawUnitSprite(graphicsPrograms, view, unit.type.spriteSheetBase, map.terrainGraphics.terrainDepthTexture, 
            rotation, position, depth, unit.team.color, unit.team.mapColor, snapToPixel);

        UnitTypes.drawUnitSprite(graphicsPrograms, view, unit.type.spriteSheetTurret, map.terrainGraphics.terrainDepthTexture, 
            turretRotation, position, depth, unit.team.color, unit.team.mapColor, snapToPixel);
    }
};



UnitTypes.components.drawId = {
    draw: function(unit, map, view, timeAccRatio, graphicsPrograms, options) {
        var gl = graphicsPrograms.gl;
    
        if(options.showUnitId) {
            var position = Geometry.interpolatePosition(unit.lastPosition, unit.position, timeAccRatio);
            var p1 = convertToScreen({x: position.x - unit.type.size, y: position.y - unit.type.size}, view);
            textWriters[8].writeTextRight(unit.id.toString(), [1,1,1,1], p1.x, p1.y);
        }
    }
};

UnitTypes.components.drawSelected = {
    drawSelected: function(unit, map, view, timeAccRatio, graphicsPrograms, options) {
        var gl = graphicsPrograms.gl;
    
        var position = Geometry.interpolatePosition(unit.lastPosition, unit.position, timeAccRatio);
        var point = convertToScreen(position, view);
    
    
    	var topLeft     = convertToScreen({x: position.x - unit.type.size / 2, y: position.y + unit.type.size / 2 /*- position.z * Z_RATIO*/}, view);
    	var bottomRight = convertToScreen({x: position.x + unit.type.size / 2, y: position.y - unit.type.size / 2 /*- position.z * Z_RATIO*/}, view);
    	topLeft.x -= 10;
    	topLeft.y += 15;
    	bottomRight.x += 10;
    	bottomRight.y -= 5;
	
	
    	/*
    	       x0  x1  x2  x3
    	       |   |   |   |
	
    	y0 _    ___     ___
    	       |           |
    	y1 _   |           |
	
    	y2 _
    	       |           |
    	y3 _   |___     ___|
	
    	*/
	
    	var x0 = topLeft.x;
    	var x3 = bottomRight.x;
    	var x1 = x0 * 4 / 5 + x3 * 1 / 5;
    	var x2 = x0 * 1 / 5 + x3 * 4 / 5;
	
    	var y0 = topLeft.y;
    	var y3 = bottomRight.y;
    	var y1 = y0 * 4 / 5 + y3 * 1 / 5;
    	var y2 = y0 * 1 / 5 + y3 * 4 / 5;
	
    	var color = [1,1,1,1];
	
    	Graphics.drawLine(graphicsPrograms, x0, y0, x0, y1, color);
    	Graphics.drawLine(graphicsPrograms, x0, y0, x1, y0, color);
    	Graphics.drawLine(graphicsPrograms, x0, y3, x0, y2, color);
    	Graphics.drawLine(graphicsPrograms, x0, y3, x1, y3, color);
    	Graphics.drawLine(graphicsPrograms, x3, y0, x3, y1, color);
    	Graphics.drawLine(graphicsPrograms, x3, y0, x2, y0, color);
    	Graphics.drawLine(graphicsPrograms, x3, y3, x3, y2, color);
    	Graphics.drawLine(graphicsPrograms, x3, y3, x2, y3, color);
	
    	//The health bar:
        drawHealthBar(topLeft.x, topLeft.y + 2, bottomRight.x - topLeft.x, 3, [0,0,0,.25], [.6,0,0,.5], [0,1,0,.75]);
    
    	function drawHealthBar(x, y, width, height, colorDarkRed, colorRed, colorGreen) {
    		var barWidth = Math.round(width * unit.hp / unit.type.hitpoints);
    		var redBarWidth = width;//Math.round(width * unit.partialHpDisplay / unit.type.hitpoints);
    		var darkRedBarWidth = width - redBarWidth - 1;
		
    		if(darkRedBarWidth > 0) {
    			Graphics.drawBox(graphicsPrograms, x + redBarWidth + 1, y, darkRedBarWidth, height, colorDarkRed);
    		}
    		if(redBarWidth > barWidth) {
    			Graphics.drawBox(graphicsPrograms, x + barWidth + 1, y, redBarWidth - barWidth, height, colorRed);
    		}
		
    		Graphics.drawBox(graphicsPrograms, x, y, barWidth, height, colorGreen);
    	}
     
     
        /*   
    	if(sharedState.showProgressBar && sharedState.team == sharedState.managers.selectionManager.team ) {
    		var barWidth = Math.round((bottomRight.x - topLeft.x) * sharedState.showProgressValue);
    		var redBarWidth = (bottomRight.x - topLeft.x) - barWidth - 1; //Ok its not really red...
    		if(redBarWidth > 0) {
    			args.graphicsInfo.drawRect(topLeft.x + barWidth + 1, topLeft.y - 9, redBarWidth, 3, [0, .1, .5, .5]);
    		}
    		args.graphicsInfo.drawRect(topLeft.x, topLeft.y - 9, barWidth, 3, [0, .8, 1, .75]);
    	}
	
    	if(group != -1) {
    		args.graphicsInfo.textWriters[10].writeTextRight(group.toString(), [1,1,1,.75], Math.floor(bottomRight.x - 1), Math.floor(bottomRight.y - 1));
    	}
        */
    }
};

UnitTypes.components.drawMiniMap = {
    drawMiniMap: function(unit, view, timeAccRatio, graphicsPrograms) {
        var position = Geometry.interpolatePosition(unit.lastPosition, unit.position, timeAccRatio);
    
        var bottomLeft = convertWorldToMinimap({x: position.x - unit.type.size / 2, y: position.y - unit.type.size / 2}, view);
        var topRight   = convertWorldToMinimap({x: position.x + unit.type.size / 2, y: position.y + unit.type.size / 2}, view);
    
        var x = Math.floor(bottomLeft.x);
        var y = Math.floor(bottomLeft.y);
        var w = Math.ceil(topRight.x) - x;
        var h = Math.ceil(topRight.y) - y;
    
        var mapColor = [unit.team.mapColor[0], unit.team.mapColor[1], unit.team.mapColor[2], 1];
        Graphics.drawBox(graphicsPrograms, x, y, w, h, mapColor);
    }
};

UnitTypes.UnitTypeEnum = {
    MEDIUM_TANK: 0,
    EXCAVATOR: 1,
    
};

//Note: In converting from old game:
//Distance: 1 in old units are 5 in new units
//Time: 1 in old units is 1/3 in new units
//Speed: from the above, 1 in old units is 15 in new units

UnitTypes.getUnitTypes = function(assets) {
    var comps = UnitTypes.components;
    var types = [];
    types[UnitTypes.UnitTypeEnum.MEDIUM_TANK] = {
        components: [comps.tankController, comps.move, comps.turretFireController, comps.drawTurretWithBase, comps.drawId, comps.drawSelected, comps.drawMiniMap],
        size: 2,
        speed: 1.5,
        hitpoints: 100,
        rotationSpeed: Math.PI / 8,
        turretRotationSpeed: 3 * Math.PI / 16,
        zOffset: 2,
        turretLength: 3.54,
        turretHeight: 2.29,
		range: 35, 
        cooldownTime: 12,
        bulletSpeed: 6, 
        bulletAirTime: 6.7,
        damage: 12,
		visualRange: 50,
        spriteSheetBase: assets.mediumTankBase,
        spriteSheetTurret: assets.mediumTankTurret,
    };
    
    
    types[UnitTypes.UnitTypeEnum.EXCAVATOR] = {
        components: [comps.move, comps.excavatorController, comps.basicDraw, comps.drawId, comps.drawSelected, comps.drawMiniMap],
        size: 2,
        speed: 1.2,
        hitpoints: 130,
        zOffset: 5,
        rotationSpeed: Math.PI / 12,
        spriteSheet: assets.excavator,
    };
    
    return types;
}