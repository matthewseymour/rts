var imageFragmentSource = `
precision highp float;

uniform sampler2D u_image;
uniform vec4 u_mask;

varying vec2 v_texCoord;

void main() {
	gl_FragColor = texture2D(u_image, v_texCoord) * u_mask;
}
`;
