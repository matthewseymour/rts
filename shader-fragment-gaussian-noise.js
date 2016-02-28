var gaussianNoiseFragmentSource = `
precision mediump float;

varying vec2 v_texCoord;

uniform float u_seed;
uniform float u_scale;

//const float PI = 3.141592653589793238;
`
+ packDataIncludeSource + 
`

float LCG_rand(float prev) {
	//x[n] = ((9821 * x[n-1]) + 6925) mod 65535
	return mod(9821.0 * prev + 6925.0, 65535.0);
}

/*
float LCG_rand2(float prev) {
	//x[n] = ((1217 * x[n-1]) + 0) mod 32767
	return mod(1217.0 * prev, 32767.0);
}
*/

void main() {
    float x = mod(unpack2Bytes(v_texCoord) + u_seed, 65536.0);
	
	x = LCG_rand(x);
	x = LCG_rand(x);
	x = LCG_rand(x);
	x = LCG_rand(x);
	x = LCG_rand(x);
	x = LCG_rand(x);
	
    /*
	x = LCG_rand(x);
    
    float y = LCG_rand(x);
    
    //Two samples in the range 0-1
    vec2 normalized = vec2(x / 65535.0, y / 65535.0);
    
    //Box–Muller transform
    vec2 z = sqrt( - 2.0 * log(normalized.x)) * vec2(cos(2.0 * PI * normalized.y), sin(2.0 * PI * normalized.y));
    */

    //Much better behaved:
    //Actually an Irwin–Hall distribution for n = 10
    float std = sqrt(10.0/12.0); //Variance = n/12, std = sqrt(n/12)
    float mean = 10.0 / 2.0;
    float x1 = 0.0, x2 = 0.0;
    for(int i = 0; i < 10; i++) {
	    x = LCG_rand(x);
        x1 += x;
    }

    float z = u_scale * (x1 / 65535.0 - mean) / std;
    
	gl_FragColor = pack(z * u_scale);
}
`;