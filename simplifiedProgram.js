function startSimplifiedProgram(fractionalGraphData, serverFractionalStatus, serverRunOverview, fractionalControlSystem) {
    let overallArray = [];
    let startTime = Date.now();

    let fractionalGraphData = fractionalGraphData;
    let serverFractionalStatus = serverFractionalStatus;
    let serverRunOverview = serverRunOverview;
    let fractionalControlSystem = fractionalControlSystem;

    console.log(fractionalControlSystem);


    function buildOuterArray(serverRunOverview) {
        let numberOfCycles = Math.floor(serverRunOverview.startAlcohol * serverRunOverview.startVolume);
        for (let i=0; i<numberOfCycles; i++) {
            let individualCycle = {};
            individualCycle.closeTime = .5 * (i+1);
            overallArray.push(individualCycle);
        };
    };
    function processOverallArray(fractionalControlSystem, serverRunOverview, overallArray){
        console.log(serverRunOverview);
        let counter = 0;
        function runOneCycle() {
            fractionalControlSystem.solenoid.setState(true);
            console.log('opened valve');
            setTimeout(endOpenValve, 500);
        };
        
        function endOpenValve() {
            fractionalControlSystem.solenoid.setState(false);
            console.log('closed valve');
            setTimeout(waitUntilNextCycle, 4000);
        };
        function waitUntilNextCycle() {
            counter++;
            serverRunOverview.currentClickCountInBeaker=counter;
            
            if (counter < overallArray.length) {
                runOneCycle();
            } else {
                console.log('testing that i can see overall array:');
                console.log(overallArray);
                fractionalControlSystem.solenoid.setState(false);
                fractionalControlSystem.heatingElement.setState(false);
                console.log(`Finished Run at ${Date.now()}`);
                clearInterval(tempLoggingTimer);
                console.log(`temp logging stopped`);
                console.log(fractionalGraphData);
            }
        };
        runOneCycle();
    };
    function waitTwoMinutesAfterPreHeat(fractionalControlSystem, serverRunOverview, overallArray, fractionalGraphData) {
        let twoMinutes = 2 * 60 * 1000;
        setTimeout( () => processOverallArray(fractionalControlSystem, serverRunOverview, overallArray, fractionalGraphData), twoMinutes)
    };
    function logTemperature(fractionalControlSystem, fractionalGraphData, startTime) {
        let fractionalTemp = fractionalControlSystem.tempProbe.getTemperature();
        let dataPoint = {}
        dataPoint.y = fractionalTemp;
        dataPoint.x = Date.now() - startTime;
        dataPoint.id = Date.now();
        fractionalGraphData.push(dataPoint);
        console.log(`Pushed temperature: ${fractionalTemp} to array at ${Date.now()}`);
    }
    let tempLoggingTimer = setInterval( () => logTemperature(fractionalControlSystem, fractionalGraphData, startTime), 5000);
    console.log(`starting run now: ${Date.now()}`);
    buildOuterArray(serverRunOverview);
    console.log(`Outer Array: `);
    console.log(overallArray);
    fractionalControlSystem.heatingElement.setState(true);
    console.log('heating element is on');
    waitTwoMinutesAfterPreHeat(fractionalControlSystem, serverFractionalStatus, overallArray, fractionalGraphData);

}

module.exports.startSimplifiedProgram = startSimplifiedProgram;