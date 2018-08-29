// This module receives:
// fractionalGraphData: array where each object is: x (elapsed time in seconds), y (temperature), id (Date.now() to use as identifier)
// serverRunOverview: object {currentBeaker, currentClickCountInBeaker, totalClickCountInBeaker, 
//                            timeToCompleteBeaker, timeToCompleteRun, startAlcohol, startVolume, message, running}. 


function startFractionalRun(fractionalGraphData, serverRunOverview, fractionalControlSystem) {
    // physical parameters and relay mapping
    const collectionCoefficient = 1.75;
    const lastFractionForHeads = 6;
    const lastFractionForHearts = 16;
    const preHeatEndTemperature = 45;

    let startTime = Date.now();
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
        console.log(`Starting alcohol is ${serverRunOverviewLocal.startAlcohol} and volume ${serverRunOverviewLocal.startVolume}`);
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
        console.log('internal beaker array - line 111:');
        console.log(beakerArray);
        return beakerArray;
    };

    buildDataForRun = function() {
        console.log(`inside buildDataForRun - line 114`);
        console.log(serverRunOverviewLocal);
        if (convertAlcoholToDecimal(serverRunOverviewLocal) && convertVolumeToDecimal(serverRunOverviewLocal)) {
            // build overall run array
            console.log(`calling buildOverallRunArray in line 118`);
            overallRunArray = buildOverallRunArray(serverRunOverviewLocal);
            console.log('returned array - line 123:');
            console.log(overallRunArray);
        } else {
            console.log(`bad volume or alcohol value was received. alcohol: ${serverRunOverviewLocal.startAlcohol}, volume: ${serverRunOverviewLocal.startVolume}`);
            serverRunOverviewLocal.message = `bad volume or alcohol value was received. alcohol: ${serverRunOverviewLocal.startAlcohol}, volume: ${serverRunOverviewLocal.startVolume}`;
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

    updateExpectedTotalRunTime = function() {
        let totalTime = 0;
        for (let i= 0; i<overallRunArray.length; i++) {
            let beakerTime = (overallRunArray[i].closeTime + 0.5) * overallRunArray[i].cycleCount;
            totalTime = totalTime + beakerTime;
        }
        serverRunOverviewLocal.timeToCompleteRun = totalTime + Date.now();
    };

    function endFractionalRun() {
        function closeSoleniod() {
            fractionalControlSystemLocal.solenoid.setState(false);
            console.log(`Completed at ${Date.now()}. Solenoid is now closed`)
            serverRunOverviewLocal.message = `Run completed at ${Date.now()}`;
            clearInterval(temperatureLogInterval);
        }

        fractionalControlSystemLocal.heatingElement.setState(false);
        fractionalControlSystemLocal.solenoid.setState(true);
        console.log(`Heating element off, solenoid open`)
        setTimeout(() => {
            closeSoleniod();
        }, 5*60*1000);
    }

    // This is the core logic.  It opens the solenoid valve for 0.5 seconds and closes for the time designated by each element of the array
    // After reaching the end of the array, heat is discontinued, we empty the still by opening the solenid for five minutes
    function runEnclosingArrayCycle(fractionInformation) {
        // recursive function.  Terminates when end of array is met
        let fractionCounter = 0;
    
        function runOneCycle() {
            fractionalControlSystemLocal.solenoid.setState(true);
            setTimeout(endOpenValve, 500);
        };
        
        function endOpenValve() {
            fractionalControlSystemLocal.solenoid.setState(false);
            setTimeout(waitUntilNextCycle, fractionInformation.closeTime);
        };
    
        function waitUntilNextCycle() {
            fractionCounter++;
            serverRunOverviewLocal.currentClickCountInBeaker=fractionCounter;
            
            // Breakpoint for cycles within one beaker
            if (fractionCounter < fractionInformation.cycleCount) {
                runOneCycle();
            } else {
                // move to next beaker in overall array                
                positionInOverallArray++;
                console.log(`moving to next beaker ${positionInOverallArray}`);
                // if the current beaker has a next function, run it.  Currently used to move actuator arm
                if (fractionInformation.nextFunction) {
                    // run end of fraction function; currently only used to move actuator arm
                    fractionInformation.nextFunction();
                    console.log(`moved actuator arm`);
                } 
                // if there's another beaker in array, run its cycle
                if (positionInOverallArray<overallRunArray.length) {
                    serverRunOverviewLocal.currentBeaker = positionInOverallArray;
                    serverRunOverviewLocal.totalClickCountInBeaker = overallRunArray[positionInOverallArray].cycleCount;
                    serverRunOverviewLocal.message = overallRunArray[positionInOverallArray].overallFraction;
                    // move to next line in overall array
                    runEnclosingArrayCycle(overallRunArray[positionInOverallArray]);
                } else {
                    // end the run
                    console.log(`Last beaker reached, moving to run termination`);
                    serverRunOverview.message = `Last beaker completed, emptying the still`;
                    endFractionalRun();
                    serverFractionalStatus = false;
                }
            }
        };
        runOneCycle(); // one cycle opens solenoid for 500 ms; closes for beaker's close time
    }


    // **********************************  Main program ********************************** //
    
    // Tell server that the program is running
    serverRunOverviewLocal.running=true;

    // Retract arm
    console.log(`Retracting arm for 30 seconds`);
    moveArmForTime(30000,'retract');
    serverRunOverviewLocal.message = `Retracting arm`;

    // Build array of beakers for recursive section to iterate through
    overallRunArray = buildDataForRun(serverRunOverviewLocal);
    console.log(`Built the following beaker array:`);
    console.log(overallRunArray);

    // Update server with estimated time to complete
    updateExpectedTotalRunTime();

    // Turn on temperature logging
    console.log(`Initiating Temperature logging`);
    let startingTemperature = fractionalControlSystemLocal.tempProbe.getTemperature();
    console.log(`Starting Temperature is ${startingTemperature}`)
    let temperatureLogInterval = setInterval(logTemperature, 60*1000);
    
    // Turn on heating element
    fractionalControlSystemLocal.heatingElement.setState(true);
    console.log(`Heating element turned on`);
    serverRunOverviewLocal.message = `Pre-heating System`;

    // Monitor temperature until target pre-heat temperature is hit
    console.log(`pre-heating system until temperature reaches ${preHeatEndTemperature}`);
    let preheatCheck = setInterval( () => {
        let currentTemperature = fractionalControlSystemLocal.tempProbe.getTemperature();
        if (currentTemperature > preHeatEndTemperature) {
            // Wait ten minutes, stop monitoring temperature for pre-heat
            serverRunOverviewLocal.message = 'Ten minute wait before processing';
            clearInterval(preheatCheck);

            // After ten minute wait, recurse through beaker array, cycling solenoid
            setTimeout(() => {
                updateExpectedTotalRunTime();
                serverRunOverviewLocal.currentBeaker = 0;
                serverRunOverviewLocal.totalClickCountInBeaker = overallRunArray[0].cycleCount;
                serverRunOverviewLocal.message = overallRunArray[0].overallFraction;
                
                // This starts the core fractional program.  Passes in first beaker's paramaters
                runEnclosingArrayCycle(overallRunArray[0]);
            }, 10*60*1000);
        }
    }, 1*60*1000);

};

module.exports.startFractionalRun = startFractionalRun;