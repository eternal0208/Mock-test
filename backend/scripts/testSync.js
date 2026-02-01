const fetch = require('node-fetch');

async function testSync() {
    console.log("🚀 Testing Sync Endpoint...");
    try {
        const response = await fetch('http://localhost:5001/api/auth/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Test Sync User',
                email: 'testsync@demo.com',
                firebaseUid: 'test-sync-uid-12345',
                role: 'student'
            })
        });

        const data = await response.json();
        console.log("Response Status:", response.status);
        console.log("Response Data:", data);

        if (response.status === 200 || response.status === 201) {
            console.log("✅ Sync Test Passed!");
        } else {
            console.error("❌ Sync Test Failed!");
        }
    } catch (error) {
        console.error("🔥 Network/Server Error:", error.message);
    }
}

testSync();
