var transform2FragmentSource1 = `
precision mediump float;

uniform sampler2D u_image0;
uniform sampler2D u_image1;

varying vec2 v_texCoord;
` 
+ packDataIncludeSource + 
`
void main() {
	vec2 a0 = unpack(texture2D(u_image0, v_texCoord));
	vec2 a1 = unpack(texture2D(u_image1, v_texCoord));
    vec2 r = v_texCoord;
    vec2 k = 0.5 * sign(0.5 - r) - 0.5 + r;
	vec2 b;
`;


var transform2FragmentSource2 = `
	gl_FragColor = pack(b);
}
`;