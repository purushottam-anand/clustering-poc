import express from 'express';
import * as PubSub from '../../Desktop/pubsub.js/dist/index.js';
import * as http from "http";

const debug = true;
const remote = true
const port = 8888
const offset = 0

const app = express();
const server = http.createServer(app);
const pubsub = new PubSub.Master('master-server-0', {debug, remote});

pubsub.listen(server, port, port + offset, () => {
    console.log(`Listening on ${port} and ${port + offset}`);
});

const {Slave} = pubsub;

Slave.on('connect', origin => {
    console.log('Connected', origin);
});

Slave.on('cat', (origin, respond) => {
    respond('dog');
});