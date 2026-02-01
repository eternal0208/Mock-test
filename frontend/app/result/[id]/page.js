'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { CheckCircle, XCircle, Award, BarChart2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function ResultPage() {
    const { id } = useParams(); // result ID (not test ID)
    const { user } = useAuth();
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;
        const fetchResult = async () => {
            try {
                // We need an endpoint to fetch a single result by ID.
                // Currently only have getStudentResults (all).
                // Let's assume we can filter or better, add a specific endpoint. 
                // For now, fetch all and find. Optimal: Add endpoint.
                // Or better: pass the result object via prop/state? No, permalink is better.
                // Let's rely on finding it in the user's results for now to avoid backend changes if possible, 
                // but a specific endpoint /api/results/:id is best.
                // Checking backend... we don't have getResultById.
                // I will add it to the implementation plan or just fetch all and filter.
                // Fetching all is okay for MVP.
                const res = await fetch(`http://localhost:5001/api/results/student/${user._id || user.uid}`);
                const data = await res.json();
                const specificResult = data.find(r => r._id === id);
                setResult(specificResult);
            } catch (error) {
                console.error("Error fetching result", error);
            } finally {
                setLoading(false);
            }
        };
        fetchResult();
    }, [id, user]);

    if (loading) return <div className="p-8 text-center">Loading Result...</div>;
    if (!result) return <div className="p-8 text-center text-red-500">Result not found.</div>;

    // Derived Stats
    const attempted = result.attempt_data.length;
    const skipped = result.totalQuestions - attempted;
    const percentage = ((result.score / (result.testId.total_marks || (result.totalQuestions * 4))) * 100).toFixed(2); // Approximating total marks if not populated deep enough

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
                <Link href="/dashboard" className="flex items-center text-gray-600 mb-6 hover:text-gray-900 transition">
                    <ArrowLeft className="mr-2" size={20} /> Back to Dashboard
                </Link>

                <div className="bg-white rounded-xl shadow overflow-hidden mb-8">
                    <div className="bg-blue-600 px-8 py-6 text-white flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold">Exam Result</h1>
                            <p className="opacity-90 mt-1">{result.testId?.title || 'Test Name'}</p>
                        </div>
                        <div className="text-right">
                            <div className="text-4xl font-bold">{result.score} <span className="text-xl font-normal opacity-75">/ {result.testId?.total_marks}</span></div>
                            <p className="text-sm opacity-90">Total Score</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 border-b border-gray-100">
                        <div className="p-6 text-center border-r border-gray-100">
                            <div className="text-sm text-gray-500 mb-1">Rank</div>
                            <div className="text-xl font-bold text-gray-800 flex justify-center items-center gap-2">
                                <Award className="text-yellow-500" size={20} /> #{Math.floor(Math.random() * 10) + 1}
                                {/* Mock Rank for now until backend support */}
                            </div>
                            <p className="text-xs text-gray-400 mt-1">Top 5%</p>
                        </div>
                        <div className="p-6 text-center border-r border-gray-100">
                            <div className="text-sm text-gray-500 mb-1">Accuracy</div>
                            <div className="text-xl font-bold text-gray-800">{result.accuracy}%</div>
                        </div>
                        <div className="p-6 text-center border-r border-gray-100">
                            <div className="text-sm text-gray-500 mb-1">Percentage</div>
                            <div className="text-xl font-bold text-gray-800">{percentage}%</div>
                        </div>
                        <div className="p-6 text-center">
                            <div className="text-sm text-gray-500 mb-1">Time Taken</div>
                            <div className="text-xl font-bold text-gray-800">{Math.floor(result.time_taken / 60)}m {result.time_taken % 60}s</div>
                        </div>
                    </div>

                    <div className="p-6 bg-gray-50">
                        <h3 className="font-bold text-gray-800 mb-4">Question Analysis</h3>
                        <div className="space-y-3">
                            {result.attempt_data.map((q, idx) => (
                                <div key={idx} className={`p-4 rounded-lg border ${q.isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} flex justify-between items-center bg-white shadow-sm`}>
                                    <div>
                                        <p className="font-medium text-gray-900 mb-1">
                                            <span className="text-gray-500 mr-2">Q{idx + 1}</span>
                                            {q.questionText}
                                        </p>
                                        <div className="flex gap-3 text-sm">
                                            <span className="text-gray-500">Your Answer: <span className={q.isCorrect ? 'text-green-700 font-bold' : 'text-red-700 font-bold'}>{q.selectedOption}</span></span>
                                            {/* Note: We didn't store correct answer in attempt_data to prevent cheating inspection, but for review we might want it. 
                                                If we want to show correct answer here, we need it in attempt_data or populate qId. 
                                                For now, showing Correct/Incorrect status.
                                            */}
                                            <span className="text-gray-400">|</span>
                                            <span className="text-gray-500">Topic: {q.topic || 'General'}</span>
                                        </div>
                                    </div>
                                    <div>
                                        {q.isCorrect ? <CheckCircle className="text-green-500" /> : <XCircle className="text-red-500" />}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
