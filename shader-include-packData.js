var packDataIncludeSource = `
float unpack2Bytes(vec2 value) { //value: Range [(0, 0), (1, 1)],
	return ((value.x * 256.0 + value.y) * 255.0); //Range [0, 65535]
}

vec2 pack2Bytes(float value) { //value: Range [0, 65535]
	float b1 = floor(value / 256.0);// Range [0, 255]
	float b2 = value - b1 * 256.0;// Range [0, 255]
	return vec2(b1 / 255.0, b2 / 255.0); //Range [(0, 0), (1, 1)]
}



vec2 multiplyComplex(vec2 a, vec2 b) {
	return vec2(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x);
}

vec4 pack(float value) {
    const float b = 256.0;
    
    //Being slightly conservative with these, they'd round off anyway:
    const float maxVal = 32767.0; 
    const float minVal = -32767.0;
    
    float s = ceil((sign(value)  + 1.0) / 2.0); //0 or 1, if value = 0 the sign is positive
    float v = abs(clamp(value, minVal, maxVal));
    
    v = v / b;
    vec4 x;
    x.x = floor(v);
    v = v * b - x.x * b;
    x.y = floor(v);
    v = v * b - x.y * b;
    x.z = floor(v);
    v = v * b - x.z * b;
    x.w = floor(v);
    
    x.x += s * 128.0;
    x /= (b - 1.0);
    
    return x;
}

float unpack(vec4 x) {
    const float b = 256.0;
    
    x *= (b - 1.0);
    x = floor(x + 0.5); //"Round" to nearest
    
    //Record the sign and remove it from x.x:
    float s = (2.0 * floor(x.x / 128.0) - 1.0);
    x.x = mod(x.x, 128.0);
    
    float v;
    v = x.w;
    v = v/b + x.z;
    v = v/b + x.y;
    v = v/b + x.x;
    
    return s * v * b;
    
}
`;