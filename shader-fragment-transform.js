var transformFragmentSource1 = `
precision mediump float;

uniform sampler2D u_image;

uniform float u_1;
uniform float u_2;
uniform float u_3;


varying vec2 v_texCoord;
` 
+ packDataIncludeSource + 
`
void main() {
	vec2 a = unpack(texture2D(u_image, v_texCoord));
    vec2 r = v_texCoord;
    vec2 k = 0.5 * sign(0.5 - r) - 0.5 + r;
	vec2 b;
`;


var transformFragmentSource2 = `
	gl_FragColor = pack(b);
}
`;