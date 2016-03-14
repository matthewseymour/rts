"use strict";

const Text = {};



Text.makeCharacterSheet = function(gl, pxSize, chars) {
	var buffer = document.createElement('canvas');
	
	var context = buffer.getContext('2d');
	
	context.font = pxSize.toString() + 'px sans-serif';
	context.textBaseline = 'bottom';
	context.textAlign = 'left';
	context.fillStyle = 'rgb(255, 255, 255)';
	
	var charInfo = [];
	var pos = 0;
	for(var i = 0; i < chars.length; i++) {
		var info = {
			pos: pos,
			width: context.measureText(chars[i]).width
		};
		charInfo[chars[i]] = info;
		pos += info.width + 2;
	}
	
	var baseLine = pxSize * 2;
	var textHeight = pxSize * 3;	
	
	buffer.width = pos;
	buffer.height = textHeight;
	
	//Reset:
	context.font = pxSize.toString() + 'px sans-serif';
	context.textBaseline = 'bottom';
	context.textAlign = 'left';
	context.fillStyle = 'rgb(255, 255, 255)';
	
	
	
	for(var i = 0; i < chars.length; i++) {
		context.fillText(chars[i], charInfo[chars[i]].pos, baseLine);
	}
    var data = new Uint8Array(context.getImageData(0, 0, buffer.width, buffer.height).data);
    var sheet = glUtils.makeSimpleTexture(gl, buffer.width, buffer.height, data);
    return {
        charInfo: charInfo,
        textHeight: textHeight,
        baseLine: baseLine,
        sheet: sheet,
    };
}
    

Text.writeTextLeft = function(graphicsPrograms, charSheet, string, color, x, y) {
	for(var i = 0; i < string.length; i++) {
        //Have to invert y:
		Graphics.drawImage(graphicsPrograms, 
            charSheet.charInfo[string[i]].pos, charSheet.textHeight, 
            charSheet.charInfo[string[i]].width, -charSheet.textHeight,
			x, y - charSheet.baseLine, charSheet.charInfo[string[i]].width, charSheet.textHeight, charSheet.sheet, color);
		
		x += charSheet.charInfo[string[i]].width;
	}
}

Text.writeTextRight = function(graphicsPrograms, charSheet, string, color, x, y) {
	for(var i = string.length - 1; i >= 0; i--) {
		x -= charSheet.charInfo[string[i]].width;
        //Have to invert y:
		Graphics.drawImage(graphicsPrograms, 
            charSheet.charInfo[string[i]].pos, charSheet.textHeight, 
            charSheet.charInfo[string[i]].width, -charSheet.textHeight,
			x, y - charSheet.baseLine, charSheet.charInfo[string[i]].width, charSheet.textHeight, charSheet.sheet, color);
	}
}

Text.writeTextCenter = function(graphicsPrograms, charSheet, string, color, x, y) {
	var textWidth = 0;
	for(var i = 0; i < string.length; i++) {
		textWidth += charSheet.charInfo[string[i]].width;
	}
	Text.writeTextLeft(graphicsPrograms, charSheet, string, color, x - Math.floor(textWidth / 2), y);
}


Text.makeTextWriter = function(graphicsPrograms, pxSize, charList) {
    var charSheet = Text.makeCharacterSheet(graphicsPrograms.gl, pxSize, charList);
    
    var writer = {};
	writer.writeTextLeft = function(string, color, x, y) {
        Text.writeTextLeft(graphicsPrograms, charSheet, string, color, x, y);
    };
    
	writer.writeTextRight = function(string, color, x, y) {
        Text.writeTextRight(graphicsPrograms, charSheet, string, color, x, y);
    };
	
    writer.writeTextCenter = function(string, color, x, y) {
        Text.writeTextCenter(graphicsPrograms, charSheet, string, color, x, y);
    };
    
    return writer;
}

Text.buildDefaultWriters = function(graphicsPrograms) {
	var writerCharList = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()`~_+-=[]\\|{};':\",./<>? ";
	var textWriters = [];
	textWriters[ 8] = Text.makeTextWriter(graphicsPrograms,  8, writerCharList);
	textWriters[10] = Text.makeTextWriter(graphicsPrograms, 10, writerCharList);
	textWriters[12] = Text.makeTextWriter(graphicsPrograms, 12, writerCharList);
	textWriters[14] = Text.makeTextWriter(graphicsPrograms, 14, writerCharList);
	textWriters[16] = Text.makeTextWriter(graphicsPrograms, 16, writerCharList);
	textWriters[18] = Text.makeTextWriter(graphicsPrograms, 18, writerCharList);
	textWriters[20] = Text.makeTextWriter(graphicsPrograms, 20, writerCharList);
	textWriters[22] = Text.makeTextWriter(graphicsPrograms, 22, writerCharList);
	textWriters[24] = Text.makeTextWriter(graphicsPrograms, 24, writerCharList);
	textWriters[30] = Text.makeTextWriter(graphicsPrograms, 30, writerCharList);
    return textWriters;
}
