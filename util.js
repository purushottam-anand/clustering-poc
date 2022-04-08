import * as ioOperationWorker from './io.js'

export const benchmarkFunction = async () => {
    const response = await ioOperationWorker({})
    const {m1, m2, mat1, n1, n2, mat2} = getParamsForMatrixMultiplication()
    return runCompute(m1, m2, mat1, n1, n2, mat2)
}

export const benchmarkFunctionWithoutWorker = async () => {
    const response = await makeIOCall()
    const {m1, m2, mat1, n1, n2, mat2} = getParamsForMatrixMultiplication()
    return runCompute(m1, m2, mat1, n1, n2, mat2)
}

const makeIOCall = async () => {
    return fetch('https://jsonplaceholder.typicode.com/todos/1')
        .then(response => response.json())
        .then(json => console.log(json))
}
const getParamsForMatrixMultiplication = () => {
    return {
        mat1: [ [ 2, 4 ], [ 3, 4 ] ],
        mat2: [ [ 1, 2 ], [ 1, 3 ] ],
        m1:2,
        m2:2,
        n1:2,
        n2:2
    }
}

const runCompute = async (m1, m2, mat1, n1, n2, mat2) => {
    let x, i, j;
    let res = new Array(m1);
    for (i = 0; i < m1; i++)
        res[i] = new Array(n2);

    for (i = 0; i < m1; i++)
    {
        for (j = 0; j < n2; j++)
        {
            res[i][j] = 0;
            for (x = 0; x < m2; x++)
            {
                res[i][j] += mat1[i][x] * mat2[x][j];
            }
        }
    }
    for (i = 0; i < m1; i++)
    {
        for (j = 0; j < n2; j++)
        {
            console.log(res[i][j] + " ");
        }
        console.log("<br>");
    }
}

export const printFn = (prnt = 'dummmy') => {
    const abc = 'Response ' + prnt
    console.log(`printFn printed`, abc)
    console.log('inside method ' + process.env.workerId)
    return {
        ret: 'retuned val ' + abc
    }
}