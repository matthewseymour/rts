var scaleFragmentSource = `
precision highp float;

uniform sampler2D u_image;

uniform float u_scale;

varying vec2 v_texCoord;


void main() {
	vec4 inputValue = texture2D(u_image, v_texCoord);
	
	gl_FragColor = inputValue * u_scale;
}
`;
