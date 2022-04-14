import express from 'express'
const port = 3000;
import cluster from "cluster";
import {benchmarkFunction} from './util.js';
import OS from "os";
const totalCPUs = OS.cpus().length;
import PubSub from 'ipc-pubsub'

if (cluster.isMaster) {
    console.log(`Number of CPUs is ${totalCPUs}`);
    console.log(`Master ${process.pid} is running`);

    // Fork workers.
    for (let i = 0; i < totalCPUs - 2; i++) {
        const workerId = i + 100
        const worker = cluster.fork({workerId: workerId});
        worker.on('message', async msg => {
            console.log(`message called`)
            if (msg.msgType === 'processIo') {
                console.log(`console --- found`)
                const ret = await makeApiRequest('abc')
                msg.returned.value = ret
                console.log(`reeeetuendeddd `, msg.returned.value)
                worker.send({
                    msgType: 'IO_PROCESSED',
                    value: ret
                })
            }
        })
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
        const returned = {}
        const ret = process.send({
            msgType: 'processIo',
            data: {arg: 5, workerId: process.env.workerId},
            returned
        })
        await process.on('message', msg => {
            if (msg.msgType === 'IO_PROCESSED') {
                console.log(`asdfsa`, msg.value)
                res.send(msg.ret)
            }
        })
        res.send('Kuch nahi')
    });

    app.listen(port, () => {
        console.log(`App listening on port ${port}`);
    });
}

const makeApiRequest = async (arg) => {
    return "makeApiResponse"
}