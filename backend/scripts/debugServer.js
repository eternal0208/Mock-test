const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Load env before anything else
dotenv.config();

// Attempt to load the controller to see if it crashes on require
console.log("👉 Loading Auth Controller...");
try {
    const authController = require('../controllers/authController');
    console.log("✅ Auth Controller Loaded");
} catch (err) {
    console.error("🔥 Crash loading Auth Controller:", err);
    process.exit(1);
}

const app = express();
app.use(express.json());
app.use(cors());

// Mount routes
app.use('/api/auth', require('../routes/authRoutes'));

const PORT = 5001; // Use different port
app.listen(PORT, () => {
    console.log(`Debug Server running on port ${PORT}`);
});
