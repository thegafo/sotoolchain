
const bitcoin = require('bitcoinjs-lib');
const coinselect = require('coinselect');
const SoChain = require('sochain');
const networks = require('./networks');


class ToolChain {

  constructor(network) { // network: LTC, LTCTEST, etc
    if (!(network in networks)) throw new Error(`Invalid network: ${network}`);
    this.network = networks[network];
    this.sochain = new SoChain(network);
  }

  /**
   * createAddress - create random  bitcoin address, public key, and private key
   *
   * @return {Object}  address data (fields: address, privKey, pubKey)
   */
  createAddress () {
    var keyPair = bitcoin.ECPair.makeRandom({network: this.network});
    var address = keyPair.getAddress();
    var privKey = keyPair.toWIF();
    var pubKey  = keyPair.getPublicKeyBuffer().toString('hex');
    return {
      address: address, privKey: privKey, pubKey: pubKey
    };
  }

  /**
   * inspect - inspect an address for UTXOs
   *
   * @param  {type} address description
   * @return {type}         description
   */
  inspect (address) {
    return new Promise(async (resolve,reject) => {
      var utxos = (await this.sochain.utxos(address)).txs;
      console.log();
      console.log(`UTXOs for ${address}`);
      var sum = 0;
      utxos.map((tx,i) => {
        var satoshis = Math.floor(tx.value*100000000)
        sum += satoshis;
        console.log(`\t${i+1}) ${tx.txid}[${tx.output_no}] ${tx.value} ${satoshis} (${tx.confirmations} confirmations)`)
        //console.log(tx.txid, tx.output_no, tx.value, tx.confirmations);
      })
      console.log(`\nBalance: ${sum} (${parseFloat(sum/100000000).toFixed(6)})`);
      console.log();
      resolve();
    });
  }

  /**
   * calculateFee - calculate fee by creating fake transaction hex and
   * calculating tx byte size * feeRate
   *
   * @param  {Integer} feeRate    satoshis/byte
   * @param  {Array} inputs       the inputs for transaction
   * @param  {Integer} numOutputs the number of outputs for transaction
   * @return {Promise}            resolves with estimated fee
   */
  calculateFee (feeRate, inputs, numOutputs) {
    return new Promise((resolve,reject) => {
      var address = this.createAddress(this.network);
      var keyPair = bitcoin.ECPair.fromWIF(address.privKey, this.network);
      var sum = 0;
      var txb = new bitcoin.TransactionBuilder(this.network);
      for (var [index,tx] of inputs.entries()) {
        sum += Math.floor(parseFloat(tx.value)*100000000);
        txb.addInput(tx.txid, tx.output_no);
      }
      for (var i=0; i<numOutputs; i++) {
        txb.addOutput(address.address, 1000000000); // fake amount
      }
      for (var [index,tx] of inputs.entries()) {
        txb.sign(index, keyPair);
      }
      var hex = txb.build().toHex();
      resolve(hex.length/2*feeRate); // num bytes is half of hex string length
    });
  }

  /**
   * drain - drain address funds to another address in one tx
   *
   * @param  {type} address   description
   * @param  {type} secret    description
   * @param  {type} recipient description
   * @return {type}           description
   */
  drain (address, secret, recipient, feeRate) {
    return new Promise(async (resolve,reject) => {
      var keyPair = bitcoin.ECPair.fromWIF(secret, this.network);
      var utxos = (await this.sochain.utxos(address)).txs;
      console.log(utxos);
      if (!utxos.length) return reject('No UTXOs');
      var sum = 0;
      var txb = new bitcoin.TransactionBuilder(this.network);
      for (var [index,tx] of utxos.entries()) {
        sum += Math.floor(parseFloat(tx.value)*100000000);
        txb.addInput(tx.txid, tx.output_no);
        console.log(`input ${tx.txid}[${tx.output_no}]`);
      }
      var fee = await this.calculateFee(feeRate || 10, utxos, 1);
      txb.addOutput(recipient, sum-fee);
      console.log(`output ${recipient} ${sum-fee}`);
      for (var [index,tx] of utxos.entries()) {
        txb.sign(index, keyPair);
      }
      var hex = txb.build().toHex();
      console.log(`fee is ${fee} (${parseFloat(fee/100000000).toFixed(4)})`);
      console.log(`sum is ${sum} (${parseFloat(sum/100000000).toFixed(4)})`);
      resolve(hex);
    });
  }

  /**
   * consolidate - consolidate all UTXOs into a single TX
   *
   * @param  {String} address the address to consolidate
   * @param  {String} secret  the secret key of the address to consolidate
   * @return {Promise}        resolves with transaction hex
   */
  consolidate (address, secret, feeRate) {
    return new Promise((resolve,reject) => {
      this.drain(address, secret, address, feeRate).then(resolve).catch(reject);
    })
  }

  /**
   * select - get optimal inputs and outputs for a target
   *  amount given a list of UTXOs
   *
   * utxos = [{txId: '', vout: '', value: ''}]
   *
   * @param  {Integer} feeRate network fee (satoshis per byte) i.e. 6
   * @param  {Array} utxos     the available unspent transaction outputs
   * @param  {Object} target   the target transaction output, i.e. {value: '', address: ''}
   * @return {Promise}         {inputs: [], outputs: [], fee: }
   */
  select  (feeRate, utxos, target, changeAddress)  {
    return new Promise((resolve,reject) => {
      var { inputs, outputs, fee } = coinselect(utxos, [target], feeRate);
      if (!inputs || !outputs) return reject(new Error('No solution found'));
      outputs = outputs.map(o => {
        if (!o.address) o.address = changeAddress; // change address
        return o;
      });
      resolve({inputs, outputs, fee});
    });
  }

  /**
   * send - description
   *
   * @param  {type} senderAddress    description
   * @param  {type} senderSecret     description
   * @param  {type} recipientAddress description
   * @param  {type} amount           description
   * @return {type}                  description
   */
  send (senderAddress, senderSecret, recipientAddress, amount) {
    return new Promise(async (resolve,reject) => {
      var satoshis = Math.floor(amount*100000000);
      var utxos = (await this.sochain.utxos(senderAddress)).txs;
      utxos = utxos.map(u => {
        u.value = Math.floor(parseFloat(u.value)*100000000);
        return u;
      })
      var txb = new bitcoin.TransactionBuilder(this.network);
      console.log();
      // make first selection, calculate fee, then substract fee from amount
      var selection = await this.select(20, utxos, {address: recipientAddress, value: satoshis}, senderAddress);
      for (var [index, tx] of selection.inputs.entries()) {
        txb.addInput(tx.txid, tx.output_no);
        console.log(`input ${tx.txid} ${tx.output_no}`);
      }
      for (var [index, o] of selection.outputs.entries()) {
        var value = o.value;
        //if (o.address == recipientAddress) value = value - selection.fee; // subtract tx fee
        txb.addOutput(o.address, value);
        console.log(`output ${o.address} ${value}`);
      }
      console.log(`fee: ${selection.fee}\n`);
      var keyPair = bitcoin.ECPair.fromWIF(senderSecret, this.network);
      for (var [index, tx] of selection.inputs.entries()) {
        txb.sign(index, keyPair);
      }
      var hex = txb.build().toHex();
      resolve(hex);
    });
  }


}

module.exports = ToolChain;
