var imageMaskVertexSource = `
precision highp float;

attribute vec2 a_position;
attribute vec2 a_texCoord;

varying vec2 v_texCoord;
varying vec2 v_maskTexCoord;

uniform vec2 u_resolution;
uniform vec2 u_position;
uniform vec2 u_size;

uniform vec2 u_texResolution;
uniform vec2 u_texPosition;
uniform vec2 u_texSize;

uniform vec2 u_maskTexResolution;
uniform vec2 u_maskTexPosition;
uniform vec2 u_maskTexSize;

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


	//convert from 0,0->1,1 to pixel positions:
	vec2 maskTexPixelPos = a_texCoord * u_maskTexSize + u_maskTexPosition; 

	//convert the rectangle from pixels to 0.0 to 1.0
	v_maskTexCoord = maskTexPixelPos / u_maskTexResolution;
}
`;
