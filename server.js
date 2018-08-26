const express = require("express");
const bodyParser = require("body-parser");
const morgan = require("morgan");
const router = express.Router();
const fractionalStill = require('./unitOperations/fractionalStill')

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




const PORT = 3001;
const app = express();

app.use(morgan('dev'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());


//     ----------
//     | ROUTES |
//     ----------

// POT STILL
router.route('/setpot')
  .post((req,res) => {
    serverPotStatus = req.body.desiredPotState
    flashingLights.runDemo();
    res.json({
      serverPotStatus:serverPotStatus
    });
  })

router.route('/potstatus')
  .get((req,res) => {
    console.log('front end asked what is the pot status')
    console.log(`server status is ${serverPotStatus}`);
    res.json({
      serverPotStatus:serverPotStatus
    });
  })

router.route('/potgraphdata')
  .get((req,res) => {
    console.log('front end asked for graph data')
    res.json({
      serverGraphData:serverGraphData
    });
  })

// FRACTIONAL STILL
router.route('/setfractional')
  .post((req,res) => {
    serverRunOverview.startAlcohol=parseInt(req.body.startAlcohol);
    serverRunOverview.startVolum=parseInt(req.body.startVolume);
    serverFractionalStatus=req.body.desiredFractionalState;
    fractionalGraphData=[];
    fractionalStill.runProgram(fractionalGraphData, serverFractionalStatus, serverRunOverview);
    res.json({
      serverFractionalStatus:serverFractionalStatus
    })
  })



// Start the API server
app.listen(PORT, function() {
  console.log(`🌎  ==> API Server now listening on PORT ${PORT}!`);
});


