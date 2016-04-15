"use strict";

const Bullet = {};

//Bullet must have:
//x, y, lastX, lastY, vx, vy, time, damage, attacker ID
Bullet.storeWidth      = 12;
Bullet.X               = 0;
Bullet.Y               = 1;
Bullet.Z               = 2;
Bullet.LAST_X          = 3;
Bullet.LAST_Y          = 4;
Bullet.V_X             = 5;
Bullet.V_Y             = 6;
Bullet.TIME            = 7;
Bullet.DAMAGE          = 8;
Bullet.ID              = 9;
Bullet.DEAD            = 10;
Bullet.ALIVE_DEAD_TIME = 11;

Bullet.BULLET_LENGTH = .3;


Bullet.getBulletStore = function(size) {
    return {
        bullets: new Float64Array(size * Bullet.storeWidth),
        positions: new Float32Array(size * 2),
        visible: new Float32Array(size),
        topPointer: 0,
        size: size,
    };
};

Bullet.makeBulletVertexBuffer = function(gl, bulletStore) {
    var bulletVertices = new Float32Array(
        [-1.25, 0, 0,  1.25, 0, -1.25,
          1.25, 0, 0, -1.25, 0,  1.25]
    );
    var bulletVertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bulletVertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, bulletVertices, gl.STATIC_DRAW);

    var bulletVerticesColors = new Float32Array(
        [1,1,.5, 1,1,0.5, 1,1,0.5,
         1,1,.5, 1,1,0.5, 1,1,0.5,]
    );
    
    var colorVertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorVertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, bulletVerticesColors, gl.STATIC_DRAW);
    
    var offsetsVertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, offsetsVertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, bulletStore.positions, gl.DYNAMIC_DRAW);
    
    var alphasVertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, alphasVertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, bulletStore.visible, gl.DYNAMIC_DRAW);
    
    bulletStore.vertexBuffer = bulletVertexBuffer;
    bulletStore.colorVertexBuffer = colorVertexBuffer;
    bulletStore.offsetsVertexBuffer = offsetsVertexBuffer;
    bulletStore.alphasVertexBuffer = alphasVertexBuffer;
};


Bullet.addBullet = function(store, x, y, z, vx, vy, airTime, damage, attackerId) {
    if(store.topPointer == store.size) {
        return false;
    }
    var i = store.topPointer * Bullet.storeWidth;

    store.bullets[i + Bullet.X              ] = x;
    store.bullets[i + Bullet.Y              ] = y;
    store.bullets[i + Bullet.Z              ] = z;
    store.bullets[i + Bullet.LAST_X         ] = x;
    store.bullets[i + Bullet.LAST_Y         ] = y;
    store.bullets[i + Bullet.V_X            ] = vx;
    store.bullets[i + Bullet.V_Y            ] = vy;
    store.bullets[i + Bullet.TIME           ] = airTime;
    store.bullets[i + Bullet.DAMAGE         ] = damage;
    store.bullets[i + Bullet.ID             ] = attackerId;
    store.bullets[i + Bullet.DEAD           ] = 0;
    store.bullets[i + Bullet.ALIVE_DEAD_TIME] = 0;
    
    store.topPointer++;
};

Bullet.deleteBullet = function(store, index) {
    if(store.topPointer == store.size) {
        return false;
    }
    
    store.topPointer--;
    
    //Overwrite the index to be deleted with the last bullet:
    var i = store.topPointer * Bullet.storeWidth;
    var j = index * Bullet.storeWidth;
    
    store.bullets[j + Bullet.X              ] = store.bullets[i + Bullet.X              ];
    store.bullets[j + Bullet.Y              ] = store.bullets[i + Bullet.Y              ];
    store.bullets[j + Bullet.Z              ] = store.bullets[i + Bullet.Z              ];
    store.bullets[j + Bullet.LAST_X         ] = store.bullets[i + Bullet.LAST_X         ];
    store.bullets[j + Bullet.LAST_Y         ] = store.bullets[i + Bullet.LAST_Y         ];
    store.bullets[j + Bullet.V_X            ] = store.bullets[i + Bullet.V_X            ];
    store.bullets[j + Bullet.V_Y            ] = store.bullets[i + Bullet.V_Y            ];
    store.bullets[j + Bullet.TIME           ] = store.bullets[i + Bullet.TIME           ];
    store.bullets[j + Bullet.DAMAGE         ] = store.bullets[i + Bullet.DAMAGE         ];
    store.bullets[j + Bullet.ID             ] = store.bullets[i + Bullet.ID             ];    
    store.bullets[j + Bullet.DEAD           ] = store.bullets[i + Bullet.DEAD           ];
    store.bullets[j + Bullet.ALIVE_DEAD_TIME] = store.bullets[i + Bullet.ALIVE_DEAD_TIME];
    
};


