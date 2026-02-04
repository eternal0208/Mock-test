import React from 'react';
import { Metadata } from 'next';
import TestList from '@/components/Exam/TestList';
import ExamLandingPage from '@/components/ExamLandingPage';

export const metadata: Metadata = {
    title: 'Apex Mock Test for CAT | MBA Entrance Mock Tests',
    description: 'Ace CAT with Apex Mock Test Series. Practice DILR, VARC, and QA with unpredictable patterns. Percentile predictor and detailed analytics included.',
};

export default function CATPage() {
    return (
        <ExamLandingPage
            title="CAT"
            description="Master Data Interpretation, Logical Reasoning, and Quantitative Ability. Our mocks are designed to match the unpredictable nature of CAT."
            stats={{ users: "12k+", tests: "450+", avgScore: "99.5 %ile" }}
            features={[
                "Unpredictable Pattern Mocks",
                "Advanced DILR Sets",
                "VARC Logic & Inference Drills",
                "Percentile Predictor"
            ]}
            themeColor="purple"
        >
            <TestList category="CAT" />

            {/* SEO Content Section */}
            <div className="mt-20 prose prose-lg max-w-none text-slate-700">
                <h2 className="text-3xl font-bold text-purple-800 mb-6">Crack IIMs with Apex Mock Test for CAT</h2>
                <p className="mb-4">
                    The Common Admission Test (CAT) is known for its unpredictability and high difficulty level, especially in Data Interpretation and Logical Reasoning (DILR). To secure a seat in the prestigious IIMs, you need more than just mathematical skills; you need decision-making agility. <strong>Apex Mock Test for CAT</strong> is designed to test your mental stamina and strategic thinking under pressure.
                </p>
                <p className="mb-8">
                    Our mock tests closely mimic the evolving pattern of CAT. Whether it's the reading-heavy VARC section or the calculation-intensive QA, we provide a balanced yet challenging experience.
                </p>

                <div className="grid md:grid-cols-2 gap-8 mb-12">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                        <h3 className="text-xl font-bold text-purple-700 mb-3">DILR Mastery</h3>
                        <p>We provide some of the toughest DILR sets available, helping you practice selecting the right sets to maximize your score in limited time.</p>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                        <h3 className="text-xl font-bold text-purple-700 mb-3">VARC Inference Skills</h3>
                        <p>Our Verbal Ability section focuses on critical reasoning and inference-based questions, moving beyond simple comprehension to real aptitude testing.</p>
                    </div>
                </div>

                <h2 className="text-2xl font-bold text-slate-900 mb-4">Why Mock Tests are Critical for CAT</h2>
                <p className="mb-4">
                    CAT is an exam where question selection is more important than solving everything. Apex Mock Tests help you refine your strategy regarding:
                </p>
                <ul className="list-disc pl-6 space-y-2 mb-8">
                    <li><strong>Time Management:</strong> Allocate time wisely across three sections.</li>
                    <li><strong>Accuracy over Attempts:</strong> Avoid the trap of negative marking by guessing less and solving more accurately.</li>
                    <li><strong>Handling Surprises:</strong> Be adaptable to sudden changes in the number of questions or difficulty level.</li>
                </ul>

                <h2 className="text-2xl font-bold text-slate-900 mb-4">Start Your MBA Journey</h2>
                <p>
                    The road to a top B-School starts here. With <strong>Apex Mock Test for CAT</strong>, you get the realistic practice you need to perform at your peak on exam day. Analyze your performance, improve your weak spots, and aim for that 99+ percentile.
                </p>
            </div>
        </ExamLandingPage>
    );
}
