var primitive3dShadowFragmentSource = `
precision highp float;

uniform sampler2D u_shadowMap;

uniform vec4 u_color;
uniform vec4 u_zColor;
uniform vec3 u_light;
uniform float u_ambient;

varying vec4 v_shadowCoord; 
varying vec3 v_pos;
varying vec3 v_normal;
` + shadowIncludeSource +
`
void main() {
    float lightPerspectiveDepth = v_shadowCoord.z / 2.0 + .5;
    
    float directionalLightFactor = max(0.0, dot(u_light, v_normal));
    //float directionalLightFactor = step(0.0, dot(u_light, v_normal));
    
    float shadowLightFactor = getShadowLightFactor(lightPerspectiveDepth);
    
    vec4 colorOut = (u_color + v_pos.z * u_zColor) * (u_ambient + (1.0 - u_ambient) * directionalLightFactor * shadowLightFactor);
	gl_FragColor = colorOut;
}
/*
float2 get_shadow_offsets(float3 N, float3 L) { 
    float cos_alpha = saturate(dot(N, L)); 
    float offset_scale_N = sqrt(1 - cos_alpha*cos_alpha); // sin(acos(L·N)) 
    float offset_scale_L = offset_scale_N / cos_alpha; // tan(acos(L·N)) 
    return float2(offset_scale_N, min(2, offset_scale_L)); }
*/
`;