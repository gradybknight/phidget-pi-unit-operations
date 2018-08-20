let arrayOfClosedTimes = [2000, 4000, 6000, 8000, 10000]
let counter = 0;
let startTime = Date.now();

const collectionCoefficient = 1.75;


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

// function buildArray(serverRunOverview) {
//     let volumeEthanol = serverRunOverview.receivedAlcoholValue * serverRunOverview.receivedVolumeValue*1000;
//     let volumeMethanol = volumeEthanol * 0.03;
//     let volumeHeads = volumeEthanol * 0.05;
//     let volumeTails = volumeEthanol * 0.05;
//     let volumeHearts = volumeEthanol - (volumeMethanol + volumeTails + volumeHeads);
//     let beakerArray = [];

//     // build target volumes for each beaker
//     for (let i = 0; i<21; i++) {
//         let beakerInformation = {
//             targetVolume:0,
//             cycleCount:0,
//             closeTime:0
//         };
//         if (i==0) {
//             // methanol
//             beakerInformation.targetVolume = volumeMethanol;
//         }  
//         if (i>0 && i<=4) {
//             // heads
//             beakerInformation.targetVolume = volumeHeads * collectionCoefficient / 3;               
//         } 
//         if (i>4 && i<=17) {
//             // hearts
//             beakerInformation.targetVolume = volumeHearts * collectionCoefficient / 14;               
//         } 
//         if (i>17) {
//             // tails
//             beakerInformation.targetVolume = volumeTails * collectionCoefficient / 3;               
//         }
//         beakerInformation.beakerID=i;
//         beakerArray[i]= beakerInformation; 
//     }

//     for (let i = 0; i<21; i++) {
//         let clickCount = Math.floor(beakerArray[i].targetVolume / 3.32);
//         beakerArray[i].cycleCount = clickCount;
//         if (i<=4) {
//             beakerArray[i].closeTime = 3000
//         } else if (i<=10) {
//             beakerArray[i].closeTime = 4000
//         } else if (i<=15) {
//             beakerArray[i].closeTime = 6000
//         } else {
//             beakerArray[i].closeTime = 8000
//         }
//     }
//     console.log(beakerArray);


// }

// let serverTest = {
//     receivedAlcoholValue:0.3,
//     receivedVolumeValue:40
// };

// buildArray(serverTest);
runOneCycle();