require('dotenv').config();
const jwt = require('jsonwebtoken');

function verifyToken (req, res, next) {
    const authHeader = req.headers.authorization;
    console.log(authHeader);

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            success: false,
            errorMessage: "No token provided"
        });
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_KEY;
    try {
        const decoded = jwt.verify(token, secret);
        req.user = decoded;
        next();
    } catch (error) {
        return res.json(401).json({
            success: false,
            errorMessage: "Invalid Token"
        });
   }
}

module.exports = verifyToken;