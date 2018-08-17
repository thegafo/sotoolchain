

module.exports.LTC = {
  messagePrefix: '\x19Litecoin Signed Message:\n',
  bip32: {
    public: 0x019da462,
    private: 0x019d9cfe
  },
  pubKeyHash: 0x30,
  scriptHash: 0x32,
  wif: 0xb0
}

module.exports.LTCTEST = {
  messagePrefix: '\x19Litecoin Signed Message:\n',
  bip32: {
    public: 70711009,
    private: 70709117
  },
  pubKeyHash: 111,
  scriptHash: 58, //  for segwit (start with 2)
  wif: 239
}


module.exports.BTC = {
  messagePrefix: '\x18Bitcoin Signed Message:\n',
  bech32: 'bc',
  bip32: {
    public: 0x0488b21e,
    private: 0x0488ade4
  },
  pubKeyHash: 0x00,
  scriptHash: 0x05,
  wif: 0x80
}

module.exports.BTCTEST = {
  messagePrefix: '\x18Bitcoin Signed Message:\n',
  bech32: 'tb',
  bip32: {
    public: 0x043587cf,
    private: 0x04358394
  },
  pubKeyHash: 0x6f,
  scriptHash: 0xc4,
  wif: 0xef
}

module.exports.DOGE = {
  messagePrefix: '\x18Dogecoin Signed Message:\n',
  bip32: {
    public: 49990397,
    private: 49988504
  },
  pubKeyHash: 30,
  scriptHash: 22,
  wif: 158
}

module.exports.DOGETEST = {
  messagePrefix: '\x18Dogecoin Signed Message:\n',
  bip32: {
    public: 0x0432a9a8,
    private: 0x0432a243
  },
  pubKeyHash: 0x71,
  scriptHash: 0xc4,
  wif: 241,
  dustThreshold: 100000000,
}
