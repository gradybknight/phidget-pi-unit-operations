// Dependencies
// =============================================================
var express = require("express");
var bodyParser = require("body-parser");
var path = require("path");

// Sets up the Express App
// =============================================================
var app = express();
var PORT = 3001;

// Sets up the Express app to handle data parsing
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());


// Phidget Information
const startFractionalRun = require('./secondTry');

// pot still variables
let serverPotStatus = false;
let serverGraphData = [];

// fractional still variables
let serverFractionalStatus = false;
let fractionalGraphData = [];
let serverRunOverview = {
  currentBeaker:'',
  currentClickCountInBeaker:'',
  totalClickCountInBeaker:'',
  timeToCompleteBeaker:'',
  timeToCompleteRun: '',
  startAlcohol: 0,
  startVolume: 0,
  currentMessage:'not running'
}


// Routes
// =============================================================

app.get("*", function(req, res){
    console.log('got this')
})

// FRACTIONAL STILL
app.post("/setfractional", function(req,res) {
    serverRunOverview.startAlcohol=parseInt(req.body.startAlcohol);
    serverRunOverview.startVolume=parseInt(req.body.startVolume);
    serverFractionalStatus=req.body.desiredFractionalState;
    fractionalGraphData=[];
    startFractionalRun(fractionalGraphData, serverFractionalStatus, serverRunOverview);
    res.json({
      serverFractionalStatus:serverFractionalStatus
    })
});

app.get("fractionalstatus", function(req,res) {
    console.log('front end asked what is the fractional status')
    console.log(`server status is ${serverFractionalStatus}`);
    res.json({
      serverFractionalStatus:serverFractionalStatus
    });
});

app.get("/fractionalgraphdata", function(req,res) {
    console.log('front end asked for fractional graph data')
    res.json({
      fractionalGraphData:fractionalGraphData
    });
});

app.get("/fractionalsummary", function(req,res) {
    console.log('front end asked for fractional summary')
    res.json({
      serverRunOverview:serverRunOverview
    });
});


// Starts the server to begin listening
// =============================================================
app.listen(PORT, function() {
  console.log("App listening on PORT " + PORT);
});
