var spriteEdgeDetectFragmentSource = `
precision highp float;

uniform sampler2D u_image;
uniform vec2 u_sizeFragment;
uniform float u_threshold;

varying vec2 v_texCoord;

void main() {
    vec2 scaledTexCoord = v_texCoord * u_sizeFragment;
    vec2 texCoord = floor(scaledTexCoord);
    
    
    //Read 5 point stencil of points:
    float p01 = texture2D(u_image, (texCoord + vec2( 0.0, -1.0)) / u_sizeFragment).a;
    float p10 = texture2D(u_image, (texCoord + vec2(-1.0,  0.0)) / u_sizeFragment).a;
    float p11 = texture2D(u_image, (texCoord + vec2( 0.0,  0.0)) / u_sizeFragment).a;
    float p12 = texture2D(u_image, (texCoord + vec2( 1.0,  0.0)) / u_sizeFragment).a;
    float p21 = texture2D(u_image, (texCoord + vec2( 0.0,  1.0)) / u_sizeFragment).a;
  
    float minVal = min(min(p01, p10), min(p12, p21));
    
    vec4 outColor;
    if(p11 >= u_threshold && minVal < u_threshold) {
        outColor = vec4(1.0, 1.0, 1.0, 1.0);
    } else {
        outColor = vec4(0.0, 0.0, 0.0, 0.0);
    }
    
    gl_FragColor = outColor;
}
`;
