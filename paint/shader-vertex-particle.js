var particleVertexSource = `
precision highp float;

attribute vec2 a_index;

uniform mat4 u_matrix;

//uniform vec4 u_color;

uniform sampler2D u_inputPosition;
uniform sampler2D u_inputColor;

varying vec4 v_color;

void main() {
    gl_PointSize = 2.0;
    
    vec2 position = texture2D(u_inputPosition, a_index).xy;
    
    vec4 pos4 = vec4(position.x, position.y, 0, 1.0);

	gl_Position = u_matrix * pos4;
    
    v_color = texture2D(u_inputColor, a_index);
}
`;
