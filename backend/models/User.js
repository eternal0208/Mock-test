// Firebase Firestore Model Definition for 'users' collection

class User {
    constructor(data) {
        this.name = data.name; // String
        this.email = data.email; // String
        this.phoneNumber = data.phoneNumber || ''; // String
        this.class = data.class || ''; // String (e.g., '11', '12', 'Dropper')
        this.firebaseUid = data.firebaseUid; // String
        this.role = data.role || 'student'; // 'student' | 'admin'
        this.status = data.status || 'active'; // 'active' | 'suspended'
        this.category = data.category || data.targetExam || ''; // Unified Field: 'JEE Main' | 'NEET', etc.
        this.purchasedTests = data.purchasedTests || []; // Array of Test IDs
        this.createdAt = data.createdAt || new Date().toISOString();
    }

    // Helper to Convert to Plain Object for Firestore
    toFirestore() {
        return {
            name: this.name,
            email: this.email,
            phoneNumber: this.phoneNumber,
            class: this.class,
            firebaseUid: this.firebaseUid,
            role: this.role,
            status: this.status,
            category: this.category,
            purchasedTests: this.purchasedTests,
            createdAt: this.createdAt
        };
    }
}

module.exports = User;
