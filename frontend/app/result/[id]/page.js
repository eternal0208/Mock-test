'use client';
import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Award, ArrowLeft, Download, ChevronDown, ChevronUp, CheckCircle, XCircle, MinusCircle } from 'lucide-react';
import { API_BASE_URL } from '@/lib/config';
import Link from 'next/link';
import MathText from '@/components/ui/MathText';
import ImageViewer from '@/components/ui/ImageViewer';

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

/** normalize strings for comparisons/display */
const normalize = (v) => {
    if (v === null || v === undefined) return '';
    return String(v).trim();
};

/** Converts "Option 1" style strings to 'A', 'B', etc. for cleaner UI in PDF tests */
const formatPlaceholder = (text) => {
    const t = normalize(text);
    const match = t.match(/^Option (\d+)$/i);
    if (match) {
        const num = parseInt(match[1]);
        if (num >= 1 && num <= 26) return String.fromCharCode(64 + num);
    }
    return t;
};

/** Returns true if the student actually answered this question */
const isAnswered = (sel) => {
    if (sel === undefined || sel === null || sel === '') return false;
    if (Array.isArray(sel)) return sel.length > 0;
    return true;
};

/**
 * Resolve correct MCQ option.
 * Priority:
 *  1. attempt.correctAnswer  (stored at submit time — most reliable)
 *  2. q.correctOption from fullTest, resolving 'A'/'B'/'C'/'D' letters to text if needed
 */
const resolveCorrectOption = (attempt, q) => {
    // 1. Use stored correct answer from attempt (most reliable)
    let stored = normalize(attempt?.correctAnswer);

    // If it's a raw letter (A, B, C, D) -> try to resolve to "Option X" text
    const letterIdxMap = { A: 0, B: 1, C: 2, D: 3 };
    if (stored.length === 1 && letterIdxMap[stored.toUpperCase()] !== undefined) {
        const idx = letterIdxMap[stored.toUpperCase()];
        if (Array.isArray(q?.options)) {
            const optText = normalize(q.options[idx]);
            stored = optText ? optText : `Option ${idx + 1}`;
        } else {
            stored = `Option ${idx + 1}`;
        }
    }

    if (stored !== "") return stored;

    // 2. Fallback: use q.correctOption from fullTest
    const raw = normalize(q?.correctOption);
    if (raw !== "") {
        const letterIdx = letterIdxMap[raw.toUpperCase()];
        if (letterIdx !== undefined && Array.isArray(q.options)) {
            const optText = normalize(q.options[letterIdx]);
            return optText ? optText : `Option ${letterIdx + 1}`;
        }
        return raw;
    }

    // 3. Fallback: if student correct, their answer IS correct
    if (attempt?.isCorrect && attempt?.selectedOption) {
        return attempt.selectedOption;
    }

    return null;
};

/**
 * Resolve correct integer answer.
 * Priority: attempt.integerAnswer → q.integerAnswer
 */
const resolveIntegerAnswer = (attempt, q) => {
    if (attempt?.integerAnswer !== null && attempt?.integerAnswer !== undefined) return normalize(attempt.integerAnswer);
    if (q?.integerAnswer !== null && q?.integerAnswer !== undefined) return normalize(q.integerAnswer);
    return null;
};

/**
 * Resolve correct MSQ options array.
 * Priority: attempt.correctOptions → q.correctOptions
 */
const resolveCorrectOptions = (attempt, q) => {
    let opts = [];
    if (Array.isArray(attempt?.correctOptions) && attempt.correctOptions.length > 0) {
        opts = attempt.correctOptions;
    } else if (Array.isArray(q?.correctOptions) && q.correctOptions.length > 0) {
        opts = q.correctOptions;
    }

    const letterIdxMap = { A: 0, B: 1, C: 2, D: 3 };
    return opts.map(opt => {
        const n = normalize(opt);
        if (n.length === 1 && letterIdxMap[n.toUpperCase()] !== undefined) {
            const idx = letterIdxMap[n.toUpperCase()];
            if (Array.isArray(q?.options)) {
                return normalize(q.options[idx]) || `Option ${idx + 1}`;
            }
            return `Option ${idx + 1}`;
        }
        return n;
    });
};

/** Get question type. Priority: attempt.questionType → q.type → 'mcq' */
const getQType = (attempt, q) => attempt?.questionType || q?.type || 'mcq';

// ─────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────

