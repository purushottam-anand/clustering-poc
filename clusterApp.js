import express from 'express'
const port = 3000;
import cluster from "cluster";
import {benchmarkFunction} from './util.js';
import OS from "os";
const totalCPUs = OS.cpus().length;

if (cluster.isMaster) {
    console.log(`Number of CPUs is ${totalCPUs}`);
    console.log(`Master ${process.pid} is running`);

    // Fork workers.
    for (let i = 0; i < totalCPUs - 2; i++) {
        cluster.fork();
    }

    cluster.on("exit", (worker, code, signal) => {
        console.log(`worker ${worker.process.pid} died`);
        console.log("Let's fork another worker!");
        cluster.fork();
    });
} else {
    const app = express();
    console.log(`Worker ${process.pid} started`);

    app.get("/", (req, res) => {
        res.send("Hello World!111");
    });

    app.get("/api/:n", function (req, res) {
        let n = parseInt(req.params.n);
        let count = 0;

        if (n > 5000000000) n = 5000000000;

        for (let i = 0; i <= n; i++) {
            count += i;
        }

        res.send(`Final count is ${count}`);
    });

    app.get("/api/benchmark/:n", async function (req, res) {
        const arrival = Date.now()
        let n = parseInt(req.params.n);
        while (n--) {
            await benchmarkFunction()
        }
        const departure = Date.now()
        return departure
    });

    app.listen(port, () => {
        console.log(`App listening on port ${port}`);
    });
}