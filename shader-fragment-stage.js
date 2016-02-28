var stageFragmentSource = `
precision mediump float;

uniform sampler2D u_image_r;
uniform sampler2D u_image_i;
uniform sampler2D u_twiddles_r;
uniform sampler2D u_twiddles_i;
uniform sampler2D u_read;

uniform float u_n;
uniform float u_numStages;
uniform float u_stage;
uniform float u_reduce;

uniform float u_outputReal; //1 to output the real channel, 0 to output the imaginary channel

varying vec2 v_texCoord;

` 
+ packDataIncludeSource + 
`

void main() {
	vec2 readPosControl = vec2(v_texCoord.x, u_stage / u_numStages);
	
	vec2 twiddle = vec2(unpack(texture2D(u_twiddles_r, readPosControl)), unpack(texture2D(u_twiddles_i, readPosControl)));
	
	vec2 readEvenPacked = texture2D(u_read, readPosControl).xy;
	vec2 readOddPacked  = texture2D(u_read, readPosControl).zw;
	
	vec2 readEven = vec2(unpack2Bytes(readEvenPacked) / u_n, v_texCoord.y);
	vec2 readOdd  = vec2(unpack2Bytes(readOddPacked)  / u_n, v_texCoord.y);
	
	vec2 even = vec2(unpack(texture2D(u_image_r, readEven)), unpack(texture2D(u_image_i, readEven)) );
	vec2 odd  = vec2(unpack(texture2D(u_image_r, readOdd )), unpack(texture2D(u_image_i, readOdd )) );
	
	vec2 outVal = (even + multiplyComplex(twiddle, odd)) / u_reduce;
	
	gl_FragColor = pack(outVal.x * u_outputReal + outVal.y * (1.0 - u_outputReal));
}
`;