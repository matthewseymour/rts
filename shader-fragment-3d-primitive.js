var primitive3dFragmentSource = `
precision highp float;

uniform vec4 u_color;
uniform vec4 u_zColor;
uniform vec3 u_light;
uniform float u_ambient;

varying vec4 v_pos; 
varying vec3 v_normal;


void main() {
    //float directionalLightFactor = max(0.0, dot(u_light, v_normal));
    float directionalLightFactor = step(0.0, dot(u_light, v_normal));
	gl_FragColor = (u_color + v_pos.z * u_zColor) * (u_ambient + (1.0 - u_ambient) * directionalLightFactor);
}
`;