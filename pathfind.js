"use strict";

/*
Node list:

There are N nodes in the pathfinding node list. The list is a 16xN Int16 array
Each row in the array corresponds to one node. The node ID is the row number.

The format for each row is:
[X][Y][NN][Res][Res][Res][Res][Res][N0][N1][N2][N3][N4][N5][N6][N7]
where the indices are:
    0,1:  X,Y are the position of the node
    2:    NN is the number of neighbours this node has. Between 0 and 8
    3-7:  Reserved
    8-15: N0-N7 are the neighbours' IDs. Values beyond NN are undefined. 
*/


const NODE_SPACING = 4;
const ROW_WIDTH = 16;
const INDEX_X = 0;
const INDEX_Y = 1;
const INDEX_NUM_NEIGHBOURS = 2;
const INDEX_NEIGHBOURS = 8;
const PATHFIND_ITERATIONS = 100;

const Pathfind = {};

Pathfind.canPlace = function(map, position, size) {
    return Pathfind.canMove(map, position, position, size, null);
}

Pathfind.canMove = function(map, start, end, size, obstacleToIgnore) {
    return passLineBox(start.x, start.y, end.x, end.y, size, map.passabilityMap) && !checkCollision(map.obstacleStore, obstacleToIgnore, start.x, start.y, end.x, end.y, size);
}



function getNodeIndex(i, j, width) { return i + j * width; }



function buildPathfindNodeInfo(passabilityMap, size) {
    var nodesX = Math.floor(passabilityMap.width / NODE_SPACING);
    var nodesY = Math.floor(passabilityMap.height / NODE_SPACING);
    
    var nodeList = new Int16Array(ROW_WIDTH * nodesX * nodesY);
    
    function getX(i) { return i * NODE_SPACING + NODE_SPACING / 2; }
    function getY(i) { return i * NODE_SPACING + NODE_SPACING / 2; }
    
    for(var i = 0; i < nodesX; i++) {
        for(var j = 0; j < nodesY; j++) {
            var index = getNodeIndex(i, j, nodesX) * ROW_WIDTH;
            var x = getX(i);
            var y = getY(j);
            nodeList[index + INDEX_X] = x;
            nodeList[index + INDEX_Y] = y;
            var neighbours = [];
            for(var k = Math.max(0, i-1); k <= Math.min(i+1, nodesX-1); k++) {
                for(var l = Math.max(0, j-1); l <= Math.min(j+1, nodesY-1); l++) {
                    if((k != i || l != j) && passLineBox(x, y, getX(k), getY(l), size, passabilityMap)) 
                        neighbours.push(getNodeIndex(k, l, nodesX));
                }
            }
            nodeList[index + INDEX_NUM_NEIGHBOURS] = neighbours.length;
            for(var n = 0; n < neighbours.length; n++) {
                nodeList[index + INDEX_NEIGHBOURS + n] = neighbours[n];
            }
        }
    }
    return {
        nodeList: nodeList,
        unitSize: size,
        nodesWidth: nodesX,
        nodesHeight: nodesY
    };
}


function getPosition(node, nodeInfo) {
    var row = Math.floor(node / nodeInfo.nodesWidth);
    var col = node - row * nodeInfo.nodesWidth;
    
    return {x: col * NODE_SPACING + NODE_SPACING / 2,
            y: row * NODE_SPACING + NODE_SPACING / 2};
}

//Delete this
function getNearestNode(x, y, nodeInfo) {
    var i = Math.round(x / NODE_SPACING - 1/2);
    var j = Math.round(y / NODE_SPACING - 1/2);
    if(i < 0)
        i = 0;
    if(i >= nodeInfo.nodesWidth)
        i = nodeInfo.nodesWidth - 1;
    if(j < 0)
        j = 0;
    if(j >= nodeInfo.nodesHeight)
        j = nodeInfo.nodesHeight - 1;
    
    var index = getNodeIndex(i, j, nodeInfo.nodesWidth);
    
    return index;
}

