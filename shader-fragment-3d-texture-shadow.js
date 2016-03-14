var texture3dShadowFragmentSource = `
precision highp float;

uniform sampler2D u_texture;
uniform sampler2D u_shadowMap;

uniform vec3 u_light;
uniform float u_ambient;

varying vec4 v_shadowCoord; 
varying vec3 v_normal;
varying vec2 v_texCoord;
` + shadowIncludeSource +
`

void main() {
    float lightPerspectiveDepth = v_shadowCoord.z / 2.0 + .5;
    
    float directionalLightFactor = max(0.0, dot(u_light, v_normal));
    //float directionalLightFactor = step(0.0, dot(u_light, v_normal));
    
    float shadowLightFactor = getShadowLightFactor(lightPerspectiveDepth);
    
    
    vec4 color = texture2D(u_texture, v_texCoord);
    
    vec4 colorOut = vec4(color.rgb * (u_ambient + (1.0 - u_ambient) * directionalLightFactor * shadowLightFactor), color.a);
	gl_FragColor = colorOut;
}
`;
