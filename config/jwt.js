require('dotenv').config();

module.exports = {
    secret: process.env.JWT_KEY,
    expiresIn: '2d'
}