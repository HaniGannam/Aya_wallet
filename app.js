var createError = require('http-errors');
var compression = require('compression');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const cors = require('cors');
var app = express();
app.use(compression());
var indexRouter = require('./config/index');
const {
  createRoutes,
  createRoutesNoAuth
} = require("./routes/app.routes");
const auth = require('./middleware/auth');
require('dotenv').config();
var mongoose = require('mongoose');




global.__basedir = __dirname;
app.set('view engine', 'pug');
app.set('trust proxy', true);
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({
  extended: true
}));
app.use(cookieParser());
app.use('/uploads', express.static(path.resolve(__dirname, 'uploads')));
const config = require('./config/database.js');
const uri = `mongodb://${config.user}:${encodeURIComponent(config.password)}@${config.host}/${config.database}`;
mongoose.connect(uri, {}).then(() => {
  console.log('Mongodb connected...');
}).catch(err => {
  console.log(err)
})

app.use(cors({
  origin: "*",
  exposedHeaders: ['X-Current-Dir', 'X-Hostname'],
}))

app.use('/', indexRouter);
createRoutesNoAuth(app);
app.use(auth);
createRoutes(app);

app.use(function (req, res, next) {
  next(createError(404));
});

app.use(function (err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.render('error', {
    title: 'error'
  });
});

module.exports = app;