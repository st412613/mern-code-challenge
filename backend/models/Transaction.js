const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  id: String,
  title: String,
  description: String,
  price: Number,
  dateOfSale: Date,
  category: String,
  sold: Boolean,
  image: String,
});

module.exports = mongoose.model('Transaction', transactionSchema);
