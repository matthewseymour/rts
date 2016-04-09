var transform2FragmentSource1 = `
precision highp float;

uniform sampler2D u_image0;
uniform sampler2D u_image1;

uniform float u_1;
uniform float u_2;
uniform float u_3;
uniform float u_4;

uniform vec2 u_size;

varying vec2 v_texCoord;

void main() {
	vec4 a0 = texture2D(u_image0, v_texCoord);
	vec4 a1 = texture2D(u_image1, v_texCoord);
    vec2 r = v_texCoord;
    vec2 k = 0.5 * sign(0.5 - r) - 0.5 + r - 0.5 / u_size;
	vec4 b;
`;


var transform2FragmentSource2 = `
	gl_FragColor = b;
}
`;
