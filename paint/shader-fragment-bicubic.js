var bicubicFragmentSource = `
precision highp float;

uniform sampler2D u_image;
uniform vec2 u_size;

varying vec2 v_texCoord;

vec4 cubicInterpolator(vec4 p0, vec4 p1, vec4 p2, vec4 p3, float x) {
	return p1 + 0.5 * x * (p2 - p0 + x * (2.0 * p0 - 5.0 * p1 + 4.0 * p2 - p3 + x * (3.0 * (p1 - p2) + p3 - p0)));
}

void main() {
    vec2 scaledTexCoord = v_texCoord * u_size - .5; //-.5 aligns the result to match simple scaling
    vec2 texCoord = floor(scaledTexCoord);
    vec2 position = fract(scaledTexCoord);
    
    
    //Read 4x4 grid of points:
    vec4 p00 = texture2D(u_image, (texCoord + vec2(-1.0, -1.0)) / u_size);
    vec4 p01 = texture2D(u_image, (texCoord + vec2( 0.0, -1.0)) / u_size);
    vec4 p02 = texture2D(u_image, (texCoord + vec2( 1.0, -1.0)) / u_size);
    vec4 p03 = texture2D(u_image, (texCoord + vec2( 2.0, -1.0)) / u_size);

    vec4 p10 = texture2D(u_image, (texCoord + vec2(-1.0,  0.0)) / u_size);
    vec4 p11 = texture2D(u_image, (texCoord + vec2( 0.0,  0.0)) / u_size);
    vec4 p12 = texture2D(u_image, (texCoord + vec2( 1.0,  0.0)) / u_size);
    vec4 p13 = texture2D(u_image, (texCoord + vec2( 2.0,  0.0)) / u_size);

    vec4 p20 = texture2D(u_image, (texCoord + vec2(-1.0,  1.0)) / u_size);
    vec4 p21 = texture2D(u_image, (texCoord + vec2( 0.0,  1.0)) / u_size);
    vec4 p22 = texture2D(u_image, (texCoord + vec2( 1.0,  1.0)) / u_size);
    vec4 p23 = texture2D(u_image, (texCoord + vec2( 2.0,  1.0)) / u_size);

    vec4 p30 = texture2D(u_image, (texCoord + vec2(-1.0,  2.0)) / u_size);
    vec4 p31 = texture2D(u_image, (texCoord + vec2( 0.0,  2.0)) / u_size);
    vec4 p32 = texture2D(u_image, (texCoord + vec2( 1.0,  2.0)) / u_size);
    vec4 p33 = texture2D(u_image, (texCoord + vec2( 2.0,  2.0)) / u_size);
  
    //Interpolate along each row:
    vec4 p0 = cubicInterpolator(p00, p01, p02, p03, position.x);
    vec4 p1 = cubicInterpolator(p10, p11, p12, p13, position.x);
    vec4 p2 = cubicInterpolator(p20, p21, p22, p23, position.x);
    vec4 p3 = cubicInterpolator(p30, p31, p32, p33, position.x);
    
    //Interpolate vertically:
    vec4 val = cubicInterpolator(p0, p1, p2, p3, position.y);
    
    //Pack and output:   
    gl_FragColor = val;
}
`;
