const F1Field = require("../../src/f3g");

module.exports.buildConstants = async function (pols) {

    const N = pols.L1.length;


    for ( let i=0; i<N; i++) {
        pols.L1[i] = (i == 0) ? 1n : 0n;
        pols.LLAST[i] = (i == N-1) ? 1n : 0n;
    }
}


module.exports.execute = async function (pols, input) {

    const N = pols.l1.length;

    const Fr = new F1Field("0xFFFFFFFF00000001");

    pols.l2[0] = BigInt(input[0]);
    pols.l1[0] = BigInt(input[1]);

    for (let i=1; i<N; i++) {
        pols.l2[i] =pols.l1[i-1];
        pols.l1[i] =Fr.add(Fr.square(pols.l2[i-1]), Fr.square(pols.l1[i-1]));
    }

    return pols.l1[N-1];
}