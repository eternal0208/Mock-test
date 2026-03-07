'use client';
import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { BarChart2, Award, Clock, ArrowLeft, Download, ChevronDown, ChevronUp, CheckCircle, XCircle, MinusCircle } from 'lucide-react';
import { API_BASE_URL } from '@/lib/config';
import Link from 'next/link';
import MathText from '@/components/ui/MathText';
import ImageViewer from '@/components/ui/ImageViewer';
import { useReactToPrint } from 'react-to-print';
import PrintableResultReport from '@/components/Exam/PrintableResultReport';

export default function ResultPage() {
    const { id } = useParams();
    const { user } = useAuth();
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(true);
    const [fullTest, setFullTest] = useState(null);
    const [error, setError] = useState(null);
    const [rankData, setRankData] = useState({ rank: '-', total: '-' });
    const [previewImage, setPreviewImage] = useState(null);
    const [expandedQ, setExpandedQ] = useState(null); // which question is expanded

    const componentRef = useRef(null);
    const handlePrint = useReactToPrint({
        contentRef: componentRef,
        documentTitle: `Apex_Mock_Test_Report_${fullTest?.title?.replace(/\s+/g, '_') || 'Result'}`,
        print: async (printIframe) => {
            try {
                const document = printIframe.contentDocument;
                if (!document) throw new Error("Iframe document not loaded");

                // Strip lab/oklch/color properties from stylesheets as html2canvas fails to parse them
                const styleTags = document.querySelectorAll('style, link[rel="stylesheet"]');
                for (let style of styleTags) {
                    try {
                        if (style.tagName.toLowerCase() === 'style' && style.innerHTML) {
                            const newCSS = style.innerHTML.replace(/[a-zA-Z-]+\s*:\s*[^;}]*(?:lab|oklch|color)\s*\([^;}]*[;}]/gi, match => match.endsWith('}') ? '}' : '');
                            style.innerHTML = newCSS;
                        }
                    } catch (e) {
                        console.warn("Could not process style tag", e);
                    }
                }

                // Dynamically import html2canvas-pro and jsPDF
                const html2canvasModule = await import('html2canvas-pro');
                const html2canvas = html2canvasModule.default ? html2canvasModule.default : html2canvasModule;

                const { jsPDF } = await import('jspdf');

                const element = document.body;

                const canvas = await html2canvas(element, {
                    scale: 2,
                    useCORS: true,
                    logging: false
                });

                const imgData = canvas.toDataURL('image/jpeg', 0.98);
                const pdf = new jsPDF({
                    orientation: 'portrait',
                    unit: 'mm',
                    format: 'a4'
                });

                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

                pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
                pdf.save(`Apex_Mock_Test_Report_${fullTest?.title?.replace(/\s+/g, '_') || 'Result'}.pdf`);
            } catch (error) {
                console.error('PDF generation error:', error);
                // Fallback to regular print if generation fails
                if (printIframe && printIframe.contentWindow) {
                    printIframe.contentWindow.print();
                }
            }
        }
    });

    useEffect(() => {
        if (!user) return;
        const fetchData = async () => {
            try {
                const token = await user.getIdToken();
                const headers = { 'Authorization': `Bearer ${token}` };
                const res = await fetch(`${API_BASE_URL}/api/results/${id}`, { headers });
                if (!res.ok) throw new Error('Result not found');
                const specificResult = await res.json();
                setResult(specificResult);

                const testId = specificResult.testId?._id || specificResult.testId;
                if (testId) {
                    const testRes = await fetch(`${API_BASE_URL}/api/tests/${testId}`, { headers });
                    if (testRes.ok) {
                        const testData = await testRes.json();
                        setFullTest(testData);
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
    }, [fullTest, result, user]);

    if (loading) return <div className="p-8 text-center">Loading Result...</div>;
    if (error) return <div className="p-8 text-center text-red-500 font-bold">{error}</div>;
    if (!result) return <div className="p-8 text-center text-red-500">Result data not found.</div>;

    const testMeta = fullTest || result.testDetails || { title: 'Unknown Test', total_marks: 0 };
    const maxMarks = testMeta.total_marks || 100;
    const percentage = ((result.score / maxMarks) * 100).toFixed(1);
    const unattempted = (result.totalQuestions - (result.correctAnswers || 0) - (result.wrongAnswers || 0)) || 0;

    const checkResultAccess = () => {
        const mode = fullTest?.resultVisibility || 'immediate';
        const declTime = fullTest?.resultDeclarationTime;
        const testEndTime = fullTest?.endTime;
        const now = new Date();
        if (mode === 'immediate') return true;
        if (mode === 'scheduled' && declTime) return new Date(declTime) <= now;
        if (mode === 'afterTestEnds' && testEndTime) return new Date(testEndTime) <= now;
        return true;
    };

    const showSolutions = checkResultAccess();
    const questionsList = fullTest?.questions || [];

    const effectiveQuestions = questionsList.length > 0 ? questionsList : result.attempt_data.map((a, i) => ({
        text: a.questionText || `Question ${i + 1}`,
        correctAnswer: '?',
        solution: 'Detailed solution unavailable (Test content deleted)',
        _reconstructed: true
    }));

    // --- ROBUST MATCHING ---
    // Build attempt_data lookup. The backend stores questionId like "q_testId_index".
    // The fullTest questions fetched via getTestById have random _id per request. 
    // So we MUST match by INDEX (the backend uses deterministic q_testId_index).
    const getAttemptForQuestion = (q, idx) => {
        if (q._reconstructed) return result.attempt_data[idx];

        const testId = fullTest?._id || result.testId?._id || result.testId;
        const expectedId = `q_${testId}_${idx}`;

        // Primary: match by deterministic questionId
        let found = result.attempt_data.find(a => a.questionId === expectedId);
        if (found) return found;

        // Secondary: match by stored _id if questions have persistent IDs
        if (q._id) {
            found = result.attempt_data.find(a => a.questionId === q._id || a.questionId === String(q._id));
            if (found) return found;
        }

        // Tertiary fallback: match by questionText
        found = result.attempt_data.find(a => a.questionText && q.text && a.questionText === q.text);
        return found || null;
    };

    const getIsAttempted = (selectedOption) => {
        if (selectedOption === undefined || selectedOption === null || selectedOption === '') return false;
        if (Array.isArray(selectedOption)) return selectedOption.length > 0;
        return true;
    };

    const toggleQuestion = (idx) => {
        setExpandedQ(expandedQ === idx ? null : idx);
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <ImageViewer src={previewImage} onClose={() => setPreviewImage(null)} />

            {/* Top Bar */}
            <div className="bg-white border-b sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
                    <Link href="/dashboard" className="flex items-center text-gray-600 hover:text-gray-900 transition text-sm font-medium">
                        <ArrowLeft className="mr-1" size={18} /> Back
                    </Link>
                    {/* {showSolutions && fullTest && (
                        <button
                            onClick={() => handlePrint()}
                            className="bg-blue-600 text-white px-3 py-1.5 rounded-lg font-semibold text-sm shadow-sm hover:bg-blue-700 transition flex items-center gap-1.5"
                        >
                            <Download size={14} />
                            <span className="hidden sm:inline">Download PDF</span>
                            <span className="sm:hidden">PDF</span>
                        </button>
                    )} */}
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-3 sm:px-6 py-4 sm:py-6">

                {/* Score Card */}
                <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl shadow-lg text-white p-5 sm:p-8 mb-4">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h1 className="text-lg sm:text-2xl font-bold">{testMeta.title}</h1>
                            {!fullTest && <span className="text-xs bg-red-500/80 px-2 py-0.5 rounded mt-1 inline-block">ARCHIVED</span>}
                        </div>
                        <div className="text-right">
                            <div className="text-3xl sm:text-5xl font-black">{result.score}</div>
                            <div className="text-xs sm:text-sm opacity-70">out of {maxMarks}</div>
                        </div>
                    </div>

                    {/* Mini Stats */}
                    <div className="grid grid-cols-4 gap-2 sm:gap-4 mt-4 pt-4 border-t border-white/20">
                        <div className="text-center">
                            <div className="text-lg sm:text-2xl font-bold flex items-center justify-center gap-1">
                                <Award size={16} className="text-yellow-300" />
                                #{rankData.rank}
                            </div>
                            <div className="text-[10px] sm:text-xs opacity-60">Rank / {rankData.total}</div>
                        </div>
                        <div className="text-center">
                            <div className="text-lg sm:text-2xl font-bold">{result.accuracy}%</div>
                            <div className="text-[10px] sm:text-xs opacity-60">Accuracy</div>
                        </div>
                        <div className="text-center">
                            <div className="text-lg sm:text-2xl font-bold">{percentage}%</div>
                            <div className="text-[10px] sm:text-xs opacity-60">Percentage</div>
                        </div>
                        <div className="text-center">
                            <div className="text-lg sm:text-2xl font-bold">{Math.floor(result.time_taken / 60)}m</div>
                            <div className="text-[10px] sm:text-xs opacity-60">Time</div>
                        </div>
                    </div>
                </div>

                {/* Performance Chips */}
                <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4">
                    <div className="bg-green-50 border border-green-200 rounded-xl p-3 sm:p-4 text-center">
                        <div className="text-xl sm:text-2xl font-black text-green-600">{result.correctAnswers || 0}</div>
                        <div className="text-[10px] sm:text-xs text-green-700 font-medium">Correct</div>
                    </div>
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3 sm:p-4 text-center">
                        <div className="text-xl sm:text-2xl font-black text-red-600">{result.wrongAnswers || 0}</div>
                        <div className="text-[10px] sm:text-xs text-red-700 font-medium">Incorrect</div>
                    </div>
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 sm:p-4 text-center">
                        <div className="text-xl sm:text-2xl font-black text-gray-500">{unattempted}</div>
                        <div className="text-[10px] sm:text-xs text-gray-600 font-medium">Skipped</div>
                    </div>
                </div>

                {/* Result Not Available */}
                {!showSolutions ? (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
                        <h3 className="text-base font-bold text-gray-800 mb-2">Results Not Yet Available</h3>
                        <p className="text-sm text-gray-600">
                            {fullTest?.resultVisibility === 'scheduled' && fullTest?.resultDeclarationTime && (
                                <>Results will be available on <strong>{new Date(fullTest.resultDeclarationTime).toLocaleString()}</strong></>
                            )}
                            {fullTest?.resultVisibility === 'afterTestEnds' && fullTest?.endTime && (
                                <>Results available after test ends on <strong>{new Date(fullTest.endTime).toLocaleString()}</strong></>
                            )}
                            {!fullTest?.resultVisibility && <>Results will be available soon.</>}
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Solution PDF */}
                        {fullTest?.solutionPdf && (
                            <a href={fullTest.solutionPdf} target="_blank" rel="noopener noreferrer"
                                className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4 hover:bg-blue-100 transition">
                                <div>
                                    <h3 className="font-bold text-blue-800 text-sm">Full Solution PDF</h3>
                                    <p className="text-xs text-blue-600">Download solution key</p>
                                </div>
                                <Download size={20} className="text-blue-600" />
                            </a>
                        )}

                        {/* Question Palette */}
                        <div className="mb-4">
                            <h3 className="font-bold text-gray-800 text-sm mb-2">Question Navigator</h3>
                            <div className="flex flex-wrap gap-1.5">
                                {effectiveQuestions.map((q, idx) => {
                                    const attempt = getAttemptForQuestion(q, idx);
                                    const selOpt = attempt?.selectedOption;
                                    const isAtt = getIsAttempted(selOpt);
                                    const isCor = attempt?.isCorrect;

                                    let bg = 'bg-gray-200 text-gray-600'; // skipped
                                    if (isAtt && isCor) bg = 'bg-green-500 text-white';
                                    else if (isAtt) bg = 'bg-red-500 text-white';

                                    return (
                                        <button key={idx} onClick={() => { setExpandedQ(idx); document.getElementById(`q-${idx}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
                                            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg text-xs font-bold ${bg} transition hover:scale-110`}>
                                            {idx + 1}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Questions List */}
                        {!fullTest && <div className="mb-3 text-xs text-red-500 bg-red-50 p-2 rounded border border-red-100">Note: Original test data missing. Showing limited details.</div>}

                        <div className="space-y-3">
                            {effectiveQuestions.map((q, idx) => {
                                const attempt = getAttemptForQuestion(q, idx);
                                const selectedOption = attempt?.selectedOption;
                                const isAttempted = getIsAttempted(selectedOption);
                                const isCorrect = attempt?.isCorrect;
                                const isExpanded = expandedQ === idx;

                                const isOptionSelected = (optVal) => {
                                    if (!isAttempted) return false;
                                    if (Array.isArray(selectedOption)) return selectedOption.includes(optVal);
                                    return selectedOption === optVal;
                                };

                                const isOptionCorrect = (optVal) => {
                                    if (!fullTest) return false;
                                    if (q.type === 'msq' && Array.isArray(q.correctOptions)) return q.correctOptions.includes(optVal);
                                    return q.correctOption === optVal;
                                };

                                // Status icon
                                let StatusIcon, statusColor, statusLabel;
                                if (!isAttempted) {
                                    StatusIcon = MinusCircle; statusColor = 'text-gray-400'; statusLabel = 'Skipped';
                                } else if (isCorrect) {
                                    StatusIcon = CheckCircle; statusColor = 'text-green-500'; statusLabel = 'Correct';
                                } else {
                                    StatusIcon = XCircle; statusColor = 'text-red-500'; statusLabel = 'Incorrect';
                                }

                                return (
                                    <div key={idx} id={`q-${idx}`} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                                        {/* Compact Header - Always Visible */}
                                        <button onClick={() => toggleQuestion(idx)}
                                            className="w-full flex items-center justify-between px-3 sm:px-4 py-3 text-left hover:bg-gray-50 transition">
                                            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                                                <span className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${isAttempted ? (isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700') : 'bg-gray-100 text-gray-500'
                                                    }`}>{idx + 1}</span>
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold border border-indigo-100">
                                                        {q.type === 'integer' ? 'INT' : (q.type === 'msq' ? 'MSQ' : 'MCQ')}
                                                    </span>
                                                    <StatusIcon size={16} className={statusColor} />
                                                    <span className={`text-xs font-semibold ${statusColor}`}>{statusLabel}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-gray-400">
                                                    {isCorrect ? `+${q.marks || 0}` : (isAttempted ? `-${q.negativeMarks || 0}` : '0')}
                                                </span>
                                                {isExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                                            </div>
                                        </button>

                                        {/* Expanded Content */}
                                        {isExpanded && (
                                            <div className="px-3 sm:px-4 pb-4 border-t border-gray-100">
                                                {/* Skipped Notice */}
                                                {!isAttempted && (
                                                    <div className="mt-3 flex items-center gap-2 text-yellow-700 bg-yellow-50 border border-yellow-200 px-3 py-2 rounded-lg text-xs sm:text-sm">
                                                        ⚠️ <span className="font-medium">You <strong>skipped</strong> this question. Correct answer highlighted below.</span>
                                                    </div>
                                                )}

                                                {/* Question */}
                                                <div className="mt-3 mb-4">
                                                    <div className="text-sm sm:text-base text-gray-900 font-medium">
                                                        <MathText text={q.text} />
                                                    </div>
                                                    {q.image && (
                                                        <img src={q.image} alt={`Q${idx + 1}`}
                                                            className="mt-3 max-h-60 sm:max-h-[400px] w-full object-contain rounded-lg border bg-gray-50 cursor-zoom-in"
                                                            onClick={() => setPreviewImage(q.image)} />
                                                    )}
                                                </div>

                                                {/* MCQ/MSQ Options */}
                                                {fullTest && q.options && q.options.length > 0 && (
                                                    <div className="space-y-1.5 mb-4">
                                                        {q.options.map((opt, optIdx) => {
                                                            const effectiveOpt = opt || `Option ${optIdx + 1}`;
                                                            const selected = isOptionSelected(effectiveOpt);
                                                            const correct = isOptionCorrect(effectiveOpt);

                                                            let optBg = 'bg-white border-gray-200';
                                                            let badge = null;

                                                            if (selected && correct) {
                                                                optBg = 'bg-green-50 border-green-400 ring-1 ring-green-400';
                                                                badge = <span className="text-[10px] sm:text-xs font-bold text-green-700 bg-green-100 px-1.5 py-0.5 rounded whitespace-nowrap">✓ Your Answer (Correct)</span>;
                                                            } else if (correct) {
                                                                optBg = 'bg-green-50 border-green-400';
                                                                badge = <span className="text-[10px] sm:text-xs font-bold text-green-700 bg-green-100 px-1.5 py-0.5 rounded whitespace-nowrap">✓ Correct</span>;
                                                            } else if (selected) {
                                                                optBg = 'bg-red-50 border-red-400 ring-1 ring-red-400';
                                                                badge = <span className="text-[10px] sm:text-xs font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded whitespace-nowrap">✗ Your Answer</span>;
                                                            }

                                                            return (
                                                                <div key={optIdx} className={`flex items-start gap-2 p-2.5 sm:p-3 rounded-lg border ${optBg}`}>
                                                                    <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 flex items-center justify-center font-bold text-[10px] sm:text-xs shrink-0 mt-0.5 ${correct ? 'bg-green-500 border-green-500 text-white' : (selected ? 'bg-red-500 border-red-500 text-white' : 'border-gray-300 text-gray-400 bg-white')
                                                                        }`}>
                                                                        {String.fromCharCode(65 + optIdx)}
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className={`text-xs sm:text-sm ${correct || selected ? 'font-medium text-gray-900' : 'text-gray-600'}`}>
                                                                            <MathText text={effectiveOpt} />
                                                                        </div>
                                                                        {q.optionImages && q.optionImages[optIdx] && (
                                                                            <img src={q.optionImages[optIdx]} alt={`Opt ${optIdx}`}
                                                                                className="mt-1.5 max-h-12 sm:max-h-16 object-contain rounded border bg-white cursor-zoom-in"
                                                                                onClick={(e) => { e.stopPropagation(); setPreviewImage(q.optionImages[optIdx]); }} />
                                                                        )}
                                                                    </div>
                                                                    {badge && <div className="shrink-0 self-center">{badge}</div>}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}

                                                {/* Integer Answer */}
                                                {fullTest && q.type === 'integer' && (
                                                    <div className={`p-3 sm:p-4 rounded-lg mb-4 border ${isAttempted ? (isCorrect ? 'bg-green-50 border-green-400' : 'bg-red-50 border-red-400') : 'bg-gray-50 border-gray-200'}`}>
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <div>
                                                                <span className={`text-[10px] sm:text-xs block font-bold ${isAttempted && !isCorrect ? 'text-red-600' : 'text-gray-500'}`}>YOUR ANSWER</span>
                                                                <span className={`font-mono text-lg sm:text-xl font-bold ${isCorrect ? 'text-green-600' : (isAttempted ? 'text-red-600' : 'text-gray-400')}`}>
                                                                    {isAttempted ? selectedOption : '-'}
                                                                </span>
                                                            </div>
                                                            <div>
                                                                <span className="text-[10px] sm:text-xs block font-bold text-green-700">CORRECT ANSWER</span>
                                                                <span className="font-mono text-lg sm:text-xl font-bold text-green-600">{q.integerAnswer}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Answer Summary */}
                                                {fullTest && (
                                                    <div className={`p-3 rounded-xl border-2 mb-3 ${isAttempted ? (isCorrect ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300') : 'bg-yellow-50 border-yellow-300'}`}>
                                                        <div className="flex items-center justify-between gap-3">
                                                            <div className="min-w-0">
                                                                <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Your Answer</div>
                                                                <div className={`text-sm font-bold truncate ${isAttempted ? (isCorrect ? 'text-green-700' : 'text-red-700') : 'text-gray-400'}`}>
                                                                    {isAttempted ? (
                                                                        q.type === 'integer' ? selectedOption :
                                                                            Array.isArray(selectedOption) ? selectedOption.join(', ') : selectedOption
                                                                    ) : 'Skipped'}
                                                                </div>
                                                            </div>
                                                            <div className="text-right min-w-0">
                                                                <div className="text-[10px] font-bold uppercase tracking-widest text-green-700">Correct Answer</div>
                                                                <div className="text-sm font-bold text-green-600 truncate">
                                                                    {q.type === 'integer' ? q.integerAnswer :
                                                                        q.type === 'msq' && Array.isArray(q.correctOptions) ? q.correctOptions.join(', ') :
                                                                            q.correctOption || '-'}
                                                                </div>
                                                            </div>
                                                            <div className="text-lg shrink-0">
                                                                {isAttempted ? (isCorrect ? '✅' : '❌') : '⏭️'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Solution */}
                                                {fullTest && (
                                                    <div className="mt-3 pt-3 border-t border-gray-100">
                                                        <h4 className="text-xs sm:text-sm text-blue-900 font-bold mb-2 flex items-center gap-1.5">
                                                            💡 Solution
                                                        </h4>
                                                        <div className="bg-blue-50/50 rounded-lg p-3 sm:p-4 text-gray-800">
                                                            {q.solution ? (
                                                                <div className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap"><MathText text={q.solution} /></div>
                                                            ) : (
                                                                (!q.solutionImages || q.solutionImages.length === 0) && !q.solutionImage ? (
                                                                    <div className="bg-indigo-50 border border-indigo-100 rounded p-3 text-indigo-900">
                                                                        <div className="flex items-start gap-2">
                                                                            <span className="text-lg">🎯</span>
                                                                            <div>
                                                                                <h5 className="font-bold text-xs sm:text-sm mb-1">Self-Study Challenge!</h5>
                                                                                <p className="text-[10px] sm:text-xs leading-relaxed text-indigo-800">No solution provided. Search the internet, textbooks, or discuss with peers. The best learning is self-driven!</p>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ) : null
                                                            )}

                                                            {q.solutionImages && q.solutionImages.length > 0 ? (
                                                                <div className="mt-2 grid grid-cols-1 gap-3">
                                                                    {q.solutionImages.map((img, i) => (
                                                                        <img key={i} src={img} alt={`Solution ${i + 1}`}
                                                                            className="max-h-60 sm:max-h-[400px] w-full object-contain rounded border bg-white shadow-sm cursor-zoom-in"
                                                                            onClick={() => setPreviewImage(img)} />
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                q.solutionImage && (
                                                                    <img src={q.solutionImage} alt="Solution"
                                                                        className="mt-2 max-h-60 sm:max-h-[400px] w-full object-contain rounded border bg-white shadow-sm cursor-zoom-in"
                                                                        onClick={() => setPreviewImage(q.solutionImage)} />
                                                                )
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>

            {/* Hidden Print Component */}
            {showSolutions && fullTest && (
                <div className="hidden">
                    <PrintableResultReport
                        ref={componentRef}
                        result={result}
                        test={fullTest}
                        effectiveQuestions={effectiveQuestions}
                        percentage={percentage}
                        rankData={rankData}
                        maxMarks={maxMarks}
                    />
                </div>
            )}
        </div>
    );
}
