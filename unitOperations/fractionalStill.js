// This module receives:
// fractionalGraphData: array where each point is x (elapsed time in seconds), y (temperature), id (time in seconds)
// serverFractionalStatus: boolean to indicated running or not
// serverRunOverview: object {currentBeaker, currentClickCount, beakerClickCount, timeToCompleteBeacker, timeToCompleteRun, startAlcohol, startVolume}. All integers


// import phidget library
const phidget22 = require('phidget22');

// physical connection parameters
const heatingElement = 1;
const solenoidValve = 2;
const armRetract = 3;
const armExtend = 4;


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
           

    },
    
    
}