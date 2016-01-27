var spriteVertexSource = `
attribute vec2 a_position;
attribute vec2 a_texCoord;

uniform vec2 u_resolution;
uniform vec2 u_position, u_size;

varying vec2 v_texCoord;
uniform vec2 u_texResolution;
uniform vec2 u_texPosition, u_texSize;

void main() {
	//convert from 0,0->1,1 to pixel positions:
	vec2 pixel_pos = a_position * u_size + u_position; 

	//convert the rectangle from pixels to 0.0 to 1.0
	vec2 zeroToOne = pixel_pos / u_resolution;
	
	//convert from 0 -> 1 to -1 -> 1, also flip y
	gl_Position = vec4((zeroToOne * 2.0 - 1.0), 0, 1);
	
	//convert from 0,0->1,1 to pixel positions:
	vec2 texPixelPos = a_texCoord * u_texSize + u_texPosition; 

	//convert the rectangle from pixels to 0.0 to 1.0
	v_texCoord = texPixelPos / u_texResolution;
}
`;