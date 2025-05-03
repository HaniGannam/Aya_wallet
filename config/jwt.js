const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

module.exports = { 
    secret: process.env.JWT_SECRET,
    // secret_client: process.env.JWT_SECRET_CLIENT,
    ttl: '10h'
}