function getNearestNodes(x, y, nodeInfo) {
    var i = Math.floor(x / NODE_SPACING - 1/2);
    var j = Math.floor(y / NODE_SPACING - 1/2);
    var nodes = [];
    for(var ii = i; ii <= i + 1; ii++) {
        if(ii < 0)
            break;
        if(ii >= nodeInfo.nodesWidth)
            break;
        for(var jj = j; jj <= j + 1; jj++) {
            if(jj < 0)
                break;
            if(jj >= nodeInfo.nodesHeight)
                break;
    
            var index = getNodeIndex(ii, jj, nodeInfo.nodesWidth);
            nodes.push(index);
        }
    }
    
    return nodes;
}




function buildNodeListView(gl, nodeInfo) {
    var nodeList = nodeInfo.nodeList;
    var lines = [];
    for(var i = 0; i < nodeList.length; i += ROW_WIDTH) {
        var x = nodeList[i + INDEX_X];
        var y = nodeList[i + INDEX_Y];
        for(var n = 0; n < nodeList[i + INDEX_NUM_NEIGHBOURS]; n++) {
            var index = nodeList[i + INDEX_NEIGHBOURS + n] * ROW_WIDTH;
            var xN = nodeList[index + INDEX_X];
            var yN = nodeList[index + INDEX_Y];
            lines.push(x);
            lines.push(y);
            lines.push(xN);
            lines.push(yN);
        }
    }
    var lineBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, lineBuffer);

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(lines), gl.STATIC_DRAW);
    
    return {buffer: lineBuffer, numLines: lines.length / 4};
}

function drawNodeListView(graphicsPrograms, nodeListView, view) {
    var offset = convertToScreen({x: 0, y: 0}, view);

    var offsetScale = convertToScreen({x: 1, y: 1}, view);
    
    Graphics.drawLines(graphicsPrograms, nodeListView.buffer, nodeListView.numLines, 
        offset.x, offset.y, offsetScale.x - offset.x, offsetScale.y - offset.y, [1,1,1,.125]);
    
}






function getObstacleStore() {
    return [];
}

function getObstacle(x, y, size) {
        return {x: x, y: y, size: size};
};

function moveObstacle(store, obs, x, y) {
    obs.x = x;
    obs.y = y;
}

function addObstacle(store, obs) {
    store.push(obs);
}

function removeObstacle(store, obs) {
    var index = store.getIndexOf(obs);
    store.splice(index, 1);
}

function checkCollision(store, ignore, x1, y1, x2, y2, size) {
    
    var dx = x2 - x1;
    var dy = y2 - y1;
    var xLeft  = x1 - size;
    var xRight = x1 + size;
    var yTop = y1 + size;
    var yBot = y1 - size;
    


    var box;
    for(var i = 0; i < store.length; i++) {
        box = store[i];
        if(box === ignore)
            continue;
        if(Geometry.boxMoveBoxCollision(box.x - box.size, box.y - box.size, box.x + box.size, box.y + box.size, xLeft, yBot, xRight, yTop, dx, dy)) {
            return true;
        }
    }
    return false;
}

function drawObstacleStore(graphicsPrograms, store, view) {
    for(var box of store) {
        var p1 = convertToScreen({x: box.x - box.size, y: box.y - box.size}, view);
        var p2 = convertToScreen({x: box.x + box.size, y: box.y + box.size}, view);
        Graphics.drawBox(graphicsPrograms, p1.x, p1.y, p2.x - p1.x, p2.y - p1.y, [1,0,.3,.5]);
        
    };
}







function getSortedSet() {
    return [];
}

function sortedSetSize(sortedSet) {
    return sortedSet.length;
}

function insertSortedSet(sortedSet, key) {
    sortedSet.push(key);
}

//Returns key with LOWEST value
function popSortedSet(sortedSet, valueMap) {
    sortedSet.sort(function(a, b) {
        return valueMap[b] - valueMap[a]; //Sort lowest last
    });
    return sortedSet.pop();
}

function emptySortedSet(sortedSet) {
    sortedSet.length = 0;
}




const setTypeEnum = {
    NONE: 0,
    OPEN: 1,
    CLOSED: 2
};

