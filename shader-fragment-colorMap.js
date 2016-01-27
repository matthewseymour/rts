var colorMapFragmentSource = `
precision mediump float;

uniform sampler2D u_image_0;
uniform sampler2D u_image_1;
uniform sampler2D u_image_2;
uniform sampler2D u_colorMap;

const float colorMapSize = 3.0;

varying vec2 v_texCoord;
`
+ packDataIncludeSource + 
`
void main() {
    vec2 val_0 = unpack(texture2D(u_image_0, v_texCoord));
    vec2 val_1 = unpack(texture2D(u_image_1, v_texCoord));
    vec2 val_2 = unpack(texture2D(u_image_2, v_texCoord));
	
    vec2 readPos_0 = vec2((val_0.x + 1.0) / 2.0, 0.0 / colorMapSize);
    vec2 readPos_1 = vec2((val_1.x + 1.0) / 2.0, 1.0 / colorMapSize);
    vec2 readPos_2 = vec2((val_2.x + 1.0) / 2.0, 2.0 / colorMapSize);

	
	gl_FragColor = texture2D(u_colorMap, readPos_0) + texture2D(u_colorMap, readPos_1) + texture2D(u_colorMap, readPos_2);
}
`;