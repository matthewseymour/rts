var gradientFragmentSource = `
precision highp float;

uniform sampler2D u_image;
uniform vec2 u_size;
uniform vec2 u_gradVec;
uniform float u_dist;

varying vec2 v_texCoord;

void main() {
    vec2 texCoord = floor(v_texCoord * u_size);
    
    //Read five points:
    /*
    
          A
        B C D
          E
    
    */
    vec4 A = texture2D(u_image, (texCoord + vec2(  0.0, -u_dist)) / u_size);
    vec4 B = texture2D(u_image, (texCoord + vec2(-u_dist,   0.0)) / u_size);
    vec4 C = texture2D(u_image,  texCoord                         / u_size);
    vec4 D = texture2D(u_image, (texCoord + vec2( u_dist,   0.0)) / u_size);
    vec4 E = texture2D(u_image, (texCoord + vec2(  0.0,  u_dist)) / u_size);
    
    vec4 grad_x = (D - B) / (2.0 * u_dist);
    vec4 grad_y = (E - A) / (2.0 * u_dist);
    //To do: grad squared?

    //Pack and output:   
    gl_FragColor = grad_x * u_gradVec.x + grad_y * u_gradVec.y;
}
`;
