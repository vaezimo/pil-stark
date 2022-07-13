const chai = require("chai");
const assert = chai.assert;
const F1Field = require("../src/f3g");
const path = require("path");
const starkInfoGen = require("../src/starkinfo.js");
const { starkGen } = require("../src/stark_gen.js");
const starkVerify = require("../src/stark_verify.js");
const buildPoseidonGL = require("../src/poseidon");
const buildPoseidonBN128 = require("circomlibjs").buildPoseidon;


const { newConstantPolsArray, newCommitPolsArray, compile, verifyPil } = require("pilcom");


const smFibonacci = require("./sm_fibonacci/sm_fibonacci.js");

const MerkleHashGL = require("../src/merklehash_p.js");
const MerkleHashBN128 = require("../src/merklehash.bn128.js");

const { interpolate } = require("../src/fft_p");



describe("test fibonacci sm", async function () {
    this.timeout(10000000);

    it("It should create the pols main", async () => {
        const starkStruct = {
            nBits: 10,
            nBitsExt: 11,
            nQueries: 8,
            verificationHashType : "GL",
            steps: [
                {nBits: 11},
                {nBits: 3}
            ]
        };

        const Fr = new F1Field("0xFFFFFFFF00000001");
        const pil = await compile(Fr, path.join(__dirname, "sm_fibonacci", "fibonacci_main.pil"));
        const constPols =  newConstantPolsArray(pil);

        await smFibonacci.buildConstants(constPols.Fibonacci);

        const starkInfo = starkInfoGen(pil, starkStruct);
        const cmPols = newCommitPolsArray(pil);

        const result = await smFibonacci.execute(cmPols.Fibonacci, [1,2]);
        console.log("Result: " + result);

        const res = await verifyPil(Fr, pil, cmPols , constPols);

        if (res.length != 0) {
            console.log("Pil does not pass");
            for (let i=0; i<res.length; i++) {
                console.log(res[i]);
            }
            assert(0);
        }

        const nBits = starkStruct.nBits;
        const nBitsExt = starkStruct.nBitsExt;
        const nExt= 1 << nBitsExt;
        const constPolsArrayEbuff = new SharedArrayBuffer(nExt*pil.nConstants*8);
        const constPolsArrayE = new BigUint64Array(constPolsArrayEbuff);

        const constBuff  = constPols.writeToBuff();
        await interpolate(constBuff, 0, pil.nConstants, nBits, constPolsArrayE, 0, nBitsExt );

        let MH;
        if (starkStruct.verificationHashType == "GL") {
            const poseidonGL = await buildPoseidonGL();
            MH = new MerkleHashGL(poseidonGL);
        } else if (starkStruct.verificationHashType == "BN128") {
            const poseidonBN128 = await buildPoseidonBN128();
            MH = new MerkleHashBN128(poseidonBN128);
        } else {
            throw new Error("Invalid Hash Type: "+ starkStruct.verificationHashType);
        }

        const constTree = await MH.merkelize(constPolsArrayE, 0, pil.nConstants, nExt);

        const resP = await starkGen(cmPols, constPols, constTree, pil, starkInfo);

        const resV = await starkVerify(resP.proof, resP.publics, pil, MH.root(constTree), starkStruct);

        assert(resV==true);
    });

});
