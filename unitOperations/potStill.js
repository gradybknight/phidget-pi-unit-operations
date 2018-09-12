// This module receives:
// potGraphData: array where each object is: x (elapsed time in seconds), y (temperature), id (Date.now() to use as identifier)
// serverPotOverview: object {startAlcohol, startVolume, timeLimitInHours message, running, currentTemperature}. 
// potControlSystem: object containing phidget mapping for heatingElement, columnTemperature, chillerReturnWaterTemperature


function startFractionalRun(potGraphData, serverPotOverview, potControlSystem) {

    let startTime = Date.now();
    let potGraphDataLocal = potGraphData;
    let serverPotOverviewLocal = serverPotOverview;
    let potControlSystemLocal = potControlSystem;

    function logTemperature() {
        let potColumnTemperature = potControlSystemLocal.columnTemperature.getTemperature();
        let dataPoint = {}
        dataPoint.y = potColumnTemperature;
        dataPoint.x = (Date.now() - startTime)/(1000*60);
        dataPoint.id = Date.now();
        potGraphDataLocal.push(dataPoint);
        serverPotOverviewLocal.columnTemperature = potColumnTemperature;
    }

    function endPotRun() {  //NEED TO THINK ABOUT TERMINATION
        function closeSoleniod() {
            fractionalControlSystemLocal.solenoid.setState(false);
            console.log(`Completed at ${Date.now()}. Solenoid is now closed`)
            serverRunOverviewLocal.message = `Run completed at ${Date.now()}`;
            clearInterval(temperatureLogInterval);
        }

        fractionalControlSystemLocal.heatingElement.setState(false);
        serverRunOverviewLocal.message = `Heating element is turned off.  Waiting five minutes to drain still`;
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
                    serverRunOverviewLocal.timeToCompleteBeaker = overallRunArray[positionInOverallArray].cycleCount * (0.5 + overallRunArray[positionInOverallArray].closeTime) / 1000;
                    // move to next line in overall array
                    runEnclosingArrayCycle(overallRunArray[positionInOverallArray]);
                } else {
                    // end the run
                    console.log(`Last beaker reached, moving to run termination`);
                    serverRunOverview.message = `Last beaker completed, emptying the still`;
                    endFractionalRun();
                    serverRunOverviewLocal.running = false;
                }
            }
        };
        serverRunOverview.timeCurrentBeakerStarted = Date.now();
        runOneCycle(); // one cycle opens solenoid for 500 ms; closes for beaker's close time
    }


    // **********************************  Main program ********************************** //
    
    // Tell server that the program is running
    serverPotOverviewLocal.running=true;
    serverPotOverviewLocal.timeStarted = startTime;
    let runTimeInMilliSeconds = serverPotOverviewLocal.timeLimitInHours * 60 * 60 * 1000; //hours * 60 min/hour * 60 secos/min * 1000 ms/sec

    // Retract arm
    console.log(`Retracting arm for 30 seconds`);
    serverRunOverviewLocal.running = true;
    moveArmForTime(30000,'retract');
    serverRunOverviewLocal.message = `Retracting arm`;

    // Build array of beakers for recursive section to iterate through
    buildDataForRun(serverRunOverviewLocal);
    console.log(`Built the following beaker array:`);
    console.log(overallRunArray);

    // Update server with estimated time to complete
    updateExpectedTotalRunTime();

    // Turn on temperature logging
    console.log(`Initiating Temperature logging`);
    let temperatureLogging = setInterval(logTemperature, 60*1000); // log temperature every minute

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
            serverRunOverviewLocal.timePreHeatComplete = Date.now();
            clearInterval(preheatCheck);

            // After ten minute wait, recurse through beaker array, cycling solenoid
            setTimeout(() => {
                // updateExpectedTotalRunTime();
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