import {
    Worker,
    isMainThread,
    parentPort,
    workerData,
} from 'worker_threads'

// const makeIOCall = async () => {
//     return fetch('https://jsonplaceholder.typicode.com/todos/1')
//         .then(response => response.json())
//         .then(json => console.log(json))
// }

if (isMainThread) {
    module.exports = (data) =>
        new Promise((resolve, reject) => {
            const worker = new Worker(__filename, {
                workerData: data,
            });
            worker.on('message', resolve);
            worker.on('error', reject);
            worker.on('exit', (code) => {
                if (code !== 0) {
                    reject(new Error(`Worker stopped with exit code ${code}`));
                }
            });
        });
} else {
    const result = makeIOCall(workerData);
    parentPort.postMessage(result);
    process.exit(0);
}