"use strict";

const Geometry = {};
/*
    Box specified by the x-left, y-bottom, x-right, y-top
    Move-box specified by the same for the initial position, then the dx and dy

    Returns true if they intersect
*/
Geometry.boxMoveBoxCollision = function(boxXl, boxYb, boxXr, boxYt, moveXl, moveYb, moveXr, moveYt, moveDx, moveDy) {
    /*
    We use the Separating Axis Theorem. For the axes we use the normals of the edges that make up the 
    polygons. In this case we have the box and the move-box. For the box we have four edges which are 
    axis aligned, so we use the x and y axes for our first two separating axes. The move-box consists
    of six edges, four of which are axis aligned and thus already covered. The remaining two are 
    parallel to the (dx,dy) vector, so the normal to this vector will make up the third separating axis.
    */
    
    //Note: If the two intervals (A1,A2) and (B1,B2) overlap then A1 < B2 && B1 < A2
    //Therefore if they don't overlap: !(A1 < B2 && B1 < A2)  ->  !(A1 < B2) || !(B1 < A2) 
    // ->    A1 >= B2 || B1 >= A2   ->   A1 >= B2 || A2 <= B1
    
    //Project onto y axis first:
    //Here we know that boxYb is the min and boxYt is the max of the projection of the box interval
    //For the move-box the interval is from min(moveYb, moveYb + moveDy) to max(moveYt, moveYt + moveDy)
    if(boxYb >= Math.max(moveYt, moveYt + moveDy) || boxYt <= Math.min(moveYb, moveYb + moveDy))
        return false;
    
    //Project onto x axis second:
    //Here we know that boxXl is the min and boxXr is the max of the projection of the box interval
    //For the move-box the interval is from min(moveXl, moveXl + moveDx) to max(moveXr, moveXr + moveDx)
    if(boxXl >= Math.max(moveXr, moveXr + moveDx) || boxXr <= Math.min(moveXl, moveXl + moveDx))
        return false;
    
    if(moveDx == 0 && moveDy == 0) //The two axes checked cover all cases in this case. Overlap along all axes, return true
        return true;
    
    //Lastly we check the axis normal to (dx,dy):
    //No need to normalize the vector. Not doing so also ensures that the answer is exact if all values are 
    //integers
    var normX = moveDy;
    var normY = -moveDx;
    
    //Find the ranges of the intervals. We project onto the axes by a simple dot product.
    
    //Start with the four points of the box:
    var p1 = normX * boxXl + normY * boxYt;
    var p2 = normX * boxXl + normY * boxYb;
    var p3 = normX * boxXr + normY * boxYt;
    var p4 = normX * boxXr + normY * boxYb;
    
    //Find the min/max:
    var minBox = Math.min(Math.min(p1, p2), Math.min(p3, p4));
    var maxBox = Math.max(Math.max(p1, p2), Math.max(p3, p4));
    
    //Now the move-box. Note that since the axis is perpendicular to (dx,dy) both the start and end boxes
    //of the move box will project onto the same values! Hence we only need to the four values of the start 
    //to check against.
    p1 = normX * moveXl + normY * moveYt;
    p2 = normX * moveXl + normY * moveYb;
    p3 = normX * moveXr + normY * moveYt;
    p4 = normX * moveXr + normY * moveYb;
    
    var minMove = Math.min(Math.min(p1, p2), Math.min(p3, p4));
    var maxMove = Math.max(Math.max(p1, p2), Math.max(p3, p4));
    
    if(minBox >= maxMove || maxBox <= minMove)
        return false;
    else //Overlap along all axes, return true
        return true;
}

Geometry.vectorMagnitude = function(dx, dy) {
    return Math.sqrt(dx * dx + dy * dy);
}

Geometry.distance = function(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
}

