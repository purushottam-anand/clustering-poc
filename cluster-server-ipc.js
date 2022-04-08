// tslint:disable:no-console

'use strict'
import {printFn} from './util'

const cluster = require('cluster')
const numCPUs = require('os').cpus().length
if (cluster.isMaster) {
    console.log(`master process called`)
    // tslint:disable-next-line:no-console
    console.log('Master process is running with pid:', process.pid)
    const clusterMap = {}
    let count = 0 // Used to avoid infinite loop
    for (let i = 0; i < numCPUs; ++i) {
        const customId = i + 100
        const worker = cluster.fork({ workerId: customId })
        clusterMap[worker.id] = customId
        worker.send({ msg: 'Hello from Master' })
        worker.on('message', msg => {
            // tslint:disable-next-line:no-console
            console.log('Message from worker:', clusterMap[worker.id], msg)
            if (clusterMap[worker.id] === 101 && !count++) {
                // Message from master for worker 101 to do specific task with taskArg
                // const taskArg = { params: { name: 'xyz' }, task: 'email' } // dummy arg
                const taskArg = { params: { prnt: 'print arg' }, task: function printFn } // dummy arg
                worker.send(taskArg)
            } else {
                switch (msg.msgType) {
                    case 'EMAIL':
                        // tslint:disable-next-line:no-console
                        console.log('Action to perform is EMAIL')
                        // Code to send email
                        break
                    default:
                        // default action
                        break
                }
            }
        })
    }
} else {
    // tslint:disable:no-console
    console.log(`worker process called`)
    console.log(
        'Worker started with pid:',
        process.pid,
        'and id:',
        process.env.workerId
    )
    process.on('message', msg => {
        // tslint:disable-next-line:no-console
        const PID = 101
        if (process.env.workerId === PID.toString() && msg.params) {
            const abc = printFn(msg.params.prnt)
            process.send({
                msgType: 'makeApiRequest',
                msg: abc
            })
        }

        console.log('Message from master for processId:', process.pid, ' ', msg)
        process.send({
            msgType: 'EMAIL',
            msg: 'Hello from worker'
        })
    })
}