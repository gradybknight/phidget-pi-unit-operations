// This module receives:
// fractionalGraphData: array where each object is: x (elapsed time in seconds), y (temperature), id (Date.now() to use as identifier)
// serverFractionalStatus: boolean to indicate running or not
// serverRunOverview: object {currentBeaker, currentClickCountInBeaker, totalClickCountInBeaker, timeToCompleteBeacker, timeToCompleteRun, startAlcohol, startVolume}. All integers


// import phidget library
const phidget22 = require('phidget22');

// physical parameters
const heatingElement = 1;
const solenoidValve = 2;
const armRetract = 3;
const armExtend = 4;
const collectionCoefficient = 1.75;


module.exports = {
    runProgram: function(fractionalGraphData, serverFractionalStatus, serverRunOverview) {
        var SERVER_PORT = 5661;
        var hostname = '127.0.0.1';
        var conn = new phidget22.Connection(SERVER_PORT, hostname, { name: 'Server Connection', passwd: '' });
        conn.connect()
            .then(this.startFractionalRun(conn, fractionalGraphData, serverFractionalStatus, serverRunOverview))
            .catch(function(err) {
                console.log(`error in fractional still: ${err.message}`);
                process.exit(1);
            });
    },


    startFractionalRun: function(conn, graphData, serverFractionalStatus, serverRunOverview) {
        if (this.convertAlcoholToDecimal(serverRunOverview) && this.convertVolumeToDecimal(serverRunOverview)) {

        } else {
            console.log(`bad volume or alcohol value was received. alcohol: ${serverRunOverview.startAlcohol}, volume: ${serverRunOverview.startVolume}`);
        }

    },
    convertAlcoholToDecimal: function(serverRunOverview) {
        let receivedAlcoholValue = parseFloat(serverRunOverview.startAlcohol);
        if (receivedAlcoholValue > 100) {
            receivedAlcoholValue = receivedAlcoholValue / 100;
            serverRunOverview.startAlcohol = receivedAlcoholValue;
        } else if (receivedAlcoholValue <= 0) {
            return false;
        }
        return true;
    },
    convertVolumeToDecimal: function(serverRunOverview) {
        serverRunOverview.startVolume = parseFloat(serverRunOverview.startVolume)*1000;
        if (receivedVolumeValue <= 0) {
            return false;
        }
        return true; 
    },
    buildOverallRunArray: function(serverRunOverview) {
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
            }  
            if (i>0 && i<=4) {
                // heads
                beakerInformation.targetVolume = volumeHeads * collectionCoefficient / 3;               
            } 
            if (i>4 && i<=17) {
                // hearts
                beakerInformation.targetVolume = volumeHearts * collectionCoefficient / 14;               
            } 
            if (i>17) {
                // tails
                beakerInformation.targetVolume = volumeTails * collectionCoefficient / 3;               
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
        return beakerArray;
    },
    buildIndividualBeakerArray: function() {

    },
    runBeaker: function() {

    }

    
}