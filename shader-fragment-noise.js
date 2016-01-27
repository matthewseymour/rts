var noiseFragmentSource = `
precision mediump float;

varying vec2 v_texCoord;

uniform float u_seed;

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
	//float x = (v_texCoord.x) * 256.0 + (v_texCoord.y) * 65536.0; //Range (0, 65536)
    float x = mod(unpack2Bytes(v_texCoord) + u_seed, 65536.0);
	
	x = LCG_rand(x);
	x = LCG_rand(x);
	x = LCG_rand(x);
	x = LCG_rand(x);
	x = LCG_rand(x);
	x = LCG_rand(x);
	
	x = LCG_rand(x);
    
    float y = LCG_rand(x);

	gl_FragColor = pack(vec2(x / 65535.0, y / 65535.0));
}
`;