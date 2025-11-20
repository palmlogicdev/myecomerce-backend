require('dotenv').config();
const jwt = require('jsonwebtoken');
const db = require('../config/firebase.js');
const crypto = require('crypto');

async function verifyToken (req, res, next) {
    // const authHeader = req.headers.authorization;

    // if (!authHeader || !authHeader.startsWith('Bearer ')) {
    //     return res.status(401).json({
    //         success: false,
    //         errorMessage: "No token provided",
    //         report: 'tokenIssue'
    //     });
    // }
    // const token = authHeader.split(' ')[1];
    const token = req.cookies.token;
    const secret = process.env.JWT_KEY;

    console.log("req.token : ", token);

    try {
        const tokenHash = crypto.createHash('sha256').update(token, 'utf8').digest('hex');

        const blacklistRef = db.collection('blacklist_token').doc(tokenHash);
        const blacklist = await blacklistRef.get();
        console.log('blacklist data', blacklist.data());
        console.log('blacklist: ', blacklist.exists);
        if (blacklist.exists) {
            return res.status(401).json({ errorMessage: "Token has been revoke" });
        }

        const decoded = jwt.verify(token, secret);
        console.log(decoded);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            errorMessage: "Invalid Token"
        });
   }
}

module.exports = verifyToken;