import express from 'express'
import cluster from "cluster";
import OS from "os";
import {makeIOCall} from './util.js'

if (cluster.isPrimary) {
    console.log(`Master ${process.pid} is running`);
    const totalCPUs = OS.cpus().length;
    console.log(`Number of CPUs is ${totalCPUs}`);
    // Fork workers.
    const ioWorker = cluster.fork({workerId: 99, workerType: 'IO_WORKER'});
    ioWorker.on('message', async msg => {
        console.log(`master called fof calling IO`, msg.msgType)
        if (msg.msgType === 'callIO') {
            console.log(`control inside to call IO`)
            const ioWorkerCalled = ioWorker.send({
                msgType: 'processIO',
                msg
            })
            console.log(`event emmitted for calling worker - `, ioWorkerCalled)
        }
    })
    ioWorker.on('message', async msg => {
        console.log(`master called after IO is processed`, msg.msgType)
        if (msg.msgType === 'IO_PROCESSED') {
            ioWorker.send({
                msgType: msg.newMsgType,
                msg
            })
        }
    })
    for (let i = 0; i < totalCPUs - 1; i++) {
        const workerId = i + 100
        const worker = cluster.fork({workerId: workerId, workerType: 'CPU_WORKER'});
        console.log(`worker created with ID`, workerId)
    }

    cluster.on("exit", (worker, code, signal) => {
        console.log(`worker ${worker.process.pid} died`);
        console.log("Let's fork another worker!");
        cluster.fork();
    });
} else {
    const app = express();
    
    app.get("/", (req, res) => {
        console.log(`Worker ${process.pid} started`);
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
        console.log(`api called with n = `, req.params.n, " received at workerId - ", process.env.workerId)
        const requestId = req.params.n
        const ret = process.send({
            msgType: 'callIO', // A, B
            data: {arg: 5, workerId: process.env.workerId},
            requestId
        })
        await process.on('message', msg => {
            console.log(`io processed`, msg)
            const currentWorkerId = process.env.workerId
            const relevantMessageType = `IO_PROCESSED_WORKER_ID_${currentWorkerId}`
            if (msg.msgType === relevantMessageType && msg.msg.requestId === requestId) {
                console.log(`msg received`, msg.value)
                res.json({output: msg.value})
            }
        })
    });
    if (process.env.workerId != 99) {
        app.listen(3000, () => {
            console.log(`App listening on port ${3000}`);
        });
    }

    if (process.env.workerId == 99) {
        process.on('message', async msg => {
            console.log(`IO worker called`)
            if (msg.msgType === 'processIO') {
                console.log(`console --- found`)
                const ret = await makeApiRequest(msg.msg.requestId)
                const msgType = `IO_PROCESSED_WORKER_ID_${msg.data.workerId}`
                process.send({
                    msgType: 'IO_PROCESSED',
                    value: ret,
                    requestId: msg.requestId,
                    newMsgType: msgType
                })
            }
        })
    }
}

const makeApiRequest = async (arg) => {
    const output = await makeIOCall(arg)
    console.log("API output ", output)
    return output
}