const config = require('../config');

const isProduction = config.nodeEnv === 'production';

const logger = {
  log: (...args) => {
    if (!isProduction) {
      console.log(...args);
    }
  },
  info: (...args) => {
    if (!isProduction) {
      console.log(...args);
    }
  },
  warn: (...args) => {
    console.warn(...args);
  },
  error: (...args) => {
    console.error(...args);
  }
};

module.exports = logger;
