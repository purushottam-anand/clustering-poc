import express from 'express'
import {benchmarkFunction} from './util.js';
const app = express();
const port = 3000;

app.get("/", (req, res) => {
    res.send("Hello World!");
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
    const arrival = Date.now()
    let n = parseInt(req.params.n);
    while (n--) {
        await benchmarkFunction()
    }
    const departure = Date.now()
    return departure
});


app.listen(port, () => {
    console.log(`App listening on port ${port}`);
});