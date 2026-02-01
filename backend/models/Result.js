// Firebase Firestore Model Definition for 'results' collection

class Result {
    constructor(data) {
        this.userId = data.userId; // String (Firebase UID)
        this.testId = data.testId; // String (Firestore Document ID)
        this.score = Number(data.score); // Number
        this.accuracy = Number(data.accuracy); // Number
        this.totalQuestions = Number(data.totalQuestions); // Number
        this.correctAnswers = Number(data.correctAnswers); // Number
        this.correctAnswers = Number(data.correctAnswers); // Number
        this.wrongAnswers = Number(data.wrongAnswers); // Number
        this.feedback = data.feedback || null; // { rating: Number, comment: String }

        // Attempt Data Array
        this.attempt_data = (data.attempt_data || []).map(a => ({
            questionId: a.questionId,
            questionText: a.questionText || '',
            subject: a.subject,
            topic: a.topic,
            selectedOption: a.selectedOption,
            isCorrect: Boolean(a.isCorrect)
        }));

        this.time_taken = Number(data.time_taken) || 0; // Number (seconds)
        this.submittedAt = data.submittedAt || new Date().toISOString();
    }

    // Helper to Convert to Plain Object for Firestore
    toFirestore() {
        return {
            userId: this.userId,
            testId: this.testId,
            score: this.score,
            accuracy: this.accuracy,
            totalQuestions: this.totalQuestions,
            correctAnswers: this.correctAnswers,
            wrongAnswers: this.wrongAnswers,
            feedback: this.feedback,
            attempt_data: this.attempt_data,
            time_taken: this.time_taken,
            submittedAt: this.submittedAt
        };
    }
}

module.exports = Result;
