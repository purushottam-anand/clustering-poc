// connect to master
const PubSub = require('cluster-pubsub')
const master = 'master-server-0'; // master name
const address = {port: 3000, protocol: 'http', hostname: '0.0.0.0'}; // master address
const debug = true
const ps = new PubSub.Slave('my-name', address, {debug, master});

ps.connect();

const {Master} = ps;

ps.on('connect', async () => {
    const res = await Master.emit('cat');
    console.log(res); // 'dog'
});


const {Peer} = ps;

Peer.on('add', ([a, b]) => {
    respond(a + b);
});