var imageDepthFragmentSource = `
precision highp float;

uniform sampler2D u_image;
uniform sampler2D u_depthImage;
uniform vec4 u_mask;
uniform float u_depth;

varying vec2 v_texCoord;

varying vec2 v_depthTexCoord;

void main() {
    if(u_depth > texture2D(u_depthImage, v_depthTexCoord).r) 
        discard;
    
    gl_FragColor = texture2D(u_image, v_texCoord) * u_mask;
    
}
`;
