var gaussianNoiseFragmentSource = `
precision highp float;

varying vec2 v_texCoord;

uniform float u_seed;
uniform float u_scale;

`
+ packDataIncludeSource + 
`

float LCG_rand(float prev) {
	//x[n] = ((9821 * x[n-1]) + 6925) mod 65535
	return mod(9821.0 * prev + 6925.0, 65535.0);
}

void main() {
    float x = mod(unpack2Bytes(v_texCoord) + u_seed, 65536.0);
	
	x = LCG_rand(x);
	x = LCG_rand(x);
	x = LCG_rand(x);
	x = LCG_rand(x);
	x = LCG_rand(x);
	x = LCG_rand(x);
	
    //Much better behaved:
    //Actually an Irwin–Hall distribution for n = 10
    float std = sqrt(10.0/12.0); //Variance = n/12, std = sqrt(n/12)
    float mean = 10.0 / 2.0;
    vec4 xOut = vec4(0.0);
    for(int i = 0; i < 10; i++) {
	    x = LCG_rand(x);
        xOut.x += x;
    }

    for(int i = 0; i < 10; i++) {
	    x = LCG_rand(x);
        xOut.y += x;
    }

    for(int i = 0; i < 10; i++) {
	    x = LCG_rand(x);
        xOut.z += x;
    }
    
    for(int i = 0; i < 10; i++) {
	    x = LCG_rand(x);
        xOut.w += x;
    }
    
    vec4 z = u_scale * (xOut / 65535.0 - mean) / std;
    
	gl_FragColor = z * u_scale;
}
`;