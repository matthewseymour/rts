function makeColorString(red, green, blue) {
	return "rgb(" + red.toString() + "," + green.toString() + "," + blue.toString() + ")";
}






function drawData(x, N, posData, scale, color, canvasContext) {
    canvasContext.strokeStyle = color;
    canvasContext.beginPath();
    canvasContext.moveTo(0, posData + x[0] * scale);
    for(var i = 1; i < N; i++) {
        canvasContext.lineTo(i * WIDTH / N, posData + x[i] * scale);
    }
    canvasContext.stroke();
}


function DFT(x, N) {
    var X_r = [];
    var X_i = [];
    for(var k = 0; k < N; k++) {
        X_r[k] = 0;
        X_i[k] = 0;
        for(var n = 0; n < N; n++) {
            var p = - 2 * Math.PI * n * k / N;
            X_r[k] += x[n] * Math.cos(p);
            X_i[k] += x[n] * Math.sin(p);
        }
    }
    
    return {X_r: X_r, X_i: X_i};
}


function FFT(x, N) {
    var X_r = [];
    var X_i = [];
    
    //Bit reversal:
    for(var i = 0; i < N; i++) {
        var k1 = 1; 
        var k2 = N >> 1;
        var j = 0; //output index
        while(k1 < N) {
            j += (Math.floor(i / k2) % 2) * k1;
            k1 = k1 << 1;
            k2 = k2 >> 1;
        }
        X_r[j] = x[i];
        X_i[j] = 0;
    }

    var outputSize = 2;
    while(outputSize <= N) {
        for(var n = 0; n < N / outputSize; n++) {
            for(var k = 0; k < outputSize / 2; k++) {
                var i1 = outputSize * n + k;
                var i2 = i1 + outputSize / 2;
                var E_r = X_r[i1];
                var E_i = X_i[i1];
                var O_r = X_r[i2];
                var O_i = X_i[i2];
                
                var twiddle_r = Math.cos(- 2 * Math.PI * k / outputSize);
                var twiddle_i = Math.sin(- 2 * Math.PI * k / outputSize);
                
                X_r[i1] = (E_r + twiddle_r * O_r - twiddle_i * O_i) / 2;
                X_i[i1] = (E_i + twiddle_r * O_i + twiddle_i * O_r) / 2;

                X_r[i2] = (E_r - (twiddle_r * O_r - twiddle_i * O_i)) / 2;
                X_i[i2] = (E_i - (twiddle_r * O_i + twiddle_i * O_r)) / 2;
                
            }
        }
        
        outputSize *= 2;
    }

    return {X_r: X_r, X_i: X_i};
}

var x = [];
var N = 256;
var stages = 8;
for(var i = 0; i < N; i++) {
    //x[i] = Math.atan(10 * (i - N /2) / N) / (Math.PI / 2);
    //x[i] = (1 + 3 * Math.sin(3 * 2 * Math.PI * i / N) + 2 * Math.cos(6 * 2 * Math.PI * i / N) + Math.cos(12 * 2 * Math.PI * i / N)) / 6;
    //
    //x[i] = Math.random() * 2 - 1;
}


/*
drawData(x, N, HEIGHT / 4, 30, makeColorString(0, 0, 0), canvasContext);


drawData(X.X_r, N, 2 * HEIGHT / 4, .5, makeColorString(255, 0, 0), canvasContext);
drawData(X.X_i, N, 2 * HEIGHT / 4, .5, makeColorString(0, 0, 255), canvasContext);

var Y = DFT(x, N);

drawData(Y.X_r, N, 3 * HEIGHT / 4, .5, makeColorString(255, 0, 0), canvasContext);
drawData(Y.X_i, N, 3 * HEIGHT / 4, .5, makeColorString(0, 0, 255), canvasContext);
*/
//console.log(x);
var X = FFT(x, N);
//console.log(X);