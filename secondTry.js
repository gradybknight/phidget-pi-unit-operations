// This module receives:
// fractionalGraphData: array where each object is: x (elapsed time in seconds), y (temperature), id (Date.now() to use as identifier)
// serverFractionalStatus: boolean to indicate running or not
// serverRunOverview: object {currentBeaker, currentClickCountInBeaker, totalClickCountInBeaker, 
//                            timeToCompleteBeaker, timeToCompleteRun, startAlcohol, startVolume, currentMessage}. 


// import phidget library
const phidget22 = require('phidget22');

// physical parameters and relay mapping
const collectionCoefficient = 1.75;
const lastFractionForHeads = 6;
const lastFractionForHearts = 16;
const preHeatEndTemperature = 45;

startFractionalRun =  function(fractionalGraphData, serverFractionalStatus, serverRunOverview) {
    console.log('started frac in secondTry.js')
    // build data for run
    overallRunArray = buildDataForRun(serverRunOverview);
    console.log(overallRunArray);
    // initialize phidget connection
    let startTime = Date.now();
    initializePhidgetConnection();    
};


initializePhidgetConnection = function() {
    console.log('connecting to:' + hostname);
	var conn = new phidget22.Connection(SERVER_PORT, hostname, { name: 'Server Connection', passwd: '' });
	conn.connect()
		.then(runCoreFractionalProgram)
		.catch(function (err) {
			console.error('Error running example:', err.message);
			process.exit(1);
		});
};

function runCoreFractionalProgram() {
    initializePhidgetBoards().then( (controlSystem) => { runFracProcess( controlSystem ) });
};

async function initializePhidgetBoards() {
    let heatingElement = new phidget22.DigitalOutput();
    heatingElement.setChannel(0);
    await heatingElement.open();

    let solenoid = new phidget22.DigitalOutput();
    solenoid.setChannel(1);
    await solenoid.open();

    let extendArm = new phidget22.DigitalOutput();
    extendArm.setChannel(2);
    await extendArm.open();

    let retractArm = new phidget22.DigitalOutput();
    retractArm.setChannel(3);
    await retractArm.open();


    var tempProbe = new phidget22.TemperatureSensor();
    tempProbe.setChannel(0);
    tempProbe.setDataInterval(500);
    await tempProbe.open();
    console.log('temp probe attached');
    

    let phidgetBoardMapping = {
        heatingElement:heatingElement,
        solenoid:solenoid,
        extendArm:extendArm,
        retractArm:retractArm,
        tempProbe:tempProbe
    }
    return phidgetBoardMapping;
}

buildDataForRun = function(serverRunOverview) {
    if (this.convertAlcoholToDecimal(serverRunOverview) && this.convertVolumeToDecimal(serverRunOverview)) {
        // build overall run array
        // each element of array: {closeTime, targetVolume, beakerID, cycleCount}
        let overallRunArray = this.buildOverallRunArray(serverRunOverview);
        // update total projected run time
        this.updateExpectedTotalRunTime(overallRunArray,serverRunOverview);
        return overallRunArray;
    } else {
        console.log(`bad volume or alcohol value was received. alcohol: ${serverRunOverview.startAlcohol}, volume: ${serverRunOverview.startVolume}`);
    }
};

function runFracProcess() {
    // pre-heat system
    controlSystem.heatingElement.setState(true);
    serverFractionalStatus = true;
    serverRunOverview.currentMessage = 'Pre-heating system';
    
    // loop until temperature endpoint is met then call enclosing array function
    let preheatCheck = setInterval(() => {
        let currentTemperature = controlSystem.tempProbe.getTemperature();
        logTimePoint(currentTemperature);
        if (currentTemperature > preHeatEndTemperature) {
            serverRunOverview.currentMessage = 'Ten minute wait before processing';
            clearInterval(preheatCheck);
            setTimeout(() => {
                updateExpectedTotalRunTime();
                serverRunOverview.currentBeaker = 0;
                serverRunOverview.totalClickCountInBeaker = overallRunArray[0].cycleCount;
                serverRunOverview.message = overallRunArray[0].overallFraction;
                // This starts the core fractional program.  Passes in first beaker's paramaters
                runEnclosingArrayCycle(overallRunArray[0]);
            }, 10*60*1000);
        }
    }, 1*60*1000);
    // 
}

function logTimePoint(temperature) {
    let dataPoint = {}
    dataPoint.y = temperature;
    dataPoint.x = Date.now() - startTime;
    datapoint.id = Date.now();
    fractionalGraphData.push(dataPoint);
}

