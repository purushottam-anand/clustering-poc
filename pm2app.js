import express from 'express'
import bodyParser from 'body-parser';
import cors from 'cors';
import {config} from "./config.js";
import {makeIOCall} from "./util.js";
import EventEmitter from 'events';
import DataLoader from 'dataloader'

const userLoader = new DataLoader(keys => myBatchGetUsers(keys))

class MyEmitter extends EventEmitter {}

const myEmitter = new MyEmitter();
let queue = []
const app = express();
const port = 3000;

app.use(cors());

// Configuring body parser middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.get("/api/benchmark/:n", async function (req, res) {
    const requestId = parseInt(req.params.n) + Date.now() + Math.random()%1000000
    // console.log(`api called with nnn = `, req.params.n, " received at requestId - ", requestId, " ", new Date().toISOString())
    // const msg = {
    //     msgType: 'processIO',
    //     msg: {
    //         msgType: 'callIO',
    //         data: { arg: req.params.n, workerId: '100' },
    //         requestId,
    //         arg: { n: req.params.n }
    //     }
    // }
    const result = await makeApiRequest(req.params.n)
    res.json({output: result})
})

// myEmitter.on('PROCESS_REQUEST', function(msg) {
//     queue.push(msg)
//     setInterval(
//         async function () {
//             let tempQueue = queue
//             queue = []
//             if (tempQueue.length > 0) {
//                 await batchAndSendResponse(tempQueue);
//                 tempQueue = []
//             }
//         },
//         config.batchingInterval
//     )
// })

// const batchAndSendResponse = async (requestsQueue) => {
//     console.log(`batchAndSendResponse called --- `, new Date().toISOString(), requestsQueue.length, requestsQueue)
//     const batchedRequests = getBatchedRequests(requestsQueue)
//     const promiseArray = []
//     const batchedReqKeys = Object.keys(batchedRequests)
//     for (let key of batchedReqKeys) {
//         promiseArray.push(makeApiRequest(key)) // TODO: fix this to be arg from any object
//     }
//     const apiResponses = await Promise.all(promiseArray)
//     let i = 0;
//     for(let key of batchedReqKeys) {
//         const apiResponse = apiResponses[i]
//         i++;
//         const relevantRequests = batchedRequests[key]
//         for (let relevantRequest of relevantRequests) {
//             const returnMessage = relevantRequest.request.msg
//             const eventName = `REQUEST_PROCESSED_${returnMessage.requestId}`
//             myEmitter.emit(eventName, {
//                 msgType: 'IO_PROCESSED',
//                 value: apiResponse,
//                 requestId: returnMessage.requestId,
//                 newMsgType: '',
//                 workerId: returnMessage.data.workerId,
//             })
//         }
//     }
// }

// const getBatchedRequests = (requestsQueue) => {
//     const requestsMap = {}
//     for (let request of requestsQueue) {
//         if (requestsMap[request.msg.arg.n]) {
//             requestsMap[request.msg.arg.n].push({arg: request.msg.arg.n, request})
//         } else {
//             requestsMap[request.msg.arg.n] = [{arg: request.msg.arg.n, request}]
//         }
//     }
//     return requestsMap
// }

const makeApiRequest = async (arg) => {
    const output = await makeIOCall(arg)
    // console.log("API output ", output)
    return output
}

app.listen(port, () => console.log(`Hello world app listening on port ${port}!`));