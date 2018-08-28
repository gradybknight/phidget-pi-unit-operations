// This module receives:
// fractionalGraphData: array where each object is: x (elapsed time in seconds), y (temperature), id (Date.now() to use as identifier)
// serverFractionalStatus: boolean to indicate running or not
// serverRunOverview: object {currentBeaker, currentClickCountInBeaker, totalClickCountInBeaker, 
//                            timeToCompleteBeaker, timeToCompleteRun, startAlcohol, startVolume, currentMessage}. 

// physical parameters and relay mapping
const collectionCoefficient = 1.75;
const lastFractionForHeads = 6;
const lastFractionForHearts = 16;
const preHeatEndTemperature = 45;

function startFractionalRun(fractionalGraphData, serverFractionalStatus, serverRunOverview, fractionalControlSystem) {
    let startTime = Date.now();

    let serverFractionalStatusLocal = serverFractionalStatus;
    let fractionalGraphDataLocal = fractionalGraphData;
    let serverRunOverviewLocal = serverRunOverview;
    let fractionalControlSystemLocal = fractionalControlSystem;
    let overallRunArray = [];

    convertAlcoholToDecimal = function() {
        serverRunOverviewLocal.startAlcohol = parseFloat(serverRunOverviewLocal.startAlcohol);
        if (serverRunOverviewLocal.startAlcohol > 1) {
            serverRunOverviewLocal.startAlcohol = serverRunOverviewLocal.startAlcohol / 100;
        } else if (serverRunOverviewLocal.startAlcohol <= 0) {
            return false;
        }
        return true;
    };
    
    convertVolumeToDecimal = function() {
        serverRunOverviewLocal.startVolume = parseFloat(serverRunOverviewLocal.startVolume)*1000;
        if (serverRunOverviewLocal.startVolume <= 0) {
            return false;
        }
        return true; 
    };

    moveArmForTime = function(moveTimeInMilliseconds, direction) {
        if (direction == 'extend') {
            fractionalControlSystemLocal.retractArm.setState(false);
            fractionalControlSystemLocal.extendArm.setState(true);
            setTimeout( () => {
                fractionalControlSystemLocal.extendArm.setState(false) 
            }, moveTimeInMilliseconds);
        } else {
            fractionalControlSystemLocal.extendArm.setState(false);
            fractionalControlSystemLocal.retractArm.setState(true);
            setTimeout( () => {
                fractionalControlSystemLocal.retractArm.setState(false) 
            }, moveTimeInMilliseconds);
        }
    };

    buildOverallRunArray = function() {
        let volumeEthanol = serverRunOverviewLocal.startAlcohol * serverRunOverviewLocal.startVolume;
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

        // move arm after beakers
        beakerArray[lastFractionForHeads].nextFunction = () => { moveArmForTime(9000, 'extend') };
        beakerArray[lastFractionForHearts].nextFunction = () => { moveArmForTime(11000, 'extend') };
        return beakerArray;
    };

    buildDataForRun = function() {
        console.log(serverRunOverviewLocal);
        if (convertAlcoholToDecimal(serverRunOverviewLocal) && convertVolumeToDecimal(serverRunOverviewLocal)) {
            // build overall run array
            let overallRunArray = buildOverallRunArray(serverRunOverviewLocal);
            // update total projected run time
            console.log(serverRunOverviewLocal);
        } else {
            console.log(`bad volume or alcohol value was received. alcohol: ${serverRunOverviewLocal.startAlcohol}, volume: ${serverRunOverviewLocal.startVolume}`);
        }
    };

    function logTemperature() {
        let fractionalTemp = fractionalControlSystemLocal.tempProbe.getTemperature();
        let dataPoint = {}
        dataPoint.y = fractionalTemp;
        dataPoint.x = Date.now() - startTime;
        dataPoint.id = Date.now();
        fractionalGraphDataLocal.push(dataPoint);
    }

    console.log(`Retracting arm for 30 seconds`);
    moveArmForTime(30000,'retract');

    overallRunArray = buildDataForRun(serverRunOverview);
    console.log(`Built the following beaker array:`);
    console.log(overallRunArray);

    console.log(`Initiating Temperature logging`);
    let startingTemperature = fractionalControlSystemLocal.tempProbe.getTemperature();
    console.log(`Starting Temperature is ${startingTemperature}`)
    let temperatureLogInterval = setInterval(logTemperature, 60*1000);
    
    fractionalControlSystemLocal.heatingElement.setState(true);
    console.log(`Heating element turned on`);




}

startFractionalRun =  function(fractionalGraphData, serverFractionalStatus, serverRunOverview) {
    console.log('started frac in secondTry.js')
    // build data for run
    overallRunArray = buildDataForRun(serverRunOverview);
    console.log(overallRunArray);
    // initialize phidget connection
    let startTime = Date.now();
    initializePhidgetConnection();    
};



function runFracProcess(controlSystem) {
    // pre-heat system
    console.log(`got to line 95`);
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

updateExpectedTotalRunTime = function(overallRunArray, serverRunOverview) {
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