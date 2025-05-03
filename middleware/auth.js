const jwt = require('../utils/jwt');
const cache = require('../utils/cache');


module.exports = async (req, res, next) => {

    if (['/api/user/sign_in'].includes(req.originalUrl)) {
        return next();
    }
    if (['/api/user/sign_up'].includes(req.originalUrl)) {
        return next();
    }
    if (['/api/client/creatClient'].includes(req.originalUrl)) {
        return next();  
    }
    if (['/api/client/login'].includes(req.originalUrl)) {
        return next();  
    }
    let token = req.headers.authorization;
    if (token && token.startsWith('Bearer ')) {
        token = token.slice(7, token.length);
    }
    if (token) {
        try {
            token = token.trim();
            const isBlackListed = await cache.get(token);
            if (isBlackListed) {
                return res.status(401).json({ response: 'failed', message: 'Unauthorized' });
            }
            const decoded = await jwt.verifyToken(token);

            req.user = decoded;
            req.userId = decoded.id;
            req.token = token;
            req.role = decoded.role
            next();
        } catch (error) {
            console.log(error)
            return res.status(401).json({ response: 'failed', message: 'Unauthorized' });
        }
    } else {
        return res.status(400).json({ response: 'failed', message: 'Authorization header is missing.' })
    }
}

