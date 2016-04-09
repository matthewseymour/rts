var particleFragmentSource = `
precision highp float;

varying vec4 v_color;

void main() {
    float dist = length(gl_PointCoord - 0.5);
    
    float trans = 2.0 * max(0.0, 0.5 - dist);
    
	gl_FragColor = vec4(v_color.rgb, v_color.a * trans);
}
`;
