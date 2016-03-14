var imageMaskFragmentSource = `
precision highp float;

uniform sampler2D u_image;
uniform sampler2D u_mask;

varying vec2 v_texCoord;
varying vec2 v_maskTexCoord;

void main() {
	gl_FragColor = texture2D(u_image, v_texCoord) * texture2D(u_mask, v_maskTexCoord);
}
`;
