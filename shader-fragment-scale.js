var scaleFragmentSource = `
precision mediump float;

uniform sampler2D u_image;

uniform float u_scale;

varying vec2 v_texCoord;
` 
+ packDataIncludeSource + 
`
void main() {
	vec2 inputValue = unpack(texture2D(u_image, v_texCoord));
	
	gl_FragColor = pack(inputValue * u_scale);
}
`;