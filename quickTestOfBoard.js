var phidget22 = require('phidget22');

var SERVER_PORT = 5661;
var hostname = 'localhost';

function main() {

	console.log('connecting to:' + hostname);
	var conn = new phidget22.Connection(SERVER_PORT, hostname, { name: 'Server Connection', passwd: '' });
	conn.connect()
		.then(runExample)
		.catch(function (err) {
			console.error('Error running example:', err.message);
			process.exit(1);
		});
}

function runExample() {
    let controlSystem = initializePhidgetBoards();

    controlSystem.solenoid.setState(true);
    controlSystem.heatingElement.setState(true);
    controlSystem.extendArm.setState(true);
    console.log(`temp requested at: ${Date.now()}`)
    console.log(`Temperature returned at ${Date.now()} with temperature: ${controlSystem.tempProbe.getTemperature()}`)
    
    setTimeout(() => {
        controlSystem.solenoid.setState(false);
    }, 5000);
    setTimeout(() => {
        controlSystem.heatingElement.setState(false);
    }, 5000);
    setTimeout(() => {
        controlSystem.extendArm.setState(false);
        controlSystem.retractArm.setState(true);
    }, 5000);
    setTimeout(() => {
        controlSystem.retractArm.setState(false);
        console.log(`that's it.`);
    }, 11000);
    
    async function initializePhidgetBoards() {
        let heatingElement = new DigitalOutput();
        heatingElement.setChannel(0);
        await heatingElement.open();

        let solenoid = new DigitalOutput();
        solenoid.setChannel(1);
        await solenoid.open();
        
        let extendArm = new DigitalOutput();
        extendArm.setChannel(2);
        await extendArm.open();
    
        let retractArm = new DigitalOutput();
        retractArm.setChannel(3);
        await retractArm.open();
    
        
        var tempProbe = new phidget22.TemperatureSensor();
        await tempProbe.open();

        let phidgetBoardMapping = {
            heatingElement:heatingElement,
            solenoid:solenoid,
            extendArm:extendArm,
            retractArm:retractArm,
            tempProbe:tempProbe
        }
        return phidgetBoardMapping;
    }
}

if (require.main === module)
	main();