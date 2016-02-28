var gradientFragmentSource = `
precision mediump float;

uniform sampler2D u_image;
uniform vec2 u_size;
uniform vec2 u_gradVec;
uniform float u_dist;

varying vec2 v_texCoord;
`
+ packDataIncludeSource + 
`

void main() {
    vec2 texCoord = floor(v_texCoord * u_size);
    
    //Read five points:
    /*
    
          A
        B C D
          E
    
    */
    float A = unpack(texture2D(u_image, (texCoord + vec2(  0.0, -u_dist)) / u_size));
    float B = unpack(texture2D(u_image, (texCoord + vec2(-u_dist,   0.0)) / u_size));
    float C = unpack(texture2D(u_image,  texCoord                         / u_size));
    float D = unpack(texture2D(u_image, (texCoord + vec2( u_dist,   0.0)) / u_size));
    float E = unpack(texture2D(u_image, (texCoord + vec2(  0.0,  u_dist)) / u_size));
    
    float grad_x = (D - B) / (2.0 * u_dist);
    float grad_y = (E - A) / (2.0 * u_dist);
    //To do: grad squared?

    //Pack and output:   
    gl_FragColor = pack(grad_x * u_gradVec.x + grad_y * u_gradVec.y);
}
`;