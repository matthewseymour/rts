"use strict";

const MINI_MAP_SIZE = 225;
const SIDE_BAR_WIDTH = 240;

const ScreenLayout = {};

ScreenLayout.canvas = document.getElementById("canvas");

ScreenLayout.top = 0;
ScreenLayout.bottom = 0;
ScreenLayout.left = 0;
ScreenLayout.right = 0;

ScreenLayout.onResize = [];


function resizeCanvas() {
    var height = document.body.offsetHeight;
    var width = document.body.offsetWidth;
    ScreenLayout.canvas.width = width;
    ScreenLayout.canvas.height = height;
    
    ScreenLayout.top = ScreenLayout.bottom + height;
    ScreenLayout.right = ScreenLayout.left + width;
    
    ScreenLayout.miniMapTop = ScreenLayout.top - 5;
    ScreenLayout.miniMapLeft = ScreenLayout.left + 5;
    
    ScreenLayout.sideBarRight = ScreenLayout.left + SIDE_BAR_WIDTH;
    
    for(var func of ScreenLayout.onResize) {
        func();
    }
}
window.addEventListener('resize', resizeCanvas, false);
resizeCanvas();
