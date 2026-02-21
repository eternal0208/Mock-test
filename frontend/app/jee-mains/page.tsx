import Link from 'next/link';
import { Metadata } from 'next';
import ExamLandingPage from '@/components/ExamLandingPage';
import TestList from '@/components/Exam/TestList';
import SeriesList from '@/components/Exam/SeriesList';

export const metadata: Metadata = {
    title: 'Apex Mock Test for JEE Mains | NTA Level Physics, Chemistry, Maths',
    description: 'Boost your JEE Mains percentile with Apex Mock Tests. Practice shift-wise papers, integer-type questions, and get detailed analytics for speed and accuracy.',
};

import SyllabusDownload from '@/components/Exam/SyllabusDownload';

export default function JeeMainsPage() {
    return (
        <ExamLandingPage
            title="JEE Mains"
            description="Target 99+ Percentile with our high-precision mock tests modeled on the latest NTA patterns."
            stats={{ users: "20k+", tests: "800+", avgScore: "+98 %ile" }}
            features={[
                "NTA Level Physics & Maths Problems",
                "Shift-wise Recent Paper Analysis",
                "Integer Type Question Practice",
                "Speed & Accuracy Analytics"
            ]}
            themeColor="blue"
        >
            <div className="space-y-16">
                <section>
                    <h2 className="text-2xl font-black text-slate-800 mb-8 flex items-center gap-3">
                        <span className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center italic font-serif">P</span>
                        Premium Test Series
                    </h2>
                    <SeriesList category="JEE Main" />
                </section>

                <section>
                    <h2 className="text-2xl font-black text-slate-800 mb-8 flex items-center gap-3">
                        <span className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center italic font-serif">M</span>
                        Individual Mock Tests
                    </h2>
                    <TestList category="JEE Main" />
                </section>
            </div>

            {/* Syllabus Section */}
            <div className="mt-12 mb-12 flex justify-center">
                <SyllabusDownload category="JEE Main" />
            </div>

            {/* SEO Content Section */}
            <div className="mt-20 prose prose-lg max-w-none text-slate-700">
                <h2 className="text-3xl font-bold text-blue-800 mb-6">Master JEE Mains with Apex Mock Test</h2>
                <p className="mb-4">
                    The Joint Entrance Examination (JEE) Mains is the gateway to India's premier engineering institutes like NITs, IIITs, and Centrally Funded Technical Institutes (CFTIs). It also serves as the qualifying exam for JEE Advanced. With competition intensifying every year, simply covering the syllabus isn't enough. You need rigorous practice and a strategic approach. <strong>Apex Mock Test for JEE Mains</strong> provides the perfect platform to fine-tune your preparation.
                </p>
                <p className="mb-8">
                    Our mock tests are designed to mirror the difficulty level and pattern of the actual NTA exam. Whether it's the tricky integer-type questions in Mathematics or conceptual problems in Physics, we cover it all.
                </p>

                <div className="grid md:grid-cols-2 gap-8 mb-12">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                        <h3 className="text-xl font-bold text-blue-700 mb-3">Shift-wise Authenticity</h3>
                        <p>We analyze every single shift of previous years' papers to create mocks that reflect the latest trends, ensuring no surprises on exam day.</p>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                        <h3 className="text-xl font-bold text-blue-700 mb-3">Speed & Accuracy</h3>
                        <p>JEE Mains is a race against time. Our detailed analytics dashboard tracks your time spent per question, helping you identify time-drains and optimize your strategy.</p>
                    </div>
                </div>

                <h2 className="text-2xl font-bold text-slate-900 mb-4">Why Our Series is Essential for 99%ile</h2>
                <p className="mb-4">
                    Achieving a 99+ percentile requires minimizing negative marking and maximizing attempt rate. Apex Mock Tests help you:
                </p>
                <ul className="list-disc pl-6 space-y-2 mb-8">
                    <li><strong>Eliminate Silly Mistakes:</strong> Regular practice reduces calculation errors.</li>
                    <li><strong>Master Numerical Types:</strong> Get comfortable with questions that have no options.</li>
                    <li><strong>Build Stamina:</strong> 3-hour full-length tests build the mental endurance needed for the D-Day.</li>
                </ul>

                <h2 className="text-2xl font-bold text-slate-900 mb-4">Start Practicing Today</h2>
                <p>
                    Don't let exam pressure get the best of you. Join <strong>Apex Mock Test for JEE Mains</strong> and turn your anxiety into confidence. Thousands of students have already improved their scores with our scientifically designed test series. It's time for you to dominate the competition.
                </p>
            </div>
        </ExamLandingPage>
    );
}
