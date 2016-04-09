var particleVertexSource = `
precision highp float;

attribute vec2 a_index;

uniform mat4 u_matrix;

//uniform vec4 u_color;

uniform sampler2D u_inputPosition;
uniform sampler2D u_inputColor;

varying vec4 v_color;

void main() {
    gl_PointSize = 5.0;//4.0;
    
    vec4 info = texture2D(u_inputPosition, a_index);
    
    vec3 position = info.xyz;
    
    float time = info.w * 0.02;
    
    vec4 pos4 = vec4(position.x, position.y, position.z, 1.0);

	gl_Position = u_matrix * pos4;
    
    vec4 color1 = vec4(3.0 - time, 2.0 - time, 1.0 - time, 1.0);
    float t0 = 3.0;
    vec4 color2 = vec4(min(time - t0, 1.0) / 3.0, min(time - t0, 1.0) / 3.0, min(time - t0, 1.0) / 3.0, clamp(1.0 - pow((time - t0) / 10.0, .1), 0.0, 1.0));
    v_color = step(time, t0) * color1 + (1.0 - step(time, t0)) * color2;
}
`;
