"use strict";

const MINI_MAP_SIZE = 225;
const SIDE_BAR_WIDTH = 240;

const screen = {};

screen.canvas = document.getElementById("canvas");

screen.top = 0;
screen.bottom = 0;
screen.left = 0;
screen.right = 0;

screen.onResize = [];


function resizeCanvas() {
    var height = document.body.offsetHeight;
    var width = document.body.offsetWidth;
    screen.canvas.width = width;
    screen.canvas.height = height;
    
    screen.top = screen.bottom + height;
    screen.right = screen.left + width;
    
    screen.miniMapTop = screen.top - 5;
    screen.miniMapLeft = screen.left + 5;
    
    screen.sideBarRight = screen.left + SIDE_BAR_WIDTH;
    
    for(var func of screen.onResize) {
        func();
    }
}
window.addEventListener('resize', resizeCanvas, false);
resizeCanvas();
