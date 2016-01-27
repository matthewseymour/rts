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

vec2 unpack(vec4 value) {
	vec2 bytes = vec2(unpack2Bytes(value.xz), unpack2Bytes(value.yw)); //Range [0, 65535]
	
	vec2 signed = bytes - 32767.0; //Range [-32767, 32768]
	
	return signed / 32767.0; //Range [-1, 1.00003...]
}

vec4 pack(vec2 value) { //Range [-1, 1.00003...] 
	vec2 signed = value * 32767.0; //Range[-32767, 32768]
	vec2 bytes = signed + 32767.0;  //Range[0, 65535]
	
	vec2 bytesA = pack2Bytes(bytes.x); //Range [(0,0), (1,1)]
	vec2 bytesB = pack2Bytes(bytes.y); //Range [(0,0), (1,1)]
	
	return vec4(bytesA.x, bytesB.x, bytesA.y, bytesB.y);
}
`;