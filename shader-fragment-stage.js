var stageFragmentSource = `
precision highp float;

uniform sampler2D u_image;
uniform sampler2D u_twiddleRead;

uniform float u_n;
uniform float u_numStages;
uniform float u_stage;
uniform float u_reduce;

varying vec2 v_texCoord;

//To do: Move to an include so that the custom programs can use it:
vec2 multiplyComplex(vec2 a, vec2 b) {
	return vec2(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x);
}


void main() {
	vec2 readPosControl = vec2(v_texCoord.x, u_stage / u_numStages);
	
    vec2 twiddle = texture2D(u_twiddleRead, readPosControl).xy;
	
	vec2 readEven = vec2(texture2D(u_twiddleRead, readPosControl).z / u_n, v_texCoord.y);
	vec2 readOdd  = vec2(texture2D(u_twiddleRead, readPosControl).w / u_n, v_texCoord.y);
	
	vec2 even = texture2D(u_image, readEven).xy;
	vec2 odd  = texture2D(u_image, readOdd ).xy;

	vec2 outVal = (even + multiplyComplex(twiddle, odd)) / u_reduce;
	
    gl_FragColor = vec4(outVal.x, outVal.y, 0, 1.0);
}
`;