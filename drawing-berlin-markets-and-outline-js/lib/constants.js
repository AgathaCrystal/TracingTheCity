/**
 *  you can change the output size by changing width and height,
 *  but depending on the size of your output you may have to adapt 
 *  the SCAN_RADIUS and RADIUS_INCREASE to make number of drawn
 *  points fit your expectations 
 */

// often used ratio of berlin for 2d mapping, you can use this to avoid distortion
const berlinRatio = 1050 / 1280;

// only change these 2 values to change size of the canvas and drawings
// you can try to keep a sensible aspect ratio but it works with any values, have fun!
const width = 700;
const height = width * berlinRatio;
//container class to hold coordinate like values

// value added by each increase of the radius scan, a higher value here makes it more likely to find neighbours of direct neighours when scanning
const RADIUS_INCREASE = 2;
// base size of the inital scan, a higher value here makes it more likely to find a direct neighbours to your search center
const SCAN_RADIUS = 4;


// additional padding in canvas (changes here do no harm to anything except an eventually wrongsized canvas)
const canvasWidth = width + 10;
const canvasHeight = height + 10;

const WESTLON = 12.9638671875; // the most left point
const NORTHLAT = 52.70468296296834; // the most top point
const SOUTHLAT = 52.338695481504814; // the most bottom point
const EASTLON = 13.8153076171875; // the most right point

// maximal expansion in latitude and longitude between the boundaries e.g. 53.5 - 51.5 = 2
const expansionHorizontal = (EASTLON - WESTLON);
const expansionVertical = (NORTHLAT - SOUTHLAT);

class Point {
    x;
    y;
    constructor() { }
}

module.exports = {
    width,height, Point, canvasHeight, canvasWidth, RADIUS_INCREASE, SCAN_RADIUS,
    left: WESTLON,
    top: NORTHLAT,
    right: EASTLON,
    bottom: SOUTHLAT,
    expansionHorizontal,
    expansionVertical
};
