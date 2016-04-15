//Matthew Seymour, matthew dot seymour at gmail.com

"use strict";
const SUB_TILE_WIDTH = 8;
const SUB_TILE_HEIGHT = 6;
const Z_SCALE = Math.sqrt(1 - Math.pow(SUB_TILE_HEIGHT / SUB_TILE_WIDTH, 2));


var height = document.body.offsetHeight;
var width = document.body.offsetWidth;











var canvas = document.getElementById("canvas");
canvas.width = width;
canvas.height = height;
var fpsDiv = document.getElementById("fps");


var gl = canvas.getContext("webgl", 
{
    alpha: false,
    antialias: true
});

var floatTextureExtension = gl.getExtension("OES_texture_float");
if (!floatTextureExtension) {
    alert("float textures not supported");
}
var floatLinearExtension = gl.getExtension("OES_texture_float_linear");
if (!floatLinearExtension) {
    alert("float linear filtering textures not supported");
}


var depthTextureExtension = gl.getExtension("WEBGL_depth_texture");
if (!depthTextureExtension) {
    alert("depth textures not supported");
}

var instancedArraysExtension = gl.getExtension("ANGLE_instanced_arrays");
if (!instancedArraysExtension) {
    alert("instanced arrays not supported");
}









/*
var V_INIT = 12;
var V_REDUCE = .75;
var FIELD_V = 115; 
var TIME_SCALE = .5;
var TIME_START_SCALE = 150;
var TIME_START_INIT = -37.5;
var VORTEX_U_INIT = 1.0;
var VORTEX_U_DRAG = .997;
var VORTEX_SPEED_INIT = 1.2;
var VORTEX_DRAG = .999;
var VORTEX_RADIUS = 40;
var GLARE_SIZE = 100;
var w = 256;
var h = 256;
//*/






















/*
UPDATE:
*/


var graphicsPrograms = Graphics.getGraphicsPrograms(gl, instancedArraysExtension);
var computeProgs = Compute.getPrograms(gl);
var particleProgs = Particle.getPrograms(gl);





/////////////////Stuff that is constant for all explosions:















































var explosionStore = Particle.getExplosionStore(particleProgs, graphicsPrograms, computeProgs);









function onMouseClick(e) {
    var screenRatio = 8 / 5;
    var mousePosition = getMousePosition(e, canvas);
    var y = mousePosition.y / SUB_TILE_HEIGHT;
    var x = mousePosition.x / SUB_TILE_WIDTH;

    console.log(x, y);

    var type;
    if(e.button == MouseClickEnum.left) {
        type = Particle.ExpTypes.SMALL;
    }
    else if(e.button == MouseClickEnum.right) {
        type = Particle.ExpTypes.MEDIUM;
    }
    
    Particle.makeExplosion({x: x, y: y, z: 0}, {x:0, y:0, z:0}, type, explosionStore);
    
}

function onContextMenu(e) {
	e.preventDefault();
}


canvas.addEventListener("contextmenu", onContextMenu, false); 
canvas.addEventListener("mousedown", onMouseClick, false);





var lastTime = 0;
var fpsMeasure = {
    samples: 0,
    total: 0,
    lastFps: 0
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
    
    gl.disable(gl.BLEND);
    
    
    fpsDiv.innerHTML = Math.round(fpsMeasure.lastFps).toString() + "fps     explosions: " + explosionStore.explosions.length;
    
    Particle.updateExplosions(particleProgs, explosionStore);
    
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    
    gl.disable(gl.DEPTH_TEST);
    
    gl.viewport(0, 0, width, height);
    gl.clearColor(.6,.5,.2,1);  
    gl.clear(gl.COLOR_BUFFER_BIT);
    
    graphicsPrograms.resolution = {width: width, height: height};
    
    Particle.drawExplosions(particleProgs, graphicsPrograms, {xOffset: 0, yOffset: 0}, explosionStore);
    
    
    requestAnimationFrame(frame);
}



requestAnimationFrame(frame);


