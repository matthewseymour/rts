"use strict";

const geometry = {};
/*
    Box specified by the x-left, y-bottom, x-right, y-top
    Move-box specified by the same for the initial position, then the dx and dy

    Returns true if they intersect
*/
geometry.boxMoveBoxCollision = function(boxXl, boxYb, boxXr, boxYt, moveXl, moveYb, moveXr, moveYt, moveDx, moveDy) {
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


geometry.distance = function(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
}