// let potGraphData = [];
// let potControlSystem = {
//   potHeatingElement:'',
//   columnTemperature:'',
//   chillerReturnWaterTemperature:''
// }
// let serverPotOverview = {
//     isGinRun:false,
//     running:false,
//     runStartTime:'',
//     forcedTerminationTime:'',
//     requiresStrippingRun:false,
//     runEndTime:'',
//     columnTemperature:'',
//     message:''
//   }

function startPotRun(potGraphData, serverPotOverview, potControlSystem) {
    const termminationTemperature = 99.0; // celsius
    
    let startTime = Date.now();
    let potGraphDataLocal = potGraphData;
    let serverPotOverviewLocal = serverPotOverview;
    let potControlSystemLocal = potControlSystem;
    let temperatureLogging = '';
    let runTimer = '';
    

    function logTemperature() {
        let potColumnTemperature = potControlSystemLocal.columnTemperature.getTemperature();
        let dataPoint = {}
        dataPoint.y = potColumnTemperature;
        dataPoint.x = (Date.now() - startTime)/(1000*60);
        dataPoint.id = Date.now();
        potGraphDataLocal.push(dataPoint);
        serverPotOverviewLocal.columnTemperature = potColumnTemperature;
    }

    function endPotRun() {  
        potControlSystemLocal.potHeatingElement.setState(false);
        serverPotOverviewLocal.running = false;
        serverPotOverviewLocal.runEndTime = Date.now();
        serverPotOverviewLocal.message = `Run has finished.  Heating element is inactive.`
        clearTimeout(runTimer);
        clearInterval(temperatureLogging);
    }

    // **********************************  Main program ********************************** //
    
    // Tell server that the program is running
    serverPotOverviewLocal.running=true;
    serverPotOverviewLocal.timeStarted = startTime;

    // Set the time limit in milliseconds
    let runTimeInMilliSeconds = serverPotOverviewLocal.forcedTerminationTime * 60 * 60 * 1000; //hours * 60 min/hour * 60 secos/min * 1000 ms/sec

    // Turn on temperature logging
    console.log(`Initiating Temperature logging`);
    temperatureLogging = setInterval(logTemperature, 60*1000); // log temperature every minute
    
    // Turn on heating element
    potControlSystemLocal.potHeatingElement.setState(true);
    console.log(`Heating element turned on`);
    serverRunOverviewLocal.message = `Heating element is active`;

    // Set timeout for total run time
    runTimer = setTimeout(() => {endPotRun()}, runTimeInMilliSeconds);

    // Monitor temperature until target temperature is attained
    if (serverPotOverviewLocal.columnTemperature >= termminationTemperature) {
        endPotRun();
    }
};

module.exports.startPotRun = startPotRun;