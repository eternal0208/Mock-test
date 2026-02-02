'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { CheckCircle, XCircle, Award, BarChart2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function ResultPage() {
    const { id } = useParams(); // result ID (not test ID)
    const { user } = useAuth();
    const [fullTest, setFullTest] = useState(null);

    useEffect(() => {
        if (!user) return;
        const fetchData = async () => {
            try {
                // 1. Fetch User Results
                const res = await fetch(`http://localhost:5001/api/results/student/${user._id || user.uid}`);
                const data = await res.json();
                const specificResult = data.find(r => r._id === id);
                setResult(specificResult);

                // 2. Fetch Full Test Details (for Questions & Solutions)
                if (specificResult?.testId?._id) {
                    const testRes = await fetch(`http://localhost:5001/api/tests/${specificResult.testId._id}`);
                    const testData = await testRes.json();
                    setFullTest(testData);
                }
            } catch (error) {
                console.error("Error fetching data", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id, user]);

    if (loading) return <div className="p-8 text-center">Loading Result...</div>;
    if (!result || !fullTest) return <div className="p-8 text-center text-red-500">Result/Test data not found.</div>;

    // Derived Stats
    const attemptedCount = result.attempt_data.length; // Raw attempts
    const percentage = ((result.score / (fullTest.total_marks || (fullTest.questions.length * 4))) * 100).toFixed(2);

    // Ranking Logic
    const [rankData, setRankData] = useState({ rank: '-', total: '-' });
    useEffect(() => {
        if (!fullTest?._id) return;
        const fetchRank = async () => {
            try {
                const res = await fetch(`http://localhost:5001/api/results/test/${fullTest._id}`);
                const allResults = await res.json();
                // Assumed sorted by score desc from backend
                const myRank = allResults.findIndex(r => r._id === result._id) + 1;
                setRankData({ rank: myRank > 0 ? myRank : '-', total: allResults.length });
            } catch (e) { console.error("Rank fetch error", e); }
        };
        fetchRank();
    }, [fullTest, result._id]);

    // Visibility Check
    const now = new Date();
    const isScheduled = fullTest.solutionVisibility === 'scheduled' && fullTest.resultDeclarationTime;
    const showSolutions = !isScheduled || (new Date(fullTest.resultDeclarationTime) <= now);

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
                            <p className="opacity-90 mt-1">{fullTest.title}</p>
                        </div>
                        <div className="text-right">
                            <div className="text-4xl font-bold">{result.score} <span className="text-xl font-normal opacity-75">/ {fullTest.total_marks || (fullTest.questions.length * 4)}</span></div>
                            <p className="text-sm opacity-90">Total Score</p>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 border-b border-gray-100">
                        <div className="p-6 text-center border-r border-gray-100">
                            <div className="text-sm text-gray-500 mb-1">Rank</div>
                            <div className="text-xl font-bold text-gray-800 flex justify-center items-center gap-2">
                                <Award className="text-yellow-500" size={20} /> #{rankData.rank}
                                <span className="text-xs text-gray-400 font-normal">/ {rankData.total}</span>
                            </div>
                            <p className="text-xs text-gray-400 mt-1">Test Wise</p>
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

                    {!showSolutions && isScheduled && (
                        <div className="p-8 text-center bg-yellow-50 border-b border-yellow-100">
                            <h2 className="text-xl font-bold text-yellow-700 mb-2">Solutions Hidden</h2>
                            <p className="text-yellow-800">
                                Detailed solutions and analysis will be available on <br />
                                <span className="font-bold">{new Date(fullTest.resultDeclarationTime).toLocaleString()}</span>
                            </p>
                        </div>
                    )}

                    {/* Solution PDF Download */}
                    {showSolutions && fullTest.solutionPdf && (
                        <div className="p-6 bg-blue-50 border-b border-blue-100 flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-blue-800">Full Solution PDF Available</h3>
                                <p className="text-sm text-blue-600">Download the detailed solution key for offline review.</p>
                            </div>
                            <a
                                href={fullTest.solutionPdf}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 shadow flex items-center gap-2"
                            >
                                <BarChart2 size={18} /> Download Solutions
                            </a>
                        </div>
                    )}

                    {showSolutions && (
                        <div className="p-6 bg-gray-50">
                            <h3 className="font-bold text-gray-800 mb-4">Detailed Question Analysis</h3>
                            <div className="space-y-4">
                                {fullTest.questions.map((q, idx) => {
                                    // Find User Attempt
                                    // We match by basic assumption of order since qId might not be in attempt_data
                                    // Ideally attempt_data should have qBaseId. Let's assume order for MVP or check text match 
                                    const userAttempt = result.attempt_data.find(a => a.questionText === q.text); // Not robust but works if text unique
                                    // Better: Match by index if attempt_data contains index? "q" + idx? 
                                    // Actually, let's use the index logic if text match fails or just simple index mapping?
                                    // result.attempt_data is ONLY attempted questions, so index mapping won't work directly against full list.
                                    // Text match is safest fallback for now without QID.

                                    const isAttempted = !!userAttempt;
                                    const isCorrect = userAttempt?.isCorrect;
                                    const selectedOption = userAttempt?.selectedOption;

                                    // Status Color
                                    let statusClass = 'border-gray-200 bg-white';
                                    if (isAttempted) {
                                        statusClass = isCorrect ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50';
                                    }

                                    return (
                                        <div key={idx} className={`rounded-xl border shadow-sm overflow-hidden ${statusClass}`}>
                                            <div className="p-4 flex gap-4">
                                                <div className="flex-shrink-0">
                                                    <span className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-200 font-bold text-gray-600 text-sm">
                                                        {idx + 1}
                                                    </span>
                                                </div>
                                                <div className="flex-grow">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <h4 className="font-medium text-gray-900">{q.text}</h4>
                                                        <span className={`text-xs font-bold px-2 py-1 rounded uppercase ${isAttempted ? (isCorrect ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800') : 'bg-gray-100 text-gray-500'}`}>
                                                            {isAttempted ? (isCorrect ? 'Correct' : 'Incorrect') : 'Skipped'}
                                                        </span>
                                                    </div>

                                                    {q.image && <img src={q.image} alt="Q" className="h-32 mb-3 object-contain rounded border bg-white" />}

                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm mb-3">
                                                        <div className={`p-2 rounded ${isAttempted ? (isCorrect ? 'bg-green-100 text-green-900' : 'bg-red-100 text-red-900') : 'bg-gray-100 text-gray-500'}`}>
                                                            <span className="font-bold mr-2">Your Answer:</span>
                                                            {isAttempted ? selectedOption : 'Not Attempted'}
                                                        </div>
                                                        <div className="p-2 rounded bg-blue-50 text-blue-900 border border-blue-100">
                                                            <span className="font-bold mr-2">Correct Answer:</span>
                                                            {q.correctAnswer}
                                                            {q.type !== 'integer' && q.options && ` (${q.options[q.correctAnswer - 1] || ''})`}
                                                        </div>
                                                    </div>

                                                    {/* Solution Section */}
                                                    <div className="mt-3 pt-3 border-t border-gray-200/50">
                                                        <details className="group">
                                                            <summary className="flex items-center text-sm font-bold text-blue-600 cursor-pointer hover:underline outline-none">
                                                                View Solution
                                                            </summary>
                                                            <div className="mt-3 text-sm text-gray-700 bg-blue-50/50 p-3 rounded">

                                                                {q.solution ? (
                                                                    <p className="whitespace-pre-wrap mb-2">{q.solution}</p>
                                                                ) : (
                                                                    <p className="italic text-gray-400">No text explanation provided.</p>
                                                                )}

                                                                {q.solutionImage && (
                                                                    <div className="mt-2">
                                                                        <p className="text-xs font-bold text-gray-500 mb-1">Solution Diagram:</p>
                                                                        <img src={q.solutionImage} alt="Solution" className="max-h-48 rounded border shadow-sm" />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </details>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
