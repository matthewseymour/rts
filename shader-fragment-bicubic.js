var bicubicFragmentSource = `
precision mediump float;

uniform sampler2D u_image;
uniform vec2 u_size;

varying vec2 v_texCoord;
`
+ packDataIncludeSource + 
`

vec2 cubicInterpolator(vec2 p0, vec2 p1, vec2 p2, vec2 p3, float x) {
	return p1 + 0.5 * x * (p2 - p0 + x * (2.0 * p0 - 5.0 * p1 + 4.0 * p2 - p3 + x * (3.0 * (p1 - p2) + p3 - p0)));
}

void main() {
    vec2 scaledTexCoord = v_texCoord * u_size - .5; //-.5 aligns the result to match simple scaling
    vec2 texCoord = floor(scaledTexCoord);
    vec2 position = fract(scaledTexCoord);
    
    
    //Read 4x4 grid of points:
    vec2 p00 = unpack(texture2D(u_image, (texCoord + vec2(-1.0, -1.0)) / u_size));
    vec2 p01 = unpack(texture2D(u_image, (texCoord + vec2( 0.0, -1.0)) / u_size));
    vec2 p02 = unpack(texture2D(u_image, (texCoord + vec2( 1.0, -1.0)) / u_size));
    vec2 p03 = unpack(texture2D(u_image, (texCoord + vec2( 2.0, -1.0)) / u_size));

    vec2 p10 = unpack(texture2D(u_image, (texCoord + vec2(-1.0,  0.0)) / u_size));
    vec2 p11 = unpack(texture2D(u_image, (texCoord + vec2( 0.0,  0.0)) / u_size));
    vec2 p12 = unpack(texture2D(u_image, (texCoord + vec2( 1.0,  0.0)) / u_size));
    vec2 p13 = unpack(texture2D(u_image, (texCoord + vec2( 2.0,  0.0)) / u_size));

    vec2 p20 = unpack(texture2D(u_image, (texCoord + vec2(-1.0,  1.0)) / u_size));
    vec2 p21 = unpack(texture2D(u_image, (texCoord + vec2( 0.0,  1.0)) / u_size));
    vec2 p22 = unpack(texture2D(u_image, (texCoord + vec2( 1.0,  1.0)) / u_size));
    vec2 p23 = unpack(texture2D(u_image, (texCoord + vec2( 2.0,  1.0)) / u_size));

    vec2 p30 = unpack(texture2D(u_image, (texCoord + vec2(-1.0,  2.0)) / u_size));
    vec2 p31 = unpack(texture2D(u_image, (texCoord + vec2( 0.0,  2.0)) / u_size));
    vec2 p32 = unpack(texture2D(u_image, (texCoord + vec2( 1.0,  2.0)) / u_size));
    vec2 p33 = unpack(texture2D(u_image, (texCoord + vec2( 2.0,  2.0)) / u_size));
  
    //Interpolate along each row:
    vec2 p0 = cubicInterpolator(p00, p01, p02, p03, position.x);
    vec2 p1 = cubicInterpolator(p10, p11, p12, p13, position.x);
    vec2 p2 = cubicInterpolator(p20, p21, p22, p23, position.x);
    vec2 p3 = cubicInterpolator(p30, p31, p32, p33, position.x);
    
    //Interpolate vertically:
    vec2 val = cubicInterpolator(p0, p1, p2, p3, position.y);
    
    //Pack and output:   
    gl_FragColor = pack(val);
}
`;