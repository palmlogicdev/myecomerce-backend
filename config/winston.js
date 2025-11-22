const winston = require('winston');
const { combine, timestamp, json, prettyPrint, errors, cli, printf } = winston.format;

const debugFormat = combine(
    cli(),
    printf(({ level, message }) => {
        return `[${level}] ${message}`
    })
);

const normalFormat = combine(
    timestamp(),
    json(),
    prettyPrint()
);

const levelFormat = winston.format((info) => {
    if (['error', 'debug', 'warn'].includes(info.level)) {
        return debugFormat.transform(info);
    } else {
        return normalFormat.transform(info);
    }
});

const logger = winston.createLogger({
    level: 'debug',
    format: levelFormat(),
    transports: [
        new winston.transports.Console(),
    ]
});

module.exports = logger;