var particleVertexSource = `
precision highp float;

attribute vec2 a_index;

uniform mat4 u_matrix;

uniform sampler2D u_inputPosition;

varying vec4 v_color;

void main() {
    gl_PointSize = 5.0;//4.0;
    
    vec4 info = texture2D(u_inputPosition, a_index); //xyz is position, w is time
    
    
    if(info.w > 650.0) {
        gl_Position = vec4(-2.0, -2.0, 0, 1.0);
    } else {
    	gl_Position = u_matrix * vec4(info.xyz, 1.0);
    
        
        float time = info.w * 0.02;
        
        vec4 color1 = vec4(3.0 - time, 2.0 - time, 1.0 - time, 1.0);
        
        float t0 = 3.0;
        float rgb = min(time - t0, 4.0) / 10.0;
        vec4 color2 = vec4(rgb, rgb, rgb, 1.0 - pow(max(time - t0, 0.0) / 10.0, .1));
        
        v_color = step(time, t0) * color1 + (1.0 - step(time, t0)) * color2;
    }
}
`;

var particleUpdateVertexSource = `
precision highp float;

attribute vec2 a_position; //used for both the texture and the coordinate

varying vec2 v_texCoord;

void main() {
	gl_Position = vec4((a_position * 2.0 - 1.0), 0, 1);

	v_texCoord = a_position;
}
`;

var glareVertexSource = `
precision highp float;

attribute vec4 a_position;

uniform vec3 u_position;

uniform mat4 u_matrix;

uniform float u_size;

void main() {
    gl_PointSize = u_size;
    
    vec4 a = a_position;
	gl_Position = u_matrix * vec4(u_position, 1.0);
}
`;