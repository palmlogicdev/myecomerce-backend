require('dotenv').config();

const API_KEY = process.env.API_KEY;

const apiKeyVerify = (req, res, next) => {
    const xApiKey = req.headers['x-api-key'];

    if (API_KEY !== xApiKey) {
        res.status(403).json({
            success: false,
            message: "Fotbidden: Invalid API key"
        });
    }

    next();
}

module.exports = apiKeyVerify;