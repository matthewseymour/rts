var primitiveInstancedVertexSource = `
precision highp float;

attribute vec2 a_position;
attribute vec3 a_color;
attribute float a_alpha;
attribute vec2 a_offset;

uniform vec2 u_resolution;

varying vec4 v_color;

void main() {
	//convert from 0,0->1,1 to pixel positions:
	vec2 pixel_pos = a_position + a_offset; 

	//convert the rectangle from pixels to 0.0 to 1.0
	vec2 zeroToOne = pixel_pos / u_resolution;
	
	//convert from 0 -> 1 to -1 -> 1, also flip y
	gl_Position = vec4((zeroToOne * 2.0 - 1.0), 0, 1);
    
    v_color = vec4(a_color.r, a_color.g, a_color.b, a_alpha);
    
}
`;
