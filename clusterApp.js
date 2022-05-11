import express from 'express'
import cluster from "cluster";
import OS from "os";
import {makeIOCall} from './util.js'
import {config} from "./config.js";
const clusterMap = {};
if (cluster.isPrimary) {
    const totalCPUs = OS.cpus().length;
    // console.log(`master pid ---`, process.pid)
    // Fork workers.
    const ioWorker = cluster.fork({workerId: 99, workerType: 'IO_WORKER'});
    
    //IO worker to master
    // ioWorker.on('message', async msg => {
    //     // // console.log(`master called for calling back cpu worker with response`, msg.msgType)
    //     if (msg.msgType === 'IO_PROCESSED') {
    //         //send msg back to CPU worker
    //         // // console.log(`master to cpu back --- `, msg)
    //         const workerHere = clusterMap[msg.workerId]
    //         workerHere.send({
    //             msgType: msg.newMsgType,
    //             msg
    //         })
    //     }
    // })
    let queue = []
    let currentWorkerId = 0
    for (let i = 0; i < totalCPUs; i++) {
        const workerId = i
        const worker = cluster.fork({workerId: workerId, workerType: 'CPU_WORKER'});
        clusterMap[workerId] = worker;
        // console.log(`worker created with ID`, workerId)
        //worker to master to callIO
        worker.on('message', async msg => {
            if (msg.msgType === 'callIO') {
                // console.log(`callIOOOO called --- `, msg)
                queue.push(msg)
                // // console.log(`pushed to queue `, new Date().toISOString(), msg)
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

    const app = express();
    app.listen(config.port, () => {
        // // console.log(`App listening on port ${config.port}`);
    });
    app.get("/api/benchmark/:n", async function (req, res) {
        // // console.log(`api called with n = `, req.params.n, " received at workerId - ", process.env.workerId, new Date().toISOString())
        const requestId = req.params.n + Math.random()%1000000
        const workerIdHere = currentWorkerId++
        const randomisedWorker = clusterMap[workerIdHere % totalCPUs]
        randomisedWorker.send({
            msgType: 'processRequest',
            n: req.params.n,
            requestId
        })
        await randomisedWorker.on('message', msg => {
            const currentWorkerId = process.env.workerId
            const relevantMessageType = 'returnToMaster'
            // console.log(`return to master --- `, msg)
            if (msg.msgType === relevantMessageType && msg.requestId === requestId) {
                // console.log(`returnToMaster -- `, msg)
                res.json({output: msg.value})
            }
        })
    });

    cluster.on("exit", (worker, code, signal) => {
        // // console.log(`worker ${worker.process.pid} died`);
        // // console.log("Let's fork another worker!");
        cluster.fork();
    });

    cluster.on("error", (worker, code, signal) => {
        // // console.log(`worker ${worker.process.pid} died`);
        // // console.log("Let's fork another worker!");
        // cluster.fork();
    });
} else {
    // if (process.env.workerId == 99) {
    //     let queue = []
    //     process.on('message', async msg => {
    //         if (msg.msgType === 'processIO') {
    //             queue.push(msg)
    //             // // console.log(`pushed to queue `, new Date().toISOString(), msg)
    //             setInterval(
    //                 async function () {
    //                     let tempQueue = queue
    //                     queue = [] // TODO: check if we can miss requests in transient period !
    //                     if (tempQueue.length > 0) {
    //                         await batchAndSendResponse(tempQueue);
    //                         tempQueue = []
    //                     }
    //                 },
    //                 config.batchingInterval
    //             )
    //         }
    //     })
    // }

    // master delegated request to a worker in round-robin
    process.on('message', async msg => {
        // console.log(`message in worker`, msg)
        if (msg.msgType === 'processRequest') {
            // console.log(`abcd`)
            return processRequest(msg)
        }
        // // console.log(`Mater called for getting IO processed --- `, req.params.n)
    })
}

const processRequest = async (msg) => {
    // console.log(`processRequest message in worker`, msg)
    const requestId = msg.requestId
    const arg = {n: msg.n}
    //worker to master for any IO call
    const ret = process.send({
        msgType: 'callIO',
        data: {arg: msg.n, workerId: process.env.workerId},
        requestId
    })
    process.on('message', async msg => {
        if (msg.msgType === `IO_PROCESSED_WORKER_ID_${process.env.workerId}` && msg.requestId === requestId) {
            // console.log(`io processed message to master to return to client`)
            process.send({
                msgType: 'returnToMaster',
                requestId,
                value: msg.value
            })
            // console.log(`io sent`)
        }
    })
}
const batchAndSendResponse = async (requestsQueue) => {
    // // console.log(`batchAndSendResponse called --- `, new Date().toISOString(), requestsQueue.length, requestsQueue)
    // console.log(`request queue -- `, requestsQueue)
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
            // console.log(`relevant request -- `, relevantRequest)
            const returnMessage = apiResponse
            // console.log(`api response --- `, apiResponse)
            const msgType = `IO_PROCESSED_WORKER_ID_${relevantRequest.request.data.workerId}`
            const workerHere = clusterMap[relevantRequest.request.data.workerId]
            workerHere.send({
                msgType: msgType,
                value: apiResponse,
                requestId: relevantRequest.request.requestId,
                newMsgType: msgType,
                workerId: relevantRequest.request.data.workerId,
            })
        }
    }
}

const getBatchedRequests = (requestsQueue) => {
    // console.log(`rewuestsQueue --- `, requestsQueue)
    const requestsMap = {}
    for (let request of requestsQueue) {
        if (requestsMap[request.data.arg]) {
            requestsMap[request.data.arg].push({arg: request.data.arg, request})
        } else {
            requestsMap[request.data.arg] = [{arg: request.data.arg, request}]
        }
    }
    return requestsMap
}
const makeApiRequest = async (arg) => {
    // console.log(`makeAPi tequest =-- `, arg)
    const output = await makeIOCall(arg)
    // console.log("API output ", output)
    return output
}