function getPathfinder(nodeInfo, obstacleToIgnore) {
    var numNodes = nodeInfo.nodeList.length;
    
    return {
        gScore: new Float32Array(numNodes),
        fScore: new Float32Array(numNodes),
        cameFrom: new Int16Array(numNodes),
        setType:  new Uint8Array(numNodes),
        openSet: getSortedSet(),
        startPoint: {x:0, y:0},
        endPoint: {x: 0, y: 0},
        bestNode: 0,
        finished: false,
        obstacleToIgnore: obstacleToIgnore,
    };
}

function startNewPath(pathfinder, map, start, end) {
    var nodeInfo = map.pathfindNodeInfo;
    
    var startNodes = getNearestNodes(start.x, start.y, nodeInfo);
    
    pathfinder.startPoint = start;
    pathfinder.endPoint = end;
    
    //Clear sets:
    //May not have to fill these first two:
    //pathfinder.gScore.fill(Number.MAX_VALUE);
    //pathfinder.fScore.fill(Number.MAX_VALUE);
    pathfinder.setType.fill(setTypeEnum.NONE);
    emptySortedSet(pathfinder.openSet);
    
    //The best node should actually be the one nearest the end point
    pathfinder.bestNode = getNearestNode(start.x, start.y, nodeInfo);
    
    //Insert the starting node:
    for(var i = 0; i < startNodes.length; i++) {
        //To do: check that the startNode is reachable from the start point
        var startNodePosition = getPosition(startNodes[i], nodeInfo);
        //if(!passLineBox(start.x, start.y, startNodePosition.x, startNodePosition.y, nodeInfo.unitSize, passabilityMap) 
        //    || checkCollision(obstacleStore, __ignore__, start.x, start.y, startNodePosition.x, startNodePosition.y, nodeInfo.unitSize)) 
        if(!Pathfind.canMove(map, start, startNodePosition, nodeInfo.unitSize, pathfinder.obstacleToIgnore))
        {
            continue;
        }
        
        pathfinder.gScore[startNodes[i]] = 0;
        pathfinder.fScore[startNodes[i]] = 0;
        pathfinder.cameFrom[startNodes[i]] = startNodes[i];
        pathfinder.setType[startNodes[i]] = setTypeEnum.OPEN;
        insertSortedSet(pathfinder.openSet, startNodes[i]); //fScore is zero for starting nodes
    }
    
    pathfinder.finished = false;
    
}

function iteratePath(pathfinder, nodeInfo, obstacleStore) {
    function nodeDistance(n1, n2) {
        return Geometry.distance(
            nodeInfo.nodeList[n1 * ROW_WIDTH + INDEX_X],
            nodeInfo.nodeList[n1 * ROW_WIDTH + INDEX_Y],
            nodeInfo.nodeList[n2 * ROW_WIDTH + INDEX_X],
            nodeInfo.nodeList[n2 * ROW_WIDTH + INDEX_Y]
        );
    }
    
    function nodePointDistance(n, p) {
        return Geometry.distance(nodeInfo.nodeList[n * ROW_WIDTH + INDEX_X], nodeInfo.nodeList[n * ROW_WIDTH + INDEX_Y], p.x, p.y);
    }
    
    var endNodes = getNearestNodes(pathfinder.endPoint.x, pathfinder.endPoint.y, nodeInfo);
    
    var iterations = 0;
    while(iterations < PATHFIND_ITERATIONS && sortedSetSize(pathfinder.openSet) > 0) {
        iterations++;
        
        var current = popSortedSet(pathfinder.openSet, pathfinder.fScore);
        
        if(nodePointDistance(current, pathfinder.endPoint) < nodePointDistance(pathfinder.bestNode, pathfinder.endPoint))
            pathfinder.bestNode = current;
        
        for(var i = 0; i < endNodes.length; i++) {
            if(current == endNodes[i]) {
                pathfinder.finished = true;
                return;
            }
        }
        
        pathfinder.setType[current] = setTypeEnum.CLOSED;
        
        for(var i = 0; i < nodeInfo.nodeList[current * ROW_WIDTH + INDEX_NUM_NEIGHBOURS]; i++) {
            var neighbour = nodeInfo.nodeList[current * ROW_WIDTH + INDEX_NEIGHBOURS + i];
            
            if(pathfinder.setType[neighbour] == setTypeEnum.CLOSED) {
                continue;
            }
            
            //To do here: dynamic check for obstacles between neighbour and current
            if(checkCollision(obstacleStore, 
                    pathfinder.obstacleToIgnore, 
                    nodeInfo.nodeList[current * ROW_WIDTH + INDEX_X], nodeInfo.nodeList[current * ROW_WIDTH + INDEX_Y], 
                    nodeInfo.nodeList[neighbour * ROW_WIDTH + INDEX_X], nodeInfo.nodeList[neighbour * ROW_WIDTH + INDEX_Y], 
                    nodeInfo.unitSize)) {
                continue;
            }
            
            var tentativeGScore = pathfinder.gScore[current] + nodeDistance(current, neighbour);
            
            if(pathfinder.setType[neighbour] == setTypeEnum.NONE) {
                pathfinder.setType[neighbour] = setTypeEnum.OPEN;
                insertSortedSet(pathfinder.openSet, neighbour); 
            } else if(tentativeGScore >= pathfinder.gScore[neighbour]) {
                continue;		// This is not a better path.
            }
            
            // This path is the best until now. Record it.
            pathfinder.cameFrom[neighbour] = current;
            pathfinder.gScore[neighbour] = tentativeGScore;
            pathfinder.fScore[neighbour] = tentativeGScore + nodePointDistance(neighbour, pathfinder.endPoint);
        }
    }
    
    if(sortedSetSize(pathfinder.openSet) == 0) {
        pathfinder.finished = true;
    }   
}


