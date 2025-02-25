
const {BigBuffer} = require("pilcom");
const buildMerklehashGL = require("../src/merklehash_p.js");
const buildMerklehashBN128 = require("../src/merklehash_bn128_p.js");
const starkInfoGen = require("../src/starkinfo.js")

const { interpolate } = require("../src/fft_p");

module.exports = async function starkSetup(constPols, pil, starkStruct) {

    const nBits = starkStruct.nBits;
    const nBitsExt = starkStruct.nBitsExt;
    const nExt= 1 << nBitsExt;
    const constPolsArrayE = new BigBuffer(nExt*pil.nConstants);

    const constBuff  = constPols.writeToBuff();
    await interpolate(constBuff, pil.nConstants, nBits, constPolsArrayE, nBitsExt );

    let MH;
    if (starkStruct.verificationHashType == "GL") {
        MH = await buildMerklehashGL();
    } else if (starkStruct.verificationHashType == "BN128") {
        MH = await buildMerklehashBN128();
    } else {
        throw new Error("Invalid Hash Type: "+ starkStruct.verificationHashType);
    }

    const constTree = await MH.merkelize(constPolsArrayE, pil.nConstants, nExt);

    return {
        constTree: constTree,
        constRoot: MH.root(constTree),
        starkInfo: starkInfoGen(pil, starkStruct)
    }
}