function runEnclosingArrayCycle(fractionInformation) {
    // recursive function.  Terminates when end of array is met

    let fractionCounter = 0;

    function runOneCycle() {
        controlSystem.solenoid.setState(true);
        setTimeout(endOpenValve, 500);
    };
    
    function endOpenValve() {
        controlSystem.solenoid.setState(false);
        setTimeout(waitUntilNextCycle, fractionInformation.closeTime);
    };

    function waitUntilNextCycle() {
        // console.log(`timestamp: ${Date.now()}: valve status: ${valveStatus}`);
        fractionCounter++;
        serverRunOverview.currentClickCountInBeaker=fractionCounter;
        
        // Log temperature every ten solenoid clicks        
        if (fractionCounter % 10 == 0) {
            logTimePoint(controlSystem.tempProbe.getTemperature());
        }
        // Breakpoint for cycles within one beaker
        if (fractionCounter < fractionInformation.cycleCount) {
            runOneCycle();
        } else {
            // move to next beaker in overall array
            positionInOverallArray++;
            // if the current beaker has a next function, run it.  Currently used to move actuator arm
            if (fractionInformation.nextFunction) {
                // run end of fraction function; usually move actuator arm
                fractionInformation.nextFunction();
                console.log(`moved actuator arm`);
            } 
            // if there's another beaker in array, run its cycle
            if (positionInOverallArray<overallRunArray.length) {
                serverRunOverview.currentBeaker = positionInOverallArray;
                serverRunOverview.totalClickCountInBeaker = overallRunArray[positionInOverallArray].cycleCount;
                serverRunOverview.message = overallRunArray[positionInOverallArray].overallFraction;
                // move to next line in overall array
                runEnclosingArrayCycle(overallRunArray[positionInOverallArray]);
            } else {
                // end the run
                console.log(`Run has ended`);
                serverRunOverview.message = `last run completed at ${Date.now()}`;
                serverFractionalStatus = false;
            }
        }
    };

    runOneCycle(); // one cycle opens solenoid for 500 ms; closes for beaker's close time
}

updateExpectedTotalRunTime = function() {
    let totalTime = 0;
    for (let i= 0; i<21; i++) {
        let beakerTime = (overallRunArray[i].closeTime + 0.5) * overallRunArray[i].cycleCount;
        totalTime = totalTime + beakerTime;
    }
    serverRunOverview.timeToCompleteRun = totalTime/1000 + Date.now();
};

convertAlcoholToDecimal = function(serverRunOverview) {
    serverRunOverview.startAlcohol = parseFloat(serverRunOverview.startAlcohol);
    if (serverRunOverview.startAlcohol > 1) {
        serverRunOverview.startAlcohol = serverRunOverview.startAlcohol / 100;
    } else if (serverRunOverview.startAlcohol <= 0) {
        return false;
    }
    return true;
};

convertVolumeToDecimal = function(serverRunOverview) {
    serverRunOverview.startVolume = parseFloat(serverRunOverview.startVolume)*1000;
    if (serverRunOverview.startVolume <= 0) {
        return false;
    }
    return true; 
};

buildOverallRunArray = function(serverRunOverview) {
    let volumeEthanol = serverRunOverview.receivedAlcoholValue * serverRunOverview.receivedVolumeValue;
    let volumeMethanol = volumeEthanol * 0.03;
    let volumeHeads = volumeEthanol * 0.05;
    let volumeTails = volumeEthanol * 0.05;
    let volumeHearts = volumeEthanol - (volumeMethanol + volumeTails + volumeHeads);
    let beakerArray = [];

    // build target volumes for each beaker
    for (let i = 0; i<21; i++) {
        let beakerInformation = {
            targetVolume:0,
            cycleCount:0,
            closeTime:0
        };
        if (i==0) {
            // methanol
            beakerInformation.targetVolume = volumeMethanol;
            beakerInformation.overallFraction = 'Heads';
        }  
        if (i>0 && i<=4) {
            // heads
            beakerInformation.targetVolume = volumeHeads * collectionCoefficient / 3;               
            beakerInformation.overallFraction = 'Heads';
        } 
        if (i>4 && i<=17) {
            // hearts
            beakerInformation.targetVolume = volumeHearts * collectionCoefficient / 14;               
            beakerInformation.overallFraction = 'Hearts';
        } 
        if (i>17) {
            // tails
            beakerInformation.targetVolume = volumeTails * collectionCoefficient / 3;               
            beakerInformation.overallFraction = 'Tails';
        }
        beakerInformation.beakerID=i;
        beakerArray[i]= beakerInformation; 
    }

    for (let i = 0; i<21; i++) {
        let clickCount = Math.floor(beakerArray[i].targetVolume / 3.32);
        beakerArray[i].cycleCount = clickCount;
        if (i<=4) {
            beakerArray[i].closeTime = 3000
        } else if (i<=10) {
            beakerArray[i].closeTime = 4000
        } else if (i<=15) {
            beakerArray[i].closeTime = 6000
        } else {
            beakerArray[i].closeTime = 8000
        }
    }
    beakerArray[lastFractionForHeads].nextFunction = this.moveArm(extend, 9000);
    beakerArray[lastFractionForHearts].nextFunction = this.moveArm(extend, 11000);
    return beakerArray;
};

moveArm = function(direction, duration) {
    if (direction == 'extend') {
        controlSystem.extendArm.setState(true);
        setTimeout((controlSystem) => {controlSystem.extendArm.setState(false)},duration);
    } else {
        controlSystem.retractArm.setState(true);
        setTimeout((controlSystem) => {controlSystem.retractArm.setState(false)},duration);
    }
};

module.exports.startFractionalRun = startFractionalRun;