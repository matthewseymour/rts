var primitive3dShadowVertexSource = `
precision highp float;

attribute vec4 a_position;
attribute vec3 a_normal;

uniform mat4 u_matrix_world;
uniform mat4 u_matrix_camera;
uniform mat4 u_matrix_light;

varying vec4 v_shadowCoord; 
varying vec3 v_pos;
varying vec3 v_normal;

void main() {
    v_shadowCoord = u_matrix_light * a_position;
    v_pos = (u_matrix_world * a_position).xyz;
    v_normal =  mat3(u_matrix_world) * a_normal;
    gl_Position = u_matrix_camera * u_matrix_world * a_position;
}
`;
