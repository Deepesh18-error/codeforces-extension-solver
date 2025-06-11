// In the future, we could get this from a .env variable

// const allowedOrigins = ['chrome-extension://YOUR_REAL_ID_HERE'];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || origin.startsWith('chrome-extension://')) {
      callback(null, true);
    } else {

      callback(new Error('This origin is not allowed by CORS'));
      
    }
  },
  optionsSuccessStatus: 200 
};

module.exports = corsOptions;