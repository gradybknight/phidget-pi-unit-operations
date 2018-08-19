let arrayOfClosedTimes = [4000, 4000, 8000, 8000, 15000]
let counter = 0;
let startTime = Date.now();

function runOneCycle() {
    valveStatus=true;
    console.log(`Counter: ${counter} timestamp: ${Date.now()-startTime}: valve status: ${valveStatus}`);
    let openTimer = setTimeout(endOpenValve, 500);
}

function endOpenValve() {
    valveStatus = false;
    console.log(`Counter: ${counter} timestamp: ${Date.now()-startTime}: valve status: ${valveStatus}`);
    let endCycleTimer = setTimeout(waitUntilNextCycle,arrayOfClosedTimes[counter]);
};

function waitUntilNextCycle() {
    // console.log(`timestamp: ${Date.now()}: valve status: ${valveStatus}`);
    counter++;
    if (counter < 5) {
        runOneCycle();
    }
}



runOneCycle();