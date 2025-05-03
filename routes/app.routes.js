
const news = require('./news/news.router');
const news_noauth = require('./news/news_noauth.router');




function createRoutes(app) {
    app.use('/api',news);
}

function createRoutesNoAuth(app) {
    app.use('/api/noAuth',news_noauth)
}

module.exports = {
    createRoutes: createRoutes,
    createRoutesNoAuth: createRoutesNoAuth
}