function getTarget(pathfinder, map) {
    var nodeInfo = map.pathfindNodeInfo;
    function getXY(node) {
        return {
            x: nodeInfo.nodeList[node * ROW_WIDTH + INDEX_X],
            y: nodeInfo.nodeList[node * ROW_WIDTH + INDEX_Y]
        }
    }
    
    var bestXY = getXY(pathfinder.bestNode);
    var currentXY;
    var currentNode;
    
    if(Pathfind.canMove(map, pathfinder.endPoint, bestXY, nodeInfo.unitSize, pathfinder.obstacleToIgnore)) {
        currentXY = pathfinder.endPoint;
        currentNode = null;
    } else {
        currentXY = bestXY;
        currentNode = pathfinder.bestNode;
    }
    
    while(currentXY != pathfinder.startPoint) {
        if(Pathfind.canMove(map, currentXY, pathfinder.startPoint, nodeInfo.unitSize, pathfinder.obstacleToIgnore)) {
            return currentXY;
        } else {
            if(currentNode == null) { 
                currentNode = pathfinder.bestNode;
            } else {
                if(pathfinder.cameFrom[currentNode] == currentNode) {
                    break;
                }
                currentNode = pathfinder.cameFrom[currentNode];
            }
            currentXY = getXY(currentNode);
        }            
    }
    return currentXY;
    
}


function getPath(pathfinder, map) {
    var nodeInfo = map.pathfindNodeInfo;
    function getXY(node) {
        return {
            x: nodeInfo.nodeList[node * ROW_WIDTH + INDEX_X],
            y: nodeInfo.nodeList[node * ROW_WIDTH + INDEX_Y]
        }
    }
    

    var path = [];
    
    var bestXY = getXY(pathfinder.bestNode);
    var currentXY;
    var currentNode;
    
    if(Pathfind.canMove(map, pathfinder.endPoint, bestXY, nodeInfo.unitSize, pathfinder.obstacleToIgnore)) {
        currentXY = pathfinder.endPoint;
        currentNode = null;
    } else {
        currentXY = bestXY;
        currentNode = pathfinder.bestNode;
    }
    
    path.push(currentXY);
    while(currentXY != pathfinder.startPoint) {
        if(Pathfind.canMove(map, currentXY, pathfinder.startPoint, nodeInfo.unitSize, pathfinder.obstacleToIgnore)) {
            currentXY = pathfinder.startPoint;
        } else {
            if(currentNode == null) { 
                currentNode = pathfinder.bestNode;
            } else {
                if(pathfinder.cameFrom[currentNode] == currentNode) {
                    break;
                }
                currentNode = pathfinder.cameFrom[currentNode];
            }
            currentXY = getXY(currentNode);
        }            
        
        path.push(currentXY);
        
    }
   
    return path;
}
