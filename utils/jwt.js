const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');

exports.verifyToken = (token) => jwt.verify(token, jwtConfig.secret);
// exports.verifyTokenAdmin = (token) => jwt.verify(token, jwtConfig.secret_client);


exports.createToken = (data) => jwt.sign(data, jwtConfig.secret, { expiresIn: jwtConfig.ttl });
// exports.createTokenAdmin = (data) => jwt.sign(data, jwtConfig.secret_client, { expiresIn: jwtConfig.ttl });
