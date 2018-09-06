// ***********************************************   Package Imports   ************************************************
const express = require("express");
const bodyParser = require("body-parser");
const morgan = require("morgan");
const router = express.Router();
const phidget22 = require('phidget22');

// ***********************************************   Unit Ops Module Imports   ****************************************
const fractionalStill = require('./secondTry');
const fractionalStillSingleInteraction = require('./fractionalstillinteractions');

// ***********************************************   Express Server Setup   *******************************************
const PORT = 3001;
const app = express();

//ADDED
var allowCrossDomain = function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');

  // intercept OPTIONS method
  if ('OPTIONS' == req.method) {
    res.send(200);
  }
  else {
    next();
  }
};

app.use(morgan('dev'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(allowCrossDomain);  //ADDED
app.use(router);

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});


// ***********************************************   Pot Still Variables   *******************************************
let serverPotStatus = false;
let serverGraphData = [];

// ***********************************************   Fractional Still Variables   ************************************
let fractionalGraphData = [];
let serverRunOverview = {
  currentBeaker:'',
  currentClickCountInBeaker:'',
  totalClickCountInBeaker:'',
  timeToCompleteBeaker:'',
  timeToCompleteRun: '',
  timeStarted:'',
  timePreHeatComplete:'',
  startAlcohol: 0,
  startVolume: 0,
  running:false,
  currentTemperature:0,
  running:false,
  // startingBeaker:0,
  message:''
};
let fractionalControlSystem = {
          heatingElement:'',
          solenoid:'',
          retractArm:'',
          extendArm:'',
          tempProbe:''
};


// ***********************************************   Phidget Board Initialization ************************************
console.log('Phidget connecting');
var SERVER_PORT = 5661;
var hostName = '127.0.0.1';
var conn = new phidget22.Connection(SERVER_PORT, hostName, { name: 'Server Connection', passwd: '' });
conn.connect(fractionalControlSystem)
  .then(initializePhidgetBoards(fractionalControlSystem))
  .catch(function (err) {
    console.error('Error connecting to phidget:', err.message);
    process.exit(1);
  });

async function initializePhidgetBoards( fractionalControlSystem) {
  let heatingElement = new phidget22.DigitalOutput();
  heatingElement.setChannel(0);
  await heatingElement.open();
  fractionalControlSystem.heatingElement = heatingElement;
  console.log('heating element attached');

  let solenoid = new phidget22.DigitalOutput();
  solenoid.setChannel(1);
  await solenoid.open();
  fractionalControlSystem.solenoid = solenoid;
  console.log('solenoid attached');

  let extendArm = new phidget22.DigitalOutput();
  extendArm.setChannel(2);
  await extendArm.open();
  fractionalControlSystem.extendArm = extendArm;
  console.log('arm extender attached');

  let retractArm = new phidget22.DigitalOutput();
  retractArm.setChannel(3);
  await retractArm.open();
  fractionalControlSystem.retractArm = retractArm;
  console.log('arm retractor attached');

  var tempProbe = new phidget22.TemperatureSensor();
  tempProbe.setChannel(0);
  tempProbe.setDataInterval(500);
  await tempProbe.open();
  fractionalControlSystem.tempProbe = tempProbe;
  console.log('temp probe attached');

  // fractionalControlSystem = {
  //     heatingElement:heatingElement,
  //     solenoid:solenoid,
  //     extendArm:extendArm,
  //     retractArm:retractArm,
  //     tempProbe:tempProbe
  // };
  console.log(`Fractional still control system established`);
  return true;
}

// ***********************************************   Routes   ********************************************************

// ***********************************************   Pot Still Routes   **********************************************
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

// ***********************************************   Fractional Still Routes   ****************************************
router.route('/setfractional')
  .post((req,res) => {
    if (parseFloat(req.body.startAlcohol) >1) {
      serverRunOverview.startAlcohol=parseFloat(req.body.startAlcohol/100);
    } else {
      serverRunOverview.startAlcohol=parseFloat(req.body.startAlcohol);
    }
    serverRunOverview.startVolume=parseFloat(req.body.startVolume);
    fractionalGraphData=[];
    console.log('starting frac');
    // fractionalStill.startFractionalRun(fractionalGraphData,serverRunOverview,fractionalControlSystem);
    res.json({
      passedIn:req.data
    })
  })

