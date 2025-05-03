const mongoose = require('mongoose');

const cryptoSymbolSchema = new mongoose.Schema({
  symbol: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
}, {
  timestamps: true
});

const CryptoSymbol = mongoose.model('CryptoSymbol', cryptoSymbolSchema);

module.exports = CryptoSymbol;