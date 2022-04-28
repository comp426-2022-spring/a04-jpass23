//FUNCTIONS//
function coinFlip() {
    return Math.floor(Math.random()*2) ? 'heads' : 'tails';
}

function coinFlips(flips) {
    var arr = []
    for (let i = 0; i<flips; i++){
      arr[i] = coinFlip(); 
    }
    return arr;
}

function countFlips(array) {
    const counter = {
      heads: 0,
      tails: 0,
    }
    array.forEach(element => {
      (element=='heads') ? counter.heads += 1 : counter.tails += 1;
    });
    if(counter.heads == 0){
      return {tails: counter.tails};
    }
    if(counter.tails == 0){
      return {heads: counter.heads};
    }
    return counter
}

function flipACoin(call) {
    const object = {
      call: '',
      flip: '',
      result: '',
    }
    object.call = call;
    object.flip = coinFlip();
    (object.flip == object.call) ? object.result = 'win' : object.result = 'lose';
    return object;
}

//SERVER//
// Require Express.js
const express = require('express')
const app = express()

//import minimist
const minimist = require('minimist')
const args = minimist(process.argv.slice(2));

//Install and require morgan as a constant: 
const morgan = require('morgan')

//Use morgan for logging:
//app.use(morgan('tiny'))

//require fs:
const fs = require('fs')

const db = require('./database.js');
const { getSystemErrorMap } = require('util');

const help = (`
server.js [options]

--port	Set the port number for the server to listen on. Must be an integer
            between 1 and 65535.

--debug	If set to true, creates endpoints /app/log/access/ which returns
            a JSON access log from the database and /app/error which throws 
            an error with the message "Error test successful." Defaults to 
            false.

--log		If set to false, no log files are written. Defaults to true.
            Logs are always written to database.

--help	Return this message and exit.
`)
// If --help or -h, echo help text to STDOUT and exit
if (args.help || args.h) {
    console.log(help)
    process.exit(0)
}

var HTTP_PORT = args['port'] ||process.env.PORT || 5555
var DEBUG = args['debug'] || false
var LOG = args['log']
if(args['log'] == null){
    LOG = true
}

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Start server
const server = app.listen(HTTP_PORT, () => {
    console.log("Server running on port %PORT%".replace("%PORT%",HTTP_PORT))
});
// READ (HTTP method GET) at root endpoint /app/
app.get("/app/", (req, res) => {
    res.statusCode = 200;
    res.statusMessage = 'OK';
    res.writeHead(res.statusCode, {'Content-Type': 'text/plain'})
    res.end(res.statusCode + ' ' + res.statusMessage);
});

//FIX THIS
if(LOG == 'true'){
    app.use((req, res, next) => {
        let logdata = {
            remoteaddr: req.ip,
            remoteuser: req.user,
            time: Date.now(),
            method: req.method,
            url: req.url,
            protocol: req.protocol,
            httpversion: req.httpVersion,
            status: res.statusCode,
            referer: req.headers['referer'],
            useragent: req.headers['user-agent']
        }
        const stmt = db.prepare('INSERT INTO accesslog (remoteaddr,remoteuser,time,method,url,protocol,httpversion,status,referer,useragent) VALUES (?,?,?,?,?,?,?,?,?,?)')
        const info = stmt.run(logdata.remoteaddr,logdata.remoteuser,logdata.time,logdata.method,logdata.url,logdata.protocol,logdata.httpversion,logdata.status,logdata.referer,logdata.useragent)
        //res.status(200).json(info)
        next();
    })
}
// Define other CRUD API endpoints using express.js and better-sqlite3
if(DEBUG){
    app.get("/app/log/access", (req,res) => {
        try {
            const stmt = db.prepare('SELECT * FROM accesslog').all()
            res.status(200).json(stmt)
        } catch {
            console.error(e)
        }
    });
    app.get("/app/error", (req,res) => {
        throw new Error('Error test successful')
    });
}

if(LOG == 'true'){
    // Use morgan for logging to files
    // Create a write stream to append (flags: 'a') to a file
    const WRITESTREAM = fs.createWriteStream('access.log', { flags: 'a' })
    // Set up the access logging middleware
    app.use(morgan('combined', { stream: WRITESTREAM }))
}

//other endpoints
app.get('/app/flip', (req,res) => {
    res.status(200).json({'flip':coinFlip()})
})

app.get('/app/flips/:number', (req,res) => {
    const flips = coinFlips(req.params.number)
    const coint = countFlips(flips)
    res.status(200).json({"raw": flips, "summary":count})
})

app.get('/app/flip/call:guess(heads|tails)', (req,res) => {
    const flipy = flipACoin(req.params.guess)
    res.status(200).json(flipy)
})
// Default response for any other request
app.use(function(req, res){
	res.json({"message":"Endpoint not found. (404)"});
    res.status(404);
});

process.on('SIGTERM', () => {
    server.close(() => {
        console.log('Server stopped')
    })
})
//commit