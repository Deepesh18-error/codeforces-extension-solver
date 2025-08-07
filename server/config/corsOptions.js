const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like Postman, server-to-server)
    // OR requests from any Chrome extension
    if (!origin || origin.startsWith('chrome-extension://')) {
      callback(null, true);
    } else {
      callback(new Error('This origin is not allowed by CORS'));
    }
  },
  optionsSuccessStatus: 200 // For legacy browser support
};

module.exports = corsOptions;