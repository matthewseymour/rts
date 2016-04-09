"use strict";

const MouseClickEnum = {
	none: -1,
	left: 0,
	middle: 1,
	right: 2
};

const KeyStateEnum = {
    KEY_DOWN: 1,
    KEY_UP: 2
};

const KeyCodeEnum = {
	SHIFT: 16,
	CTRL: 17,
	ALT: 18,
		
	LEFT: 37,
	UP: 38,
	RIGHT: 39,
	DOWN: 40,
	
	NUM_0: 48,
	NUM_1: 49,
	NUM_2: 50,
	NUM_3: 51,
	NUM_4: 52,
	NUM_5: 53,
	NUM_6: 54,
	NUM_7: 55,
	NUM_8: 56,
	NUM_9: 57,
	
	A: 65,
	B: 66,
	C: 67,
	D: 68,
	E: 69,
	F: 70,
	G: 71,
	H: 72,
	I: 73,
	J: 74,
	K: 75,
	L: 76,
	M: 77,
	N: 78,
	O: 79,
	P: 80,
	Q: 81,
	R: 82,
	S: 83,
	T: 84,
	U: 85,
	V: 86,
	W: 87,
	X: 88,
	Y: 89,
	Z: 90,
	
	PLUS: 187,
	MINUS: 189
};

function getMousePosition(e, canvas) {
	var x;
    var y;
    if (e.pageX || e.pageY) {
      x = e.pageX;
      y = e.pageY;
    }
    else {
      x = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
      y = e.clientY + document.body.scrollTop + document.documentElement.scrollTop;
    }

	x -= canvas.offsetLeft;
	y -= canvas.offsetTop;
	return {x: x, y: document.body.offsetHeight - y};
}
