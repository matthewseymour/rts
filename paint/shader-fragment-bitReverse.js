var bitReverseFragmentSource = `
precision highp float;

uniform sampler2D u_image;
uniform sampler2D u_bitReverse;

uniform float u_n;

varying vec2 v_texCoord;


void main() {
	vec4 readPosBitReverse = texture2D(u_bitReverse, vec2(v_texCoord.x, 1));
    float x = readPosBitReverse.x / u_n;
	vec2 readPosImage = vec2(x, v_texCoord.y);
	
	gl_FragColor = texture2D(u_image, readPosImage);
}
`;
