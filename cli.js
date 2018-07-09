

var ask = require('./ask');
var Toolchain = require('./toolchain');
var toolchain = null;

var loop = async () => {
  if (!toolchain) {
    var network = await ask('network:');
    try {
      toolchain = new Toolchain(network);
    } catch (err) {
      console.log(err.message);
      process.exit();
    }
  }
  var command = await ask('>>>');
  try {
    switch(command) {
      case 'create':
        console.log(await toolchain.createAddress());
        break;
      case 'lookupt':
        console.log(await toolchain.sochain.tx(await ask('txid:')));
        break;
      case 'lookupa':
      case 'inspect':
        await toolchain.inspect(await ask('address?'));
        break;
      case 'send':
        var hex = await toolchain.send(
          await ask('sender address:'),
          await ask('sender secret:'),
          await ask('recipient address:'),
          parseFloat(await ask('amount:'))
        );
        if ((await ask('broadcast?')).startsWith('y')) {
          console.log(await toolchain.sochain.broadcast(hex));
        } else {
          console.log(hex);
        }
        break;
      case 'drain':
        var hex = await toolchain.drain(
          await ask('draining address:'),
          await ask('draining secret:'),
          await ask('recipient address:'),
        );
        if ((await ask('broadcast?')).startsWith('y')) {
          console.log(await toolchain.sochain.broadcast(hex));
        } else {
          console.log(hex);
        }
        break;
      case 'consolidate':
        var hex = await toolchain.consolidate(
          await ask('address:'),
          await ask('secret:'),
        );
        if ((await ask('broadcast?')).startsWith('y')) {
          console.log(await toolchain.sochain.broadcast(hex));
        } else {
          console.log(hex);
        }
        break;
      case 'broadcast':
        console.log(await toolchain.sochain.broadcast(await ask('hex:')));
        break;
      case 'cl':
      case 'clear':
        process.stdout.write('\033c');
        break;
      case 'q':
      case 'quit':
        console.log('bye');
        process.exit();

      default:
        console.log('what?');
    }
  } catch(err) {
    console.log(err.message);
  }
  loop();
}

loop();
