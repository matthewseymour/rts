var computeVertexSource = `
precision highp float;

attribute vec2 a_position;
attribute vec2 a_texCoord;

varying vec2 v_texCoord;

void main() {
	//convert from 0 -> 1 to -1 -> 1
	gl_Position = vec4((a_position * 2.0 - 1.0), 0, 1);

	v_texCoord = a_texCoord;
}
`;
