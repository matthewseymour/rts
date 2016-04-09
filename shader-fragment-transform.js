var transformFragmentSource1 = `
precision highp float;

uniform sampler2D u_image;

uniform float u_1;
uniform float u_2;
uniform float u_3;
uniform float u_4;

uniform vec2 u_size;

varying vec2 v_texCoord;

void main() {
	vec4 a = texture2D(u_image, v_texCoord);
    vec2 r = v_texCoord;
    vec2 k = 0.5 * sign(0.5 - r) - 0.5 + r - 0.5 / u_size;
	vec4 b;
`;


var transformFragmentSource2 = `
	gl_FragColor = b;
}
`;
