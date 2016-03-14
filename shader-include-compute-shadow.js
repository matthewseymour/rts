var shadowIncludeSource = `
float getShadowLightFactor(float lightPerspectiveDepth) {
    vec2 poissonDisk[4];
    poissonDisk[0] = vec2( -0.94201624, -0.39906216 );
    poissonDisk[1] = vec2( 0.94558609, -0.76890725 );
    poissonDisk[2] = vec2( -0.094184101, -0.92938870 );
    poissonDisk[3] = vec2( 0.34495938, 0.29387760 );

    float cosTheta = clamp(dot(v_normal, u_light), 0.0, 1.0);
    float bias = clamp(0.0002*tan(acos(cosTheta)), 0.0, .0004);
    /*
    float shadowMapDepth = texture2D(u_shadowMap, v_shadowCoord.xy / 2.0 + vec2(0.5, 0.5)).r;
    float shadowLightFactor = step(0.0, shadowMapDepth - lightPerspectiveDepth + bias);
    */
    float shadowLightFactor = 0.0;
    for (int i=0;i<4;i++){
        float shadowMapDepth = texture2D(u_shadowMap, v_shadowCoord.xy / 2.0 + vec2(0.5, 0.5) + poissonDisk[i] / 4000.0 ).r;
        shadowLightFactor += (1.0 / 4.0) * step(0.0, shadowMapDepth - lightPerspectiveDepth + bias);
    }
    return shadowLightFactor;
}
`
