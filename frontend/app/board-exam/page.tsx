import Link from 'next/link';
import { Metadata } from 'next';
import ExamLandingPage from '@/components/ExamLandingPage';
import TestList from '@/components/Exam/TestList';
import SeriesList from '@/components/Exam/SeriesList';
import SyllabusDownload from '@/components/Exam/SyllabusDownload';

export const metadata: Metadata = {
    title: 'Apex Board Exam Prep | Class 10th & 12th Mock Tests',
    description: 'Ace your Class 10th and 12th Board Exams with Apex Mock Tests. Comprehensive practice for Science, Maths, and crucial subjects.',
};

export default function BoardExamPage() {
    return (
        <ExamLandingPage
            title="Board Exams"
            description="Secure high percentages in Class 10th and 12th Board Exams. Practice with chapter-wise tests and full-length model papers."
            stats={{ users: "5k+", tests: "150+", avgScore: "90%+" }}
            features={[
                "Class 10th & 12th Mixed Series",
                "Chapter-wise Important Questions",
                "Previous Year Model Papers",
                "Subjective & Objective Pattern"
            ]}
            themeColor="blue"
        >
            <div className="space-y-16">
                <section>
                    <h2 className="text-2xl font-black text-slate-800 mb-8 flex items-center gap-3">
                        <span className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center italic font-serif">P</span>
                        Premium Test Series
                    </h2>
                    <SeriesList category="Board Exam" />
                </section>

                <section>
                    <h2 className="text-2xl font-black text-slate-800 mb-8 flex items-center gap-3">
                        <span className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center italic font-serif">M</span>
                        Individual Mock Tests
                    </h2>
                    <TestList category="Board Exam" />
                </section>
            </div>

            {/* Syllabus Section */}
            <div className="mt-12 mb-12 flex justify-center">
                <SyllabusDownload category="Board Exam" />
            </div>

            {/* SEO Content Section */}
            <div className="mt-20 prose prose-lg max-w-none text-slate-700">
                <h2 className="text-3xl font-bold text-blue-800 mb-6">Excel in Board Exams with Apex Prep</h2>
                <p className="mb-4">
                    Board exams are the first major milestone in a student's academic career. Whether it's Class 10th or Class 12th, the pressure to perform is immense. <strong>Apex Board Exam Prep</strong> simplifies your preparation by providing a structured approach to covering the vast syllabus.
                </p>
                <p className="mb-8">
                    Our test series covers all major subjects including Mathematics, Science (Physics, Chemistry, Biology), and English. We focus on writing answers that fetch maximum marks.
                </p>

                <div className="grid md:grid-cols-2 gap-8 mb-12">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                        <h3 className="text-xl font-bold text-blue-700 mb-3">Model Papers & Blueprints</h3>
                        <p>Practice with papers designed strictly according to the latest marking schemes and blueprints issued by the boards.</p>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                        <h3 className="text-xl font-bold text-blue-700 mb-3">Chapter-wise Mastery</h3>
                        <p>Don't just memorize; understand. Our chapter-wise tests help you identify weak topics and strengthen them before the final exam.</p>
                    </div>
                </div>

                <h2 className="text-2xl font-bold text-slate-900 mb-4">Why Choose Apex for Boards?</h2>
                <ul className="list-disc pl-6 space-y-2 mb-8">
                    <li><strong>Time Management:</strong> Learn to complete the paper within 3 hours.</li>
                    <li><strong>Answer Writing Skills:</strong> Understand how to structure subjective answers.</li>
                    <li><strong>Comprehensive Coverage:</strong> From MCQs to long answer questions, we cover it all.</li>
                </ul>
            </div>
        </ExamLandingPage>
    );
}
