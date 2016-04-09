var spriteTeamDepthFragmentSource = `
precision highp float;

uniform sampler2D u_image;
uniform sampler2D u_outline;
uniform sampler2D u_depthImage;
uniform vec4 u_mask;
uniform vec3 u_teamColor1;
uniform vec3 u_teamColor2;
uniform vec3 u_teamColor3;
uniform vec3 u_outlineColor;
uniform float u_depth;

varying vec2 v_texCoord;
varying vec2 v_texTeamCoord;
varying vec2 v_depthTexCoord;

void main() {
    if(u_depth > texture2D(u_depthImage, v_depthTexCoord).r) {
        //discard;
        gl_FragColor = vec4(u_outlineColor, texture2D(u_outline, v_texCoord).a);
    } else {
    
    
        vec4 teamSpriteColor = texture2D(u_image, v_texTeamCoord) - texture2D(u_image, v_texCoord);
    
        vec4 teamColor = vec4(
            u_teamColor1 * teamSpriteColor.r + u_teamColor2 * teamSpriteColor.g + u_teamColor3 * teamSpriteColor.b, 
            0.0
        );
    
        gl_FragColor = (teamColor + texture2D(u_image, v_texCoord)) * u_mask;
    }
}  
`;
