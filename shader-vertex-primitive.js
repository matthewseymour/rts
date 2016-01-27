var primitiveVertexSource = `
attribute vec2 a_position;

uniform vec2 u_resolution;
uniform vec2 u_position;
uniform vec2 u_size;

void main() {
	//convert from 0,0->1,1 to pixel positions:
	vec2 pixel_pos = a_position * u_size + u_position; 

	//convert the rectangle from pixels to 0.0 to 1.0
	vec2 zeroToOne = pixel_pos / u_resolution;
	
	//convert from 0 -> 1 to -1 -> 1, also flip y
	gl_Position = vec4((zeroToOne * 2.0 - 1.0), 0, 1);
}
`;