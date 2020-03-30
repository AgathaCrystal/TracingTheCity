
//required constants 
const {
    width,
    height,
    Point,
    RADIUS_INCREASE,
    SCAN_RADIUS,
    left,
    top,
    right,
    bottom,
    expansionHorizontal,
    expansionVertical
} = require('./constants');

//the list of points that is getting scanned
var POINTS;

/**
 * A function for drawing a circle from a given center point 
 *
 * @param {NodeCanvasRenderingContext2D} context The context of the canvas
 * @param {Point} center canvas coordinate of the circle
 * @param {number} size size of the circle
 */
function drawCustomCircle(context, center, size) {
    context.beginPath();
    context.arc(center.x, center.y, size / 2, 0, 2 * Math.PI);
    context.stroke();
}

/**
 * A function for calculating x in relation to the canvas size 
 *
 * @param {number} lon the longitude value
 * @return {number} the x value in relation to the canvas
 */
function calcX(lon) {
    // calculate the longitude's propotion of horizontal expansion  
    let xFactor = (lon - left) / expansionHorizontal;
    return width * xFactor;
}

/**
 * A function for calculating y in relation to the canvas size 
 *
 * @param {number} lat the latitude value
 * @return {number} the y value in relation to the canvas
 */
function calcY(lat) {
    // calculate the latitude's propotion of vertical expansion  
    let yFactor = (lat - bottom) / expansionVertical;
    //invert the factor, because the y axis grows downwards so the proportion is the opposite
    return height * (1 - yFactor);
}

/**
 * A function for drawing the outline of a list of coordinates
 *
 * @param {NodeCanvasRenderingContext2D} context The context of the canvas
 * @param {Array} coords The coordinates of the outline
 */
function drawPolygon(context, coords) {
    context.beginPath();
    for (let i = 0; i < coords.length; i++) {
        const lon = coords[i][0];
        const lat = coords[i][1];

        const x = calcX(lon);
        const y = calcY(lat);

        if (i === 0) {
            context.moveTo(x, y);
        } else {
            context.lineTo(x, y);
        }
    }
    context.closePath(); // close the shape
    context.stroke(); // make it a line

}

/**
 * A function for transforming coordinates (example coordinate {"type": "point","lon": 13.359232,"lat": 52.546674 })
 * to points
 *
 * @param {coordinate[]} coordinates list of coordinates each consisting of "type", "lon" & "lat"
 * @param {number} distance the distance between the points
 */
function toPoints(coordinates) {
    const points = [];
    //run through points
    for (let coord of coordinates) {
        let point = new Point();
        //transform each axis value to canvas related value
        point.x = calcX(coord.lon);
        point.y = calcY(coord.lat);
        points.push(point);
    }
    return points;
}

/**
 * A function for transforming geojson coordinates (example coordinate [13.504807966473637, 52.61959821024611])
 * to points
 * @param {features[]} coordinates list of features containing the coordinates 
 * @param {number} distance the distance between the points
 */
function fromGeoJsonCoordinatesToPoints(features) {
    const points = [];
    const coordinates = features.map(feature => feature.geometry.coordinates);
    for (let coord of coordinates) {
        let point = new Point();
        point.x = calcX(coord[0]);
        point.y = calcY(coord[1]);
        points.push(point);
    }
    return points;
}


/**
 * A function for calculating the distance between to points in the canvas
 *
 * @param {Point} point1 point in the canvas
 * @param {Point} point2 point in the canvas
 * @param {number} distance the distance between the points
 */
function getDistance(point1, point2) {
    //substract the values of each axis from each other
    const xd = Math.abs(point2.x - point1.x);
    const yd = Math.abs(point2.y - point1.y);
    //calculate distance via pythagoras x² + y² = z²
    let dist = Math.sqrt((xd * xd) + (yd * yd));
    return dist;
}

/**
 * A function for calculating the center of multiple points
 *
 * @param {Point[]} points list of points
 * @param {Point} center the center of these points
 */
function calculateCenter(points) {
    let xSum = 0;
    let ySum = 0;
    //sum up x and y values
    for (let point of points) {
        xSum += point.x;
        ySum += point.y;
    }
    //instantiate new point
    const center = new Point();
    //add averages of each axis
    center.x = xSum / points.length;
    center.y = ySum / points.length;
    //return new center
    return center;
}


/**
 * A function condensing points depending on the density of their locations
 *
 * @param {Point[]} points points the should be scanned for possible condensing
 * @return {Map<Point, number} Mapping between centers after condensing
 * and their radiuses depending on the level of aggregation
 * e.g. [{Point(123, 423) : 3}, {Point(56, 234) : 1}]
 */
