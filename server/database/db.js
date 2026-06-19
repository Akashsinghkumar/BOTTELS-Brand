const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/aquaviora';
        // Mongoose v6+ enables new URL parser and unified topology by default.
        // Pass a small set of options if needed (e.g., serverSelectionTimeoutMS for quicker failures).
        await mongoose.connect(mongoURI, {
            serverSelectionTimeoutMS: 5000
        });
        console.log(`MongoDB Connected: ${mongoose.connection.host}`);
    } catch (err) {
        console.error('MongoDB Connection Error:', err.message);
        // We don't exit process here so the server can still run without DB for frontend demo purposes if needed,
        // but for production it's critical.
    }
};

module.exports = connectDB;
