import Link from 'next/link';
import { Metadata } from 'next';
import ExamLandingPage from '@/components/ExamLandingPage';
import TestList from '@/components/Exam/TestList';

export const metadata: Metadata = {
    title: 'Apex Mock Test for NEET | Best NEET Test Series 2025',
    description: 'Join the best NEET Mock Test Series by Apex Mock. Practice NCERT-based questions, biology diagrams, and physics numericals. Get detailed performance analysis.',
};

import SyllabusDownload from '@/components/Exam/SyllabusDownload';

export default function NeetPage() {
    return (
        <ExamLandingPage
            title="NEET"
            description="Join thousands of medical aspirants mastering Biology, Physics, and Chemistry with our NCERT-centric mock tests."
            stats={{ users: "15k+", tests: "500+", avgScore: "+120 Marks" }}
            features={[
                "NCERT Line-by-Line Questions",
                "Previous Year Paper Analysis",
                "Detailed Biology Diagrams Practice",
                "Time Management Strategy for 200 Mins"
            ]}
            themeColor="teal"
        >
            <TestList category="NEET" />

            {/* Syllabus Section */}
            <div className="mt-12 mb-12 flex justify-center">
                <SyllabusDownload category="NEET" />
            </div>

            {/* SEO Content Section */}
            <div className="mt-20 prose prose-lg max-w-none text-slate-700">
                <h2 className="text-3xl font-bold text-teal-800 mb-6">Why Choose Apex Mock Test for NEET?</h2>
                <p className="mb-4">
                    Preparing for the National Eligibility cum Entrance Test (NEET) requires more than just studying textbooks. It demands a strategic approach to solving questions accurately and efficiently within the time limit. <strong>Apex Mock Test for NEET</strong> offers a comprehensive platform designed to simulate the real exam environment, ensuring you are exam-ready.
                </p>
                <p className="mb-8">
                    Our test series is meticulously crafted by subject matter experts to cover the entire syllabus of Biology, Physics, and Chemistry. We focus heavily on <strong>NCERT-based questions</strong>, as they form the core of the NEET examination.
                </p>

                <div className="grid md:grid-cols-2 gap-8 mb-12">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                        <h3 className="text-xl font-bold text-teal-700 mb-3">NCERT Line-by-Line Coverage</h3>
                        <p>We ensure that every diagram, summary point, and hidden concept in the NCERT textbooks is converted into high-yield questions, leaving no stone unturned.</p>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                        <h3 className="text-xl font-bold text-teal-700 mb-3">Real-Time Performance Analytics</h3>
                        <p>Get instant feedback on your strong and weak areas. Our AI-driven analysis helps you understand your speed, accuracy, and subject-wise proficiency.</p>
                    </div>
                </div>

                <h2 className="text-2xl font-bold text-slate-900 mb-4">NEET Exam Pattern Mastery</h2>
                <p className="mb-4">
                    The NEET exam consists of 200 questions (180 to be attempted) across Physics, Chemistry, and Biology (Botany & Zoology). Managing time across these sections is critical. Apex Mock Tests help you practice:
                </p>
                <ul className="list-disc pl-6 space-y-2 mb-8">
                    <li><strong>Section Switching:</strong> Efficiently moving between subjects.</li>
                    <li><strong>OMR Simulation:</strong> Digital interface mimicking the actual flow.</li>
                    <li><strong>Negative Marking Control:</strong> Learning to avoid guesses that cost marks.</li>
                </ul>

                <h2 className="text-2xl font-bold text-slate-900 mb-4">Start Your Journey Today</h2>
                <p>
                    Don't leave your medical dreams to chance. Join the <strong>Apex Mock Test for NEET</strong> community today and take the first step towards your dream medical college. With consistent practice and our detailed solutions, you can boost your score by significant margins.
                </p>
            </div>
        </ExamLandingPage>
    );
}
