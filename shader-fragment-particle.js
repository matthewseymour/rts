var particleFragmentSource = `
precision highp float;

varying vec4 v_color;

void main() {
    float dist = length(gl_PointCoord - 0.5);
    
    float trans = 2.0 * max(0.0, 0.5 - dist);
    
	gl_FragColor = vec4(v_color.rgb, v_color.a * trans * trans);
}
`;


var particleUpdateFragmentSource = `
precision highp float;

varying vec2 v_texCoord;

uniform vec3 u_vortexCenter;
uniform float u_vortexSpeed;
uniform float u_vortexRadius;

uniform vec3 u_wind;

uniform sampler2D u_inputPosition;
uniform sampler2D u_inputVelocity;
uniform sampler2D u_velocityField1;
uniform sampler2D u_velocityField2;
uniform sampler2D u_velocityField3;

uniform float u_t;
uniform mat4 u_velocityTransformMatrix;
uniform float u_speedReduceFactor;


void main() {
    
    vec4 inputVal           = texture2D(u_inputPosition, v_texCoord);
    vec4 inputVelocityVal   = texture2D(u_inputVelocity, v_texCoord);
    vec2 velocityReadXY     = (u_velocityTransformMatrix * vec4(inputVal.x, inputVal.y, 0, 1.0)).xy;
    vec2 velocityReadYZ     = (u_velocityTransformMatrix * vec4(inputVal.y, inputVal.z, 0, 1.0)).xy;
    vec2 velocityReadXZ     = (u_velocityTransformMatrix * vec4(inputVal.x, inputVal.z, 0, 1.0)).xy;
    
    float boost = 1.0/sqrt(2.0 * u_t * u_t - 2.0 * u_t + 1.0); //Keep the average velocity unchanged
    
    
    
    //Hill's spherical vortex!
    float dist = length(inputVal.xyz - u_vortexCenter);
    float r = length(inputVal.xy - u_vortexCenter.xy);
    vec2 r_dir;
    if(r == 0.0) {
        r_dir = vec2(0.0);
    } else {
        r_dir = normalize(inputVal.xy - u_vortexCenter.xy);
    }
    float z = inputVal.z - u_vortexCenter.z;
    
    float u0 = u_vortexSpeed;
    float a = u_vortexRadius;
    
    float u, v;
    if(dist < a) {
        u = 1.5 * u0 * (1.0 - (2.0 * r*r + z*z) / (a*a)) + u0;
        v = 1.5 * u0 * z * r / (a*a);
    } else {
        float f = pow(a * a / (z*z + r*r), 2.5); 
        u = u0 * f * (2.0 * z*z - r*r) / (2.0 * a*a);
        v = 1.5 * u0 * z * r / (a*a) * f;
    }
    
    inputVal.xy += r_dir * v;
    inputVal.z  += u;
    
    inputVal.xy += boost * (u_t * texture2D(u_velocityField1, velocityReadXY).xy + sqrt(pow(1.0 - u_t, 2.0)) * texture2D(u_velocityField1, velocityReadXY).zw); 
    inputVal.yz += boost * (u_t * texture2D(u_velocityField2, velocityReadYZ).xy + sqrt(pow(1.0 - u_t, 2.0)) * texture2D(u_velocityField2, velocityReadYZ).zw); 
    inputVal.xz += boost * (u_t * texture2D(u_velocityField3, velocityReadXZ).xy + sqrt(pow(1.0 - u_t, 2.0)) * texture2D(u_velocityField3, velocityReadXZ).zw); 

    //Wind:
    inputVal.xy += u_wind.xy * u_wind.z * inputVal.z;
    
    //Initial speed:
    inputVal.xyz += inputVelocityVal.xyz * exp(u_speedReduceFactor * inputVal.w / inputVelocityVal.w);
    
    //inputVal.z = max(0.0, inputVal.z);
    
    inputVal.w += inputVelocityVal.w;
    
    gl_FragColor = inputVal;
}
`;

var glareFragmentSource = `
precision highp float;

uniform vec4 u_color;

void main() {
    float dist = length(gl_PointCoord - 0.5);
    
    float trans = 2.0 * max(0.0, 0.5 - dist);
    
	gl_FragColor = vec4(u_color.rgb, u_color.a * trans * trans);
}
`;

var curlFragmentSource = `
precision highp float;

varying vec2 v_texCoord;

uniform sampler2D u_input;

uniform float u_dx;


void main() {
    
    float x = v_texCoord.x;
    float y = v_texCoord.y;
    
    
    float d_dx1 = (texture2D(u_input, vec2(x + u_dx, y)).r - texture2D(u_input, vec2(x - u_dx, y)).r) / (2.0 * u_dx);
    float d_dy1 = (texture2D(u_input, vec2(x, y + u_dx)).r - texture2D(u_input, vec2(x, y - u_dx)).r) / (2.0 * u_dx);

    float d_dx2 = (texture2D(u_input, vec2(x + u_dx, y)).g - texture2D(u_input, vec2(x - u_dx, y)).g) / (2.0 * u_dx);
    float d_dy2 = (texture2D(u_input, vec2(x, y + u_dx)).g - texture2D(u_input, vec2(x, y - u_dx)).g) / (2.0 * u_dx);
    
    gl_FragColor = vec4(d_dy1, -d_dx1, d_dy2, -d_dx2);
}
`;