function condensePointsByScanRadius(points) {
    // copy given points to new list we want to use for processing
    POINTS = [...points];
    // variable to store our condensed points in a map [key:Point, value:Radius] for later processing
    let condensedCenters = new Map();

    //switch to control the condensing process
    let keepCondensing = true;
    //as long as keepCondensing is true we keep going
    while (keepCondensing) {
        // find next points to be condensed
        let condensedPointsObj = findNextPointsToCondense();
        // get radius from result
        let radius = condensedPointsObj.radius;
        // get allFoundPoints from result
        let allFoundPoints = condensedPointsObj.allFoundPoints;
        // calculate the new condensed center from all the found points
        let condensedCenter = calculateCenter(allFoundPoints);
        // add condensed center and radius to condensedCenters for further processing
        condensedCenters.set(condensedCenter, radius);

        // if there are no more points to condense we want to stop
        if (POINTS.length === 0) {
            keepCondensing = false;
        }
    }
    // return condensedCenters for futher processing
    return condensedCenters;
}

/**
 * A function for find the next points which should be condensed
 *
 * @return {allFoundPoints, radius} Object containing allFoundPoints and the radius
 * 
 * e.g. [{Point(123, 423) : 3}, {Point(56, 234) : 1}]
 */
function findNextPointsToCondense() {
    //location from where we want to scan
    const scanCenter = POINTS[0];
    //remove the origin of the scan from POINTS
    removePoint(scanCenter);

    //SHORTCUT: if there are no further points there is no need for scanning
    if (isEmpty(POINTS)) {
        return { allFoundPoints: [scanCenter], radius: SCAN_RADIUS };
    }

    //add center to list of total points found, because we sure we found at least this one ;)
    let totalFoundPoints = [scanCenter];
    //init the radius for scanning 
    let currentScanRadius = SCAN_RADIUS;
    //set the switch for controling the scan process to true
    let keepScanning = true;

    //ready to scan? lets go
    //we keep scanning as long as the keepScanning is true
    while (keepScanning) {
        //scans the points and returns points within radius (the radius expands when neighbours are found)
        const tempFoundPoints = scanForPointsWithinRadius(POINTS, scanCenter, currentScanRadius);

        //no points found? we're done here
        if (tempFoundPoints.length === 0) {
            keepScanning = false; // demands to stop the scan 
        } else { // we found some points
            //remove them from POINTS, we don't want to scan for them again
            removePoints(tempFoundPoints);
            //increase the scan radius because we want to find possible neighbours of our direct neighbours
            currentScanRadius += RADIUS_INCREASE;
        }
        //add found points in this iteration to totalFoundPoints
        totalFoundPoints = [...totalFoundPoints, ...tempFoundPoints];
    }

    //we're ready, lets return our result
    return { allFoundPoints: totalFoundPoints, radius: currentScanRadius };
}


/**
 * returns true if the given list contains no elements (empty) or is undefined, false if otherwise
 * @param {Point[]} points 
 */
function isEmpty(points) {
    return !points || points.length === 0;
}

/**
 * scans the given points and produces a list of points within the given radius by filtering the others out
 * @param {*} points 
 * @param {*} scanCenter 
 * @param {*} radius 
 */
function scanForPointsWithinRadius(points, scanCenter, radius) {
    return points.filter(p => isPointWithinRadius(p, scanCenter, radius))
}

/**
 * returns true if the given point lies within the given radius measured from the given center, false if not
 * @param {*} point 
 * @param {*} center 
 * @param {*} radius 
 */
function isPointWithinRadius(point, center, radius) {
    let distance = getDistance(point, center);
    return distance <= radius;
}

/**
 * returns false if the given points are equal, true if not
 * @param {*} point1 
 * @param {*} point2 
 */
function notEquals(point1, point2) {
    return point1.x !== point2.x || point1.y !== point2.y;
}

/**
 * returns true if the given points are equal, false if not
 * @param {*} point1 
 * @param {*} point2 
 */
function equals(point1, point2) {
    return point1.x === point2.x && point1.y === point2.y;
}

/**
 * removes given point from POINTS by filtering it 
 * @param {*} point 
 */
function removePoint(point) {
    POINTS = POINTS.filter(p => notEquals(p, point));
}

/**
 * removes the given points from POINTS by filtering them
 * @param {*} points 
 */
function removePoints(points) {
    POINTS = POINTS.filter(p => notInList(points, p));
}

/**
 * returns true or false if the given point is in the given list
 * @param {*} points 
 * @param {*} point 
 */
function notInList(points, point) {
    let list = points.filter(p => equals(point, p));
    return list.length === 0;
}

/**
 * draws all given centers with their radius in the given canvas
 * @param {*} context 
 * @param {*} groupedCenters 
 */
function drawGroupedCenters(context, groupedCenters) {
    groupedCenters.forEach((size, center) => {
        drawCustomCircle(context, center, size);
    })

}

module.exports = { drawPolygon, toPoints, fromGeoJsonCoordinatesToPoints, condensePointsByScanRadius, drawGroupedCenters };