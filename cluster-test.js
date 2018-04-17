"use strict";

const cluster = require('cluster');
const http = require('http');
const os = require( "os" );
const numCPUs = os.cpus().length;

if (cluster.isMaster) {
    console.log("numCPUs=" + numCPUs);
    for (var i = 0; i < numCPUs; i++) {
        var worker = cluster.fork();
    }
    cluster.on(
        "exit",
        function handleExit(worker, code, signal ) {

            console.log( chalk.yellow( "[Cluster]" ), "Worker end ", worker.process.pid );
            console.log( chalk.yellow( "[Cluster]" ), "nguyen nhan:", worker.exitedAfterDisconnect );
            if ( ! worker.exitedAfterDisconnect ) {
                var worker = cluster.fork();
            }

        }
    );
}else {
// Worker processes have a http server
    http.Server((req, res) => {
        console.error('---Request header.', req.headers)
    res.writeHead(200);
    res.end('hello world \n');
}).listen(8000);
}