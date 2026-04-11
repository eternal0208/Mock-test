// Firebase Firestore Model Definition for 'institutes' collection

class Institute {
    constructor(data) {
        this.instituteCode = data.instituteCode; // String, Unique identifier (e.g. 'SCALER')
        this.name = data.name; // String (e.g. 'Scaler School')
        this.createdBy = data.createdBy || 'admin';
        this.createdAt = data.createdAt || new Date().toISOString();
        this.updatedAt = new Date().toISOString();
    }

    // Helper to Convert to Plain Object for Firestore
    toFirestore() {
        return {
            instituteCode: this.instituteCode,
            name: this.name,
            createdBy: this.createdBy,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }
}

module.exports = Institute;
