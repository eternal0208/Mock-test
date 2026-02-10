'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { BarChart2, Award, Clock, ArrowLeft } from 'lucide-react';
import { API_BASE_URL } from '@/lib/config';
import Link from 'next/link';
import MathText from '@/components/ui/MathText';

export default function ResultPage() {
    const { id } = useParams(); // result ID (not test ID)
    const { user } = useAuth();
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(true);
    const [fullTest, setFullTest] = useState(null);
    const [error, setError] = useState(null);
    const [rankData, setRankData] = useState({ rank: '-', total: '-' });

    useEffect(() => {
        if (!user) return;
        const fetchData = async () => {
            try {
                const token = await user.getIdToken();
                const headers = { 'Authorization': `Bearer ${token}` };

                // 1. Fetch Specific Result
                const res = await fetch(`${API_BASE_URL}/api/results/${id}`, { headers });
                if (!res.ok) throw new Error('Result not found');
                const specificResult = await res.json();
                setResult(specificResult);

                // 2. Try Fetch Full Test Details
                const testId = specificResult.testId?._id || specificResult.testId;
                if (testId) {
                    const testRes = await fetch(`${API_BASE_URL}/api/tests/${testId}`, { headers });
                    if (testRes.ok) {
                        const testData = await testRes.json();
                        setFullTest(testData);
                    } else {
                        console.warn("Test data unavailable (likely deleted). Showing cached result data.");
                        // We do NOT set error state here to allow fallback rendering
                    }
                }
            } catch (error) {
                console.error("Error fetching data:", error);
                setError(error.message);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id, user]);

    // Ranking Logic
    useEffect(() => {
        if (!result) return;
        const targetTestId = fullTest?._id || result.testId?._id || result.testId;
        if (!targetTestId) return;

        const fetchRank = async () => {
            try {
                const token = await user.getIdToken();
                const res = await fetch(`${API_BASE_URL}/api/results/test/${targetTestId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const allResults = await res.json();
                    const myRank = allResults.findIndex(r => r._id === result._id) + 1;
                    setRankData({ rank: myRank > 0 ? myRank : '-', total: allResults.length });
                }
            } catch (e) { console.error("Rank fetch error", e); }
        };
        fetchRank();
    }, [fullTest, result, user]); // Added user to dependency array

    if (loading) return <div className="p-8 text-center">Loading Result...</div>;
    if (error) return <div className="p-8 text-center text-red-500 font-bold">{error}</div>;
    if (!result) return <div className="p-8 text-center text-red-500">Result data not found.</div>;

    // --- FALLBACK LOGIC ---
    // Use test details from result if fullTest is missing
    const testMeta = fullTest || result.testDetails || { title: 'Unknown Test', total_marks: 0 };
    const maxMarks = testMeta.total_marks || (result.score * 1.5) || 100; // Fallback estimate
    const percentage = ((result.score / maxMarks) * 100).toFixed(2);

    // Check result visibility based on mode
    const checkResultAccess = () => {
        const mode = fullTest?.resultVisibility || 'immediate';
        const declTime = fullTest?.resultDeclarationTime;
        const testEndTime = fullTest?.endTime;
        const now = new Date();

        if (mode === 'immediate') return true;

        if (mode === 'scheduled' && declTime) {
            return new Date(declTime) <= now;
        }

        if (mode === 'afterTestEnds' && testEndTime) {
            return new Date(testEndTime) <= now;
        }

        return true; // Fallback: show if mode is unclear
    };

    const showSolutions = checkResultAccess();
    const questionsList = fullTest?.questions || [];

    // Fallback: If no questions, reconstruct from attempt_data for display
    const effectiveQuestions = questionsList.length > 0 ? questionsList : result.attempt_data.map((a, i) => ({
        text: a.questionText || `Question ${i + 1}`,
        correctAnswer: '?',
        solution: 'Detailed solution unavailable (Test content deleted)',
        _reconstructed: true
    }));

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
                <Link href="/dashboard" className="flex items-center text-gray-600 mb-6 hover:text-gray-900 transition">
                    <ArrowLeft className="mr-2" size={20} /> Back to Dashboard
                </Link>

                <div className="bg-white rounded-xl shadow overflow-hidden mb-8">
                    {/* Header */}
                    <div className="bg-blue-600 px-8 py-6 text-white flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold">Exam Result</h1>
                            <p className="opacity-90 mt-1">{testMeta.title} {!fullTest && <span className="bg-red-500 text-xs px-2 py-0.5 rounded ml-2">ARCHIVED</span>}</p>
                        </div>
                        <div className="text-right">
                            <div className="text-4xl font-bold">{result.score} <span className="text-xl font-normal opacity-75">/ {maxMarks}</span></div>
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

                    {/* Result Visibility Check */}
                    {!showSolutions ? (
                        <div className="p-8 text-center">
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 max-w-md mx-auto">
                                <div className="text-yellow-600 mb-3">
                                    <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-bold text-gray-800 mb-2">Results Not Yet Available</h3>
                                <p className="text-sm text-gray-600">
                                    {fullTest?.resultVisibility === 'scheduled' && fullTest?.resultDeclarationTime && (
                                        <>Results will be available on <strong>{new Date(fullTest.resultDeclarationTime).toLocaleString()}</strong></>
                                    )}
                                    {fullTest?.resultVisibility === 'afterTestEnds' && fullTest?.endTime && (
                                        <>Results will be available after the test ends on <strong>{new Date(fullTest.endTime).toLocaleString()}</strong></>
                                    )}
                                    {!fullTest?.resultVisibility && <>Results will be available soon. Please check back later.</>}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Performance Summary */}
                            <div className="p-8 border-b border-gray-100">
                                <h2 className="text-xl font-bold text-gray-800 mb-4">Performance Summary</h2>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                                        <div className="text-sm text-green-600 mb-1">Correct</div>
                                        <div className="text-2xl font-bold text-green-700">{result.correct_count || 0}</div>
                                    </div>
                                    <div className="bg-red-50 p-4 rounded-lg border border-red-100">
                                        <div className="text-sm text-red-600 mb-1">Incorrect</div>
                                        <div className="text-2xl font-bold text-red-700">{result.incorrect_count || 0}</div>
                                    </div>
                                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                                        <div className="text-sm text-gray-600 mb-1">Unattempted</div>
                                        <div className="text-2xl font-bold text-gray-700">{result.unattempted_count || 0}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Solution PDF Download */}
                            {showSolutions && fullTest?.solutionPdf && (
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

                            {/* Question Analysis */}
                            {showSolutions && (
                                <div className="p-6 bg-gray-50">
                                    <h3 className="font-bold text-gray-800 mb-4">Detailed Question Analysis</h3>
                                    {!fullTest && <div className="mb-4 text-xs text-red-500 bg-red-50 p-2 rounded border border-red-100">Note: Original test data is missing. Showing limited details from your attempt history.</div>}

                                    <div className="space-y-4">
                                        {effectiveQuestions.map((q, idx) => {
                                            // Robust matching: Try by Text first (if available in attempt)
                                            // If q._reconstructed is true, q is DERIVED from attempt, so 'a' is simply the attempt at index idx?
                                            // Wait, result.attempt_data might be subset (only attempted)? 
                                            // But unattempted questions might NOT be in attempt_data if logic excluded them?
                                            // In `submitTest`, we pushed `attemptData` only inside the loop of answers? 
                                            // If user didn't answer, is it in attempt_data? 
                                            // Checking submitTest: `answers` loop -> push to attemptData.
                                            // If user skipped, it's NOT in attempt_data!
                                            // So if fullTest is missing, we ONLY show Attempted questions.

                                            // If we are iterating effectiveQuestions (which is attempt_data mapped if fullTest missing),
                                            // then `userAttempt` IS `a` (the source).

                                            let userAttempt;
                                            if (q._reconstructed) {
                                                userAttempt = result.attempt_data[idx];
                                            } else {
                                                userAttempt = result.attempt_data.find(a => a.questionText === q.text);
                                            }

                                            const isAttempted = !!userAttempt;
                                            const isCorrect = userAttempt?.isCorrect;
                                            const selectedOption = userAttempt?.selectedOption;

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
                                                                <div className="font-medium text-gray-900">
                                                                    <MathText text={q.text} />
                                                                </div>
                                                                <span className={`text-xs font-bold px-2 py-1 rounded uppercase ${isAttempted ? (isCorrect ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800') : 'bg-gray-100 text-gray-500'}`}>
                                                                    {isAttempted ? (isCorrect ? 'Correct' : 'Incorrect') : 'Skipped'}
                                                                </span>
                                                            </div>

                                                            {q.image && <img src={q.image} alt="Q" className="h-32 mb-3 object-contain rounded border bg-white" />}

                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm mb-3">
                                                                <div className={`p-2 rounded ${isAttempted ? (isCorrect ? 'bg-green-100 text-green-900' : 'bg-red-100 text-red-900') : 'bg-gray-100 text-gray-500'}`}>
                                                                    <span className="font-bold mr-2">Your Answer:</span>
                                                                    <MathText text={isAttempted ? selectedOption : 'Not Attempted'} />
                                                                </div>
                                                                {fullTest && (
                                                                    <div className="p-2 rounded bg-blue-50 text-blue-900 border border-blue-100">
                                                                        <span className="font-bold mr-2">Correct Answer:</span>
                                                                        {q.type === 'integer' ? (
                                                                            q.integerAnswer
                                                                        ) : q.type === 'msq' ? (
                                                                            // Multiple Select - show all correct options
                                                                            Array.isArray(q.correctOptions) ? q.correctOptions.join(', ') : (q.correctOptions || 'N/A')
                                                                        ) : (
                                                                            // Single Select MCQ
                                                                            <>
                                                                                <MathText text={q.correctOption} />
                                                                                {/* Show option text if available */}
                                                                                {q.options && typeof q.correctOption === 'string' && q.correctOption.length === 1 && (
                                                                                    <span className="ml-1 text-gray-600">
                                                                                        (<MathText text={q.options[q.correctOption.charCodeAt(0) - 65] || ''} />)
                                                                                    </span>
                                                                                )}
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {fullTest && (
                                                                <div className="mt-3 pt-3 border-t border-gray-200/50">
                                                                    <details className="group">
                                                                        <summary className="flex items-center text-sm font-bold text-blue-600 cursor-pointer hover:underline outline-none">
                                                                            View Solution
                                                                        </summary>
                                                                        <div className="mt-3 text-sm text-gray-700 bg-blue-50/50 p-3 rounded">
                                                                            {q.solution ? (
                                                                                <div className="whitespace-pre-wrap mb-2">
                                                                                    <MathText text={q.solution} />
                                                                                </div>
                                                                            ) : <p className="italic text-gray-400">No text explanation.</p>}
                                                                            {q.solutionImage && <img src={q.solutionImage} alt="Solution" className="max-h-48 rounded border shadow-sm mt-2" />}
                                                                        </div>
                                                                    </details>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
