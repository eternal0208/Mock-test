// Firebase Firestore Model Definition for 'testSeries' collection

class TestSeries {
    constructor(data) {
        this.title = data.title; // String
        this.description = data.description || ''; // String
        this.price = Number(data.price) || 0; // Number (0 for free)
        this.currency = data.currency || 'INR'; // String
        this.category = data.category || 'JEE Main'; // 'JEE Main', 'NEET', 'CAT'
        this.features = data.features || []; // Array of Strings (e.g., ["10 Full Mocks", "Video Solutions"])
        this.image = data.image || ''; // URL to cover image
        this.isActive = typeof data.isActive === 'boolean' ? data.isActive : true; // Boolean

        this.testIds = data.testIds || []; // Array of Strings (Test IDs included in this series)

        this.createdAt = data.createdAt || new Date().toISOString();
        this.updatedAt = new Date().toISOString();
    }

    // Helper to Convert to Plain Object for Firestore
    toFirestore() {
        return {
            title: this.title,
            description: this.description,
            price: this.price,
            currency: this.currency,
            category: this.category,
            features: this.features,
            image: this.image,
            isActive: this.isActive,
            testIds: this.testIds,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }
}

module.exports = TestSeries;
