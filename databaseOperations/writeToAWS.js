require('dotenv').config();
const mysql = require('mysql');

// MySQL consts
const dbhost = process.env.DB_HOST;
const dbuser = process.env.DB_USER;
const dbpassword = process.env.DB_PASSWORD;
const dbname = process.env.DB_NAME;

module.exports = {
    writeFractionalTimePoint: function(timepointData) {
        var connection = mysql.createConnection({
            host:dbhost,
            user:dbuser,
            password:dbpassword,
            database:dbname
        })
        connection.query('INSERT INTO fractional SET ?', timepointData, function(err, rows, fields) {
            if (err) {
                console.log(err);
            } else {
                connection.end();
            };
        })
    }
}