export default function ResultPage() {
    const { id } = useParams();
    const { user } = useAuth();

    const [result, setResult] = useState(null);
    const [fullTest, setFullTest] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [rankData, setRankData] = useState({ rank: '-', total: '-' });
    const [percentileData, setPercentileData] = useState(null);
    const [previewImage, setPreviewImage] = useState(null);
    const [expandedQ, setExpandedQ] = useState(null);

    // ── Fetch result + test + percentile ──────────────────────
    useEffect(() => {
        if (!user) return;
        (async () => {
            try {
                const token = await user.getIdToken();
                const headers = { Authorization: `Bearer ${token}` };

                const res = await fetch(`${API_BASE_URL}/api/results/${id}`, { headers });
                if (!res.ok) throw new Error('Result not found');
                const resultData = await res.json();
                setResult(resultData);

                // Fetch test for question text / images / solutions
                const testId = resultData.testId?._id || resultData.testId;
                if (testId) {
                    const testRes = await fetch(`${API_BASE_URL}/api/tests/${testId}`, { headers });
                    if (testRes.ok) setFullTest(await testRes.json());
                }

                // Percentile data
                const percRes = await fetch(`${API_BASE_URL}/api/admin/percentile-data`, { headers });
                if (percRes.ok) setPercentileData(await percRes.json());
            } catch (e) {
                setError(e.message);
            } finally {
                setLoading(false);
            }
        })();
    }, [id, user]);

    // ── Fetch rank ────────────────────────────────────────────
    useEffect(() => {
        if (!result || !user) return;
        const testId = fullTest?._id || result.testId?._id || result.testId;
        if (!testId) return;
        (async () => {
            try {
                const token = await user.getIdToken();
                const res = await fetch(`${API_BASE_URL}/api/results/test/${testId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.ok) {
                    const all = await res.json();
                    const myRank = all.findIndex(r => r._id === result._id) + 1;
                    setRankData({ rank: myRank > 0 ? myRank : '-', total: all.length });
                }
            } catch (e) { /* silent */ }
        })();
    }, [fullTest, result, user]);

    // ─────────────────────────────────────────────────────────
    // LOADING / ERROR
    // ─────────────────────────────────────────────────────────
    if (loading) return <div className="p-8 text-center text-gray-500 text-sm">Loading result…</div>;
    if (error) return <div className="p-8 text-center text-red-500 font-bold">{error}</div>;
    if (!result) return <div className="p-8 text-center text-red-500">Result not found.</div>;

    // ─────────────────────────────────────────────────────────
    // DERIVED VALUES
    // ─────────────────────────────────────────────────────────
    const testMeta = fullTest || result.testDetails || { title: 'Test Result', total_marks: 100 };
    // Prefer server-computed effectiveTotalMarks (accounts for section attempt caps)
    const maxMarks = result.effectiveTotalMarks || Number(testMeta.total_marks) || 100;
    const percentage = ((result.score / maxMarks) * 100).toFixed(1);
    const skipped = (result.totalQuestions || 0) - (result.correctAnswers || 0) - (result.wrongAnswers || 0);
    const sectionCapSkipped = (result.attempt_data || []).filter(a => a.skippedDueToSectionCap).length;

    // Compute marks breakdown from attempt_data
    let correctMarks = 0;
    let negativeMarksLost = 0;
    let attemptedMarks = 0; // total marks of attempted questions
    (result.attempt_data || []).forEach(a => {
        const isAns = a.selectedOption !== undefined && a.selectedOption !== null &&
            (Array.isArray(a.selectedOption) ? a.selectedOption.length > 0 : a.selectedOption !== '');
        if (a.skippedDueToSectionCap) return; // don't count these
        if (isAns) {
            const qMarks = Number(a.marks || 4);
            const qNeg = Number(a.negativeMarks || 1);
            attemptedMarks += qMarks;
            if (a.isCorrect) {
                correctMarks += qMarks;
            } else {
                negativeMarksLost += qNeg;
            }
        }
    });

    // Percentile (JEE Main 300-mark tests only)
    let expectedPercentile = 'N/A', expectedRankRange = 'N/A';
    if (percentileData && testMeta.category === 'JEE Main' && maxMarks === 300) {
        const score = result.score;
        const mapping = (percentileData.overallMappings || []).find(m => {
            const rangeStr = String(m.marksRequired).replace(/\+/g, '');
            const parts = rangeStr.split('-');
            if (parts.length === 2) {
                return score >= parseInt(parts[0]) && score <= parseInt(parts[1]);
            } else if (String(m.marksRequired).includes('+')) {
                return score >= parseInt(parts[0]);
            }
            return false;
        });
        if (mapping) {
            expectedPercentile = mapping.percentileRange;
            expectedRankRange = mapping.expectedRankRange;
        } else if (score < 70) {
            expectedPercentile = '< 80.0 %ile';
            expectedRankRange = '> 2.5 Lakh';
        }
    }

    // Result visibility
    const checkAccess = () => {
        const mode = fullTest?.resultVisibility || 'immediate';
        if (mode === 'immediate') return true;
        if (mode === 'scheduled' && fullTest?.resultDeclarationTime)
            return new Date(fullTest.resultDeclarationTime) <= new Date();
        if (mode === 'afterTestEnds' && fullTest?.endTime)
            return new Date(fullTest.endTime) <= new Date();
        return true;
    };
    const showSolutions = checkAccess();

    // Build question list: prefer fullTest.questions, fall back to attempt_data reconstructed
    const questions = (fullTest?.questions?.length > 0)
        ? fullTest.questions
        : (result.attempt_data || []).map((a, i) => ({
            text: a.questionText || `Question ${i + 1}`,
            _reconstructed: true,
        }));

    // Map attempt_data by questionId for fast lookup
    const attemptByQId = {};
    (result.attempt_data || []).forEach(a => {
        if (a.questionId) attemptByQId[a.questionId] = a;
    });

    const testId = fullTest?._id || result.testId?._id || result.testId;

    /** Find the attempt entry for question at index idx */
    const getAttempt = (q, idx) => {
        if (q._reconstructed) return result.attempt_data?.[idx] || null;

        // Try deterministic ID (q_testId_idx)
        const deterministicId = `q_${testId}_${idx}`;
        if (attemptByQId[deterministicId]) return attemptByQId[deterministicId];

        // Try stored _id
        if (q._id && attemptByQId[q._id]) return attemptByQId[q._id];
        if (q._id && attemptByQId[String(q._id)]) return attemptByQId[String(q._id)];

        // Match by question text
        return (result.attempt_data || []).find(a => a.questionText && q.text && a.questionText === q.text) || null;
    };

    // ─────────────────────────────────────────────────────────
    // RENDER
    // ─────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-gray-50">
            <ImageViewer src={previewImage} onClose={() => setPreviewImage(null)} />

            {/* Top Bar */}
            <div className="bg-white border-b sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
                    <Link href="/dashboard" className="flex items-center text-gray-600 hover:text-gray-900 text-sm font-medium transition">
                        <ArrowLeft className="mr-1" size={18} /> Back
                    </Link>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4">

                {/* ── Score Card ── */}
                <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl shadow-lg text-white p-5 sm:p-8">
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

                    <div className="grid grid-cols-4 gap-2 sm:gap-4 pt-4 border-t border-white/20">
                        <div className="text-center">
                            <div className="text-lg sm:text-2xl font-bold flex items-center justify-center gap-1">
                                <Award size={16} className="text-yellow-300" />#{rankData.rank}
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
                            <div className="text-lg sm:text-2xl font-bold">{Math.floor((result.time_taken || 0) / 60)}m</div>
                            <div className="text-[10px] sm:text-xs opacity-60">Time</div>
                        </div>
                    </div>

                    {/* Percentile (JEE Main) */}
                    {testMeta.category === 'JEE Main' && maxMarks === 300 && expectedPercentile !== 'N/A' && (
                        <div className="mt-6 p-4 bg-white/10 rounded-xl border border-white/20">
                            <h4 className="text-white/80 text-xs font-bold uppercase tracking-widest mb-3 text-center">
                                AI Predictive Analysis (Based on 2024/2025 Difficulty)
                            </h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="text-center">
                                    <div className="text-2xl sm:text-3xl font-black text-yellow-300">{expectedPercentile}</div>
                                    <div className="text-xs text-blue-100 font-medium mt-1">Expected Percentile</div>
                                </div>
                                <div className="text-center border-l border-white/20">
                                    <div className="text-2xl sm:text-3xl font-black text-green-300">AIR {expectedRankRange}</div>
                                    <div className="text-xs text-blue-100 font-medium mt-1">Expected Rank Range</div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Data Integrity Warning ── */}
                {(() => {
                    const totalQ = questions.length;
                    const ansCount = questions.filter(q => q.correctOption || (q.correctOptions && q.correctOptions.length > 0) || (q.integerAnswer !== undefined && q.integerAnswer !== '')).length;
                    const isBroken = totalQ > 0 && ansCount === 0;

                    if (!isBroken) return null;

                    return (
                        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 flex gap-4 items-start shadow-sm">
                            <div className="bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center shrink-0 font-bold mt-0.5 whitespace-nowrap">!</div>
                            <div>
                                <h3 className="text-red-800 font-bold text-sm sm:text-base">Answer Key Missing</h3>
                                <p className="text-red-600 text-xs sm:text-sm mt-1 leading-relaxed">
                                    The administration has not yet uploaded the answer key for this test.
                                    <strong> Your score and highlights will not be accurate </strong> until the answers are marked.
                                    Please check back later.
                                </p>
                            </div>
                        </div>
                    );
                })()}

                {/* ── Stats Chips ── */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                    <div className="bg-green-50 border border-green-200 rounded-xl p-3 sm:p-4 text-center">
                        <div className="text-xl sm:text-2xl font-black text-green-600">{result.correctAnswers || 0}</div>
                        <div className="text-[10px] sm:text-xs text-green-700 font-medium">Correct</div>
                        <div className="text-[10px] text-green-500 font-bold mt-0.5">+{correctMarks} marks</div>
                    </div>
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3 sm:p-4 text-center">
                        <div className="text-xl sm:text-2xl font-black text-red-600">{result.wrongAnswers || 0}</div>
                        <div className="text-[10px] sm:text-xs text-red-700 font-medium">Incorrect</div>
                        <div className="text-[10px] text-red-500 font-bold mt-0.5">-{negativeMarksLost} marks</div>
                    </div>
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 sm:p-4 text-center">
                        <div className="text-xl sm:text-2xl font-black text-gray-500">{skipped > 0 ? skipped : 0}</div>
                        <div className="text-[10px] sm:text-xs text-gray-600 font-medium">Skipped</div>
                        <div className="text-[10px] text-gray-400 font-bold mt-0.5">0 marks</div>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 sm:p-4 text-center">
                        <div className="text-xl sm:text-2xl font-black text-blue-600">{attemptedMarks}</div>
                        <div className="text-[10px] sm:text-xs text-blue-700 font-medium">Attempted Marks</div>
                        <div className="text-[10px] text-blue-400 font-bold mt-0.5">of {maxMarks} total</div>
                    </div>
                </div>

                {/* ── Section Cap Notice ── */}
                {sectionCapSkipped > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 items-start">
                        <div className="text-amber-500 text-xl shrink-0">⚠️</div>
                        <div>
                            <h4 className="text-amber-800 font-bold text-sm">Section Attempt Limit Applied</h4>
                            <p className="text-amber-700 text-xs mt-1">
                                {sectionCapSkipped} response(s) were not scored because they exceeded the maximum attempt limit for their section.
                                Only the first N attempts per section are counted towards your score (as per the test rules).
                            </p>
                        </div>
                    </div>
                )}

                {/* ── Solutions ── */}
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
                        {/* Solution PDF download */}
                        {fullTest?.solutionPdf && (
                            <a href={fullTest.solutionPdf} target="_blank" rel="noopener noreferrer"
                                className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl p-4 hover:bg-blue-100 transition">
                                <div>
                                    <h3 className="font-bold text-blue-800 text-sm">Full Solution PDF</h3>
                                    <p className="text-xs text-blue-600">Download solution key</p>
                                </div>
                                <Download size={20} className="text-blue-600" />
                            </a>
                        )}

                        {/* Question Navigator */}
                        <div>
                            <h3 className="font-bold text-gray-800 text-sm mb-2">Question Navigator</h3>
                            <div className="flex flex-wrap gap-1.5">
                                {questions.map((q, idx) => {
                                    const att = getAttempt(q, idx);
                                    const attempted = isAnswered(att?.selectedOption);
                                    const correct = att?.isCorrect;
                                    let bg = 'bg-gray-200 text-gray-600';
                                    if (attempted && correct) bg = 'bg-green-500 text-white';
                                    else if (attempted) bg = 'bg-red-500 text-white';
                                    return (
                                        <button key={idx}
                                            onClick={() => {
                                                setExpandedQ(idx);
                                                document.getElementById(`q-${idx}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                            }}
                                            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg text-xs font-bold ${bg} transition hover:scale-110`}>
                                            {idx + 1}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {!fullTest && (
                            <div className="text-xs text-red-500 bg-red-50 p-2 rounded border border-red-100">
                                Note: Original test data unavailable. Showing limited question details.
                            </div>
                        )}

                        {/* ── Question List ── */}
                        <div className="space-y-3">
                            {questions.map((q, idx) => {
                                const attempt = getAttempt(q, idx);
                                const selectedOpt = attempt?.selectedOption;
                                const attempted = isAnswered(selectedOpt);
                                const isCorrect = attempt?.isCorrect ?? false;
                                const isExpanded = expandedQ === idx;

                                // Resolved correct-answer data — attempt_data is source of truth
                                const qType = getQType(attempt, q);
                                const correctOptText = resolveCorrectOption(attempt, q);   // MCQ
                                const correctOpts = resolveCorrectOptions(attempt, q); // MSQ
                                const intAnswer = resolveIntegerAnswer(attempt, q);  // INT

                                // Status
                                let StatusIcon = MinusCircle, statusColor = 'text-gray-400', statusLabel = 'Skipped';
                                if (attempted && isCorrect) { StatusIcon = CheckCircle; statusColor = 'text-green-500'; statusLabel = 'Correct'; }
                                else if (attempted) { StatusIcon = XCircle; statusColor = 'text-red-500'; statusLabel = 'Incorrect'; }

                                // Marks display
                                const marksDisplay = isCorrect
                                    ? `+${attempt?.marks ?? q.marks ?? 4}`
                                    : attempted
                                        ? `-${attempt?.negativeMarks ?? q.negativeMarks ?? 1}`
                                        : '0';

                                // Is a given option the correct answer?
                                const isOptCorrect = (optVal) => {
                                    const normVal = normalize(optVal);
                                    if (qType === 'msq') return correctOpts.map(normalize).includes(normVal);
                                    if (correctOptText) return normalize(correctOptText) === normVal;
                                    // If no correct answer known but student got this right, their selection is correct
                                    if (isCorrect && attempted) return normalize(optVal) === normalize(selectedOpt);
                                };

                                return (
                                    <div key={idx} id={`q-${idx}`} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">

                                        {/* ── Always-visible header ── */}
                                        <button onClick={() => setExpandedQ(isExpanded ? null : idx)}
                                            className="w-full flex items-center justify-between px-3 sm:px-4 py-3 text-left hover:bg-gray-50 transition">
                                            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                                                <span className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold
                                                    ${attempted ? (isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700') : 'bg-gray-100 text-gray-500'}`}>
                                                    {idx + 1}
                                                </span>
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold border border-indigo-100">
                                                        {qType === 'integer' ? 'INT' : qType === 'msq' ? 'MSQ' : qType === 'matching' ? 'MATCH' : 'MCQ'}
                                                    </span>
                                                    <StatusIcon size={16} className={statusColor} />
                                                    <span className={`text-xs font-semibold ${statusColor}`}>{statusLabel}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <span className="text-xs font-bold text-gray-400">{marksDisplay}</span>
                                                {isExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                                            </div>
                                        </button>

                                        {/* ── Expanded content ── */}
                                        {isExpanded && (
                                            <div className="px-3 sm:px-4 pb-4 border-t border-gray-100">

                                                {/* Skipped notice */}
                                                {!attempted && (
                                                    <div className="mt-3 flex items-center gap-2 text-yellow-700 bg-yellow-50 border border-yellow-200 px-3 py-2 rounded-lg text-xs sm:text-sm">
                                                        ⚠️ <span className="font-medium">You <strong>skipped</strong> this question.</span>
                                                    </div>
                                                )}

                                                {/* Question text + image */}
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

                                                {/* ── Matrix Match pairs ── */}
                                                {qType === 'matching' && q.matchPairs && q.matchPairs.length > 0 && (
                                                    <div className="mb-4 flex flex-col md:flex-row gap-4 w-full">
                                                        <div className="flex-1 bg-white border border-gray-200 rounded-lg shadow-sm">
                                                            <div className="bg-gray-50 border-b px-2 py-1 font-bold text-[10px] text-gray-500 text-center rounded-t-lg">List I</div>
                                                            <div className="p-0">
                                                                {q.matchPairs.map((pair, pIdx) => (
                                                                    <div key={pIdx} className="flex border-b last:border-0 hover:bg-gray-50 transition items-center">
                                                                        <div className="px-2 py-2 w-8 text-center text-xs font-bold text-gray-400 bg-gray-50 border-r self-stretch flex items-center justify-center">{pIdx + 1}</div>
                                                                        <div className="px-3 py-2 text-xs sm:text-sm"><MathText text={pair.left || '-'} /></div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                        <div className="flex-1 bg-white border border-gray-200 rounded-lg shadow-sm">
                                                            <div className="bg-gray-50 border-b px-2 py-1 font-bold text-[10px] text-gray-500 text-center rounded-t-lg">List II</div>
                                                            <div className="p-0">
                                                                {q.matchPairs.map((pair, pIdx) => (
                                                                    <div key={pIdx} className="flex border-b last:border-0 hover:bg-gray-50 transition items-center">
                                                                        <div className="px-2 py-2 w-8 text-center text-xs font-bold text-gray-400 bg-gray-50 border-r self-stretch flex items-center justify-center">{String.fromCharCode(80 + pIdx)}</div>
                                                                        <div className="px-3 py-2 text-xs sm:text-sm"><MathText text={pair.right || '-'} /></div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* ── MCQ / MSQ options ── */}
                                                {qType !== 'integer' && q.options && q.options.length > 0 && (
                                                    <div className="space-y-1.5 mb-4">
                                                        {q.options.map((opt, optIdx) => {
                                                            const effectiveOpt = opt || `Option ${optIdx + 1}`;
                                                            const isSelected = attempted &&
                                                                (Array.isArray(selectedOpt) ? selectedOpt.includes(effectiveOpt) : selectedOpt === effectiveOpt);
                                                            const isCorrectOpt = isOptCorrect(effectiveOpt);

                                                            let bg = 'bg-white border-gray-200';
                                                            let badge = null;
                                                            if (isSelected && isCorrectOpt) {
                                                                bg = 'bg-green-50 border-green-400 ring-1 ring-green-400';
                                                                badge = <span className="text-[10px] sm:text-xs font-bold text-green-700 bg-green-100 px-1.5 py-0.5 rounded whitespace-nowrap">✓ Correct</span>;
                                                            } else if (isCorrectOpt) {
                                                                bg = 'bg-green-50 border-green-400';
                                                                badge = <span className="text-[10px] sm:text-xs font-bold text-green-700 bg-green-100 px-1.5 py-0.5 rounded whitespace-nowrap">✓ Correct Answer</span>;
                                                            } else if (isSelected) {
                                                                bg = 'bg-red-50 border-red-400 ring-1 ring-red-400';
                                                                badge = <span className="text-[10px] sm:text-xs font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded whitespace-nowrap">✗ Your Answer</span>;
                                                            }

                                                            return (
                                                                <div key={optIdx} className={`flex items-start gap-2 p-2.5 sm:p-3 rounded-lg border ${bg}`}>
                                                                    <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 flex items-center justify-center font-bold text-[10px] sm:text-xs shrink-0 mt-0.5
                                                                        ${isCorrectOpt ? 'bg-green-500 border-green-500 text-white' :
                                                                            isSelected ? 'bg-red-500 border-red-500 text-white' :
                                                                                'border-gray-300 text-gray-400 bg-white'}`}>
                                                                        {String.fromCharCode(65 + optIdx)}
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className={`text-xs sm:text-sm ${isCorrectOpt || isSelected ? 'font-medium text-gray-900' : 'text-gray-600'}`}>
                                                                            <MathText text={effectiveOpt} />
                                                                        </div>
                                                                        {q.optionImages?.[optIdx] && (
                                                                            <img src={q.optionImages[optIdx]} alt={`Opt ${optIdx}`}
                                                                                className="mt-1.5 max-h-12 sm:max-h-16 object-contain rounded border bg-white cursor-zoom-in"
                                                                                onClick={e => { e.stopPropagation(); setPreviewImage(q.optionImages[optIdx]); }} />
                                                                        )}
                                                                    </div>
                                                                    {badge && <div className="shrink-0 self-center">{badge}</div>}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}

                                                {/* ── Integer answer block ── */}
                                                {qType === 'integer' && (
                                                    <div className={`p-3 sm:p-4 rounded-lg mb-4 border
                                                        ${attempted ? (isCorrect ? 'bg-green-50 border-green-400' : 'bg-red-50 border-red-400') : 'bg-gray-50 border-gray-200'}`}>
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div>
                                                                <div className={`text-[10px] sm:text-xs font-bold mb-1 ${attempted && !isCorrect ? 'text-red-600' : 'text-gray-500'}`}>YOUR ANSWER</div>
                                                                <div className={`font-mono text-xl sm:text-2xl font-black
                                                                    ${isCorrect ? 'text-green-600' : attempted ? 'text-red-600' : 'text-gray-400'}`}>
                                                                    {attempted ? <MathText text={String(selectedOpt)} /> : '—'}
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <div className="text-[10px] sm:text-xs font-bold mb-1 text-green-700">CORRECT ANSWER</div>
                                                                <div className="font-mono text-xl sm:text-2xl font-black text-green-600">
                                                                    {intAnswer != null ? <MathText text={String(intAnswer)} /> : '—'}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* ── MCQ / MSQ answer summary ── */}
                                                {qType !== 'integer' && (
                                                    <div className={`p-3 rounded-xl border-2 mb-3
                                                        ${attempted ? (isCorrect ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300') : 'bg-yellow-50 border-yellow-300'}`}>
                                                        <div className="flex items-center justify-between gap-3">
                                                            <div className="min-w-0 flex-1">
                                                                <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Your Answer</div>
                                                                <div className={`text-sm font-bold ${attempted ? (isCorrect ? 'text-green-700' : 'text-red-700') : 'text-gray-400'}`}>
                                                                    {attempted
                                                                        ? (Array.isArray(selectedOpt)
                                                                            ? selectedOpt.map((o, i) => <MathText key={i} text={formatPlaceholder(o)} className="inline mr-1" />)
                                                                            : <MathText text={formatPlaceholder(selectedOpt)} />)
                                                                        : 'Skipped'}
                                                                </div>
                                                            </div>
                                                            <div className="text-right min-w-0 flex-1">
                                                                <div className="text-[10px] font-bold uppercase tracking-widest text-green-700">Correct Answer</div>
                                                                <div className="text-sm font-bold text-green-600">
                                                                    {qType === 'msq'
                                                                        ? (correctOpts.length > 0
                                                                            ? correctOpts.map((o, i) => <MathText key={i} text={formatPlaceholder(o)} className="inline mr-1" />)
                                                                            : '—')
                                                                        : (correctOptText
                                                                            ? <MathText text={formatPlaceholder(correctOptText)} />
                                                                            : (isCorrect && attempted ? <MathText text={formatPlaceholder(selectedOpt)} /> : '—'))
                                                                    }
                                                                </div>
                                                            </div>
                                                            <div className="text-lg shrink-0">
                                                                {attempted ? (isCorrect ? '✅' : '❌') : '⏭️'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* ── Solution ── */}
                                                {(q.solution || q.solutionImage || q.solutionImages?.length > 0) && (
                                                    <div className="mt-3 pt-3 border-t border-gray-100">
                                                        <h4 className="text-xs sm:text-sm text-blue-900 font-bold mb-2 flex items-center gap-1.5">
                                                            💡 Solution
                                                        </h4>
                                                        <div className="bg-blue-50/50 rounded-lg p-3 sm:p-4 text-gray-800">
                                                            {q.solution && (
                                                                <div className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap mb-2">
                                                                    <MathText text={q.solution} />
                                                                </div>
                                                            )}
                                                            {q.solutionImages?.length > 0 ? (
                                                                <div className="grid grid-cols-1 gap-3">
                                                                    {q.solutionImages.map((img, i) => (
                                                                        <img key={i} src={img} alt={`Solution ${i + 1}`}
                                                                            className="max-h-60 sm:max-h-[400px] w-full object-contain rounded border bg-white shadow-sm cursor-zoom-in"
                                                                            onClick={() => setPreviewImage(img)} />
                                                                    ))}
                                                                </div>
                                                            ) : q.solutionImage && (
                                                                <img src={q.solutionImage} alt="Solution"
                                                                    className="max-h-60 sm:max-h-[400px] w-full object-contain rounded border bg-white shadow-sm cursor-zoom-in"
                                                                    onClick={() => setPreviewImage(q.solutionImage)} />
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
        </div>
    );
}
