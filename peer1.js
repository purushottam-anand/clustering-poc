// connect to master
const master = 'master-server-0'; // master name
const address = {port: 3000, protocol: 'http', hostname: '0.0.0.0'}; // master address
const ps = new PubSub.Slave('my-name', address, {remote, master});

ps.connect();

const {Master} = ps;

ps.on('connect', async () => {
    const res = await Master.emit('cat');
    console.log(res); // 'dog'
});



const {Peer} = ps;

ps.on('connect', async () => {
    const res = await Peer.emit('add', [5, 4]);
    console.log(res); // 9
});