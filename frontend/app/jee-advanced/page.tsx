import Link from 'next/link';
import { Metadata } from 'next';
import ExamLandingPage from '@/components/ExamLandingPage';
import TestList from '@/components/Exam/TestList';

export const metadata: Metadata = {
    title: 'Apex Mock Test for JEE Advanced | IIT JEE Test Series',
    description: 'Crack IIT JEE with Apex Mock Test for JEE Advanced. Solve multi-correct, matrix match, and paragraph-based questions. Deep conceptual analysis for top ranks.',
};

export default function JeeAdvancedPage() {
    return (
        <ExamLandingPage
            title="JEE Advanced"
            description="The ultimate test of concepts. Prepare for IITs with deep, multi-concept problems and varied patterns."
            stats={{ users: "8k+", tests: "300+", avgScore: "Top 500 AIR" }}
            features={[
                "Multi-Correct & Matrix Match Types",
                "Deep Conceptual Physics & Chemistry",
                "Paragraph Based Questions",
                "Mock Tests with New Patters"
            ]}
            themeColor="rose"
        >
            <TestList category="JEE Advanced" />

            {/* SEO Content Section */}
            <div className="mt-20 prose prose-lg max-w-none text-slate-700">
                <h2 className="text-3xl font-bold text-rose-800 mb-6">Conquer IIT JEE with Apex Mock Test for Advanced</h2>
                <p className="mb-4">
                    JEE Advanced is widely regarded as one of the toughest engineering entrance exams globally. It doesn't just test your memory; it tests your ability to apply multiple concepts to solve a single problem. <strong>Apex Mock Test for JEE Advanced</strong> is specifically engineered to challenge your critical thinking and problem-solving abilities, preparing you for the rigors of the IIT entrance.
                </p>
                <p className="mb-8">
                    Our advanced test series goes beyond standard problems. We incorporate complex scenarios, interdisciplinary questions, and novel patterns that IITs are known for introducing.
                </p>

                <div className="grid md:grid-cols-2 gap-8 mb-12">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                        <h3 className="text-xl font-bold text-rose-700 mb-3">Diverse Question Patterns</h3>
                        <p>From Matrix-Match and Multi-Correct options to Integer Type and Paragraph-based questions, we ensure you are comfortable with every possible format.</p>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                        <h3 className="text-xl font-bold text-rose-700 mb-3">Conceptual Depth</h3>
                        <p>Our questions are not just hard; they are thoughtful. They probe your fundamental understanding of Physics, Chemistry, and Mathematics.</p>
                    </div>
                </div>

                <h2 className="text-2xl font-bold text-slate-900 mb-4">Strategic Preparation for a Top Rank</h2>
                <p className="mb-4">
                    Securing a seat in an IIT requires a smart strategy. You need to know which questions to pick and which to leave. Apex Mock Tests help you:
                </p>
                <ul className="list-disc pl-6 space-y-2 mb-8">
                    <li><strong>Develop Question Selection Skills:</strong> Learn to identify high-scoring low-effort questions.</li>
                    <li><strong>Handle Surprise Elements:</strong> Be ready for changes in marking schemes or question types.</li>
                    <li><strong>Manage 6 Hours of Testing:</strong> Build the stamina required for the two papers of JEE Advanced.</li>
                </ul>

                <h2 className="text-2xl font-bold text-slate-900 mb-4">Your Path to IIT Begins Here</h2>
                <p>
                    Don't settle for average. Push your limits with <strong>Apex Mock Test for JEE Advanced</strong>. Our platform simulates the pressure and complexity of the real exam, ensuring that when you step into the exam hall, you are ready to dominate. Join the league of top rankers today.
                </p>
            </div>
        </ExamLandingPage>
    );
}
