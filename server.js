const express = require("express");
const bodyParser = require("body-parser");
const morgan = require("morgan");
const router = express.Router();
// const phidget22 = require('phidget22');
// const flashgLights = require('./unitOperations/flashingLights')

let serverPotStatus = false;
let serverGraphData = ['test'];

const PORT = 3001;
const app = express();

app.use(morgan('dev'));
// Configure body parser for AJAX requests
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

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



// Start the API server
app.listen(PORT, function() {
  console.log(`🌎  ==> API Server now listening on PORT ${PORT}!`);
});


