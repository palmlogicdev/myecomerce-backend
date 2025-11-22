const logger = require('../config/winston.js');

const requrestLogger = (req, res, next) => {

    const cleanBody = { ...req.body };

    if (cleanBody.password) cleanBody.password = "***hidden***"
    // if (cleanBody.cpassword) cleanBody.cpassword = "***hidden***"

    const requestLog = {
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        body: cleanBody
    }

    const child = logger.child(requestLog);
    req.log = child;

    child.info('Request info');

    next();
}

module.exports = requrestLogger;