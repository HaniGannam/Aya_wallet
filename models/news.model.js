const mongoose = require('mongoose');

const newsSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
  },
  url: {
    type: String,
  },
  publishedAt: {
    type: Date,
  },
  source: {
    type: String,
  },
  content: {
    type: String,
  },
  blockchain: {
    type: [String],
    default: []
  },
}, {
  timestamps: true
});

const news = mongoose.model('news', newsSchema);

module.exports = news;