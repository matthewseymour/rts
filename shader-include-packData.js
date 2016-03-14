var packDataIncludeSource = `
float unpack2Bytes(vec2 value) { //value: Range [(0, 0), (1, 1)],
	return ((value.x * 256.0 + value.y) * 255.0); //Range [0, 65535]
}

vec2 pack2Bytes(float value) { //value: Range [0, 65535]
	float b1 = floor(value / 256.0);// Range [0, 255]
	float b2 = value - b1 * 256.0;// Range [0, 255]
	return vec2(b1 / 255.0, b2 / 255.0); //Range [(0, 0), (1, 1)]
}
`;
