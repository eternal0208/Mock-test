const express = require('express');
const cluster = require('cluster');
const os = require('os');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

dotenv.config();

const app = express();

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000', process.env.FRONTEND_URL || '*'],
    credentials: true
}));
app.use(helmet());
app.use(morgan('dev'));

// Routes
const authRoutes = require('./routes/authRoutes');
const testRoutes = require('./routes/testRoutes');
const resultRoutes = require('./routes/resultRoutes');
const adminRoutes = require('./routes/adminRoutes');
const paymentRoutes = require('./routes/paymentRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/tests', testRoutes);
app.use('/api/results', resultRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/otp', require('./routes/otpRoutes'));


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
        app.listen(PORT, () => {
            console.log(`Worker ${process.pid} started on port ${PORT}`);
        });
    }
}
