var transposeFragmentSource = `
precision highp float;

uniform sampler2D u_image;

uniform float u_transpose;

varying vec2 v_texCoord;

void main() {
	vec2 transformed = v_texCoord.xy * (1.0 - u_transpose) + v_texCoord.yx * u_transpose;
	
	gl_FragColor = texture2D(u_image, transformed);
}
`;
