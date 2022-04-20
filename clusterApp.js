import express from 'express'
import cluster from "cluster";
import OS from "os";
import {makeIOCall} from './util.js'
import {config} from "./config.js";

if (cluster.isPrimary) {
    const totalCPUs = OS.cpus().length;
    const clusterMap = {};
    // Fork workers.
    const ioWorker = cluster.fork({workerId: 99, workerType: 'IO_WORKER'});
    
    //IO worker to master
    ioWorker.on('message', async msg => {
        console.log(`master called for calling back cpu worker with response`, msg.msgType)
        if (msg.msgType === 'IO_PROCESSED') {
            //send msg back to CPU worker
            console.log(`master to cpu back --- `, msg)
            const workerHere = clusterMap[msg.workerId]
            workerHere.send({
                msgType: msg.newMsgType,
                msg
            })
        }
    })

    for (let i = 0; i < totalCPUs - 1; i++) {
        const workerId = i + 100
        const worker = cluster.fork({workerId: workerId, workerType: 'CPU_WORKER'});
        clusterMap[workerId] = worker;
        console.log(`worker created with ID`, workerId)
        //worker to master to callIO
        worker.on('message', async msg => {
            if (msg.msgType === 'callIO') {
                //send to IO worker to process IO
                const ioWorkerCalled = ioWorker.send({
                    msgType: 'processIO',
                    msg
                })
                console.log(`event emitted for calling IO worker - `, ioWorkerCalled)
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
    app.get("/api/benchmark/:n", async function (req, res) {
        console.log(`api called with n = `, req.params.n, " received at workerId - ", process.env.workerId, new Date().toISOString())
        const requestId = parseInt(req.params.n) + Date.now()
        const arg = {n: req.params.n}

        //worker to master
        const ret = process.send({
            msgType: 'callIO',
            data: {arg: req.params.n, workerId: process.env.workerId},
            requestId,
            arg
        })
        console.log(`Mater called for getting IO processed --- `, req.params.n)
        await process.on('message', msg => {
            const currentWorkerId = process.env.workerId
            const relevantMessageType = `IO_PROCESSED_WORKER_ID_${currentWorkerId}`
            if (msg.msg.newMsgType === relevantMessageType && msg.msg.requestId === requestId) {
                res.json({output: msg.msg.value})
            }
        })
    });
    if (process.env.workerId != 99) {
        app.listen(config.port, () => {
            console.log(`App listening on port ${config.port}`);
        });
    }

    if (process.env.workerId == 99) {
        let queue = []
        process.on('message', async msg => {
            if (msg.msgType === 'processIO') {
                queue.push(msg)
                console.log(`pushed to queue `, new Date().toISOString(), msg)
                setInterval(
                    async function () {
                        let tempQueue = queue
                        queue = [] // TODO: check if we can miss requests in transient period !
                        if (tempQueue.length > 0) {
                            await batchAndSendResponse(tempQueue);
                            tempQueue = []
                        }
                    },
                    config.batchingInterval
                )
            }
        })
    }
}

const batchAndSendResponse = async (requestsQueue) => {
    console.log(`batchAndSendResponse called --- `, new Date().toISOString(), requestsQueue.length, requestsQueue)
    const batchedRequests = getBatchedRequests(requestsQueue)
    const promiseArray = []
    const batchedReqKeys = Object.keys(batchedRequests)
    for (let key of batchedReqKeys) {
        promiseArray.push(makeApiRequest(key)) // TODO: fix this to be arg from any object
    }
    const apiResponses = await Promise.all(promiseArray)
    let i = 0;
    for(let key of batchedReqKeys) {
        const apiResponse = apiResponses[i]
        i++;
        const relevantRequests = batchedRequests[key]
        for (let relevantRequest of relevantRequests) {
            const returnMessage = relevantRequest.request.msg
            const msgType = `IO_PROCESSED_WORKER_ID_${returnMessage.data.workerId}`
            process.send({
                msgType: 'IO_PROCESSED',
                value: apiResponse,
                requestId: returnMessage.requestId,
                newMsgType: msgType,
                workerId: returnMessage.data.workerId,
            })
        }
    }
}

const getBatchedRequests = (requestsQueue) => {
    const requestsMap = {}
    for (let request of requestsQueue) {
        if (requestsMap[request.msg.arg.n]) {
            requestsMap[request.msg.arg.n].push({arg: request.msg.arg.n, request})
        } else {
            requestsMap[request.msg.arg.n] = [{arg: request.msg.arg.n, request}]
        }
    }
    return requestsMap
}
const makeApiRequest = async (arg) => {
    const output = await makeIOCall(arg)
    console.log("API output ", output)
    return output
}