Bullet.update = function(game) {
    var store = game.bullets;
    for(var i = 0; i < store.topPointer; i++) {
        var j = i * Bullet.storeWidth;
        
        if(store.bullets[j + Bullet.DEAD]) {
            Bullet.deleteBullet(store, i);
            i--; //Repeat this index
            continue;
        }
        
        store.bullets[j + Bullet.LAST_X] = store.bullets[j + Bullet.X];
        store.bullets[j + Bullet.LAST_Y] = store.bullets[j + Bullet.Y];
        
        var steps = 5;
        var vx = store.bullets[j + Bullet.V_X] / steps;
        var vy = store.bullets[j + Bullet.V_Y] / steps;

        var hit = false;
        for(var k = 0; k < steps; k++) {

            var lineSegment = {
                p1: {x: store.bullets[j + Bullet.X] + vx * k      , y: store.bullets[j + Bullet.Y] + vy * k      },
                p2: {x: store.bullets[j + Bullet.X] + vx * (k + 1), y: store.bullets[j + Bullet.Y] + vy * (k + 1)},
            };
        
            var inRange = Game.findUnitsInRangeLine(game, lineSegment, 0, function(x) {return true;});
            if(inRange.length > 0) {
                Unit.takeDamage(inRange[0], store.bullets[j + Bullet.DAMAGE], store.bullets[j + Bullet.ID]);
                store.bullets[j + Bullet.DEAD] = 1;
                store.bullets[j + Bullet.ALIVE_DEAD_TIME] = (k + 0.5) / steps;
                
                hit = true;
                break;
            }
        }
        
        if(!hit && store.bullets[j + Bullet.TIME] <= 1) {
            store.bullets[j + Bullet.DEAD] = 1;
            store.bullets[j + Bullet.ALIVE_DEAD_TIME] = store.bullets[j + Bullet.TIME];
        }
        
        if(store.bullets[j + Bullet.DEAD] == 1) {
            Particle.makeExplosion(
                {x: store.bullets[j + Bullet.X] + store.bullets[j + Bullet.V_X] * store.bullets[j + Bullet.ALIVE_DEAD_TIME], 
                 y: store.bullets[j + Bullet.Y] + store.bullets[j + Bullet.V_Y] * store.bullets[j + Bullet.ALIVE_DEAD_TIME], 
                 z: store.bullets[j + Bullet.Z]}, 
                    {x: 0, y: 0, z: 0}, Particle.ExpTypes.SHELL, game.explosionStore);
        }

        store.bullets[j + Bullet.X] += store.bullets[j + Bullet.V_X];
        store.bullets[j + Bullet.Y] += store.bullets[j + Bullet.V_Y];
        
        store.bullets[j + Bullet.TIME] -= 1;
    }
}

Bullet.draw = function(store, timeAccRatio, view, graphicsPrograms) {
    for(var index = 0; index < store.topPointer; index++) {
        var i = index * Bullet.storeWidth;
        
        if(store.bullets[i + Bullet.DEAD] == 1 && timeAccRatio > store.bullets[i + Bullet.ALIVE_DEAD_TIME]) {
            store.visible[index] = 0;
            continue;
        } else {
            store.visible[index] = 1;
        }
        
        
        var position = Geometry.interpolatePosition(
            {x: store.bullets[i + Bullet.LAST_X], y: store.bullets[i + Bullet.LAST_Y]}, 
            {x: store.bullets[i + Bullet.X     ], y: store.bullets[i + Bullet.Y     ]}, 
            timeAccRatio);
        
        var point = convertToScreen({x: position.x, y: position.y + store.bullets[i + Bullet.Z] * Z_SCALE}, view);
        store.positions[index * 2    ] = point.x;
        store.positions[index * 2 + 1] = point.y;
        
        
    }
    var gl = graphicsPrograms.gl;

    gl.bindBuffer(gl.ARRAY_BUFFER, store.offsetsVertexBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, store.positions.subarray(0, store.topPointer * 2));

    gl.bindBuffer(gl.ARRAY_BUFFER, store.alphasVertexBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, store.visible.subarray(0, store.topPointer));
    
    Graphics.drawTrianglesInstanced(graphicsPrograms, store.vertexBuffer, store.offsetsVertexBuffer, store.colorVertexBuffer, store.alphasVertexBuffer, 2, store.topPointer);    
    

}