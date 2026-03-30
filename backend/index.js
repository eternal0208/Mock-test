// Admin Dashboard Updated: 2026-02-16 19:04
const express = require('express');
const cluster = require('cluster');
const os = require('os');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

dotenv.config({ override: true });

const app = express();

// 1. Edge Authority Handshake
// CORS is now managed by the Vercel Gateway (vercel.json) for 
// absolute cross-platform reliability and zero handoff latency.

// 2. Global Safety & Logging
app.use(helmet({ 
    crossOriginResourcePolicy: false, 
    crossOriginOpenerPolicy: false,
    contentSecurityPolicy: false
}));
app.use(morgan('dev'));

// 3. Parser Logic
app.use(express.json({ limit: '200mb' }));
app.use(express.urlencoded({ limit: '200mb', extended: true }));

// Routes
const authRoutes = require('./routes/authRoutes');
const testRoutes = require('./routes/testRoutes');
const resultRoutes = require('./routes/resultRoutes');
const adminRoutes = require('./routes/adminRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const purchaseRoutes = require('./routes/purchaseRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/tests', testRoutes);
app.use('/api/results', resultRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/payment', paymentRoutes);  // alias — frontend coupon APIs use singular form
app.use('/api/purchases', purchaseRoutes);



app.get('/', (req, res) => {
    res.send(`Mock Test Platform API is running on ${process.env.VERCEL ? 'Vercel' : 'Worker ' + process.pid}`);
});

// Vercel Serverless Export
if (process.env.VERCEL) {
    module.exports = app;
} else {
    // Local / Dedicated Server Setup with Cluster
    const numCPUs = os.cpus().length;

    if (cluster.isPrimary) {
        console.log(`Primary ${process.pid} is running`);
        console.log(`Forking ${numCPUs} workers...`);

        for (let i = 0; i < numCPUs; i++) {
            cluster.fork();
        }

        cluster.on('exit', (worker, code, signal) => {
            console.log(`worker ${worker.process.pid} died. Restarting...`);
            cluster.fork();
        });
    } else {
        const PORT = process.env.PORT || 5001;
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`Worker ${process.pid} started on port ${PORT} (0.0.0.0)`);
        });
    }
}