Geometry.distanceSquared = function(x1, y1, x2, y2) {
    return (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
}

Geometry.unitVec = function(vec) {
    var mag = Math.sqrt(vec.x * vec.x + vec.y * vec.y + vec.z * vec.z);
    return {x: vec.x / mag, y: vec.y / mag, z: vec.z / mag};
}

Geometry.normal = function(p1x, p1y, p1z, p2x, p2y, p2z, p3x, p3y, p3z) {
    var cp = Geometry.crossProduct(p2x - p1x, p2y - p1y, p2z - p1z, p3x - p1x, p3y - p1y, p3z - p1z);
    return Geometry.unitVec(cp);
}

Geometry.crossProduct = function(v1x, v1y, v1z, v2x, v2y, v2z) {
    return { 
        x: v1y * v2z - v1z * v2y,
        y: v1z * v2x - v1x * v2z,
        z: v1x * v2y - v1y * v2x
    };
}

Geometry.distancePointLineSegment = function(p, p1, p2) {
    var Mx = p2.x - p1.x;
    var My = p2.y - p1.y;
    
    var P_Bx = p.x - p1.x;
    var P_By = p.y - p1.y;
    
    var t0 = (Mx * P_Bx + My * P_By) / (Mx * Mx + My * My);
    
    if(t0 <= 0) {
        return Geometry.distance(p.x, p.y, p1.x, p1.y);
    } else if(t0 < 1) {
        var nearest_x = p1.x + t0 * Mx;
        var nearest_y = p1.y + t0 * My;
        return Geometry.distance(p.x, p.y, nearest_x, nearest_y);
    } else {
        return Geometry.distance(p.x, p.y, p2.x, p2.y);
    }
}

Geometry.fixAngle = function(a) {
    return a - 2 * Math.PI * Math.floor(a / (2 * Math.PI)); //Floored division
}

Geometry.rotateAngle = function(angle, targetRotation, rotationSpeed) {
	if(Math.abs(targetRotation) <= rotationSpeed) {
        return {
		    angle: Geometry.fixAngle(angle + targetRotation),
		    matchAngle: true
        };
	} else {
        return {
		    angle: Geometry.fixAngle(angle + rotationSpeed * Math.sign(targetRotation)),
		    matchAngle: false
        };
        
	}
}

Geometry.getTargetRotation = function(dx, dy, rotation) {
	var rotatedDx = dx * Math.cos(-rotation) - dy * Math.sin(-rotation);
	var rotatedDy = dx * Math.sin(-rotation) + dy * Math.cos(-rotation);
	var targetRotation = Math.atan2(rotatedDy, rotatedDx);
    return targetRotation;
}

//a1,a2: the angles. Must be in the range [0, 2 pi)
//t: 0-1, 0 gives a1, 1 gives a2, in between gives an interpolation of the angle
Geometry.interpolateAngle = function(a1, a2, t) {
    var angleDiff = a2 - a1;
    if(angleDiff > Math.PI)
        angleDiff -= 2 * Math.PI;
    if(angleDiff < -Math.PI)
        angleDiff += 2 * Math.PI;
    
    return a1 + t * angleDiff;
}

Geometry.interpolatePosition = function(p1, p2, t) {
    return {x: p1.x * (1 - t) + p2.x * t, y: p1.y * (1 - t) + p2.y * t};
}

Geometry.pointCanBeReached = function(dx, dy, angle, speed, rotationSpeed) {
	var mag = Geometry.vectorMagnitude(dx, dy);
	var rotatedDx = dx * Math.cos(-angle) - dy * Math.sin(-angle);
	var rotatedDy = dx * Math.sin(-angle) + dy * Math.cos(-angle);
	var targetAngle = Math.atan2(rotatedDy, rotatedDx);
	
	var FUDGE_FACTOR = 1.1;
	
    var turnRadius = speed / rotationSpeed;
	
	return (mag > 2 * turnRadius *  Math.abs(Math.sin(targetAngle)) * FUDGE_FACTOR);
}