var reduceFragmentSource1 = `
precision highp float;

uniform sampler2D u_image;
uniform float u_offset;

uniform float u_1;
uniform float u_2;
uniform float u_3;
uniform float u_4;


varying vec2 v_texCoord;

void main() {
	vec4 a0 = texture2D(u_image, v_texCoord                           );
	vec4 a1 = texture2D(u_image, v_texCoord + vec2(u_offset, 0.0     ));
	vec4 a2 = texture2D(u_image, v_texCoord + vec2(0.0     , u_offset));
	vec4 a3 = texture2D(u_image, v_texCoord + vec2(u_offset, u_offset));
	vec4 b;
`;


var reduceFragmentSource2 = `
	gl_FragColor = b;
}
`;
