const http = require('http');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');

// CONFIGURATION
const API_URL = 'http://localhost:5001'; // Change to production URL for real test
const TEST_ID = '05lg0KMkvpNTSDU9wGxF';
const USER_ID = '4tnu9fJUqvSixhLE83QEVc8ECmn1';
const CONCURRENT_USERS = 50; // Total workers
const REQUESTS_PER_USER = 10; // Requests per worker
const TOTAL_EXPECTED = CONCURRENT_USERS * REQUESTS_PER_USER;

if (isMainThread) {
    console.log(`🚀 Starting load test...`);
    console.log(`Target: ${API_URL}/api/tests/${TEST_ID}/submit`);
    console.log(`Simulating ${CONCURRENT_USERS} concurrent users, ${REQUESTS_PER_USER} requests each.`);
    
    let completed = 0;
    let success = 0;
    let failure = 0;
    const startTime = Date.now();

    for (let i = 0; i < CONCURRENT_USERS; i++) {
        const worker = new Worker(__filename, {
            workerData: { index: i, apiUrl: API_URL, testId: TEST_ID, userId: USER_ID, count: REQUESTS_PER_USER }
        });

        worker.on('message', (msg) => {
            if (msg.type === 'done') {
                success += msg.success;
                failure += msg.failure;
                completed++;
                
                if (completed === CONCURRENT_USERS) {
                    const duration = (Date.now() - startTime) / 1000;
                    console.log('\n--- Load Test Results ---');
                    console.log(`Total Requests: ${TOTAL_EXPECTED}`);
                    console.log(`Successful: ${success}`);
                    console.log(`Failed: ${failure}`);
                    console.log(`Total Time: ${duration.toFixed(2)}s`);
                    console.log(`Requests Per Second: ${(TOTAL_EXPECTED / duration).toFixed(2)}`);
                    process.exit(0);
                }
            }
        });
    }
} else {
    const { apiUrl, testId, userId, count } = workerData;
    
    async function run() {
        let sc = 0;
        let fl = 0;
        
        for (let i = 0; i < count; i++) {
            const data = JSON.stringify({
                userId: userId,
                answers: [
                    { questionId: 'dummy_q1', selectedOption: 'A' },
                    { questionId: 'dummy_q2', selectedOption: 'B' }
                ]
            });

            const options = {
                hostname: 'localhost',
                port: 5001,
                path: `/api/tests-bench/${testId}/submit`,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': data.length
                }
            };

            const reqPromise = new Promise((resolve) => {
                const req = http.request(options, (res) => {
                    if (res.statusCode === 200) sc++;
                    else {
                        fl++;
                        let body = '';
                        res.on('data', chunk => body += chunk);
                        res.on('end', () => {
                            console.error(`FAILURE: ${res.statusCode} - ${body}`);
                        });
                    }
                    res.on('data', () => {}); // Consume data
                    res.on('end', resolve);
                });

                req.on('error', (e) => {
                    fl++;
                    resolve();
                });

                req.write(data);
                req.end();
            });

            await reqPromise;
        }
        
        parentPort.postMessage({ type: 'done', success: sc, failure: fl });
    }

    run();
}
