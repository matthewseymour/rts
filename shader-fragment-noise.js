var noiseFragmentSource = `
precision highp float;

varying vec2 v_texCoord;

uniform float u_seed;

`
+ packDataIncludeSource + 
`

float LCG_rand(float prev) {
	//x[n] = ((9821 * x[n-1]) + 6925) mod 65535
	return mod(9821.0 * prev + 6925.0, 65535.0);
}

void main() {
	//float x = (v_texCoord.x) * 256.0 + (v_texCoord.y) * 65536.0; //Range (0, 65536)
    float x = mod(unpack2Bytes(v_texCoord) + u_seed, 65536.0);
	
	x = LCG_rand(x);
	x = LCG_rand(x);
	x = LCG_rand(x);
	x = LCG_rand(x);
	x = LCG_rand(x);
	x = LCG_rand(x);
	
	float z1 = LCG_rand(x);
	float z2 = LCG_rand(z1);
	float z3 = LCG_rand(z2);
	float z4 = LCG_rand(z3);
    
    
	gl_FragColor = vec4(z1, z2, z3, z4) / 65535.0;
}
`;