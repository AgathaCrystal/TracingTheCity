
// build in modules
const path = require("path");
const fs = require("fs");
// installed modules
const { createCanvas } = require("canvas");

// our own modules
const { readData } = require("./lib/read-data");
const { loadGeojson } = require("./lib/load-geojson");

// our declarations
const { drawPolygon, toPoints, fromGeoJsonCoordinatesToPoints, condensePointsByScanRadius, drawGroupedCenters } = require("./lib/drawMarketsAndOutline");
const { canvasHeight, canvasWidth } = require("./lib/constants");

//settings the size of the canvas
const currentCanvas = createCanvas(canvasWidth, canvasHeight, "svg");
const ctx = currentCanvas.getContext("2d");
let outFilePath = path.resolve(process.cwd(), `./out/sketch.svg`);


async function main() {
    try {
        // YOUR CODE STARTS HERE YOUR CODE STARTS HERE YOUR CODE STARTS HERE
        //----------------------------------------------------------------

        /**
         * here is not much going on, the real magic happens in the drawMarketsAndOutline
         */

        /*
        +++ Code for drawing an already existing svg in the canvas +++

        const imgData = fs.readFileSync("./data/berlin_outline.svg");
        let img = new canvas.Image();
        img.src = imgData;
        ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);
        */

        //read the geojson for bezirke
        const geojson = await loadGeojson("./data/bezirksgrenzen.geojson");
        //set all data of bezirke  
        const bezirkeDaten = geojson.features;
        //loop through all bezirksdata
        for (let bezirk of bezirkeDaten) {
            //get coordinates of the bezirk
            let coordinatesByBezirk = bezirk.geometry.coordinates.flat(2);
            //draw the outline of the bezirk
            drawPolygon(ctx, coordinatesByBezirk);
        }

        
        //START IF USING maerkte2.json
        //read the maerkte2 json
        const json = await readData("./data/maerkte2.json");
        //parse to object (json -> javascript object)
        const jsonObj = JSON.parse(json);
        //get coordinates from maerkte json e.g. [{"type": "point","lon": 13.359232,"lat": 52.546674 }, ...]
        const coords = jsonObj.coordinates;
        //transform coordinates to points
        const points = toPoints(coords);
        //END IF USING maerkte2.json
        

        /*
        //START IF USING maerkte.json
        //read the maerkte pseudo geo json
        const json = await readData("./data/maerkte.json");
        //parse to object (json -> javascript object)
        const jsonObj = JSON.parse(json);
        const features = jsonObj.features;
        //transform geojson coordinates to points
        const points = fromGeoJsonCoordinatesToPoints(features);
        //END IF USING maerkte.json
        */

        //start condensing the points
        let condensedCenters = condensePointsByScanRadius(points);
        //draw all condensed Centers
        drawGroupedCenters(ctx, condensedCenters);

        console.log(condensedCenters.size + " Circles drawn");
        // ----------------------------------------------------------
        // YOUR CODE ENDS HERE YOUR CODE ENDS HERE YOUR CODE ENDS HERE
        // YOUR CODE ENDS HERE YOUR CODE ENDS HERE...
        fs.writeFileSync(outFilePath, currentCanvas.toBuffer()); // write to file
    } catch (error) {
        throw error;
    }
}

/**
 * We call our main function here and catch all errors
 */
main().catch((err) => {
    throw err;
});