router.route('/fractionalstatus')
  .get((req,res) => {
    console.log('front end asked what is the pot status')
    console.log(`server status is ${serverRunOverview.running}`);
    res.json({
      serverFractionalStatus:serverRunOverview.running
    });
  })

router.route('/fractionalgraphdata')
  .get((req,res) => {
    console.log('front end asked for graph data')
    res.json({
      fractionalGraphData:fractionalGraphData
    });
  })

router.route('/fractionalsummary')
  .get((req,res) => {
    console.log('front end asked for fractional summary')
    res.json({
      serverRunOverview:serverRunOverview
    });
  })

// router.route('/checkfractionaltemperature')
//   .get((req,res) => {
//     let fractionalTemp = fractionalControlSystem.tempProbe.getTemperature();
//     console.log(`front end asked for fractional temperature. Returning ${fractionalTemp}`);
//     res.json({
//       fractionalTemp:fractionalTemp
//     });
//   })

router.route('/extendarm')
  .get((req,res) => {
    let confirmationMessage = fractionalStillSingleInteraction.handleIndividualFractionalInteraction(fractionalControlSystem, 'extendArm');
    console.log(`turning on heat`);
    res.json({
      message:confirmationMessage
    });
  })

router.route('/retractarm')
  .get((req,res) => {
    let confirmationMessage = fractionalStillSingleInteraction.handleIndividualFractionalInteraction(fractionalControlSystem, 'retractArm');
    console.log(`turning on heat`);
    res.json({
      message:confirmationMessage
    });
  })
router.route('/turnonheat')
  .get((req,res) => {
    let confirmationMessage = fractionalStillSingleInteraction.handleIndividualFractionalInteraction(fractionalControlSystem, 'heatOn');
    console.log(`turning on heat`);
    res.json({
      message:confirmationMessage
    });
  })

router.route('/turnoffheat')
  .get((req,res) => {
    let confirmationMessage = fractionalStillSingleInteraction.handleIndividualFractionalInteraction(fractionalControlSystem, 'heatOff');
    console.log(`turning on heat`);
    res.json({
      message:confirmationMessage
    });
  })

router.route('/fracchecktemp')
  .get((req,res) => {
    let confirmationMessage = fractionalStillSingleInteraction.handleIndividualFractionalInteraction(fractionalControlSystem, 'checkTemp');
    console.log(`turning on heat`);
    res.json({
      message:confirmationMessage
    });
  })
router.route('/openvalve')
  .get((req,res) => {
    let confirmationMessage = fractionalStillSingleInteraction.handleIndividualFractionalInteraction(fractionalControlSystem, 'openValve');
    console.log(`turning on heat`);
    res.json({
      message:confirmationMessage
    });
  })

router.route('/closevalve')
  .get((req,res) => {
    let confirmationMessage = fractionalStillSingleInteraction.handleIndividualFractionalInteraction(fractionalControlSystem, 'closeValve');
    console.log(`turning on heat`);
    res.json({
      message:confirmationMessage
    });
  })


// ***********************************************   Phidget Test Routes   ****************************************
router.route('/simplifiedprogram')
  .get((req,res) => {
    serverRunOverview.startAlcohol=.3;
    serverRunOverview.startVolume=38.8;
    serverFractionalStatus=req.body.desiredFractionalState;
    fractionalGraphData=[];
    fractionalStill.startFractionalRun(fractionalGraphData,serverRunOverview,fractionalControlSystem);
    res.json({
      message:'started simple program'
    });
  })

router.route('*')
  .get((req,res) => {
    var userIP = req.socket.remoteAddress;
    console.log(`user from ${userIP} just pinged the server`);
    res.status(404);
  })
// ***********************************************   Start API server   ****************************************
app.listen(PORT, function() {
  console.log(`🌎  ==> API Server now listening on PORT ${PORT}!`);
});


