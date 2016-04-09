"use strict";

const SELECT_BOX_FUDGE_FACTOR = .25;

const SelectUnits = {};

SelectUnits.selectBox = function(game, startPosition, endPosition, timeAccRatio) {
	if(keyState[KeyCodeEnum.SHIFT] == KeyStateEnum.KEY_UP) {
		game.selectedUnits = [];
	}
    
	for(var i = 0; i < game.units.length; i++) {
        if(Unit.isUnitInBox(
            game.units[i], 
            Math.min(startPosition.x, endPosition.x) - SELECT_BOX_FUDGE_FACTOR, 
		    Math.min(startPosition.y, endPosition.y) - SELECT_BOX_FUDGE_FACTOR, 
		    Math.max(startPosition.x, endPosition.x) + SELECT_BOX_FUDGE_FACTOR, 
		    Math.max(startPosition.y, endPosition.y) + SELECT_BOX_FUDGE_FACTOR,
            timeAccRatio)) 
        {
            game.selectedUnits.push(game.units[i]);
		}
	}
    
};
