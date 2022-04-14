import express from 'express'
import cluster from "cluster";
import OS from "os";

if (cluster.isPrimary) {
    console.log(`Master ${process.pid} is running`);
    const totalCPUs = OS.cpus().length;
    console.log(`Number of CPUs is ${totalCPUs}`);
    // Fork workers.
    for (let i = 0; i < totalCPUs - 2; i++) {
        const workerId = i + 100
        const worker = cluster.fork({workerId: workerId});
        worker.on('message', async msg => {
            console.log(`message called`)
            if (msg.msgType === 'processIO') { // A, B
                console.log(`console --- found`)
                const ret = await makeApiRequest(msg.requestId)
                // msg.returned.value = ret
                // console.log(`API output `, msg.returned.value)
                worker.send({
                    msgType: 'IO_PROCESSED',
                    value: ret,
                    requestId: msg.requestId
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
        const requestId = req.params.n
        const ret = process.send({
            msgType: 'processIO', // A, B
            data: {arg: 5, workerId: process.env.workerId},
            requestId
        })
        await process.on('message', msg => {
            console.log(`io processed`, msg)
            if (msg.msgType === 'IO_PROCESSED' && msg.requestId === requestId) {
                console.log(`msg received`, msg.value)
                res.json({output: msg.value})
            }
        })
    });

    app.listen(3000, () => {
        console.log(`App listening on port ${3000}`);
    });
}

const makeApiRequest = async (arg) => {
    return `returned_value = ${arg}`
}