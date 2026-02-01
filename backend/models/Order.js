// Firebase Firestore Model Definition for 'orders' collection

class Order {
    constructor(data) {
        this.userId = data.userId; // String (Firebase UID)
        this.seriesId = data.seriesId; // String (TestSeries ID)
        this.amount = Number(data.amount); // Number
        this.currency = data.currency || 'INR'; // String

        this.razorpayOrderId = data.razorpayOrderId; // String (from Razorpay)
        this.paymentId = data.paymentId || null; // String (after successful payment)
        this.status = data.status || 'created'; // 'created', 'paid', 'failed'

        this.createdAt = data.createdAt || new Date().toISOString();
        this.updatedAt = new Date().toISOString();
    }

    // Helper to Convert to Plain Object for Firestore
    toFirestore() {
        return {
            userId: this.userId,
            seriesId: this.seriesId,
            amount: this.amount,
            currency: this.currency,
            razorpayOrderId: this.razorpayOrderId,
            paymentId: this.paymentId,
            status: this.status,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }
}

module.exports = Order;
