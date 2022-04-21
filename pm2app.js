import express from 'express'
import bodyParser from 'body-parser';
import cors from 'cors';
import {config} from "./config.js";
import {makeIOCall} from "./util.js";
import EventEmitter from 'events';

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
    console.log(`api called with n = `, req.params.n, " received at workerId - ", new Date().toISOString())
    let requestId = req.params.n + Date.now()
    let result = 123
    const msg = {
        msgType: 'processIO',
        msg: {
            msgType: 'callIO',
            data: { arg: req.params.n, workerId: '100' },
            requestId,
            arg: { n: req.params.n }
        }
    }
    myEmitter.emit('PROCESS_REQUEST', msg)
    const eventName = `REQUEST_PROCESSED_${requestId}`
    myEmitter.on(eventName, function(msg) {
        console.log(`mmmsssggg`, msg)
        res.json({returnedVal: msg})
    })
})

myEmitter.on('PROCESS_REQUEST', function(msg) {
    queue.push(msg)
    setInterval(
        async function () {
            let tempQueue = queue
            queue = []
            if (tempQueue.length > 0) {
                await batchAndSendResponse(tempQueue);
                tempQueue = []
            }
        },
        config.batchingInterval
    )
})

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
            const eventName = `REQUEST_PROCESSED_${returnMessage.requestId}`
            myEmitter.emit(eventName, {
                msgType: 'IO_PROCESSED',
                value: apiResponse,
                requestId: returnMessage.requestId,
                newMsgType: '',
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

app.listen(port, () => console.log(`Hello world app listening on port ${port}!`));