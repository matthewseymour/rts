"use strict";

const Matrix = {};

//Note: All matrices are in column major order
Matrix.makeTranslation = function(tx, ty, tz) {
    return [
        1,  0,  0,  0,
        0,  1,  0,  0,
        0,  0,  1,  0,
        tx, ty, tz, 1
    ];
}
    
Matrix.makeXRotation = function(angleInRadians) {
    var c = Math.cos(angleInRadians);
    var s = Math.sin(angleInRadians);

    return [
        1, 0, 0, 0,
        0, c, s, 0,
        0, -s, c, 0,
        0, 0, 0, 1
    ];
};

Matrix.makeYRotation = function(angleInRadians) {
    var c = Math.cos(angleInRadians);
    var s = Math.sin(angleInRadians);

    return [
        c, 0, -s, 0,
        0, 1, 0, 0,
        s, 0, c, 0,
        0, 0, 0, 1
    ];
};

Matrix.makeZRotation = function(angleInRadians) {
    var c = Math.cos(angleInRadians);
    var s = Math.sin(angleInRadians);

    return [
        c, s, 0, 0,
        -s, c, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1,
    ];
}

Matrix.makeScale = function(sx, sy, sz) {
    return [
        sx, 0, 0, 0,
        0, sy, 0, 0,
        0, 0, sz, 0,
        0, 0, 0,  1
    ];
}

Matrix.makeIdentity = function() {
    return [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0,  1
    ];
}

Matrix.multiplyMatrices = function(b, a) {
    //Note the order of the inputs. This is because they are in column major order
    return [
        a[0] *b[0] + a[1] *b[4] + a[2] *b[8]  + a[3] *b[12], a[0] *b[1] + a[1] *b[5] + a[2] *b[9] + a[3] *b[13], a[0] *b[2] + a[1] *b[6] + a[2] *b[10] + a[3] *b[14], a[0] *b[3] + a[1] *b[7] + a[2] *b[11] + a[3] *b[15],
        a[4] *b[0] + a[5] *b[4] + a[6] *b[8]  + a[7] *b[12], a[4] *b[1] + a[5] *b[5] + a[6] *b[9] + a[7] *b[13], a[4] *b[2] + a[5] *b[6] + a[6] *b[10] + a[7] *b[14], a[4] *b[3] + a[5] *b[7] + a[6] *b[11] + a[7] *b[15],
        a[8] *b[0] + a[9] *b[4] + a[10]*b[8]  + a[11]*b[12], a[8] *b[1] + a[9] *b[5] + a[10]*b[9] + a[11]*b[13], a[8] *b[2] + a[9] *b[6] + a[10]*b[10] + a[11]*b[14], a[8] *b[3] + a[9] *b[7] + a[10]*b[11] + a[11]*b[15],
        a[12]*b[0] + a[13]*b[4] + a[14]*b[8]  + a[15]*b[12], a[12]*b[1] + a[13]*b[5] + a[14]*b[9] + a[15]*b[13], a[12]*b[2] + a[13]*b[6] + a[14]*b[10] + a[15]*b[14], a[12]*b[3] + a[13]*b[7] + a[14]*b[11] + a[15]*b[15],
    ]
}

Matrix.multiplyManyMatrices = function(mats) {
    var m = mats[0];
    for(var i = 1; i < mats.length; i++)
        m = Matrix.multiplyMatrices(m, mats[i]);
    return m;
}
