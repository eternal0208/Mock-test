'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useAntiCheating } from '@/hooks/useAntiCheating';
import { Clock, AlertTriangle, User, Info, ChevronRight, ChevronLeft, Maximize2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import MathText from '@/components/ui/MathText';
import Calculator from './Tools/Calculator';

import { Calculator as CalcIcon, PenTool, X } from 'lucide-react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

const ImageZoomModal = ({ imageUrl, onClose }) => {
    if (!imageUrl) return null;
    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[110] p-4 animate-in fade-in duration-200" onClick={onClose}>
            <button className="absolute top-6 right-6 text-white hover:text-gray-300 transition-colors" onClick={onClose}>
                <X size={32} />
            </button>
            <div className="max-w-full max-h-full overflow-auto flex items-center justify-center" onClick={e => e.stopPropagation()}>
                <img
                    src={imageUrl}
                    alt="Zoom"
                    className="max-w-[95vw] max-h-[90vh] object-contain shadow-2xl rounded"
                />
            </div>
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-white/10 backdrop-blur rounded-full text-white/60 text-xs font-bold pointer-events-none">
                Click anywhere to close
            </div>
        </div>
    );
};

const ExamInterface = ({ test, onSubmit }) => {
    // MODES: 'instruction' | 'countdown' | 'test' | 'feedback'
    const [mode, setMode] = useState('instruction');
    const [instructionsRead, setInstructionsRead] = useState(false);
    const [countdown, setCountdown] = useState(3);

    // Exam State
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState({});
    const [questionStatus, setQuestionStatus] = useState({});
    const [timeLeft, setTimeLeft] = useState(test.duration_minutes * 60);

    // Subjects & Sections
    const [activeSubject, setActiveSubject] = useState(null); // 'Physics', etc.
    const [activeSection, setActiveSection] = useState(null); // null = All Sections
    const [subjects, setSubjects] = useState([]);
    const [sectionsMap, setSectionsMap] = useState({}); // { Physics: ['Section A', 'Section B'] }

    // Feedback
    const [feedback, setFeedback] = useState({ rating: 0, comment: '' });
    const [submittingFeedback, setSubmittingFeedback] = useState(false);

    // Tools State
    const [showCalculator, setShowCalculator] = useState(false);
    const [zoomedImg, setZoomedImg] = useState(null);
    // Anti-cheat state (desktop only)
    const [tabSwitchCount, setTabSwitchCount] = useState(0);
    const [tabWarningMsg, setTabWarningMsg] = useState(null);
    const tabSwitchCountRef = useRef(0);
    const touchRef = useRef({ startX: 0, endX: 0 });
    // const { warnings } = useAntiCheating((msg) => alert(msg));
    const timerRef = useRef(null);
    const longPressTimerRef = useRef(null);
    const router = useRouter();

    // Map DB size classes to Tailwind classes
    const getQuestionImageSize = (size) => {
        if (size === 'small') return 'max-h-[150px] md:max-h-[200px]';
        if (size === 'large') return 'max-h-[500px] md:max-h-[700px]';
        return 'max-h-[300px] md:max-h-[400px]'; // default medium
    };

    const getOptionImageSize = (size) => {
        if (size === 'small') return 'max-h-12 md:max-h-16'; // ~48px/64px
        if (size === 'large') return 'max-h-40 md:max-h-56'; // ~160px/224px
        return 'max-h-24 md:max-h-32'; // default medium ~96px/128px
    };

    // Init Subjects and sectionsMap
    useEffect(() => {
        if (test.questions && test.questions.length > 0) {
            // Extract Unique Subjects, preserve order
            const subs = [...new Set(test.questions.map(q => q.subject || 'General'))];
            setSubjects(subs);
            setActiveSubject(subs[0]);
            setActiveSection(null);

            // Build sections map: { subject: [section1, section2, ...] }
            const map = {};
            test.questions.forEach(q => {
                const sub = q.subject || 'General';
                const sec = q.section || '';
                if (sec) {
                    if (!map[sub]) map[sub] = [];
                    if (!map[sub].includes(sec)) map[sub].push(sec);
                }
            });
            setSectionsMap(map);
        }
    }, [test]);

    // Init Status
    useEffect(() => {
        const initialStatus = {};
        test.questions.forEach((q) => {
            initialStatus[q._id] = 'not_visited';
        });
        if (test.questions.length > 0) initialStatus[test.questions[0]._id] = 'not_answered';
        setQuestionStatus(initialStatus);
    }, [test]);

    // Countdown Logic
    useEffect(() => {
        if (mode === 'countdown') {
            const interval = setInterval(() => {
                setCountdown((prev) => {
                    if (prev === 1) {
                        clearInterval(interval);
                        setMode('test');
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [mode]);

    // Timer Logic
    useEffect(() => {
        if (mode === 'test') {
            if (timeLeft <= 0) {
                handleSubmitTest(true);
                return;
            }
            timerRef.current = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        clearInterval(timerRef.current);
                        handleSubmitTest(true);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(timerRef.current);
        }
    }, [timeLeft, mode]);

    // Anti-Cheating Logic (Desktop Only)
    useEffect(() => {
        if (mode !== 'test') return;

        // Only enforce on non-mobile devices
        const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
        if (isMobile) return;

        const MAX_WARNINGS = 2;

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') return; // only care when coming back
            // We detect the tab-switch on `hidden`
        };

        const handleBlur = () => {
            // window lost focus → user switched tab or browser
            const newCount = tabSwitchCountRef.current + 1;
            tabSwitchCountRef.current = newCount;
            setTabSwitchCount(newCount);

            if (newCount > MAX_WARNINGS) {
                // 3rd violation → auto-submit immediately
                handleSubmitTest(true);
            } else {
                // Show warning overlay
                const remaining = MAX_WARNINGS - newCount + 1;
                setTabWarningMsg(
                    `⚠️ Warning ${newCount}/${MAX_WARNINGS}: Tab/browser switch detected! ${remaining > 0 ? `${remaining} warning${remaining > 1 ? 's' : ''} remaining before auto-submit.` : 'Next violation will auto-submit the test.'}`
                );
                // Auto-hide warning after 5 seconds
                setTimeout(() => setTabWarningMsg(null), 5000);
            }
        };

        const handleBeforeUnload = (e) => {
            // Browser close / refresh → immediate auto-submit on desktop
            handleSubmitTest(true);
            e.preventDefault();
            e.returnValue = '';
        };

        window.addEventListener('blur', handleBlur);
        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('blur', handleBlur);
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mode]);

    // Intelligent Image Preloading Queue
    useEffect(() => {
        if (!['test', 'instruction'].includes(mode) || !test?.questions?.length) return;

        // Initialize global cache if not present (prevents redundant fetches)
        if (!window.__preloadedImages) {
            window.__preloadedImages = new Set();
        }

        let isCancelled = false;

        const preloadImages = async () => {
            // Build priority array: current, current+1, current+2... then current-1, current-2...
            const total = test.questions.length;
            const priorityIndices = [currentQuestionIndex];

            let i = 1;
            while (currentQuestionIndex + i < total || currentQuestionIndex - i >= 0) {
                if (currentQuestionIndex + i < total) priorityIndices.push(currentQuestionIndex + i);
                if (currentQuestionIndex - i >= 0) priorityIndices.push(currentQuestionIndex - i);
                i++;
            }

            // Extract all un-cached URLs logically ordered by proximity to current question
            const urlsToLoad = [];
            for (const idx of priorityIndices) {
                const q = test.questions[idx];
                if (q.image && !window.__preloadedImages.has(q.image)) urlsToLoad.push(q.image);
                if (q.optionImages && Array.isArray(q.optionImages)) {
                    for (const optImg of q.optionImages) {
                        if (optImg && !window.__preloadedImages.has(optImg)) urlsToLoad.push(optImg);
                    }
                }
            }

            // Waterfall load to preserve bandwidth and stability
            for (const url of urlsToLoad) {
                if (isCancelled) break; // Hard abort if user jumped to a different question

                try {
                    await new Promise((resolve) => {
                        const img = new Image();
                        img.src = url;
                        img.onload = () => {
                            window.__preloadedImages.add(url);
                            resolve();
                        };
                        img.onerror = resolve; // Continue gracefully even if one image fails
                    });
                } catch (e) {
                    console.error("Preload error:", e);
                }
            }
        };

        preloadImages();

        return () => {
            isCancelled = true; // Cleanup flag immediately aborts the previous queue natively
        };
    }, [currentQuestionIndex, mode, test.questions]);

    // --- Actions ---

    const startTest = () => {
        if (instructionsRead) setMode('countdown');
        else alert("Please confirm you have read the instructions.");
    };

    const handleSubjectChange = (subj) => {
        setActiveSubject(subj);
        setActiveSection(null); // reset section when switching subject
        // Jump to first question of that subject
        const idx = test.questions.findIndex(q => (q.subject || 'General') === subj);
        if (idx !== -1) setCurrentQuestionIndex(idx);
    };

    const handleSectionChange = (sec) => {
        setActiveSection(sec); // null = All
        // Jump to first question in this section (within active subject)
        const idx = test.questions.findIndex(q =>
            (q.subject || 'General') === activeSubject &&
            (sec === null || (q.section || '') === sec)
        );
        if (idx !== -1) setCurrentQuestionIndex(idx);
    };

    // Helper: get sectionMeta for a specific subject+section
    const getSectionMeta = (subject, section) => {
        if (!test.sectionMeta || !section) return null;
        return test.sectionMeta.find(m => m.subject === subject && m.section === section) || null;
    };

    // Count answered questions in a subject+section
    const countAnsweredInSection = (subject, section) => {
        return test.questions.filter(q => {
            if ((q.subject || 'General') !== subject) return false;
            if ((q.section || '') !== section) return false;
            const status = questionStatus[q._id] || 'not_visited';
            return status === 'answered' || status === 'marked_answered';
        }).length;
    };

    const handleAnswerChange = (val) => {
        const q = test.questions[currentQuestionIndex];
        const qId = q._id;
        const sub = q.subject || 'General';
        const sec = q.section || '';

        // Enforce optional attempt limit for this section
        const meta = getSectionMeta(sub, sec);
        if (meta?.requiredAttempts) {
            const alreadyAnswered = answers[qId] !== undefined && answers[qId] !== '' && answers[qId] !== null;
            if (!alreadyAnswered) {
                const answeredCount = countAnsweredInSection(sub, sec);
                if (answeredCount >= meta.requiredAttempts) {
                    alert(`This section allows attempting any ${meta.requiredAttempts} questions. You have already answered ${answeredCount}. Clear another answer first.`);
                    return;
                }
            }
        }

        setAnswers({ ...answers, [qId]: val });
    };

    const handleMSQChange = (option) => {
        const qId = test.questions[currentQuestionIndex]._id;
        let currentAns = answers[qId] || [];
        if (!Array.isArray(currentAns)) currentAns = [];
        if (currentAns.includes(option)) currentAns = currentAns.filter(o => o !== option);
        else currentAns.push(option);
        setAnswers({ ...answers, [qId]: currentAns });
    };

    const isAnswered = (qId) => {
        const ans = answers[qId];
        return Array.isArray(ans) ? ans.length > 0 : (ans !== undefined && ans !== '' && ans !== null);
    };

    const updateStatus = (id, status) => setQuestionStatus(prev => ({ ...prev, [id]: status }));

    const handleNext = () => {
        const currentQ = test.questions[currentQuestionIndex];
        if (isAnswered(currentQ._id)) updateStatus(currentQ._id, 'answered');
        else updateStatus(currentQ._id, 'not_answered');

        if (currentQuestionIndex < test.questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
            const nextQId = test.questions[currentQuestionIndex + 1]._id;
            if (questionStatus[nextQId] === 'not_visited') updateStatus(nextQId, 'not_answered');

            // Auto switch subject tab if subject changes
            const nextSubject = test.questions[currentQuestionIndex + 1].subject || 'General';
            if (nextSubject !== activeSubject) setActiveSubject(nextSubject);
        }
    };

    const handlePrev = () => {
        if (currentQuestionIndex > 0) {
            const currentQ = test.questions[currentQuestionIndex];
            if (isAnswered(currentQ._id)) updateStatus(currentQ._id, 'answered');
            else updateStatus(currentQ._id, 'not_answered');

            setCurrentQuestionIndex(prev => prev - 1);
            const prevSubject = test.questions[currentQuestionIndex - 1].subject || 'General';
            if (prevSubject !== activeSubject) setActiveSubject(prevSubject);
        }
    };

    const handleMarkForReview = () => {
        const currentQ = test.questions[currentQuestionIndex];
        if (isAnswered(currentQ._id)) updateStatus(currentQ._id, 'marked_answered');
        else updateStatus(currentQ._id, 'marked');

        if (currentQuestionIndex < test.questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
            const nextQId = test.questions[currentQuestionIndex + 1]._id;
            if (questionStatus[nextQId] === 'not_visited') updateStatus(nextQId, 'not_answered');
            const nextSubject = test.questions[currentQuestionIndex + 1].subject || 'General';
            if (nextSubject !== activeSubject) setActiveSubject(nextSubject);
        }
    };

    const handleClearResponse = () => {
        const qId = test.questions[currentQuestionIndex]._id;
        const newAnswers = { ...answers };
        delete newAnswers[qId];
        setAnswers(newAnswers);
        updateStatus(qId, 'not_answered');
    };

    const handlePaletteClick = (idx) => {
        setCurrentQuestionIndex(idx);
        const qId = test.questions[idx]._id;
        if (questionStatus[qId] === 'not_visited') updateStatus(qId, 'not_answered');
        const subj = test.questions[idx].subject || 'General';
        setActiveSubject(subj);
    };

    const handleSubmitTest = (force = false) => {
        console.log("handleSubmitTest triggered", { force });
        if (!force && !confirm("Are you sure you want to submit?")) return;

        if (force) {
            // Direct submission (Timer end / Tab close)
            const formattedAnswers = Object.entries(answers).map(([qId, opt]) => ({
                questionId: qId,
                selectedOption: opt
            }));

            onSubmit({
                answers: formattedAnswers,
                timeTaken: (test.duration_minutes * 60) - timeLeft,
                feedback: { rating: 0, comment: 'Auto-submitted' }
            });
        } else {
            setMode('feedback');
            console.log("Mode set to feedback");
        }
    };

    const submitFeedbackAndFinish = () => {
        setSubmittingFeedback(true);
        const formattedAnswers = Object.entries(answers).map(([qId, opt]) => ({
            questionId: qId,
            selectedOption: opt
        }));

        onSubmit({
            answers: formattedAnswers,
            timeTaken: (test.duration_minutes * 60) - timeLeft,
            feedback
        });
    };

    // --- Renders ---

    if (mode === 'instruction') {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
                <div className="bg-white max-w-3xl w-full p-8 rounded-lg shadow-xl">
                    <h1 className="text-3xl font-bold text-center mb-6 border-b pb-4 text-blue-900">{test.title} - Instructions</h1>
                    <div className="prose max-w-none mb-8 text-gray-700 whitespace-pre-wrap leading-relaxed bg-gray-50 p-6 rounded border">
                        {test.instructions || "No custom instructions. Standard NTA JEE rules apply."}
                    </div>
                    <div className="flex items-center space-x-3 mb-6 p-4 bg-blue-50 rounded border border-blue-100">
                        <input
                            type="checkbox"
                            id="confirm"
                            checked={instructionsRead}
                            onChange={(e) => setInstructionsRead(e.target.checked)}
                            className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <label htmlFor="confirm" className="font-semibold text-gray-800 cursor-pointer select-none">
                            I have read and understood the instructions. I agree to abide by the rules.
                        </label>
                    </div>
                    <button
                        onClick={startTest}
                        disabled={!instructionsRead}
                        className={`w-full py-4 rounded-lg font-bold text-xl shadow-lg transition-all transform ${instructionsRead ? 'bg-green-600 hover:bg-green-700 text-white hover:scale-105' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                    >
                        START TEST
                    </button>
                </div>
            </div>
        );
    }

    if (mode === 'countdown') {
        return (
            <div className="h-screen bg-gradient-to-br from-blue-900 to-black flex items-center justify-center">
                <div className="text-white text-9xl font-black animate-ping">
                    {countdown}
                </div>
            </div>
        );
    }

    if (mode === 'feedback') {
        console.log("Rendering Feedback Mode");
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
                <div className="bg-white max-w-md w-full p-8 rounded-lg shadow-2xl text-center">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Test Completed! 🎉</h2>
                    <p className="text-gray-500 mb-6">Rate your experience (optional) then view your results.</p>

                    <div className="flex justify-center space-x-2 mb-6">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button
                                key={star}
                                onClick={() => setFeedback({ ...feedback, rating: star })}
                                className={`text-3xl focus:outline-none transition transform hover:scale-110 ${feedback.rating >= star ? 'text-yellow-400' : 'text-gray-300'}`}
                            >
                                ★
                            </button>
                        ))}
                    </div>

                    <textarea
                        className="w-full border p-3 rounded-lg mb-6 focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="Any comments? (Optional)"
                        rows={3}
                        value={feedback.comment}
                        onChange={(e) => setFeedback({ ...feedback, comment: e.target.value })}
                    />

                    <button
                        onClick={submitFeedbackAndFinish}
                        disabled={submittingFeedback}
                        className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 transition"
                    >
                        {submittingFeedback ? 'Submitting...' : 'View Result →'}
                    </button>
                </div>
            </div>
        );
    }

    // TEST MODE
    const currentQ = test.questions[currentQuestionIndex];
    if (!currentQ) return (
        <div className="p-10 flex flex-col items-center justify-center min-h-[50vh]">
            <DotLottieReact
                src="https://lottie.host/585eaa49-82ac-4ffe-8958-524df205393d/GCwqhgbTtp.lottie"
                loop
                autoplay
                className="w-32 h-32 md:w-48 md:h-48 mb-4"
            />
            <span className="text-gray-500 font-bold">Loading Question...</span>
        </div>
    );
    const currentType = currentQ.type || 'mcq';

    return (
        <div className="flex flex-col h-screen bg-white select-none">
            {/* Tab Switch Warning Toast (Desktop Only) */}
            {tabWarningMsg && (
                <div className={`fixed top-0 left-0 right-0 z-[200] flex items-center justify-between px-4 py-3 text-white text-sm font-bold shadow-lg animate-in slide-in-from-top duration-300 ${tabSwitchCount >= 2 ? 'bg-red-700' : 'bg-orange-500'}`}>
                    <div className="flex items-center gap-3">
                        <span className="text-xl">⚠️</span>
                        <span>{tabWarningMsg}</span>
                    </div>
                    <button onClick={() => setTabWarningMsg(null)} className="ml-4 text-white/80 hover:text-white text-lg leading-none">✕</button>
                </div>
            )}
            {/* Header */}
            <header className="bg-blue-700 text-white shadow sticky top-0 z-50">
                <div className="h-14 md:h-16 flex justify-between items-center px-2 md:px-4">
                    <h1 className="text-sm md:text-lg font-bold truncate max-w-[200px] md:max-w-md ml-1">{test.title}</h1>
                    <div className="flex items-center">
                        <div className="flex flex-col items-end mr-4">
                            <span className="text-[10px] text-blue-200">Time Left:</span>
                            <span className={`text-sm md:text-xl font-mono font-bold ${timeLeft < 300 ? 'text-red-300 animate-pulse' : ''}`}>
                                {Math.floor(timeLeft / 3600)}:{Math.floor((timeLeft % 3600) / 60) < 10 ? '0' : ''}{Math.floor((timeLeft % 3600) / 60)}:{timeLeft % 60 < 10 ? '0' : ''}{timeLeft % 60}
                            </span>
                        </div>
                        <button onClick={() => handleSubmitTest(false)} className="md:hidden bg-green-500 text-white px-3 py-1 rounded text-xs font-bold">Submit</button>
                    </div>
                </div>

                {/* Tools & Subject Tabs */}
                <div className="flex bg-blue-800 px-4 items-center gap-4">
                    <div className="flex space-x-2 py-1">
                        {test.calculator && (
                            <button
                                onClick={() => setShowCalculator(!showCalculator)}
                                className={`flex items-center gap-1 px-3 py-1 rounded text-xs font-bold transition ${showCalculator ? 'bg-yellow-400 text-black' : 'bg-blue-900 text-blue-200 hover:bg-blue-700'}`}
                                title="Scientific Calculator"
                            >
                                <CalcIcon size={14} /> Calc
                            </button>
                        )}
                    </div>

                    <div className="flex space-x-1 overflow-x-auto no-scrollbar mask-gradient flex-1">
                        {subjects.map(sub => (
                            <button
                                key={sub}
                                onClick={() => handleSubjectChange(sub)}
                                className={`px-6 py-2 text-sm font-bold rounded-t-lg transition-colors ${activeSubject === sub ? 'bg-white text-blue-800' : 'bg-blue-900 text-blue-200 hover:bg-blue-700'}`}
                            >
                                {sub}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Section Sub-tabs (only shown when subject has multiple sections) */}
                {activeSubject && sectionsMap[activeSubject] && sectionsMap[activeSubject].length > 1 && (
                    <div className="flex items-center gap-1 overflow-x-auto no-scrollbar bg-blue-900/50 px-4 py-1 border-t border-blue-700/50">
                        <button
                            onClick={() => handleSectionChange(null)}
                            className={`px-3 py-0.5 rounded text-[11px] font-bold whitespace-nowrap transition-colors ${
                                activeSection === null ? 'bg-white text-blue-800' : 'bg-blue-800/60 text-blue-200 hover:bg-blue-700'
                            }`}
                        >
                            All Sections
                        </button>
                        {sectionsMap[activeSubject].map(sec => {
                            const meta = getSectionMeta(activeSubject, sec);
                            const answeredCount = meta?.requiredAttempts ? countAnsweredInSection(activeSubject, sec) : null;
                            return (
                                <button
                                    key={sec}
                                    onClick={() => handleSectionChange(sec)}
                                    className={`px-3 py-0.5 rounded text-[11px] font-bold whitespace-nowrap transition-colors ${
                                        activeSection === sec ? 'bg-white text-blue-800' : 'bg-blue-800/60 text-blue-200 hover:bg-blue-700'
                                    }`}
                                >
                                    {sec}
                                    {meta?.requiredAttempts && (
                                        <span className={`ml-1.5 text-[9px] font-black px-1.5 py-0.5 rounded ${
                                            answeredCount >= meta.requiredAttempts ? 'bg-green-500 text-white' : 'bg-amber-400 text-black'
                                        }`}>
                                            {answeredCount}/{meta.requiredAttempts}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                )}
            </header>

            <div className="flex flex-1 overflow-hidden">
                <main
                    className="flex-1 flex flex-col overflow-hidden"
                    onTouchStart={(e) => touchRef.current.startX = e.touches[0].clientX}
                    onTouchEnd={(e) => {
                        const endX = e.changedTouches[0].clientX;
                        const diff = touchRef.current.startX - endX;
                        if (Math.abs(diff) > 50) {
                            if (diff > 0) handleNext();
                            else handlePrev();
                        }
                    }}
                >
                    {/* Mobile Question Navigator - sticky, never scrolls */}
                    <div className="md:hidden bg-blue-50 border-b overflow-x-auto no-scrollbar flex items-center px-2.5 py-2 gap-2 flex-shrink-0 shadow-sm">
                        {test.questions.map((q, idx) => {
                            const status = questionStatus[q._id] || 'not_visited';
                            let dotClass = 'bg-gray-200';
                            if (status === 'answered') dotClass = 'bg-green-500';
                            else if (status === 'not_answered') dotClass = 'bg-red-500';
                            else if (status.includes('marked')) dotClass = 'bg-purple-600';

                            return (
                                <button
                                    key={idx}
                                    onClick={() => handlePaletteClick(idx)}
                                    className={`flex-none w-10 h-10 rounded-md flex items-center justify-center font-bold text-sm transition-all relative ${currentQuestionIndex === idx ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-300' : 'bg-white text-gray-700 border border-gray-200'}`}
                                >
                                    {idx + 1}
                                    <span className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border border-white ${dotClass}`}></span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Question Info Bar - always visible */}
                    <div className="bg-white border-b px-4 py-2.5 flex justify-between items-center flex-shrink-0">
                        <div className="font-bold text-sm text-blue-900 flex items-center gap-2">
                            <span className="truncate max-w-[120px] md:max-w-none">{currentQ.subject || 'General'}</span>
                            <span className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full border hidden sm:inline-block">{currentQ.topic || 'Topic'}</span>
                            <span className="text-[10px] font-normal text-gray-500">({currentType.toUpperCase()})</span>
                        </div>
                        <div className="flex space-x-2 text-xs font-bold">
                            <span className="text-green-600 bg-green-50 px-2 py-0.5 rounded border border-green-200">+{currentQ.marks}</span>
                            <span className="text-red-500 bg-red-50 px-2 py-0.5 rounded border border-red-200">-{currentQ.negativeMarks}</span>
                        </div>
                    </div>

                    {/* Scrollable Question & Answer Area */}
                    <div className="flex-1 overflow-y-auto">
                        <div className="p-4 md:p-6 lg:p-8 pb-6">
                            <div className="flex items-start gap-4 mb-6">
                                <span className="font-bold text-lg md:text-xl text-gray-500 w-8 pt-1 flex-shrink-0">Q{currentQuestionIndex + 1}.</span>
                                <div className="flex-1">
                                    {currentQ.text && (
                                        <div className="text-lg md:text-xl text-gray-900 leading-relaxed font-serif mb-4 whitespace-pre-wrap">
                                            <MathText text={currentQ.text} />
                                        </div>
                                    )}
                                    {currentQ.image && (
                                        <div className="w-full flex justify-center mb-6 cursor-zoom-in" onClick={() => setZoomedImg(currentQ.image)}>
                                            <img
                                                src={currentQ.image}
                                                alt="Question"
                                                className={`${getQuestionImageSize(currentQ.questionImageSize)} w-full md:w-auto border rounded-lg shadow-md object-contain hover:brightness-95 transition`}
                                            />
                                        </div>
                                    )}

                                    {currentType === 'matching' && currentQ.matchPairs && currentQ.matchPairs.length > 0 && (
                                        <div className="mb-6 flex flex-col md:flex-row gap-4 md:gap-8 w-full max-w-3xl">
                                            <div className="flex-1 bg-white border border-gray-200 rounded-lg shadow-sm">
                                                <div className="bg-gray-50 border-b px-4 py-2 font-bold text-gray-700 text-center rounded-t-lg">List I</div>
                                                <div className="p-0">
                                                    {currentQ.matchPairs.map((pair, idx) => (
                                                        <div key={idx} className="flex border-b last:border-0 hover:bg-gray-50 transition items-center">
                                                            <div className="px-3 py-3 w-10 text-center font-bold text-gray-400 bg-gray-50 border-r self-stretch flex items-center justify-center">{idx + 1}</div>
                                                            <div className="px-4 py-3"><MathText text={pair.left || '-'} /></div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="flex-1 bg-white border border-gray-200 rounded-lg shadow-sm">
                                                <div className="bg-gray-50 border-b px-4 py-2 font-bold text-gray-700 text-center rounded-t-lg">List II</div>
                                                <div className="p-0">
                                                    {currentQ.matchPairs.map((pair, idx) => (
                                                        <div key={idx} className="flex border-b last:border-0 hover:bg-gray-50 transition items-center">
                                                            <div className="px-3 py-3 w-10 text-center font-bold text-gray-400 bg-gray-50 border-r self-stretch flex items-center justify-center">{String.fromCharCode(80 + idx)}</div>
                                                            <div className="px-4 py-3"><MathText text={pair.right || '-'} /></div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* ANSWER AREA */}
                                    <div className="mt-6">
                                        {(currentType === 'mcq' || currentType === 'matching') && (
                                            <div className={`grid gap-3 ${currentQ.optionsLayout === 'grid' ? 'grid-cols-2' : 'grid-cols-1'}`}>
                                                {currentQ.options.map((opt, idx) => {
                                                    const effectiveOpt = opt || `Option ${idx + 1}`;
                                                    return (
                                                        <label key={idx} className={`flex items-start cursor-pointer group p-3 rounded-lg border transition-all ${answers[currentQ._id] === effectiveOpt ? 'bg-blue-50 border-blue-400 shadow-sm' : 'hover:bg-gray-50 border-gray-200'}`}>
                                                            <div className="relative flex items-center pt-1">
                                                                <input type="radio" name={`q-${currentQ._id}`} className="sr-only" checked={answers[currentQ._id] === effectiveOpt} onChange={() => handleAnswerChange(effectiveOpt)} />
                                                                <div className={`w-5 h-5 rounded-full border-2 mr-4 flex items-center justify-center transition-colors ${answers[currentQ._id] === effectiveOpt ? 'border-blue-600 bg-blue-600' : 'border-gray-400 group-hover:border-blue-400'}`}>
                                                                    {answers[currentQ._id] === effectiveOpt && <div className="w-2 h-2 bg-white rounded-full" />}
                                                                </div>
                                                            </div>
                                                            <div className="flex-1">
                                                                {opt && (
                                                                    <div className={`text-base md:text-lg ${answers[currentQ._id] === effectiveOpt ? 'text-blue-900 font-medium' : 'text-gray-700'}`}>
                                                                        <MathText text={opt} />
                                                                    </div>
                                                                )}
                                                                {(!opt || !currentQ.optionImages?.[idx]) && !opt && <div className="text-gray-400 text-sm font-medium mb-1">{String.fromCharCode(65 + idx)}</div>}
                                                                {currentQ.optionImages && currentQ.optionImages[idx] && (
                                                                    <img
                                                                        src={currentQ.optionImages[idx]}
                                                                        alt={`Opt ${idx}`}
                                                                        className={`mt-2 ${getOptionImageSize(currentQ.optionsImageSize)} object-contain border rounded bg-white p-1 transition select-none`}
                                                                        onPointerDown={(e) => {
                                                                            longPressTimerRef.current = setTimeout(() => {
                                                                                setZoomedImg(currentQ.optionImages[idx]);
                                                                            }, 500);
                                                                        }}
                                                                        onPointerUp={() => clearTimeout(longPressTimerRef.current)}
                                                                        onPointerLeave={() => clearTimeout(longPressTimerRef.current)}
                                                                    />
                                                                )}
                                                            </div>
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        {currentType === 'msq' && (
                                            <div className={`grid gap-3 ${currentQ.optionsLayout === 'grid' ? 'grid-cols-2' : 'grid-cols-1'}`}>
                                                {currentQ.options.map((opt, idx) => {
                                                    const effectiveOpt = opt || `Option ${idx + 1}`;
                                                    const isSelected = (answers[currentQ._id] || []).includes(effectiveOpt);
                                                    return (
                                                        <label key={idx} className={`flex items-start cursor-pointer group p-3 rounded-lg border transition-all ${isSelected ? 'bg-blue-50 border-blue-400 shadow-sm' : 'hover:bg-gray-50 border-gray-200'}`}>
                                                            <div className="relative flex items-center pt-1">
                                                                <input type="checkbox" className="sr-only" checked={isSelected} onChange={() => handleMSQChange(effectiveOpt)} />
                                                                <div className={`w-5 h-5 rounded border-2 mr-4 flex items-center justify-center transition-colors ${isSelected ? 'border-blue-600 bg-blue-600' : 'border-gray-400 group-hover:border-blue-400'}`}>
                                                                    {isSelected && <div className="text-white font-bold text-xs">✓</div>}
                                                                </div>
                                                            </div>
                                                            <div className="flex-1">
                                                                {opt && (
                                                                    <div className={`text-base md:text-lg ${isSelected ? 'text-blue-900 font-medium' : 'text-gray-700'}`}>
                                                                        <MathText text={opt} />
                                                                    </div>
                                                                )}
                                                                {(!opt || !currentQ.optionImages?.[idx]) && !opt && <div className="text-gray-400 text-sm font-medium mb-1">{String.fromCharCode(65 + idx)}</div>}
                                                                {currentQ.optionImages && currentQ.optionImages[idx] && (
                                                                    <img
                                                                        src={currentQ.optionImages[idx]}
                                                                        alt={`Opt ${idx}`}
                                                                        className={`mt-2 ${getOptionImageSize(currentQ.optionsImageSize)} object-contain border rounded bg-white p-1 transition select-none`}
                                                                        onPointerDown={(e) => {
                                                                            longPressTimerRef.current = setTimeout(() => {
                                                                                setZoomedImg(currentQ.optionImages[idx]);
                                                                            }, 500);
                                                                        }}
                                                                        onPointerUp={() => clearTimeout(longPressTimerRef.current)}
                                                                        onPointerLeave={() => clearTimeout(longPressTimerRef.current)}
                                                                    />
                                                                )}
                                                            </div>
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        {currentType === 'integer' && (
                                            <div className="mt-4">
                                                <input
                                                    type="text"
                                                    inputMode="decimal"
                                                    pattern="[0-9.-]*"
                                                    value={answers[currentQ._id] || ''}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        if (/^-?\d*\.?\d*$/.test(val) || val === '') {
                                                            handleAnswerChange(val);
                                                        }
                                                    }}
                                                    className="border-2 border-gray-300 rounded-lg px-4 py-3 text-xl w-48 focus:border-blue-500 focus:outline-none shadow-sm"
                                                    placeholder="Enter Answer"
                                                />
                                                <p className="text-sm text-gray-500 mt-2 italic">Accepts negative numbers and decimals (e.g., -1.5, 42)</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Toolbar — locked to bottom, never scrolls */}
                    <div className="bg-gray-50 border-t px-3 py-2.5 md:px-4 md:py-3 flex flex-wrap gap-2 justify-between items-center flex-shrink-0 shadow-[0_-2px_10px_rgba(0,0,0,0.06)]">
                        <div className="flex gap-2">
                            <button onClick={handleMarkForReview} className="px-3 md:px-4 py-2 bg-purple-100 text-purple-800 border border-purple-200 rounded text-xs md:text-sm hover:bg-purple-200 font-bold transition">Mark for Review</button>
                            <button onClick={handleClearResponse} className="px-3 md:px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded text-xs md:text-sm hover:bg-gray-100 font-bold transition">Clear</button>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={handlePrev} disabled={currentQuestionIndex === 0} className="px-4 md:px-5 py-2 bg-white border border-blue-600 text-blue-700 rounded font-bold text-xs md:text-sm hover:bg-blue-50 transition disabled:opacity-50">Previous</button>
                            <button onClick={currentQuestionIndex === test.questions.length - 1 ? () => handleSubmitTest(false) : handleNext} className="bg-blue-700 hover:bg-blue-800 text-white px-6 md:px-8 py-2 rounded font-bold shadow-md transition text-xs md:text-sm">
                                {currentQuestionIndex === test.questions.length - 1 ? 'Submit Test' : 'Save & Next'}
                            </button>
                        </div>
                    </div>
                </main>

                <aside className="w-80 bg-blue-50 border-l flex flex-col h-full shrink-0 hidden md:flex">
                    <div className="p-4 flex items-center bg-blue-100 border-b border-blue-200">
                        <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center text-gray-500 mr-3"><User size={20} /></div>
                        <div><div className="font-bold text-gray-800 text-sm">Candidate</div></div>
                    </div>

                    <div className="p-3 grid grid-cols-2 gap-2 text-[10px] font-semibold border-b bg-white text-gray-600">
                        <div className="flex items-center"><span className="w-4 h-4 bg-green-500 text-white flex items-center justify-center mr-1 rounded-sm">1</span> Answered</div>
                        <div className="flex items-center"><span className="w-4 h-4 bg-red-500 text-white flex items-center justify-center mr-1 rounded-sm">2</span> Not Ans</div>
                        <div className="flex items-center"><span className="w-4 h-4 bg-gray-200 text-black flex items-center justify-center mr-1 rounded-sm">3</span> Not Visit</div>
                        <div className="flex items-center"><span className="w-4 h-4 bg-purple-600 text-white flex items-center justify-center mr-1 rounded-full">4</span> Review</div>
                        <div className="col-span-2 flex items-center"><span className="w-4 h-4 bg-purple-600 text-white flex items-center justify-center mr-1 relative rounded-full"><span className="absolute bottom-0 right-0 w-1.5 h-1.5 bg-green-400 rounded-full"></span>5</span> Ans+Review</div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 bg-blue-50">
                        <h3 className="font-bold text-blue-900 mb-2 px-2 bg-blue-200 py-1 text-sm rounded">
                            {activeSubject}{activeSection ? ` › ${activeSection}` : ''} Questions
                        </h3>
                        <div className="grid grid-cols-5 gap-2">
                            {test.questions.map((q, idx) => {
                                if ((q.subject || 'General') !== activeSubject) return null;
                                // Filter by active section if one is chosen
                                if (activeSection && (q.section || '') !== activeSection) return null;
                                const status = questionStatus[q._id] || 'not_visited';
                                let classes = '';
                                switch (status) {
                                    case 'answered': classes = 'bg-green-500 text-white'; break;
                                    case 'not_answered': classes = 'bg-red-500 text-white'; break;
                                    case 'marked': classes = 'bg-purple-600 text-white rounded-full'; break;
                                    case 'marked_answered': classes = 'bg-purple-600 text-white relative rounded-full'; break;
                                    default: classes = 'bg-gray-200 text-black'; break;
                                }

                                return (
                                    <button key={q._id} onClick={() => handlePaletteClick(idx)} className={`h-8 w-8 flex items-center justify-center text-xs font-bold border border-gray-300 shadow-sm transition hover:opacity-80 relative rounded-sm ${classes}`}>
                                        {idx + 1}
                                        {status === 'marked_answered' && <span className="absolute bottom-0 right-0 w-2 h-2 bg-green-400 rounded-full border border-white"></span>}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="p-4 bg-blue-100 border-t">
                        <button onClick={() => handleSubmitTest(false)} className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded shadow font-bold text-sm transition">SUBMIT TEST</button>
                    </div>
                </aside>
            </div>
            {/* Tool Modals */}
            {showCalculator && <Calculator onClose={() => setShowCalculator(false)} />}
            {zoomedImg && <ImageZoomModal imageUrl={zoomedImg} onClose={() => setZoomedImg(null)} />}
        </div>
    );
};

export default ExamInterface;
