// Firebase Firestore Model Definition for 'tests' collection
// Note: Firestore is schema-less, but this class documents the expected structure.

class Test {
    constructor(data) {
        this.title = data.title; // String
        this.duration_minutes = Number(data.duration_minutes); // Number
        this.total_marks = Number(data.total_marks) || 0; // Number
        this.subject = data.subject; // String
        this.category = data.category || 'JEE Main'; // 'JEE Main' | 'JEE Advanced' | 'NEET'
        this.difficulty = data.difficulty || 'medium'; // 'easy' | 'medium' | 'hard'
        this.isVisible = data.isVisible !== undefined ? data.isVisible : true; // Visibility Toggle

        // New Fields for granular categorization
        this.accessType = data.accessType || 'free'; // 'free' | 'paid'
        this.format = data.format || 'full-mock'; // 'full-mock' | 'chapter-wise' | 'part-test'
        this.chapters = data.chapters || []; // Array of strings (e.g., ['Kinematics', 'Laws of Motion']) - relevant for chapter-wise

        this.instructions = data.instructions || '1. All questions are compulsory.\n2. +4 for correct, -1 for wrong answer (MCQ).\n3. 0 Marks for unattempted.';

        this.startTime = data.startTime || null; // ISO String for Live Test Start
        this.endTime = data.endTime || null; // ISO String for Live Test End

        this.endTime = data.endTime || null; // ISO String for Live Test End

        this.maxAttempts = data.maxAttempts !== undefined ? Number(data.maxAttempts) : null; // null/0 = Unlimited, 1 = One Time

        // Solution Controls
        this.solutionPdf = data.solutionPdf || '';
        this.solutionVisibility = data.solutionVisibility || 'immediate'; // 'immediate' | 'scheduled'
        this.resultDeclarationTime = data.resultDeclarationTime || null; // ISO String (if scheduled)


        // Questions Array
        this.questions = (data.questions || []).map(q => ({
            _id: q._id, // Keep ID if provided (critical for editing/scoring)
            text: q.text || '', // Text can be empty if image is there
            image: q.image || '', // Question Image URL
            type: q.type || 'mcq', // 'mcq' | 'msq' | 'integer'
            options: q.options || [], // Array of option strings (for text)
            optionImages: q.optionImages || [], // Array of option image URLs (corresponding indices)
            correctOption: q.correctOption, // For MCQ/Integer (Auto-check)
            correctOptions: q.correctOptions || [], // For MSQ (Array of correct strings)
            integerAnswer: q.integerAnswer, // For Integer Type (Number or String)
            marks: Number(q.marks) || 4,
            negativeMarks: Number(q.negativeMarks) || 1,
            subject: q.subject,
            topic: q.topic || '',
            solution: q.solution || '', // Explanation Text
            solutionImage: q.solutionImage || '' // Explanation Image
        }));

        this.createdBy = data.createdBy || 'admin';
        this.createdAt = data.createdAt || new Date().toISOString();
    }

    // Helper to Convert to Plain Object for Firestore
    toFirestore() {
        return {
            title: this.title,
            duration_minutes: this.duration_minutes,
            total_marks: this.total_marks,
            subject: this.subject,
            category: this.category,
            difficulty: this.difficulty,
            isVisible: this.isVisible,
            accessType: this.accessType,
            format: this.format,
            chapters: this.chapters,
            instructions: this.instructions,
            startTime: this.startTime,
            endTime: this.endTime,
            maxAttempts: this.maxAttempts,
            solutionPdf: this.solutionPdf,
            solutionVisibility: this.solutionVisibility,
            resultDeclarationTime: this.resultDeclarationTime,
            questions: this.questions,
            createdBy: this.createdBy,
            createdAt: this.createdAt
        };
    }
}

module.exports = Test;
