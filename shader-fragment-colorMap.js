var colorMapFragmentSource = `
precision highp float;

uniform sampler2D u_image;
uniform sampler2D u_colorMap;

const float colorMapSize = 3.0;

varying vec2 v_texCoord;

void main() {
    float val_0 = texture2D(u_image, v_texCoord).x;
    float val_1 = texture2D(u_image, v_texCoord).y;
    float val_2 = texture2D(u_image, v_texCoord).z;
    float val_3 = texture2D(u_image, v_texCoord).w;
	
    vec2 readPos_0 = vec2(val_0, 0.0 / colorMapSize);
    vec2 readPos_1 = vec2(val_1, 1.0 / colorMapSize);
    vec2 readPos_2 = vec2(val_2, 2.0 / colorMapSize);
    vec2 readPos_3 = vec2(val_3, 2.0 / colorMapSize);

	
	gl_FragColor = 
          texture2D(u_colorMap, readPos_0) 
        + texture2D(u_colorMap, readPos_1) 
        + texture2D(u_colorMap, readPos_2) 
        + texture2D(u_colorMap, readPos_3);
}
`;