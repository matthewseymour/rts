var stageFragmentSource = `
precision mediump float;

uniform sampler2D u_image;
uniform sampler2D u_twiddles;
uniform sampler2D u_read;

uniform float u_n;
uniform float u_numStages;
uniform float u_stage;
uniform float u_reduce;

varying vec2 v_texCoord;

` 
+ packDataIncludeSource + 
`

void main() {
	vec2 readPosControl = vec2(v_texCoord.x, u_stage / u_numStages);
	
	vec2 twiddle = unpack(texture2D(u_twiddles, readPosControl));
	
	vec2 readEvenPacked = texture2D(u_read, readPosControl).xy;
	vec2 readOddPacked  = texture2D(u_read, readPosControl).zw;
	
	vec2 readEven = vec2(unpack2Bytes(readEvenPacked) / u_n, v_texCoord.y);
	vec2 readOdd  = vec2(unpack2Bytes(readOddPacked)  / u_n, v_texCoord.y);
	
	vec2 even = unpack(texture2D(u_image, readEven));
	vec2 odd  = unpack(texture2D(u_image, readOdd ));
	
	vec2 outVal = (even + multiplyComplex(twiddle, odd)) / u_reduce;
	
	gl_FragColor = pack(outVal);
}
`;