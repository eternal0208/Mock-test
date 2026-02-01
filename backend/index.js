const express = require('express');
const cluster = require('cluster');
const os = require('os');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

dotenv.config();

const numCPUs = os.cpus().length;

if (cluster.isPrimary) {
    console.log(`Primary ${process.pid} is running`);
    console.log(`Forking ${numCPUs} workers for scalability...`);

    // Fork workers.
    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
    }

    cluster.on('exit', (worker, code, signal) => {
        console.log(`worker ${worker.process.pid} died. Restarting...`);
        cluster.fork();
    });
} else {
    // Worker sharing the TCP connection
    const app = express();

    // Middleware
    app.use(express.json({ limit: '50mb' })); // Increased limit for potential large payloads
    app.use(cors({
        origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
        credentials: true
    }));
    app.use(helmet());
    app.use(morgan('dev'));

    // Optimize for high concurrency - disable etag for dynamic APIs might save some CPU, 
    // but keep it for now for bandwidth saving on repeated requests.
    // app.set('etag', false); 

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

    app.get('/', (req, res) => {
        res.send(`Mock Test Platform API is running on worker ${process.pid}`);
    });

    const PORT = process.env.PORT || 5001;

    // Use a random delay for workers to start to avoid port collision if they were independent (not needed for cluster)
    // but just listening is enough.
    const server = app.listen(PORT, () => {
        console.log(`Worker ${process.pid} started`);
    });

    server.on('error', (err) => {
        console.error(`Worker ${process.pid} Server Error:`, err);
    });

    process.on('uncaughtException', (err) => {
        console.error(`Worker ${process.pid} Uncaught Exception:`, err);
        // In production, you might want to exit here, but let's keep it alive for now
    });

    process.on('unhandledRejection', (reason, promise) => {
        console.error(`Worker ${process.pid} Unhandled Rejection at:`, promise, 'reason:', reason);
    });
}
