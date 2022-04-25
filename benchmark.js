import wrk from 'wrk';

let conns = 1;
const results = [];

function benchmark() {
    if (conns === 100) {
        return console.log(results);
    }
    conns++;
    wrk({
        threads: 10,
        connections: conns,
        duration: '100s',
        printLatency: true,
        headers: {},
        url: 'http://localhost:3000/api/benchmark/7'
    }, function(err, out) {
        console.log(`errr `, err, ` outtt `, out)
        results.push(out);
        benchmark();
    });
}
benchmark();