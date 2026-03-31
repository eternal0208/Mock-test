'use client';
// Admin Dashboard Updated: 2026-02-04
import { useState, useEffect } from 'react';
import { Plus, Trash, Save, BookOpen, Clock, AlertCircle, User, List, LogOut, Users, Calendar, Image as ImageIcon, BarChart2, Eye, EyeOff, Search, Edit2, CheckCircle, UploadCloud, X, Download, Loader2, Layers, RefreshCcw, Zap, ChevronUp, ChevronDown, Upload, Info, Combine, AlertTriangle, Edit3, Award, Type, Sparkles } from 'lucide-react';
import RichMathEditor from './RichMathEditor';
import MathText from '@/components/ui/MathText';
import { API_BASE_URL } from '@/lib/config';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import PdfUploadModal from './PdfUploadModal';
import PdfTextUploadModal from './PdfTextUploadModal';
import PdfMarkerUploadModal from './PdfMarkerUploadModal';
import GeminiPdfUploadModal from './GeminiPdfUploadModal';
import PercentileConfig from './PercentileConfig';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import dynamic from 'next/dynamic';
const NotesManager = dynamic(() => import('./NotesManager'), { ssr: false, loading: () => <div className="flex items-center justify-center py-20"><div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div></div> });
import InteractiveMascot from './InteractiveMascot';

const ImageZoomModal = ({ imageUrl, onClose }) => {
    if (!imageUrl) return null;
    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200" onClick={onClose}>
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

// -----------------------------------------------------------------------------
// Rescore helper: triggered by admin UI button
// -----------------------------------------------------------------------------
const useRescoreAllResults = (user) => {
    const [loading, setLoading] = useState(false);
    const [info, setInfo] = useState(null);

    const run = async () => {
        if (!confirm('Re‑scoring will recompute marks for every stored result. Continue?')) return;
        setLoading(true);
        setInfo(null);
        try {
            const token = await user?.getIdToken();
            const res = await fetch(`${API_BASE_URL}/api/admin/rescore-all-results`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) setInfo(data);
            else throw data;
        } catch (e) {
            console.error('Rescore error', e);
            setInfo({ error: e.message || JSON.stringify(e) });
        } finally {
            setLoading(false);
        }
    };

    return { loading, info, run };
};

// small component for UI
const RescoreSection = ({ user }) => {
    const { loading, info, run } = useRescoreAllResults(user);

    return (
        <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-6 mb-6">
            <h4 className="text-lg font-semibold text-yellow-800 flex items-center gap-2">
                <RefreshCcw className="text-yellow-600" /> Rescore All Results
            </h4>
            <p className="text-sm text-yellow-700 mb-4">
                Use this button to recompute scores for every stored result based on the latest answer/normalisation logic. Typically run after deploying fixes.
            </p>
            <button
                onClick={run}
                disabled={loading}
                className={`px-5 py-2 rounded-md font-bold text-white ${loading ? 'bg-yellow-300' : 'bg-yellow-600 hover:bg-yellow-700'} disabled:opacity-50 transition`}
            >
                {loading ? 'Processing…' : 'Rescore Now'}
            </button>
            {info && (
                <div className="mt-3 text-sm text-yellow-800">
                    {info.error && <span className="text-red-600">Error: {info.error}</span>}
                    {info.message && <>{info.message} (total {info.total}, updated {info.updated}, skipped {info.skipped}, errors {info.errors})</>}
                </div>
            )}
        </div>
    );
};

const TestPreviewModal = ({ test, onClose }) => {
    const [zoomedImg, setZoomedImg] = useState(null);
    if (!test) return null;

    return (
        <>
            {zoomedImg && <ImageZoomModal imageUrl={zoomedImg} onClose={() => setZoomedImg(null)} />}
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[70] p-4 sm:p-6">
                <div className="bg-gray-50 rounded-3xl w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-white/20 animate-in zoom-in-95 duration-200">
                    {/* Header */}
                    <div className="p-6 sm:p-8 bg-white border-b border-gray-100 flex justify-between items-start shrink-0 relative overflow-hidden">
                        <div className="relative z-10 w-full pr-12">
                            <div className="flex items-center gap-3 mb-2 flex-wrap">
                                <span className="bg-indigo-100 text-indigo-700 font-black text-[10px] sm:text-xs px-2.5 py-1 rounded-full uppercase tracking-widest">{test.category}</span>
                                <span className="bg-emerald-100 text-emerald-700 font-black text-[10px] sm:text-xs px-2.5 py-1 rounded-full uppercase tracking-widest flex items-center gap-1"><BookOpen size={12} /> {test.questions?.length || 0} QS</span>
                                <span className="bg-amber-100 text-amber-700 font-black text-[10px] sm:text-xs px-2.5 py-1 rounded-full uppercase tracking-widest flex items-center gap-1"><Clock size={12} /> {test.duration} MINS</span>
                            </div>
                            <h2 className="text-2xl sm:text-4xl font-black text-slate-800 tracking-tight leading-tight">{test.title}</h2>
                        </div>
                        <button onClick={onClose} className="absolute top-6 right-6 p-2.5 bg-gray-100 hover:bg-red-100 hover:text-red-600 text-gray-500 rounded-full transition-all z-20">
                            <X size={24} strokeWidth={2.5} />
                        </button>

                        {/* Decorative background elements */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-8 scroll-smooth pb-24">
                        {test.questions && test.questions.length > 0 ? test.questions.map((q, idx) => {
                            const qType = q.type || 'mcq';
                            const isInteger = qType === 'integer';
                            const isMsq = qType === 'msq';
                            const optionsList = q.options && q.options.length > 0 ? q.options : ['A', 'B', 'C', 'D'];

                            return (
                                <div key={idx} className="bg-white rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-gray-100 overflow-hidden relative group">
                                    {/* Type indicator side border */}
                                    <div className={`absolute top-0 left-0 bottom-0 w-1.5 ${isInteger ? 'bg-amber-400' : isMsq ? 'bg-purple-500' : 'bg-blue-500'}`}></div>

                                    {/* Question Header */}
                                    <div className="px-5 py-4 flex flex-col sm:flex-row justify-between sm:items-center bg-transparent border-b border-gray-50 gap-4">
                                        <div className="flex items-center gap-3 pl-1 sm:pl-0">
                                            <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-lg shadow-md shrink-0">
                                                {idx + 1}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Question Type</span>
                                                <span className={`text-xs sm:text-sm font-black uppercase leading-none ${isInteger ? 'text-amber-600' : isMsq ? 'text-purple-600' : 'text-blue-600'}`}>
                                                    {isInteger ? 'Integer' : isMsq ? 'Multiple Select' : 'Multiple Choice'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 pl-14 sm:pl-0">
                                            <span className="px-3 py-1 bg-gray-50 text-gray-600 text-xs font-bold rounded-lg border border-gray-200">
                                                {q.subject || 'General'}
                                            </span>
                                            {q.section && (
                                                <span className="px-3 py-1 bg-amber-50 text-amber-700 text-xs font-bold rounded-lg border border-amber-200">
                                                    {q.section}
                                                </span>
                                            )}
                                            <div className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-100 flex items-center gap-1">
                                                +{q.marks || 4}
                                                <span className="text-red-500 border-l border-emerald-200 pl-1 ml-1">-{q.negativeMarks || 1}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-5 sm:p-8 pl-6 sm:pl-8">
                                        {/* Question Text & Image */}
                                        <div className="mb-8">
                                            {q.text && (
                                                <div className="text-slate-800 text-base sm:text-lg font-medium leading-relaxed break-words overflow-hidden">
                                                    <MathText text={q.text} />
                                                </div>
                                            )}
                                            {q.image && (
                                                <div className="mt-6 bg-slate-50 rounded-xl p-3 border border-slate-200 inline-block cursor-zoom-in hover:shadow-md transition group/img" onClick={() => setZoomedImg(q.image)}>
                                                    <div className="relative">
                                                        <img src={q.image} alt="Question" className="max-h-[350px] max-w-full object-contain rounded-lg" />
                                                        <div className="absolute top-2 right-2 bg-black/60 text-white p-1.5 rounded-md opacity-0 group-hover/img:opacity-100 transition"><Search size={16} /></div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {qType === 'matching' && q.matchPairs && q.matchPairs.length > 0 && (
                                            <div className="mb-8 flex flex-col md:flex-row gap-4 w-full">
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

                                        {/* Options OR Integer Answer */}
                                        {isInteger ? (
                                            <div className="bg-amber-50/50 rounded-xl border-2 border-amber-200 p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-6">
                                                <div className="flex flex-col text-center sm:text-left">
                                                    <span className="text-amber-700 text-xs font-black uppercase tracking-widest mb-1">Correct Answer</span>
                                                    <span className="text-amber-600/70 text-sm font-medium">Numerical Value Expected</span>
                                                </div>
                                                <div className="bg-white px-8 py-3 rounded-xl border-2 border-amber-300 shadow-sm font-mono text-3xl font-black text-amber-600 min-w-[120px] text-center shrink-0">
                                                    {q.integerAnswer !== undefined && q.integerAnswer !== null && q.integerAnswer !== '' ? q.integerAnswer : '?'}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {optionsList.map((opt, i) => {
                                                    const label = String.fromCharCode(65 + i); // A, B, C, D
                                                    const optValue = opt;

                                                    let isCorrect = false;
                                                    if (isMsq) {
                                                        if (Array.isArray(q.correctOptions)) {
                                                            isCorrect = q.correctOptions.includes(label) || q.correctOptions.includes(optValue);
                                                        }
                                                    } else {
                                                        isCorrect = q.correctOption === label || q.correctOption === optValue || q.correctAnswer === label;
                                                    }

                                                    return (
                                                        <div key={i} className={`relative flex items-center p-3 sm:p-4 rounded-xl border-2 transition duration-200 ${isCorrect ? 'border-emerald-500 bg-emerald-50/40 shadow-sm' : 'border-gray-100 bg-gray-50/50 hover:bg-gray-50'}`}>
                                                            <div className={`w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg font-black text-sm sm:text-base shrink-0 shadow-sm ${isCorrect ? 'bg-emerald-500 text-white' : 'bg-white border border-gray-200 text-slate-400'}`}>
                                                                {label}
                                                            </div>
                                                            <div className="flex-1 ml-3 sm:ml-4 py-1 pr-6 text-slate-700 min-w-0">
                                                                <div className="font-medium text-sm sm:text-base break-words overflow-hidden">
                                                                    {optValue !== label && <MathText text={optValue} />}
                                                                    {optValue === label && !q.optionImages?.[i] && <span className="text-gray-400 italic text-sm">Empty text option</span>}
                                                                </div>
                                                                {q.optionImages?.[i] && (
                                                                    <div className="mt-3 cursor-zoom-in group/opt" onClick={() => setZoomedImg(q.optionImages[i])}>
                                                                        <div className="inline-block relative bg-white p-2 border border-gray-200 shadow-sm rounded-lg">
                                                                            <img src={q.optionImages[i]} alt={`Option ${label}`} className="max-h-20 sm:max-h-24 max-w-full object-contain" />
                                                                            <div className="absolute inset-0 bg-black/5 opacity-0 group-hover/opt:opacity-100 transition rounded-lg flex items-center justify-center"><Search size={20} className="text-white drop-shadow-md" /></div>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            {isCorrect && (
                                                                <div className="absolute top-2 right-2 sm:top-4 sm:right-4 text-emerald-500 bg-emerald-100 rounded-full p-1 shadow-sm">
                                                                    <CheckCircle size={16} className="sm:w-5 sm:h-5" strokeWidth={3} />
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        {/* Solution Section */}
                                        {(q.solutionText || q.solution || (q.solutionImages && q.solutionImages.length > 0) || q.solutionImage) && (
                                            <div className="mt-8 pt-6 border-t border-dashed border-gray-200">
                                                <div className="inline-flex items-center gap-2 text-[10px] sm:text-xs font-black text-indigo-500 uppercase tracking-widest mb-4 bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100">
                                                    <span>💡</span> Solution & Explanation
                                                </div>
                                                <div className="bg-slate-50/80 rounded-2xl p-5 sm:p-6 border border-slate-100 shadow-inner">
                                                    {(q.solutionText || q.solution) && (
                                                        <div className="text-slate-700 text-sm sm:text-base leading-relaxed">
                                                            <MathText text={q.solutionText || q.solution} />
                                                        </div>
                                                    )}

                                                    {((q.solutionImages && q.solutionImages.length > 0) || q.solutionImage) && (
                                                        <div className="mt-5 flex flex-wrap gap-4">
                                                            {q.solutionImage && (
                                                                <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm cursor-zoom-in hover:border-indigo-300 transition relative group/sol" onClick={() => setZoomedImg(q.solutionImage)}>
                                                                    <img src={q.solutionImage} alt="Solution" className="max-h-[200px] sm:max-h-[250px] max-w-full object-contain rounded-lg" />
                                                                    <div className="absolute inset-0 bg-black/5 opacity-0 group-hover/sol:opacity-100 transition rounded-xl flex items-center justify-center"><Search size={28} className="text-white drop-shadow-md" /></div>
                                                                </div>
                                                            )}
                                                            {q.solutionImages && q.solutionImages.map((img, i) => (
                                                                <div key={i} className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm cursor-zoom-in hover:border-indigo-300 transition relative group/sol2" onClick={() => setZoomedImg(img)}>
                                                                    <img src={img} alt={`Solution ${i + 1}`} className="max-h-[200px] sm:max-h-[250px] max-w-full object-contain rounded-lg" />
                                                                    <div className="absolute inset-0 bg-black/5 opacity-0 group-hover/sol2:opacity-100 transition rounded-xl flex items-center justify-center"><Search size={28} className="text-white drop-shadow-md" /></div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        }) : (
                            <div className="flex flex-col items-center justify-center py-20 px-4 text-gray-400 border-2 border-dashed border-gray-200 rounded-3xl bg-white/50 backdrop-blur-sm">
                                <BookOpen size={64} className="text-gray-300 mb-6 opacity-80 drop-shadow-sm" />
                                <p className="text-xl font-black text-gray-500 mb-2">No questions found</p>
                                <p className="text-sm font-medium text-gray-400">Add questions to this test to preview them in this viewer.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

const AnalyticsModal = ({ testId, onClose }) => {
    const { user } = useAuth();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchAnalytics = async () => {
            if (!user) return;
            try {
                const token = await user.getIdToken();
                const res = await fetch(`${API_BASE_URL}/api/tests/${testId}/analytics`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                if (!res.ok) throw new Error('Failed to fetch analytics');
                const data = await res.json();
                setStats(data);
            } catch (err) {
                console.error("Analytics Error", err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchAnalytics();
    }, [testId, user]);

    if (loading) return (
        <div className="fixed inset-0 bg-black/50 flex flex-col items-center justify-center text-white z-50">
            <DotLottieReact
                src="https://lottie.host/585eaa49-82ac-4ffe-8958-524df205393d/GCwqhgbTtp.lottie"
                loop
                autoplay
                className="w-32 h-32 md:w-48 md:h-48 mb-4"
            />
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-200 to-purple-200 drop-shadow-md">Loading Analytics...</span>
        </div>
    );

    // Safety check for stats to prevent runtime crash
    if (error || !stats) return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white p-6 rounded-lg text-center">
                <p className="text-red-600 mb-4">{error || 'Failed to load analytics'}</p>
                <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded">Close</button>
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[90vh] overflow-hidden flex flex-col">
                <div className="p-6 border-b flex justify-between items-center bg-gray-50">
                    <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2"><BarChart2 className="text-blue-600" /> Test Analytics</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 font-bold text-xl">&times;</button>
                </div>

                <div className="p-6 overflow-y-auto flex-1 space-y-8">
                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-blue-50 p-6 rounded-lg text-center border border-blue-100">
                            <h4 className="text-gray-500 font-medium">Total Attempts</h4>
                            <p className="text-4xl font-bold text-blue-700 mt-2">{stats.totalAttempts || 0}</p>
                        </div>
                        <div className="bg-green-50 p-6 rounded-lg text-center border border-green-100">
                            <h4 className="text-gray-500 font-medium">Average Score</h4>
                            <p className="text-4xl font-bold text-green-700 mt-2">{stats.avgScore?.toFixed(2) || '0.00'}</p>
                        </div>
                        <div className="bg-purple-50 p-6 rounded-lg text-center border border-purple-100">
                            <h4 className="text-gray-500 font-medium">Top Score</h4>
                            <p className="text-4xl font-bold text-purple-700 mt-2">{stats.rankList?.[0]?.score || 0}</p>
                        </div>
                    </div>

                    {/* Rank List */}
                    <div>
                        <h4 className="text-lg font-bold text-gray-800 mb-4 border-l-4 border-indigo-600 pl-2">Leaderboard</h4>
                        <div className="overflow-x-auto border rounded-lg shadow-sm">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Rank</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Student Name</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Score</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Accuracy</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Correct/Wrong</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Time Taken</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Date</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {stats.rankList?.map((entry, idx) => (
                                        <tr key={idx} className={idx < 3 ? 'bg-yellow-50' : ''}>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {idx === 0 && <span className="text-xl">🥇</span>}
                                                {idx === 1 && <span className="text-xl">🥈</span>}
                                                {idx === 2 && <span className="text-xl">🥉</span>}
                                                <span className={`font-bold ml-2 ${idx < 3 ? 'text-gray-900' : 'text-gray-500'}`}>#{entry.rank}</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{entry.name}</td>
                                            <td className="px-6 py-4 whitespace-nowrap font-mono text-blue-600 font-bold text-lg">{entry.score}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <span className="text-sm font-medium text-gray-700 mr-2">{entry.accuracy?.toFixed(1)}%</span>
                                                    <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                                                        <div className="h-full bg-green-500" style={{ width: `${entry.accuracy || 0}%` }}></div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <span className="text-green-600 font-bold">{entry.correctAnswers}</span> / <span className="text-red-500 font-bold">{entry.wrongAnswers}</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-500 font-mono">{(entry.timeTaken / 60).toFixed(1)}m</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-400 text-xs">
                                                {new Date(entry.submittedAt).toLocaleDateString()}
                                            </td>
                                        </tr>
                                    ))}
                                    {stats.rankList?.length === 0 && <tr><td colSpan="7" className="text-center py-8 text-gray-400 font-medium">No students have attempted this test yet.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Feedback */}
                    <div>
                        <h4 className="text-lg font-bold text-gray-800 mb-4 border-l-4 border-orange-600 pl-2">Student Feedback</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {stats.feedbacks?.map((fb, idx) => (
                                <div key={idx} className="bg-gray-50 p-4 rounded border">
                                    <div className="flex items-center mb-2">
                                        {[...Array(5)].map((_, i) => (
                                            <span key={i} className={i < fb.rating ? "text-yellow-400 text-lg" : "text-gray-300 text-lg"}>★</span>
                                        ))}
                                    </div>
                                    <p className="text-gray-600 text-sm italic">"{fb.comment || 'No comment'}"</p>
                                </div>
                            ))}
                            {(!stats.feedbacks || stats.feedbacks.length === 0) && <p className="text-gray-500 italic">No feedback received yet.</p>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

import ExcelJS from 'exceljs';

const BulkUploadModal = ({ onUpload, onClose }) => {
    const [status, setStatus] = useState('idle'); // idle, parsing, uploading, done
    const [progress, setProgress] = useState({ current: 0, total: 0 });
    const [error, setError] = useState('');

    const downloadTemplate = async () => {
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Questions');

        sheet.columns = [
            { header: 'Question Type (mcq/integer)', key: 'type', width: 25 },
            { header: 'Question Text', key: 'text', width: 40 },
            { header: 'Question Image (Insert Here)', key: 'qImg', width: 30 },
            { header: 'Option A', key: 'optA', width: 20 },
            { header: 'Option A Image', key: 'imgA', width: 20 },
            { header: 'Option B', key: 'optB', width: 20 },
            { header: 'Option B Image', key: 'imgB', width: 20 },
            { header: 'Option C', key: 'optC', width: 20 },
            { header: 'Option C Image', key: 'imgC', width: 20 },
            { header: 'Option D', key: 'optD', width: 20 },
            { header: 'Option D Image', key: 'imgD', width: 20 },
            { header: 'Correct Option', key: 'correct', width: 15 },
            { header: 'Integer Answer', key: 'intAns', width: 15 },
            { header: 'Marks', key: 'marks', width: 10 },
            { header: 'Neg. Marks', key: 'neg', width: 10 },
            { header: 'Subject', key: 'subj', width: 15 },
            { header: 'Section (optional)', key: 'section', width: 18 },
            { header: 'Topic', key: 'topic', width: 15 },
            { header: 'Solution', key: 'sol', width: 40 },
            { header: 'Solution Image', key: 'solImg', width: 30 }
        ];

        // Add some instruction row
        sheet.addRow(["mcq", "Example Question?", "", "Opt A", "", "Opt B", "", "Opt C", "", "Opt D", "", "A", "", 4, 1, "Physics", "Section A", "Mechanics", "Explanation...", ""]);

        // Style the header
        sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } }; // Indigo-600

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'Smart_Question_Template.xlsx';
        a.click();
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setStatus('parsing');
        setError('');

        try {
            const arrayBuffer = await file.arrayBuffer();
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.load(arrayBuffer);
            const worksheet = workbook.getWorksheet(1); // First sheet

            if (!worksheet) throw new Error("Excel file is empty or invalid.");

            // 1. Map Images to Cells
            const imageMap = {}; // "row:col" -> buffer

            // ExcelJS images are stored in workbook.model.media
            const images = worksheet.getImages();

            images.forEach(img => {
                // range.tl = { nativeRow, nativeCol } 0-indexed
                const row = Math.floor(img.range.tl.nativeRow) + 1; // 1-based
                const col = Math.floor(img.range.tl.nativeCol) + 1; // 1-based
                const imageId = img.imageId;
                const media = workbook.model.media.find(m => m.index === imageId);

                if (media) {
                    imageMap[`${row}:${col}`] = media.buffer;
                }
            });

            const questions = [];
            const rows = [];

            worksheet.eachRow((row, rowNumber) => {
                if (rowNumber === 1) return; // Skip header
                rows.push({ row, rowNumber });
            });

            if (rows.length === 0) throw new Error("No data found in Excel.");

            setStatus('uploading');
            setProgress({ current: 0, total: rows.length });

            // Process row by row
            for (let i = 0; i < rows.length; i++) {
                const { row, rowNumber } = rows[i];

                // Helper to get cell value or image URL
                const getCellData = async (colIndex, folder) => {
                    // Check if image exists at this cell
                    const imgBuffer = imageMap[`${rowNumber}:${colIndex}`];

                    if (imgBuffer) {
                        try {
                            const fileName = `${Date.now()}_${rowNumber}_${colIndex}.png`;
                            const storageRef = ref(storage, `bulk_upload/${folder}/${fileName}`);
                            await uploadBytes(storageRef, imgBuffer);
                            return await getDownloadURL(storageRef);
                        } catch (err) {
                            console.error(`Valid image found but upload failed at ${rowNumber}:${colIndex}`, err);
                            return '';
                        }
                    }

                    // Fallback to text
                    const cell = row.getCell(colIndex);
                    // Handle rich text
                    if (cell.value && typeof cell.value === 'object') {
                        if (cell.value.text) return cell.value.text;
                        if (cell.value.richText) return cell.value.richText.map(r => r.text).join('');
                        if (cell.value.result) return cell.value.result.toString();
                    }
                    return cell.value ? cell.value.toString() : '';
                };

                // Map Columns (1-based index)
                // 1: Type, 2: Text, 3: Q-Img, 4: A, 5: A-Img ...

                const type = (row.getCell(1).value || 'mcq').toString().toLowerCase().trim();
                const text = await getCellData(2, 'questions'); // Text might be rich text
                const qImg = await getCellData(3, 'questions'); // Image

                const optA = await getCellData(4, 'options');
                const imgA = await getCellData(5, 'options');

                const optB = await getCellData(6, 'options');
                const imgB = await getCellData(7, 'options');

                const optC = await getCellData(8, 'options');
                const imgC = await getCellData(9, 'options');

                const optD = await getCellData(10, 'options');
                const imgD = await getCellData(11, 'options');

                const correctRaw = (row.getCell(12).value || '').toString().trim().toUpperCase();
                const intAns = (row.getCell(13).value || '').toString().trim();

                const marks = Number(row.getCell(14).value) || 4;
                const neg = Number(row.getCell(15).value) || 1;
                const subject = (row.getCell(16).value || 'Physics').toString();
                const section = (row.getCell(17).value || '').toString().trim(); // NEW: Section column
                const topic = (row.getCell(18).value || '').toString();

                const sol = await getCellData(19, 'solutions');
                const solImg = await getCellData(20, 'solutions');

                // Determine correct option — store as the actual option text to match exam format
                let correctOption = '';
                if (type === 'mcq') {
                    const letterToIdx = { 'A': 0, 'B': 1, 'C': 2, 'D': 3, '1': 0, '2': 1, '3': 2, '4': 3 };
                    const opts = [optA, optB, optC, optD];
                    const idx = letterToIdx[String(correctRaw).trim().toUpperCase()];
                    if (idx !== undefined) {
                        correctOption = opts[idx] || `Option ${idx + 1}`;
                    }
                }

                if (text || qImg) {
                    questions.push({
                        text,
                        image: qImg,
                        type: type === 'integer' ? 'integer' : 'mcq',
                        options: [optA, optB, optC, optD],
                        optionImages: [imgA, imgB, imgC, imgD],
                        correctOption,
                        integerAnswer: type === 'integer' ? (intAns || correctRaw) : '',
                        correctOptions: [],
                        marks,
                        negativeMarks: neg,
                        subject,
                        section,
                        topic,
                        solution: sol,
                        solutionImage: solImg || '',
                        solutionImages: solImg ? [solImg] : []
                    });
                }

                setProgress({ current: i + 1, total: rows.length });
            }

            setStatus('done');
            onUpload(questions);
            onClose();
            alert(`Processed ${questions.length} questions. Images uploaded successfully!`);

        } catch (err) {
            console.error("Excel Processing Error:", err);
            setError("Failed to process file. Ensure you are using the correct template.");
            setStatus('idle');
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold flex items-center gap-2">
                        <UploadCloud className="text-indigo-600" /> Smart Excel Upload
                    </h3>
                    {status === 'idle' && <button onClick={onClose}><X size={24} className="text-gray-400 hover:text-gray-600" /></button>}
                </div>

                {status === 'idle' ? (
                    <div className="space-y-6">
                        <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 rounded-lg p-5">
                            <h4 className="font-bold text-indigo-800 mb-2">Step 1: Download Smart Template</h4>
                            <p className="text-sm text-indigo-700 mb-4">
                                You can now <strong>Paste Images</strong> directly into the Excel cells!
                                No need for URLs. Just insert your diagrams into the "Image" columns.
                            </p>
                            <button
                                onClick={downloadTemplate}
                                className="bg-white border border-indigo-200 text-indigo-700 px-4 py-2 rounded-md text-sm font-bold shadow-sm hover:bg-indigo-50 flex items-center gap-2"
                            >
                                <Download size={16} /> Download Template
                            </button>
                        </div>

                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:bg-gray-50 transition-colors group">
                            <div className="flex flex-col items-center">
                                <div className="p-4 bg-indigo-100 rounded-full mb-4 group-hover:scale-110 transition-transform">
                                    <UploadCloud size={32} className="text-indigo-600" />
                                </div>
                                <label className="cursor-pointer">
                                    <span className="bg-indigo-600 text-white px-6 py-2 rounded-md font-bold hover:bg-indigo-700 transition">
                                        Select Excel File
                                    </span>
                                    <input
                                        type="file"
                                        accept=".xlsx"
                                        className="hidden"
                                        onChange={handleFileUpload}
                                    />
                                </label>
                                <p className="text-xs text-gray-400 mt-2">Supports .xlsx with embedded images</p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="py-12 flex flex-col items-center justify-center text-center">
                        {status === 'parsing' && (
                            <>
                                <DotLottieReact
                                    src="https://lottie.host/585eaa49-82ac-4ffe-8958-524df205393d/GCwqhgbTtp.lottie"
                                    loop
                                    autoplay
                                    className="w-24 h-24 mb-4"
                                />
                                <h4 className="text-xl font-bold text-gray-800">Reading Excel File...</h4>
                                <p className="text-gray-500">Extracting questions and images</p>
                            </>
                        )}
                        {status === 'uploading' && (
                            <>
                                <div className="w-full max-w-sm bg-gray-200 rounded-full h-4 mb-4 overflow-hidden">
                                    <div
                                        className="bg-indigo-600 h-4 rounded-full transition-all duration-300"
                                        style={{ width: `${(progress.current / progress.total) * 100}%` }}
                                    ></div>
                                </div>
                                <h4 className="text-xl font-bold text-gray-800">Uploading Images...</h4>
                                <p className="text-gray-500">
                                    Processing Question {progress.current} of {progress.total}
                                </p>
                                <p className="text-xs text-orange-500 mt-2 font-medium animate-pulse">
                                    Please do not close this window.
                                </p>
                            </>
                        )}
                    </div>
                )}

                {error && (
                    <div className="mt-4 p-3 bg-red-50 text-red-600 text-sm rounded-md border border-red-200 flex items-center gap-2">
                        <AlertCircle size={16} /> {error}
                    </div>
                )}
            </div>
        </div>
    );
};

const StudentReportModal = ({ student, user, onClose }) => {
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchResults = async () => {
            try {
                // Ensure student.id matches what backend expects (firebase UID or _id)
                // Backend resultController user getStudentResults uses req.params.userId
                // results stored with userId field.
                const token = await user?.getIdToken();
                const res = await fetch(`${API_BASE_URL}/api/results/student/${student.id || student._id}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();
                setResults(Array.isArray(data) ? data : []);
            } catch (error) {
                console.error("Failed to fetch student results", error);
                setResults([]);
            } finally {
                setLoading(false);
            }
        };
        if (student) fetchResults();
    }, [student, user]);

    return (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-4xl h-[85vh] rounded-xl shadow-2xl flex flex-col overflow-hidden">
                <div className="p-6 border-b bg-indigo-50 flex justify-between items-center">
                    <div>
                        <h3 className="text-xl font-bold text-gray-800">Performance Report: {student.name}</h3>
                        <p className="text-sm text-gray-500">{student.email}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl">&times;</button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {loading ? <div className="text-center py-10">Loading Performance Data...</div> : (
                        <>
                            {/* Summary Stats */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-blue-50 p-4 rounded text-center border border-blue-100">
                                    <div className="text-2xl font-bold text-blue-700">{results.length}</div>
                                    <div className="text-xs text-gray-500 font-bold uppercase">Tests Taken</div>
                                </div>
                                <div className="bg-green-50 p-4 rounded text-center border border-green-100">
                                    <div className="text-2xl font-bold text-green-700">
                                        {results.length > 0 ? (results.reduce((acc, r) => acc + (r.score || 0), 0) / results.length).toFixed(1) : 0}
                                    </div>
                                    <div className="text-xs text-gray-500 font-bold uppercase">Avg Score</div>
                                </div>
                                <div className="bg-purple-50 p-4 rounded text-center border border-purple-100">
                                    <div className="text-2xl font-bold text-purple-700">
                                        {results.length > 0 ? (results.reduce((acc, r) => acc + (r.accuracy || 0), 0) / results.length).toFixed(1) : 0}%
                                    </div>
                                    <div className="text-xs text-gray-500 font-bold uppercase">Avg Accuracy</div>
                                </div>
                                <div className="bg-orange-50 p-4 rounded text-center border border-orange-100">
                                    <div className="text-2xl font-bold text-orange-700">
                                        {results.length > 0 ? new Date(results[0].submittedAt).toLocaleDateString() : 'N/A'}
                                    </div>
                                    <div className="text-xs text-gray-500 font-bold uppercase">Last Active</div>
                                </div>
                            </div>

                            {/* Detailed History */}
                            <h4 className="text-lg font-bold text-gray-800 border-b pb-2">Test History</h4>
                            {results.length === 0 ? <p className="text-gray-500 italic">No test attempts found.</p> : (
                                <div className="space-y-3">
                                    {results.map((res, idx) => (
                                        <div key={idx} className="border rounded-lg p-4 hover:bg-gray-50 flex flex-col md:flex-row justify-between items-center gap-4">
                                            <div className="flex-1">
                                                <h5 className="font-bold text-indigo-900">{res.testDetails?.title || 'Unknown Test'}</h5>
                                                <div className="flex gap-3 text-xs text-gray-500 mt-1">
                                                    <span>📅 {new Date(res.submittedAt).toLocaleDateString()}</span>
                                                    <span>⏱️ {(res.time_taken / 60).toFixed(1)} min</span>
                                                </div>
                                            </div>
                                            <div className="flex gap-6 text-center">
                                                <div>
                                                    <div className="font-mono font-bold text-lg text-blue-600">{res.score}</div>
                                                    <div className="text-[10px] text-gray-400 uppercase">Score</div>
                                                </div>
                                                <div>
                                                    <div className="font-mono font-bold text-lg text-green-600">{res.accuracy?.toFixed(1)}%</div>
                                                    <div className="text-[10px] text-gray-400 uppercase">Accuracy</div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

const CreateSeriesForm = ({ onSuccess, initialData = null }) => {
    const { user } = useAuth();
    const [formData, setFormData] = useState({
        title: initialData?.title || '',
        description: initialData?.description || '',
        price: initialData?.price || 0,
        currency: initialData?.currency || 'INR',
        category: initialData?.category || 'JEE Main',
        features: initialData?.features ? (Array.isArray(initialData.features) ? initialData.features.join(', ') : initialData.features) : '',
        image: initialData?.image || '',
        isActive: initialData?.isActive !== undefined ? initialData.isActive : true,
        expiryDate: initialData?.expiryDate || ''
    });
    const [loading, setLoading] = useState(false);
    const [includedSections, setIncludedSections] = useState(initialData?.includedSections || []);
    const [includedNotes, setIncludedNotes] = useState(initialData?.includedNotes || []);
    const [allSections, setAllSections] = useState([]);
    const [sectionsLoading, setSectionsLoading] = useState(false);

    // Fetch all notes sections when category changes
    const fetchSectionsForCategory = async (category) => {
        setSectionsLoading(true);
        try {
            const token = await user?.getIdToken();
            const res = await fetch(`${API_BASE_URL}/api/notes/admin/sections?field=${encodeURIComponent(category)}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setAllSections(data.sections || []);
            }
        } catch (e) { console.error('Failed to fetch sections', e); }
        finally { setSectionsLoading(false); }
    };

    React.useEffect(() => {
        if (formData.category) fetchSectionsForCategory(formData.category);
    }, [formData.category]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 200 * 1024) { // 200KB limit
            alert("Image too large! Max 200KB allowed.");
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            setFormData(prev => ({ ...prev, image: reader.result }));
        };
        reader.readAsDataURL(file);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const token = await user?.getIdToken();
            const payload = {
                ...formData,
                features: formData.features.split(',').map(f => f.trim()).filter(f => f),
                includedSections,
                includedNotes
            };

            const url = initialData
                ? `${API_BASE_URL}/api/admin/series/${initialData.id || initialData._id}`
                : `${API_BASE_URL}/api/admin/series`;

            const method = initialData ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                alert(initialData ? 'Series Updated Successfully' : 'Series Created Successfully');
                setFormData({ title: '', description: '', price: 0, currency: 'INR', category: 'JEE Main', features: '', image: '', isActive: true, expiryDate: '' });
                onSuccess();
            } else {
                const errorData = await res.json().catch(() => ({}));
                alert(errorData.error || (initialData ? 'Failed to update series' : 'Failed to create series'));
            }
        } catch (error) {
            console.error("Series Submit Error:", error);
            alert('Error creating series: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Series Title</label>
                    <input type="text" name="title" value={formData.title || ''} onChange={handleChange} required className="mt-1 block w-full border border-gray-300 rounded p-2" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Price (INR)</label>
                    <input type="number" name="price" value={formData.price || 0} onChange={handleChange} required className="mt-1 block w-full border border-gray-300 rounded p-2" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Category</label>
                    <select name="category" value={formData.category || 'JEE Main'} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded p-2 bg-white">
                        <option value="JEE Main">JEE Main</option>
                        <option value="JEE Advanced">JEE Advanced</option>
                        <option value="NEET">NEET</option>
                        <option value="CAT">CAT</option>
                        <option value="Board Exam">Board Exam</option>
                        <option value="Others">Others</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Cover Image</label>
                    <div className="mt-1 flex items-center gap-4">
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="block w-full text-sm text-gray-500
                                file:mr-4 file:py-2 file:px-4
                                file:rounded-full file:border-0
                                file:text-sm file:font-semibold
                                file:bg-indigo-50 file:text-indigo-700
                                hover:file:bg-indigo-100"
                        />
                        {formData.image && (
                            <img src={formData.image} alt="Preview" className="h-10 w-10 rounded object-cover border" />
                        )}
                    </div>
                    {/* Hidden input to keep state sync if needed or just use state directly */}
                </div>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea name="description" value={formData.description || ''} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded p-2" />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">Features (Comma separated)</label>
                <input type="text" name="features" value={formData.features || ''} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded p-2" placeholder="10 Full Mocks, Video Analysis, expert support" />
            </div>
            <div className="flex items-center">
                <input type="checkbox" name="isActive" checked={formData.isActive || false} onChange={handleChange} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded" />
                <label className="ml-2 block text-sm text-gray-900">Active (Visible to students)</label>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">Expiry Date (Optional)</label>
                <input type="date" name="expiryDate" value={formData.expiryDate || ''} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded p-2" />
            </div>

            {/* Notes Bundling Section */}
            <div className="border-t pt-4 mt-2">
                <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">📚</span>
                    <h4 className="text-sm font-bold text-gray-800">Bundle Notes Sections with this Series</h4>
                </div>
                <p className="text-xs text-gray-500 mb-3">
                    Students who buy this series will automatically get access to all notes in the selected sections.
                </p>
                {sectionsLoading ? (
                    <p className="text-xs text-gray-400 animate-pulse">Loading sections for {formData.category}...</p>
                ) : allSections.length === 0 ? (
                    <p className="text-xs text-gray-400">No notes sections found for {formData.category}. Add sections in the Notes Manager first.</p>
                ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {allSections.map(section => {
                            const isChecked = includedSections.includes(section.id);
                            return (
                                <label key={section.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition ${
                                    isChecked ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 hover:border-indigo-200'
                                }`}>
                                    <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => {
                                            setIncludedSections(prev =>
                                                isChecked ? prev.filter(id => id !== section.id) : [...prev, section.id]
                                            );
                                        }}
                                        className="h-4 w-4 text-indigo-600 rounded"
                                    />
                                    <span className="text-base">{section.icon || '📁'}</span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-gray-800 truncate">{section.title}</p>
                                        <p className="text-xs text-gray-500">{section.type === 'paid' ? '👑 Premium' : '✅ Free'} • {section._noteCount || 0} notes</p>
                                    </div>
                                    {isChecked && <span className="text-xs font-bold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full">Bundled ✓</span>}
                                </label>
                            );
                        })}
                    </div>
                )}
                {includedSections.length > 0 && (
                    <p className="text-xs font-semibold text-indigo-600 mt-2">✓ {includedSections.length} section(s) will be included with this series.</p>
                )}
            </div>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-indigo-600 text-white font-bold rounded hover:bg-indigo-700 disabled:opacity-50">
                {loading ? (initialData ? 'Updating...' : 'Creating...') : (initialData ? 'Update Series' : 'Create Series')}
            </button>
        </form>
    );
};

const CustomMockGeneratorModal = ({ availableTests, onClose, onSuccess, user }) => {
    // Step 1: Selection
    const [selectedTestIds, setSelectedTestIds] = useState([]);
    const [categoryFilter, setCategoryFilter] = useState('All');
    
    // Step 2: Blueprint
    const [step, setStep] = useState(1);
    const [pools, setPools] = useState({}); // { "Physics|mcq": { available: 50, selected: 10 } }
    const [mockCount, setMockCount] = useState(1);
    
    // UI state
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Initial Filter
    const activeTests = availableTests.filter(t => t.isVisible !== false && t.status !== 'draft');
    const filteredTests = categoryFilter === 'All' 
        ? activeTests 
        : activeTests.filter(t => t.category === categoryFilter);

    const handleNextStep = () => {
        if (selectedTestIds.length === 0) {
            setError("Please select at least one source test.");
            return;
        }
        
        // Ensure all selected tests have the same category
        const selectedTestsData = activeTests.filter(t => selectedTestIds.includes(t._id));
        const firstCat = selectedTestsData[0].category;
        const allSameCat = selectedTestsData.every(t => t.category === firstCat);
        
        if (!allSameCat) {
            setError("All selected source tests must belong to the exact same category.");
            return;
        }

        // Calculate available pools
        const newPools = {};
        selectedTestsData.forEach(t => {
            (t.questions || []).forEach(q => {
                const key = `${q.subject || 'General'}|${q.type || 'mcq'}`;
                if (!newPools[key]) newPools[key] = { available: 0, selected: 0 };
                newPools[key].available += 1;
            });
        });

        setPools(newPools);
        setError(null);
        setStep(2);
    };

    const handlePoolChange = (key, value) => {
        const num = parseInt(value, 10) || 0;
        setPools(prev => ({
            ...prev,
            [key]: { ...prev[key], selected: num }
        }));
    };

    // nCr combinations formula
    const getCombinations = (n, r) => {
        if (r > n) return 0;
        if (r === 0 || r === n) return 1;
        let c = 1;
        for (let i = 1; i <= r; i++) {
            c = c * (n - i + 1) / i;
        }
        return c;
    };

    const calculateMaxMocks = () => {
        let max = Infinity;
        let hasSelection = false;
        let isValid = true;
        
        for (const [key, data] of Object.entries(pools)) {
            if (data.selected > 0) {
                hasSelection = true;
                if (data.available < data.selected) {
                    isValid = false;
                } else {
                    // Calculate nCr for this bucket
                    const combinations = getCombinations(data.available, data.selected);
                    if (combinations < max) {
                        max = combinations;
                    }
                }
            }
        }
        
        // If not valid, 0. Otherwise, return the minimum combinations across all required buckets.
        // Cap the *display* at a very high number if it gets too large to prevent Infinity display issues
        if (!hasSelection || !isValid) return 0;
        return max > 1000000 ? "1000000+" : max; 
    };

    const maxMocks = calculateMaxMocks();

    const handleGenerate = async () => {
        if (maxMocks === 0) {
            setError("Blueprint is invalid or empty. You cannot generate 0 mocks.");
            return;
        }
        
        const count = parseInt(mockCount, 10);
        if (isNaN(count) || count < 1) {
            setError(`Please enter a valid number of mocks to generate (minimum 1).`);
            return;
        }
        
        if (count > 50) {
            setError("To prevent server overload, you can only generate a maximum of 50 mocks at one time.");
            return;
        }

        const numericMax = typeof maxMocks === 'string' ? Infinity : maxMocks;
        if (count > numericMax) {
            setError(`You cannot generate more than ${numericMax} unique mocks based on this blueprint.`);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const blueprint = {};
            for (const [key, data] of Object.entries(pools)) {
                if (data.selected > 0) blueprint[key] = data.selected;
            }

            const token = await user?.getIdToken();
            const res = await fetch(`${API_BASE_URL}/api/tests/generate-shuffled`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    testIds: selectedTestIds,
                    blueprint,
                    mockCount: parseInt(mockCount, 10)
                })
            });

            const data = await res.json();
            if (res.ok) {
                alert(`Success! ${data.message}`);
                onSuccess();
            } else {
                throw new Error(data.message || "Failed to generate mocks");
            }
        } catch (err) {
            console.error(err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4 sm:p-6 overflow-y-auto">
            <div className="bg-white rounded-2xl w-full max-w-4xl flex flex-col shadow-2xl overflow-hidden border border-white/20 my-auto">
                <div className="p-6 bg-indigo-50 border-b border-indigo-100 flex justify-between items-center">
                    <div>
                        <h3 className="text-xl font-black text-indigo-900 flex items-center gap-2">
                            <Combine className="text-indigo-600" /> Custom Mock Generator
                        </h3>
                        <p className="text-sm text-indigo-700/70 mt-1 font-medium">Create new drafted mocks by pooling and shuffling questions.</p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-white hover:bg-red-50 hover:text-red-500 rounded-full transition-colors text-gray-400">
                        <X size={20} strokeWidth={2.5} />
                    </button>
                </div>

                <div className="p-6 md:p-8 flex-1 overflow-y-auto max-h-[70vh]">
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-start gap-3 text-sm font-medium">
                            <AlertTriangle className="shrink-0 mt-0.5" size={18} />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Stepper */}
                    <div className="flex items-center justify-center mb-8">
                        <div className={`px-4 py-2 rounded-full font-bold text-sm ${step === 1 ? 'bg-indigo-600 text-white shadow-md' : 'bg-indigo-50 text-indigo-400 border border-indigo-100'}`}>
                            1. Select Pool
                        </div>
                        <div className={`w-12 h-0.5 mx-2 ${step === 2 ? 'bg-indigo-600' : 'bg-indigo-100'}`}></div>
                        <div className={`px-4 py-2 rounded-full font-bold text-sm ${step === 2 ? 'bg-indigo-600 text-white shadow-md' : 'bg-indigo-50 text-indigo-400 border border-indigo-100'}`}>
                            2. Blueprint & Generate
                        </div>
                    </div>

                    {step === 1 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <div>
                                    <h4 className="font-bold text-gray-800">Select Source Tests</h4>
                                    <p className="text-xs text-gray-500">Pick active tests to pool questions from.</p>
                                </div>
                                <select 
                                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white font-medium text-gray-700"
                                    value={categoryFilter}
                                    onChange={(e) => {
                                        setCategoryFilter(e.target.value);
                                        setSelectedTestIds([]); // Reset selection on category change to prevent mixing
                                    }}
                                >
                                    <option value="All">All Categories</option>
                                    <option value="JEE Main">JEE Main</option>
                                    <option value="JEE Advanced">JEE Advanced</option>
                                    <option value="NEET">NEET</option>
                                    <option value="CAT">CAT</option>
                                    <option value="Board Exam">Board Exam</option>
                                    <option value="Others">Others</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto p-1 pr-2 custom-scrollbar">
                                {filteredTests.map(t => (
                                    <label key={t._id} className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedTestIds.includes(t._id) ? 'border-indigo-500 bg-indigo-50/50 shadow-sm' : 'border-gray-100 hover:border-indigo-200 hover:bg-gray-50'}`}>
                                        <div className="pt-0.5">
                                            <input 
                                                type="checkbox" 
                                                className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 transition-colors"
                                                checked={selectedTestIds.includes(t._id)}
                                                onChange={(e) => {
                                                    if (e.target.checked) setSelectedTestIds(prev => [...prev, t._id]);
                                                    else setSelectedTestIds(prev => prev.filter(id => id !== t._id));
                                                }}
                                            />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-gray-900 truncate">{t.title}</p>
                                            <div className="flex gap-2 mt-1">
                                                <span className="text-[10px] font-bold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded uppercase tracking-wider">{t.category}</span>
                                                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded uppercase tracking-wider">{t.questions?.length || 0} QS</span>
                                            </div>
                                        </div>
                                    </label>
                                ))}
                                {filteredTests.length === 0 && (
                                    <div className="col-span-1 md:col-span-2 text-center py-12 text-gray-500">
                                        No active tests found in this category.
                                    </div>
                                )}
                            </div>

                            <div className="pt-4 flex justify-end">
                                <button
                                    onClick={handleNextStep}
                                    disabled={selectedTestIds.length === 0}
                                    className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-bold shadow hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    Continue to Blueprint →
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-300">
                            <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex gap-3 text-sm text-amber-800">
                                <Info className="shrink-0 mt-0.5 text-amber-600" size={18} />
                                <div>
                                    <p className="font-bold mb-1">How it works</p>
                                    <p className="text-amber-700/80 leading-relaxed">Questions are pooled from the {selectedTestIds.length} test(s) you selected. Define how many questions you want per mock for each subject and type below. The system will calculate how many non-duplicating mocks can be generated.</p>
                                </div>
                            </div>

                            <div className="border border-gray-200 rounded-xl overflow-hidden">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Subject & Type</th>
                                            <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase">Pool Size</th>
                                            <th className="px-6 py-3 text-right text-xs font-bold text-indigo-600 uppercase">Select Per Mock</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-100">
                                        {Object.entries(pools).map(([key, data]) => {
                                            const [subj, type] = key.split('|');
                                            return (
                                                <tr key={key} className={data.selected > 0 ? "bg-indigo-50/30" : ""}>
                                                    <td className="px-6 py-3 whitespace-nowrap">
                                                        <span className="font-bold text-gray-800">{subj}</span>
                                                        <span className="ml-2 text-[10px] font-bold text-gray-500 uppercase bg-gray-100 px-2 py-0.5 rounded">{type}</span>
                                                    </td>
                                                    <td className="px-6 py-3 whitespace-nowrap text-center font-mono font-bold text-gray-600">
                                                        {data.available}
                                                    </td>
                                                    <td className="px-6 py-3 whitespace-nowrap text-right">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            max={data.available}
                                                            className="w-20 px-3 py-1.5 border border-indigo-200 rounded text-center font-bold text-indigo-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                                                            value={data.selected || ''}
                                                            onChange={(e) => handlePoolChange(key, e.target.value)}
                                                            placeholder="0"
                                                        />
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            <div className="bg-emerald-50 border-2 border-emerald-100 p-6 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <div>
                                    <h4 className="font-black text-emerald-800 text-lg">Maximum Possible Mocks</h4>
                                    <p className="text-sm text-emerald-600/80 font-medium">Based on your blueprint limit</p>
                                </div>
                                <div className="text-4xl font-black text-emerald-600 text-center font-mono drop-shadow-sm">
                                    {maxMocks}
                                </div>
                            </div>

                            {maxMocks > 0 && (
                                <div className="p-6 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between gap-4">
                                    <div className="flex-1">
                                        <label className="block text-sm font-bold text-gray-800 mb-1">Mocks to Generate</label>
                                        <p className="text-xs text-gray-500">How many new draft tests should be created?</p>
                                    </div>
                                    <input
                                        type="number"
                                        min="1"
                                        max={maxMocks}
                                        value={mockCount}
                                        onChange={(e) => setMockCount(e.target.value)}
                                        className="w-24 px-4 py-2 text-xl font-bold text-center border cursor-text border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                            )}

                            <div className="pt-6 border-t border-gray-100 flex justify-between items-center">
                                <button
                                    onClick={() => setStep(1)}
                                    className="px-4 py-2 text-gray-500 hover:text-gray-800 font-bold transition-colors"
                                >
                                    ← Back
                                </button>
                                <button
                                    onClick={handleGenerate}
                                    disabled={loading || maxMocks === 0}
                                    className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-black tracking-wide shadow-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                                >
                                    {loading ? (
                                        <><Loader2 size={18} className="animate-spin" /> Generating...</>
                                    ) : (
                                        <><Combine size={18} /> Generate {mockCount || 0} Mocks</>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// ========================
// COUPON MANAGER COMPONENT
// ========================
const CouponManager = ({ user }) => {
    const [coupons, setCoupons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingCoupon, setEditingCoupon] = useState(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const emptyForm = { code: '', discountType: 'percent', discountValue: '', applicableFields: ['all'], maxUses: 0, maxUsesPerUser: 1, validFrom: '', validUntil: '', isActive: true };
    const [form, setForm] = useState(emptyForm);

    const EXAM_FIELDS = ['JEE Main', 'JEE Advanced', 'NEET', 'CAT', 'Board Exam', 'Others'];

    const fetchCoupons = async () => {
        try {
            setLoading(true);
            const token = await user?.getIdToken();
            const res = await fetch(`${API_BASE_URL}/api/admin/coupons`, { headers: { Authorization: `Bearer ${token}` } });
            const data = await res.json();
            setCoupons(Array.isArray(data) ? data : []);
        } catch (e) { setError('Failed to fetch coupons'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchCoupons(); }, []);

    const handleFieldToggle = (field) => {
        setForm(prev => {
            if (field === 'all') return { ...prev, applicableFields: ['all'] };
            const current = prev.applicableFields.filter(f => f !== 'all');
            if (current.includes(field)) return { ...prev, applicableFields: current.filter(f => f !== field) || ['all'] };
            return { ...prev, applicableFields: [...current, field] };
        });
    };

    const openCreate = () => { setEditingCoupon(null); setForm(emptyForm); setShowForm(true); setError(null); };
    const openEdit = (c) => { setEditingCoupon(c); setForm({ ...c, validFrom: c.validFrom ? c.validFrom.slice(0,16) : '', validUntil: c.validUntil ? c.validUntil.slice(0,16) : '' }); setShowForm(true); setError(null); };

    const handleSave = async () => {
        if (!form.code.trim()) { setError('Coupon code is required'); return; }
        if (form.discountType !== 'free' && (!form.discountValue || isNaN(Number(form.discountValue)))) { setError('Discount value is required'); return; }
        setSaving(true); setError(null);
        try {
            const token = await user?.getIdToken();
            const url = editingCoupon ? `${API_BASE_URL}/api/admin/coupons/${editingCoupon.id}` : `${API_BASE_URL}/api/admin/coupons`;
            const method = editingCoupon ? 'PUT' : 'POST';
            const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(form) });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to save');
            setSuccess(editingCoupon ? 'Coupon updated!' : 'Coupon created!');
            setShowForm(false);
            fetchCoupons();
            setTimeout(() => setSuccess(null), 3000);
        } catch (e) { setError(e.message); }
        finally { setSaving(false); }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this coupon? This action cannot be undone.')) return;
        try {
            const token = await user?.getIdToken();
            await fetch(`${API_BASE_URL}/api/admin/coupons/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
            setCoupons(prev => prev.filter(c => c.id !== id));
        } catch (e) { setError('Failed to delete coupon'); }
    };

    const discountLabel = (c) => {
        if (c.discountType === 'free') return <span className="text-green-700 font-bold">FREE</span>;
        if (c.discountType === 'percent') return <span className="text-indigo-700 font-bold">{c.discountValue}%</span>;
        return <span className="text-orange-700 font-bold">₹{c.discountValue}</span>;
    };

    return (
        <div className="bg-white rounded-xl shadow border border-gray-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    🎟️ Coupon Manager
                </h3>
                <button onClick={openCreate} className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 flex items-center gap-2">
                    + Create Coupon
                </button>
            </div>

            {success && <div className="mx-6 mt-4 p-3 bg-green-50 text-green-700 border border-green-200 rounded-lg text-sm font-bold">{success}</div>}
            {error && !showForm && <div className="mx-6 mt-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm font-bold">{error}</div>}

            {/* Create / Edit Form */}
            {showForm && (
                <div className="p-6 border-b border-gray-100 bg-indigo-50/30 space-y-4">
                    <h4 className="font-bold text-gray-700">{editingCoupon ? 'Edit Coupon' : 'New Coupon'}</h4>
                    {error && <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm">{error}</div>}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1">Coupon Code *</label>
                            <input value={form.code} onChange={e => setForm(p => ({...p, code: e.target.value.toUpperCase()}))} placeholder="e.g. SAVE50" maxLength={20}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 font-mono font-bold text-sm uppercase focus:ring-2 focus:ring-indigo-400 outline-none" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1">Discount Type *</label>
                            <select value={form.discountType} onChange={e => setForm(p => ({...p, discountType: e.target.value}))}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400 outline-none">
                                <option value="percent">Percentage (%)</option>
                                <option value="flat">Flat Amount (₹)</option>
                                <option value="free">100% Free</option>
                            </select>
                        </div>
                        {form.discountType !== 'free' && (
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1">Discount Value *</label>
                                <input type="number" min="0" max={form.discountType === 'percent' ? 100 : undefined} value={form.discountValue} onChange={e => setForm(p => ({...p, discountValue: e.target.value}))}
                                    placeholder={form.discountType === 'percent' ? '0-100' : '₹ amount'}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400 outline-none" />
                            </div>
                        )}
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1">Max Total Uses (0 = unlimited)</label>
                            <input type="number" min="0" value={form.maxUses} onChange={e => setForm(p => ({...p, maxUses: e.target.value}))}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400 outline-none" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1">Max Uses Per User</label>
                            <input type="number" min="0" value={form.maxUsesPerUser} onChange={e => setForm(p => ({...p, maxUsesPerUser: e.target.value}))}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400 outline-none" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1">Active</label>
                            <button onClick={() => setForm(p => ({...p, isActive: !p.isActive}))}
                                className={`px-4 py-2 rounded-lg font-bold text-sm border-2 ${form.isActive ? 'bg-green-100 border-green-400 text-green-800' : 'bg-gray-100 border-gray-300 text-gray-600'}`}>
                                {form.isActive ? '✅ Active' : '⛔ Inactive'}
                            </button>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1">Valid From</label>
                            <input type="datetime-local" value={form.validFrom} onChange={e => setForm(p => ({...p, validFrom: e.target.value}))}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400 outline-none" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1">Valid Until</label>
                            <input type="datetime-local" value={form.validUntil} onChange={e => setForm(p => ({...p, validUntil: e.target.value}))}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400 outline-none" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-2">Applicable For</label>
                        <div className="flex flex-wrap gap-2">
                            {['all', ...EXAM_FIELDS].map(field => (
                                <button key={field} onClick={() => handleFieldToggle(field)}
                                    className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors ${(form.applicableFields || []).includes(field)
                                        ? 'bg-indigo-600 text-white border-indigo-600'
                                        : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}>
                                    {field === 'all' ? '🌍 All Fields' : field}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button onClick={handleSave} disabled={saving} className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 disabled:opacity-50">
                            {saving ? 'Saving...' : editingCoupon ? '💾 Save Changes' : '✨ Create Coupon'}
                        </button>
                        <button onClick={() => { setShowForm(false); setError(null); }} className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg font-bold text-sm hover:bg-gray-50">Cancel</button>
                    </div>
                </div>
            )}

            {/* Coupon List */}
            <div className="overflow-x-auto">
                {loading ? (
                    <div className="text-center py-12 text-gray-400 font-medium">Loading coupons...</div>
                ) : coupons.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                        <div className="text-4xl mb-3">🎟️</div>
                        <p className="font-medium">No coupons yet. Create one to get started!</p>
                    </div>
                ) : (
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Code</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Discount</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">For</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Uses</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Per User</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Validity</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                            {coupons.map(c => (
                                <tr key={c.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 whitespace-nowrap font-mono font-bold text-gray-900 text-sm">{c.code}</td>
                                    <td className="px-4 py-3 whitespace-nowrap">{discountLabel(c)}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600">{(c.applicableFields || ['all']).join(', ')}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                                        <span className="font-bold text-gray-800">{c.usedCount || 0}</span>
                                        <span className="text-gray-400"> / {c.maxUses > 0 ? c.maxUses : '∞'}</span>
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{c.maxUsesPerUser > 0 ? c.maxUsesPerUser : '∞'}x</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">
                                        {c.validUntil ? `Until ${new Date(c.validUntil).toLocaleDateString()}` : 'No expiry'}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${c.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {c.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap flex gap-2">
                                        <button onClick={() => openEdit(c)} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-bold hover:bg-blue-100">Edit</button>
                                        <button onClick={() => handleDelete(c.id)} className="px-3 py-1 bg-red-50 text-red-700 rounded-md text-xs font-bold hover:bg-red-100">Delete</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default function AdminDashboard() {

    const { user } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname();

    // URL Derived State
    const activeTab = searchParams.get('tab') || 'manage';
    const showAnalytics = searchParams.get('analytics'); // Test ID or null

    // Navigation Helper
    const updateParams = (key, value) => {
        const current = new URLSearchParams(Array.from(searchParams.entries()));
        if (!value) {
            current.delete(key);
        } else {
            current.set(key, value);
        }
        const search = current.toString();
        const query = search ? `?${search}` : "";
        router.push(`${pathname}${query}`);
    };

    const setActiveTab = (tab) => updateParams('tab', tab);
    const setShowAnalytics = (testId) => updateParams('analytics', testId);

    // Syllabus State
    const [syllabusData, setSyllabusData] = useState({
        'JEE Main': '',
        'JEE Advanced': '',
        'NEET': '',
        'CAT': '',
        'Board Exam': ''
    });
    const [selectedSyllabusCategory, setSelectedSyllabusCategory] = useState('JEE Main');
    const [syllabusLink, setSyllabusLink] = useState('');
    const [savingSyllabus, setSavingSyllabus] = useState(false);

    // Missing State Definitions
    // const [showAnalytics, setShowAnalytics] = useState(null); // REMOVED (URL Driven)
    // const [activeTab, setActiveTab] = useState('manage'); // REMOVED (URL Driven)
    const [tests, setTests] = useState([]);
    const [sortTestsBy, setSortTestsBy] = useState('newest');
    const [usersList, setUsersList] = useState([]);
    const [seriesList, setSeriesList] = useState([]);
    const [teamStats, setTeamStats] = useState([]);
    const [revenueStats, setRevenueStats] = useState(null);
    const [loading, setLoading] = useState(false);
    const [viewingStudent, setViewingStudent] = useState(null); // Report Modal State
    const [editingSeries, setEditingSeries] = useState(null); // Series Edit Modal State
    const [editingTest, setEditingTest] = useState(null); // Test Edit Modal State
    const [splittingTest, setSplittingTest] = useState(null); // Split Test Modal State
    const [showMergeModal, setShowMergeModal] = useState(false); // Merge Tests Modal State
    const [studentSearch, setStudentSearch] = useState('');
    const [studentFieldFilter, setStudentFieldFilter] = useState('All');
    const [previewingTest, setPreviewingTest] = useState(null); // Test Preview Modal State
    const [zoomedImg, setZoomedImg] = useState(null); // Global image zoom state

    const [showBulkUpload, setShowBulkUpload] = useState(false);
    const [showPdfModal, setShowPdfModal] = useState(false);
    const [showPdfTextModal, setShowPdfTextModal] = useState(false);
    const [showMarkerModal, setShowMarkerModal] = useState(false);
    const [showGeminiModal, setShowGeminiModal] = useState(false);
    const [showCustomMockModal, setShowCustomMockModal] = useState(false);
    const [allNotes, setAllNotes] = useState([]);
    const [allSections, setAllSections] = useState([]);
    const [seriesTab, setSeriesTab] = useState('tests'); // 'tests' | 'notes'

    // States for "Load to Edit" functionality
    const [isUpdatingExisting, setIsUpdatingExisting] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [showQuickMarkModal, setShowQuickMarkModal] = useState(false);
    const [quickMarkInput, setQuickMarkInput] = useState('');

    // Master Password State
    const [isMasterUnlocked, setIsMasterUnlocked] = useState(false);
    const [masterPasswordInput, setMasterPasswordInput] = useState('');
    const [masterUnlockError, setMasterUnlockError] = useState('');
    const [isUnlocking, setIsUnlocking] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Initial Data Fetching
    useEffect(() => {
        if (user) {
            if (activeTab === 'manage') {
                fetchTests();
                fetchSeries(); // Fetch series to show names in manage tab
            }
            if (activeTab === 'users' && isMasterUnlocked) fetchStudents();
            if (activeTab === 'series') fetchSeries();
            if (activeTab === 'revenue' && isMasterUnlocked) fetchRevenue();
            if (activeTab === 'profile') fetchTeamStats();
        }
    }, [activeTab, user, isMasterUnlocked]);

    // Fetch Syllabus on mount
    useEffect(() => {
        const fetchSyllabus = async () => {
            try {
                const token = await user?.getIdToken();
                const res = await fetch(`${API_BASE_URL}/api/admin/syllabus`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setSyllabusData(prev => ({ ...prev, ...data }));
                }
            } catch (error) {
                console.error("Error fetching syllabus:", error);
            }
        };
        if (user && activeTab === 'content' && isMasterUnlocked) fetchSyllabus();
    }, [user, activeTab, isMasterUnlocked]);

    // Update local input when category changes or data loads
    useEffect(() => {
        setSyllabusLink(syllabusData[selectedSyllabusCategory] || '');
    }, [selectedSyllabusCategory, syllabusData]);

    const handleSaveSyllabus = async () => {
        setSavingSyllabus(true);
        try {
            const token = await user?.getIdToken();
            const payload = { [selectedSyllabusCategory]: syllabusLink };

            const res = await fetch(`${API_BASE_URL}/api/admin/syllabus`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setSyllabusData(prev => ({ ...prev, [selectedSyllabusCategory]: syllabusLink }));
                alert('Syllabus Link Updated Successfully!');
            } else {
                alert('Failed to update syllabus link');
            }
        } catch (error) {
            console.error("Save Error:", error);
            alert("Error saving syllabus link");
        } finally {
            setSavingSyllabus(false);
        }
    };

    const fetchTests = async () => {
        try {
            const token = await user?.getIdToken();
            const res = await fetch(`${API_BASE_URL}/api/tests`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (Array.isArray(data)) {
                setTests(data); // Raw order — sorting is handled by sortTestsBy in UI
            } else {
                setTests([]);
            }
        } catch (error) {
            console.error("Error fetching tests:", error);
            setTests([]);
        }
    };

    const fetchStudents = async () => {
        try {
            const token = await user?.getIdToken();
            const res = await fetch(`${API_BASE_URL}/api/admin/students`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (Array.isArray(data)) {
                setUsersList(data);
            } else {
                console.error("Invalid students data:", data);
                setUsersList([]);
            }
        } catch (error) {
            console.error("Error fetching students:", error);
            setUsersList([]);
        }
    };

    const fetchSeries = async () => {
        try {
            const token = await user?.getIdToken();
            const res = await fetch(`${API_BASE_URL}/api/admin/series`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (Array.isArray(data)) {
                const sortedSeries = data.sort((a, b) => (a.title || '').localeCompare(b.title || '', undefined, { numeric: true, sensitivity: 'base' }));
                setSeriesList(sortedSeries);
            }
        } catch (error) {
            console.error("Error fetching series:", error);
        }
    };

    const fetchNotesAndSections = async () => {
        const token = await user?.getIdToken();
        if (!token) return;
        try {
            const [nRes, sRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/notes`, { headers: { Authorization: `Bearer ${token}` } }),
                fetch(`${API_BASE_URL}/api/notes/sections`, { headers: { Authorization: `Bearer ${token}` } })
            ]);
            if (nRes.ok) setAllNotes(await nRes.json());
            if (sRes.ok) setAllSections(await sRes.json());
        } catch (err) { console.error("Fetch library error", err); }
    };

    const handleToggleNoteInSeries = async (noteId) => {
        if (!managingSeries) return;
        const currentNotes = managingSeries.includedNotes || [];
        const isIncluded = currentNotes.includes(noteId);
        const updatedNotes = isIncluded ? currentNotes.filter(id => id !== noteId) : [...currentNotes, noteId];

        try {
            const token = await user?.getIdToken();
            const res = await fetch(`${API_BASE_URL}/api/admin/series/${managingSeries.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ includedNotes: updatedNotes })
            });
            if (res.ok) {
                setSeriesList(seriesList.map(s => s.id === managingSeries.id ? { ...s, includedNotes: updatedNotes } : s));
            }
        } catch (e) { alert('Update failed'); }
    };

    const handleToggleSectionInSeries = async (sectionId) => {
        if (!managingSeries) return;
        const currentSections = managingSeries.includedSections || [];
        const isIncluded = currentSections.includes(sectionId);
        const updatedSections = isIncluded ? currentSections.filter(id => id !== sectionId) : [...currentSections, sectionId];

        try {
            const token = await user?.getIdToken();
            const res = await fetch(`${API_BASE_URL}/api/admin/series/${managingSeries.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ includedSections: updatedSections })
            });
            if (res.ok) {
                setSeriesList(seriesList.map(s => s.id === managingSeries.id ? { ...s, includedSections: updatedSections } : s));
            }
        } catch (e) { alert('Update failed'); }
    };

    const fetchTeamStats = async () => {
        try {
            const token = await user?.getIdToken();
            const res = await fetch(`${API_BASE_URL}/api/admin/team-stats`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setTeamStats(data);
            }
        } catch (error) {
            console.error("Error fetching team stats:", error);
        }
    };

    const fetchRevenue = async () => {
        try {
            const token = await user?.getIdToken();
            const res = await fetch(`${API_BASE_URL}/api/admin/revenue`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setRevenueStats(data);
        } catch (error) {
            console.error("Error fetching revenue:", error);
        }
    };

    const handleUnlockMaster = async (e) => {
        e.preventDefault();
        setMasterUnlockError('');
        setIsUnlocking(true);
        try {
            const token = await user?.getIdToken();
            const res = await fetch(`${API_BASE_URL}/api/admin/verify-revenue-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ password: masterPasswordInput })
            });

            const data = await res.json();
            if (res.ok && data.success) {
                setIsMasterUnlocked(true);
                setMasterPasswordInput('');
            } else {
                setMasterUnlockError(data.error || 'Incorrect password');
            }
        } catch (error) {
            console.error("Master Unlock Error:", error);
            setMasterUnlockError('Failed to verify password');
        } finally {
            setIsUnlocking(false);
        }
    };

    const handleDeleteSeries = async (seriesId) => {
        if (!confirm('Are you sure you want to delete this Test Series?\n\nThe tests inside will remain intact, but the series itself will be removed. Proceed?')) return;
        try {
            const token = await user?.getIdToken();
            const res = await fetch(`${API_BASE_URL}/api/admin/series/${seriesId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                alert('Series deleted successfully');
                fetchSeries();
            } else {
                alert('Failed to delete series');
            }
        } catch (error) {
            console.error("Error deleting series:", error);
            alert("Error deleting series");
        }
    };

    const handleDeleteTest = async (testId) => {
        if (!confirm('Are you sure you want to delete this test container?\n\nNote: Uploaded images (Questions, Options, Solutions) are safely preserved in the database to prevent breaking other tests that might reuse them. Only this specific test will be removed.\n\nThis cannot be undone. Proceed?')) return;
        try {
            const token = await user?.getIdToken();
            const res = await fetch(`${API_BASE_URL}/api/admin/tests/${testId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setTests(prev => prev.filter(t => t._id !== testId));
                alert("Test deleted successfully");
                fetchTests(); // Refresh the list
            } else {
                const errorData = await res.json();
                alert(`Failed to delete test: ${errorData.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error("Delete Error:", error);
            alert("Failed to delete test");
        }
    };

    const handleUpdateRole = async (userId, newRole) => {
        if (!confirm(`Are you sure you want to promote/demote this user to ${newRole}?`)) return;
        try {
            const token = await user?.getIdToken();
            const res = await fetch(`${API_BASE_URL}/api/admin/students/${userId}/role`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ role: newRole })
            });
            if (res.ok) {
                setUsersList(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
                alert(`User role updated to ${newRole}`);
            } else {
                alert("Failed to update role");
            }
        } catch (error) {
            console.error("Role Update Error:", error);
            alert("Error updating role");
        }
    };

    const handleUpdateAdminLevel = async (userId, newLevel) => {
        if (!confirm(`Are you sure you want to change this admin's level to ${newLevel}?`)) return;
        try {
            const token = await user?.getIdToken();
            const res = await fetch(`${API_BASE_URL}/api/admin/students/${userId}/adminLevel`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ adminLevel: Number(newLevel) })
            });
            if (res.ok) {
                setUsersList(prev => prev.map(u => u.id === userId ? { ...u, adminLevel: Number(newLevel) } : u));
                alert(`Admin level updated to ${newLevel}`);
            } else {
                alert("Failed to update admin level");
            }
        } catch (error) {
            console.error("Admin Level Update Error:", error);
            alert("Error updating admin level");
        }
    };

    const handleBlockUser = async (userId, currentStatus) => {
        const NewStatus = currentStatus === 'blocked' ? 'active' : 'blocked';
        if (!confirm(`Are you sure you want to ${NewStatus.toUpperCase()} this user?`)) return;

        try {
            const token = await user?.getIdToken();
            const res = await fetch(`${API_BASE_URL}/api/admin/students/${userId}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status: NewStatus })
            });

            if (res.ok) {
                setUsersList(prev => prev.map(u => u.id === userId ? { ...u, status: NewStatus } : u));
                alert(`User status updated to ${NewStatus}`);
            } else {
                alert("Failed to update user status");
            }
        } catch (error) {
            console.error("Block User Error", error);
            alert("Error updating status");
        }
    };

    // Test Metadata State
    const [testDetails, setTestDetails] = useState({
        title: '',
        duration: 180,
        subject: 'Full Mock',
        category: 'JEE Main',
        difficulty: 'medium',
        totalMarks: 0,
        isLive: false,
        startTime: '',
        endTime: '',
        accessType: 'free',
        format: 'full-mock',
        calculator: false,
        chapters: '',
        instructions: '',
        seriesId: '',
        isVisible: true,
        resultVisibility: 'immediate',
        resultDeclarationTime: '',
        sectionMeta: [] // [{ subject, section, requiredAttempts }]
    });

    // ... Question State Setup ...
    const [questions, setQuestions] = useState([]);
    const [currentQuestion, setCurrentQuestion] = useState({
        text: '',
        type: 'mcq',
        options: ['', '', '', ''],
        correctOption: '',
        correctOptions: [],
        integerAnswer: '',
        subject: 'Physics',
        section: '',       // Section within subject (e.g. 'Section A')
        topic: '',
        marks: 4,
        negativeMarks: 1,
        image: null,
        optionImages: [null, null, null, null],
        solution: '',      // Solution text explanation
        solutionImage: '',  // Solution image URL (Legacy)
        solutionImages: []  // Solution images array (New)
    });

    const [uploadingImage, setUploadingImage] = useState(false);
    const [fileInputKey, setFileInputKey] = useState(Date.now()); // Key to force re-render file inputs

    const handleTestChange = (e) => {
        const { name, value, type, checked } = e.target;
        setTestDetails({
            ...testDetails,
            [name]: type === 'checkbox' ? checked : value
        });
    };

    const handleQuestionChange = (e) => {
        setCurrentQuestion({ ...currentQuestion, [e.target.name]: e.target.value });
    };

    const handleOptionChange = (idx, val) => {
        const newOpts = [...currentQuestion.options];
        newOpts[idx] = val;
        setCurrentQuestion({ ...currentQuestion, options: newOpts });
    };

    const handleOptionImageChange = (index, url) => {
        const newOptionImages = [...currentQuestion.optionImages];
        newOptionImages[index] = url;
        setCurrentQuestion({ ...currentQuestion, optionImages: newOptionImages });
    };

    const handleMSQCheck = (option) => {
        let newCorrect = [...currentQuestion.correctOptions];
        if (newCorrect.includes(option)) {
            newCorrect = newCorrect.filter(o => o !== option);
        } else {
            newCorrect.push(option);
        }
        setCurrentQuestion({ ...currentQuestion, correctOptions: newCorrect });
    };

    const insertMath = (field, latex) => {
        const currentValue = currentQuestion[field] || '';
        // Appends to the end. For cursor position insertion, we'd need a ref to the textarea.
        // For now, this is sufficient for the user's request.
        setCurrentQuestion({ ...currentQuestion, [field]: currentValue + ' ' + latex });
    };

    const compressImage = (file) => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 800;
                    const MAX_HEIGHT = 800;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    // Compress to JPEG with 0.7 quality
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                    resolve(dataUrl);
                };
            };
        });
    };

    const uploadImage = async (file, type, index = null) => {
        if (!file) return;

        setUploadingImage(true);
        try {
            // 1. Compress the image (returns Base64)
            const compressedBase64 = await compressImage(file);

            // 2. Convert Base64 to Blob
            const response = await fetch(compressedBase64);
            const blob = await response.blob();

            // 3. Create Storage Reference
            // Add randomness to filename to avoid collisions and handle missing names
            const safeName = file.name ? file.name.replace(/\s+/g, '_') : 'pasted_image.jpg';
            const filename = `${Date.now()}_${Math.random().toString(36).substring(7)}_${safeName}`;
            const storageRef = ref(storage, `questions/${filename}`);

            // 4. Upload File
            await uploadBytes(storageRef, blob);

            // 5. Get Download URL
            const downloadURL = await getDownloadURL(storageRef);
            console.log("Image uploaded to Storage:", downloadURL);

            // 6. Update State with URL
            if (type === 'question') {
                setCurrentQuestion(prev => ({ ...prev, image: downloadURL }));
            } else if (type === 'solution') {
                setCurrentQuestion(prev => ({
                    ...prev,
                    solutionImages: [...(prev.solutionImages || []), downloadURL]
                }));
            } else if (type === 'option' && index !== null) {
                handleOptionImageChange(index, downloadURL);
            } else if (type === 'grid-q') {
                const newQs = [...questions];
                newQs[index].image = downloadURL;
                setQuestions(newQs);
            } else if (type === 'grid-opt' && typeof index === 'object') {
                const newQs = [...questions];
                if (!newQs[index.qIdx].optionImages) newQs[index.qIdx].optionImages = ['', '', '', ''];
                newQs[index.qIdx].optionImages[index.oIdx] = downloadURL;
                setQuestions(newQs);
            }
        } catch (error) {
            console.error("Error uploading image:", error);
            alert("Failed to upload image. Please check your internet connection.");
        } finally {
            setUploadingImage(false);
        }
    };

    const handlePaste = (e, type, index = null) => {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf("image") !== -1) {
                const blob = items[i].getAsFile();
                uploadImage(blob, type, index);
                e.preventDefault(); // Prevent pasting the image binary string
                return;
            }
        }
    };

    const handleUpdateStatus = async (userId, currentStatus) => {
        const newStatus = currentStatus === 'blocked' ? 'active' : 'blocked';
        const action = newStatus === 'blocked' ? 'BLOCK' : 'UNBLOCK';

        if (!confirm(`Are you sure you want to ${action} this user? Blocked users cannot login.`)) return;

        try {
            const res = await fetch(`${API_BASE_URL}/api/admin/students/${userId}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });

            if (res.ok) {
                setUsersList(prev => prev.map(u => u.id === userId ? { ...u, status: newStatus } : u));
                alert(`User ${newStatus === 'blocked' ? 'BLOCKED' : 'UNBLOCKED'} successfully`);
            } else {
                alert("Failed to update status");
            }
        } catch (error) {
            console.error("Status Update Error:", error);
            alert("Error updating status");
        }
    };

    const handleDeleteUser = async (userId) => {
        if (!confirm('Are you certain you want to DELETE this user permanently? This action CANNOT be undone and will remove all their data.')) return;

        try {
            const res = await fetch(`${API_BASE_URL}/api/admin/students/${userId}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                setUsersList(prev => prev.filter(u => u.id !== userId));
                alert('User deleted permanently');
            } else {
                const err = await res.json();
                alert(`Failed to delete user: ${err.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error("Delete User Error:", error);
            alert("Error deleting user");
        }
    };

    const addQuestion = () => {
        // ... VALIDATION Logic (Keeping it same as before) ...
        if (currentQuestion.type === 'mcq' && !currentQuestion.correctOption) {
            alert("Please mark the correct answer"); return;
        }
        if (currentQuestion.type === 'msq' && currentQuestion.correctOptions.length === 0) {
            alert("Please mark at least one correct answer"); return;
        }
        if (currentQuestion.type === 'integer' && !currentQuestion.integerAnswer) {
            alert('Provide Answer'); return;
        }
        if (!currentQuestion.text && !currentQuestion.image) return alert('Provide text or image');

        setQuestions([...questions, { ...currentQuestion }]);

        setCurrentQuestion({
            ...currentQuestion,
            text: '', image: '', options: ['', '', '', ''], optionImages: ['', '', '', ''],
            correctOption: '', correctOptions: [], integerAnswer: '',
        });
        setFileInputKey(Date.now()); // Reset file inputs
    };

    const removeQuestion = (index) => {
        setQuestions(questions.filter((_, i) => i !== index));
    };

    const moveQuestion = (index, direction) => {
        const newQs = [...questions];
        const targetIdx = direction === 'up' ? index - 1 : index + 1;
        if (targetIdx < 0 || targetIdx >= newQs.length) return;
        [newQs[index], newQs[targetIdx]] = [newQs[targetIdx], newQs[index]];
        setQuestions(newQs);
    };

    const handleSubmitTest = async () => {
        if (questions.length === 0) {
            alert('Please add at least one question to the test.');
            return;
        }
        if (!testDetails.title) {
            alert('Please enter a test title.');
            return;
        }
        if (testDetails.isLive && (!testDetails.startTime || !testDetails.endTime)) {
            alert('Please specify Start and End times for Live Test.');
            return;
        }

        // VALIDATION: We now allow saving partial tests (missing answers) to let admins save progress.
        // We will just warn them if answers are missing, but still allow saving.
        const missingAnswers = questions.some(q =>
            (q.type === 'mcq' && !q.correctOption) ||
            (q.type === 'msq' && (!q.correctOptions || q.correctOptions.length === 0)) ||
            (q.type === 'integer' && (q.integerAnswer === undefined || q.integerAnswer === ''))
        );

        if (missingAnswers) {
            const confirmProceed = window.confirm("Some questions are missing answers! Save anyway as a draft/work-in-progress?");
            if (!confirmProceed) return false;
        }

        setLoading(true);
        try {
            const calculatedTotalMarks = questions.reduce((acc, q) => {
                const m = Number(q.marks);
                return acc + (isNaN(m) ? 0 : m);
            }, 0);

            const payload = {
                ...testDetails,
                chapters: (testDetails.chapters || '').toString().split(',').map(c => c.trim()).filter(c => c),
                totalMarks: calculatedTotalMarks,
                questions,
                sectionMeta: testDetails.sectionMeta || [],
                createdByName: user?.name || user?.displayName || (user?.email ? user.email.split('@')[0] : 'Admin'),
                updatedByName: user?.name || user?.displayName || (user?.email ? user.email.split('@')[0] : 'Admin')
            };

            const url = isUpdatingExisting ? `${API_BASE_URL}/api/tests/${editingId}` : `${API_BASE_URL}/api/tests`;
            const method = isUpdatingExisting ? 'PUT' : 'POST';

            const token = await user?.getIdToken();
            const res = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.message || `Failed to ${isUpdatingExisting ? 'update' : 'create'} test on server`);
            }

            const isDraft = user?.adminLevel === 3;
            alert(isUpdatingExisting
                ? (isDraft ? 'Draft Updated! Pending review.' : 'Test Updated Successfully!')
                : (isDraft ? '✅ Draft Saved! Awaiting review by Level 1/2 Admin before publishing.' : 'Test Published Successfully!')
            );

            // RESET EVERYTHING
            setIsUpdatingExisting(false);
            setEditingId(null);
            setActiveTab('manage');
            setQuestions([]);
            setTestDetails({
                title: '', duration: 180, subject: 'Full Mock', category: 'JEE Main',
                difficulty: 'medium', totalMarks: 0, isLive: false, startTime: '', endTime: '', instructions: '',
                isVisible: true,
                calculator: false,
                chapters: ''
            });
            fetchTests(); // Refresh list
        } catch (error) {
            console.error('Publish test error details:', error);
            alert(`Publishing Error: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadTemplate = () => {
        const header = "Question Text,Option A,Option B,Option C,Option D,Correct Option Text,Marks,Negative Marks,Subject,Topic\n";
        const sample = "What is the unit of Force?,Newton,Joule,Watt,Pascal,Newton,4,1,Physics,Mechanics";
        const blob = new Blob([header + sample], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'question_template.csv';
        a.click();
    };

    const handleExportQueue = () => {
        if (questions.length === 0) return alert("Queue is empty!");
        const header = "Question Text,Option A,Option B,Option C,Option D,Correct Option Text,Marks,Negative Marks,Subject,Topic\n";
        const rows = questions.map(q => [
            `"${(q.text || '').replace(/"/g, '""')}"`,
            `"${(q.options[0] || '').replace(/"/g, '""')}"`,
            `"${(q.options[1] || '').replace(/"/g, '""')}"`,
            `"${(q.options[2] || '').replace(/"/g, '""')}"`,
            `"${(q.options[3] || '').replace(/"/g, '""')}"`,
            `"${(q.correctOption || '').replace(/"/g, '""')}"`,
            q.marks,
            q.negativeMarks,
            q.subject,
            q.topic || ''
        ].join(',')).join('\n');

        const blob = new Blob([header + rows], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `test_queue_${Date.now()}.csv`;
        a.click();
    };


    // URL Driven Series Management
    const managingSeriesId = searchParams.get('series');
    
    // Fetch notes/sections when managing a series
    useEffect(() => {
        if (user && managingSeriesId) {
            fetchNotesAndSections();
        }
    }, [user, managingSeriesId, fetchNotesAndSections]);
    const managingSeries = managingSeriesId ? seriesList.find(s => s.id === managingSeriesId) : null;
    const setManagingSeries = (series) => updateParams('series', series?.id);

    // Filter tests for Modal (Ensure logic works even if series not loaded yet, though normally is)
    // Tests already in series
    const seriesTests = managingSeries ? tests
        .filter(t => (managingSeries.testIds || []).includes(t._id))
        .sort((a, b) => (a.title || '').localeCompare(b.title || '', undefined, { numeric: true, sensitivity: 'base' })) : [];

    // Tests available to add (Tests NOT currently in THIS series AND are Active)
    const availableTests = managingSeries ? tests
        .filter(t => !managingSeries.testIds?.includes(t._id) && t.status !== 'draft' && t.status !== 'hidden')
        .sort((a, b) => (a.title || '').localeCompare(b.title || '', undefined, { numeric: true, sensitivity: 'base' })) : [];

    const handleAddTestToSeries = async (testId) => {
        if (!managingSeries) return;
        const updatedIds = [...(managingSeries.testIds || []), testId];
        const token = await user?.getIdToken();
        try {
            await fetch(`${API_BASE_URL}/api/admin/series/${managingSeries.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ testIds: updatedIds })
            });
            // Update Local Series List State (to reflect instantly)
            const updatedSeries = { ...managingSeries, testIds: updatedIds };
            // setManagingSeries not needed URL update, but we need to update LIST
            setSeriesList(seriesList.map(s => s.id === updatedSeries.id ? updatedSeries : s));
        } catch (e) { alert('Failed to add test'); }
    };

    const handleRemoveTestFromSeries = async (testId) => {
        if (!managingSeries) return;
        const updatedIds = managingSeries.testIds.filter(id => id !== testId);
        const token = await user?.getIdToken();
        try {
            await fetch(`${API_BASE_URL}/api/admin/series/${managingSeries.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ testIds: updatedIds })
            });
            const updatedSeries = { ...managingSeries, testIds: updatedIds };
            setSeriesList(seriesList.map(s => s.id === updatedSeries.id ? updatedSeries : s));
        } catch (e) { alert('Failed to remove test'); }
    };

    return (
        <div className="space-y-6 relative">
            {showAnalytics && <AnalyticsModal testId={showAnalytics} onClose={() => setShowAnalytics(null)} />}
            {viewingStudent && <StudentReportModal student={viewingStudent} user={user} onClose={() => setViewingStudent(null)} />}
            {showBulkUpload && <BulkUploadModal onUpload={(qs) => setQuestions([...questions, ...qs])} onClose={() => setShowBulkUpload(false)} />}
            {showPdfModal && <PdfUploadModal onUpload={(qs) => setQuestions([...questions, ...qs])} onClose={() => setShowPdfModal(false)} onZoom={(url) => setZoomedImg(url)} />}
            {showPdfTextModal && <PdfTextUploadModal onUpload={(qs) => setQuestions([...questions, ...qs])} onClose={() => setShowPdfTextModal(false)} onZoom={(url) => setZoomedImg(url)} />}
            {showMarkerModal && <PdfMarkerUploadModal onUpload={(qs) => setQuestions([...questions, ...qs])} onClose={() => setShowMarkerModal(false)} onZoom={(url) => setZoomedImg(url)} />}
            {showGeminiModal && <GeminiPdfUploadModal onUpload={fetchTests} onClose={() => setShowGeminiModal(false)} allSeries={seriesList || []} />}

            {/* Manage Series Modal */}
            {managingSeries && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-5xl h-[85vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-white/20">
                        {/* Header */}
                        <div className="p-6 sm:p-8 border-b border-gray-100 flex justify-between items-center bg-white shrink-0">
                            <div>
                                <h3 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">Manage Tests: {managingSeries.title}</h3>
                                <div className="flex gap-2 mt-2">
                                    <span className="px-2.5 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-bold uppercase tracking-widest rounded-md border border-indigo-100">{managingSeries.category}</span>
                                    <span className="px-2.5 py-1 bg-slate-50 text-slate-600 text-[10px] font-bold uppercase tracking-widest rounded-md border border-slate-200">{seriesTests.length} Tests Included</span>
                                </div>
                            </div>
                            <button onClick={() => setManagingSeries(null)} className="p-2 sm:p-3 bg-gray-50 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-full transition-colors">
                                <X size={24} strokeWidth={2.5} />
                            </button>
                        </div>
                        
                        {/* Tab Switcher */}
                        <div className="flex bg-gray-100 p-1.5 rounded-2xl mx-8 mb-4 self-start border border-gray-200 shadow-inner shrink-0 scale-90 origin-left">
                            <button
                                onClick={() => setSeriesTab('tests')}
                                className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${seriesTab === 'tests' ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-800 hover:bg-white/50'}`}
                            >
                                📝 Manage Tests
                            </button>
                            <button
                                onClick={() => setSeriesTab('notes')}
                                className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${seriesTab === 'notes' ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-800 hover:bg-white/50'}`}
                            >
                                📂 Study Materials (Bundled)
                            </button>
                        </div>

                        {seriesTab === 'tests' ? (
                            <div className="flex-1 overflow-hidden flex flex-col md:flex-row bg-slate-50/50 animate-in slide-in-from-right-4 duration-300">
                                {/* Left: Available Tests */}
                                <div className="flex-1 flex flex-col border-b md:border-b-0 md:border-r border-gray-200 bg-white">
                                    <div className="p-4 sm:p-6 border-b border-gray-100 bg-white sticky top-0 z-10 shadow-sm flex justify-between items-center">
                                        <h4 className="font-extrabold text-slate-700 uppercase tracking-tight text-sm">Available Tests</h4>
                                        <span className="bg-slate-100 text-slate-600 text-xs font-bold px-2 py-0.5 rounded-full">{availableTests.length} found</span>
                                    </div>
                                    <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-3">
                                        {availableTests.length > 0 ? availableTests.map(t => (
                                            <div key={t._id} className="p-3 sm:p-4 rounded-xl border-2 border-slate-100 hover:border-indigo-300 bg-white transition-all group flex flex-col sm:flex-row justify-between sm:items-center gap-4 hover:shadow-md">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <p className="font-bold text-slate-800 text-[13px] sm:text-[15px] truncate">{t.title}</p>
                                                        {(() => {
                                                            const otherSeries = seriesList.filter(s => s.id !== managingSeries.id && s.testIds?.includes(t._id));
                                                            return otherSeries.length > 0 && (
                                                                <span className="px-1.5 py-0.5 bg-amber-50 text-amber-600 text-[9px] font-black rounded border border-amber-200 uppercase leading-none">
                                                                    In {otherSeries.length} Other {otherSeries.length === 1 ? 'Series' : 'Series'}
                                                                </span>
                                                            );
                                                        })()}
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                                        <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-gray-500 bg-gray-50 px-2 py-0.5 rounded border border-gray-100"><BookOpen size={10} /> {t.questionCount || t.questions?.length || 0} Qs</span>
                                                        <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-gray-500 bg-gray-50 px-2 py-0.5 rounded border border-gray-100"><Clock size={10} /> {t.duration_minutes || t.duration || 0}m</span>
                                                        <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">{t.total_marks || 0} Marks</span>
                                                    </div>
                                                </div>
                                                <button onClick={() => handleAddTestToSeries(t._id)} className="w-full sm:w-auto px-4 py-2 sm:py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold hover:bg-indigo-600 hover:text-white transition-colors flex items-center justify-center gap-1 border border-indigo-100 hover:border-indigo-600 shadow-sm">
                                                    <Plus size={14} strokeWidth={3} /> Add
                                                </button>
                                            </div>
                                        )) : (
                                            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-400">
                                                <Search size={48} className="text-gray-200 mb-4" />
                                                <p className="font-bold">No tests available</p>
                                                <p className="text-sm mt-1">All compatible tests have been added.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Right: Included Tests */}
                                <div className="flex-1 flex flex-col bg-slate-50/80">
                                    <div className="p-4 sm:p-6 border-b border-gray-200/60 sticky top-0 z-10 bg-slate-50/80 backdrop-blur-md flex justify-between items-center shadow-sm">
                                        <h4 className="font-extrabold text-indigo-900 uppercase tracking-tight text-sm">Included Tests</h4>
                                        <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-0.5 rounded-full">{seriesTests.length} items</span>
                                    </div>
                                    <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-3">
                                        {seriesTests.length > 0 ? seriesTests.map((t, idx) => (
                                            <div key={t._id} className="p-3 sm:p-4 bg-white border-2 border-indigo-100/50 shadow-sm hover:shadow relative rounded-xl flex flex-col sm:flex-row justify-between sm:items-center gap-3 transition-all">
                                                <div className="absolute top-0 left-0 bottom-0 w-1 bg-indigo-500 rounded-l-xl"></div>
                                                <div className="flex-1 min-w-0 pl-3">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="bg-slate-900 text-white text-[9px] font-black px-1.5 rounded uppercase">#{idx + 1}</span>
                                                        <p className="font-bold text-indigo-950 text-[13px] sm:text-[15px] truncate">{t.title}</p>
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-[2px] flex-wrap">
                                                        <span className="text-[10px] uppercase font-bold text-gray-500 opacity-80 bg-gray-50 px-1 py-[1px] rounded">ID: {t._id.substr(0, 6)}</span>
                                                        <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-gray-600 bg-gray-50 px-2 py-0.5 rounded border border-gray-200"><BookOpen size={10} /> {t.questionCount || t.questions?.length || 0} Qs</span>
                                                    </div>
                                                </div>
                                                <button onClick={() => handleRemoveTestFromSeries(t._id)} className="p-2 w-full sm:w-auto text-red-500 hover:text-white rounded-lg bg-red-50 hover:bg-red-500 transition-colors border border-red-100 hover:border-red-500 flex items-center justify-center group/btn shadow-sm">
                                                    <Trash size={16} className="group-hover/btn:scale-110 transition-transform" />
                                                    <span className="sm:hidden ml-2 font-bold text-xs uppercase">Remove</span>
                                                </button>
                                            </div>
                                        )) : (
                                            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-400">
                                                <Layers size={48} className="text-gray-200 mb-4" />
                                                <p className="font-bold text-indigo-900/40">Series is Empty</p>
                                                <p className="text-sm mt-1 text-gray-500/70">Add tests from the available list on the left.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 overflow-hidden flex flex-col md:flex-row bg-slate-50/50 animate-in slide-in-from-left-4 duration-300">
                                {/* Left: Available Library Items */}
                                <div className="flex-1 flex flex-col border-r border-gray-200 bg-white">
                                    <div className="p-6 border-b border-gray-100 sticky top-0 z-10 bg-white shadow-sm">
                                        <h4 className="font-extrabold text-slate-700 uppercase tracking-tight text-sm mb-1">Available Premium Library</h4>
                                        <p className="text-[10px] text-gray-400 font-medium">Select paid sections or notes to bundle with this series</p>
                                    </div>
                                    <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
                                        {/* Sections List */}
                                        <div>
                                            <h5 className="text-[11px] font-black text-indigo-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                <Layers size={14} /> Available Sections
                                            </h5>
                                            <div className="space-y-2">
                                                {allSections.filter(s => s.field === managingSeries.field && s.type === 'paid').map(s => {
                                                    const isIncluded = managingSeries.includedSections?.includes(s.id);
                                                    return (
                                                        <div key={s.id} className="p-3 rounded-xl border-2 border-slate-50 hover:border-indigo-200 transition-all flex items-center justify-between group">
                                                            <div className="flex items-center gap-3">
                                                                <span className="text-lg">{s.icon || '📂'}</span>
                                                                <div>
                                                                    <p className="font-bold text-slate-700 text-sm leading-tight">{s.title}</p>
                                                                    <p className="text-[9px] text-amber-600 font-black uppercase">₹{s.price} Value</p>
                                                                </div>
                                                            </div>
                                                            <button 
                                                                onClick={() => handleToggleSectionInSeries(s.id)}
                                                                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all border-2 ${isIncluded ? 'bg-red-50 text-red-500 border-red-100 hover:bg-red-500 hover:text-white' : 'bg-indigo-50 text-indigo-600 border-indigo-100 hover:bg-indigo-600 hover:text-white'}`}
                                                            >
                                                                {isIncluded ? 'Remove' : 'Bundle'}
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Notes List */}
                                        <div>
                                            <h5 className="text-[11px] font-black text-emerald-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                <Plus size={14} /> Individual Premium Notes
                                            </h5>
                                            <div className="space-y-2">
                                                {allNotes.filter(n => n.field === managingSeries.field && n.type === 'paid').map(n => {
                                                    const isIncluded = managingSeries.includedNotes?.includes(n.id);
                                                    return (
                                                        <div key={n.id} className="p-3 rounded-xl border-2 border-slate-50 hover:border-emerald-200 transition-all flex items-center justify-between group">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center text-red-500">
                                                                    <BookOpen size={16} />
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <p className="font-bold text-slate-700 text-sm leading-tight truncate max-w-[150px]">{n.title}</p>
                                                                    <p className="text-[9px] text-amber-600 font-black uppercase">₹{n.price} Value</p>
                                                                </div>
                                                            </div>
                                                            <button 
                                                                onClick={() => handleToggleNoteInSeries(n.id)}
                                                                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all border-2 ${isIncluded ? 'bg-red-50 text-red-500 border-red-100 hover:bg-red-500 hover:text-white' : 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-600 hover:text-white'}`}
                                                            >
                                                                {isIncluded ? 'Remove' : 'Bundle'}
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Right: Summary & Included Items */}
                                <div className="flex-1 flex flex-col bg-slate-50/80 p-6 sm:p-8">
                                    <div className="bg-indigo-600 rounded-3xl p-6 text-white shadow-xl shadow-indigo-200 mb-6 relative overflow-hidden">
                                        <div className="relative z-10">
                                            <h4 className="text-xl font-black mb-1">Bundle Summary</h4>
                                            <p className="text-indigo-100 text-xs font-medium opacity-80">Students buying this series get these items for ₹0</p>
                                            
                                            <div className="mt-6 flex gap-4">
                                                <div className="bg-white/10 rounded-2xl p-3 flex-1 backdrop-blur-md border border-white/10">
                                                    <p className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest mb-1">Sections</p>
                                                    <p className="text-2xl font-black">{managingSeries.includedSections?.length || 0}</p>
                                                </div>
                                                <div className="bg-white/10 rounded-2xl p-3 flex-1 backdrop-blur-md border border-white/10">
                                                    <p className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest mb-1">Notes</p>
                                                    <p className="text-2xl font-black">{managingSeries.includedNotes?.length || 0}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <Sparkles className="absolute -bottom-4 -right-4 text-white/10 w-32 h-32" />
                                    </div>

                                    <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                                        <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Active Bonus Items</h5>
                                        {/* List currently included sections */}
                                        {allSections.filter(s => managingSeries.includedSections?.includes(s.id)).map(s => (
                                            <div key={s.id} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100 shadow-sm">
                                                <span className="text-lg">{s.icon || '📂'}</span>
                                                <p className="flex-1 font-bold text-slate-700 text-xs">{s.title}</p>
                                                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[8px] font-black uppercase rounded">Section</span>
                                            </div>
                                        ))}
                                        {/* List currently included notes */}
                                        {allNotes.filter(n => managingSeries.includedNotes?.includes(n.id)).map(n => (
                                            <div key={n.id} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100 shadow-sm">
                                                <div className="w-5 h-5 rounded bg-red-100 flex items-center justify-center text-red-500 text-[10px]"><BookOpen size={10} /></div>
                                                <p className="flex-1 font-bold text-slate-700 text-xs truncate">{n.title}</p>
                                                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[8px] font-black uppercase rounded">Note</span>
                                            </div>
                                        ))}
                                        {(!managingSeries.includedSections?.length && !managingSeries.includedNotes?.length) && (
                                            <div className="h-full flex flex-col items-center justify-center py-10 opacity-40">
                                                <Combine size={32} className="mb-2" />
                                                <p className="text-xs font-bold uppercase tracking-tight">No bundles yet</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-0 border-b border-gray-200 gap-2">
                <div className="flex items-center gap-3">
                    <img src="/logo.png" alt="APEX MOCK" className="h-16 w-auto" />
                    <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">Admin Controls</h2>
                </div>
                <div className="flex overflow-x-auto space-x-1 sm:space-x-2 pb-2 sm:pb-0">
                    <button onClick={() => setActiveTab('profile')} className={`px-3 py-2 sm:px-4 rounded-md text-sm whitespace-nowrap ${activeTab === 'profile' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600'}`}>Profile</button>
                    <button onClick={() => setActiveTab('manage')} className={`px-3 py-2 sm:px-4 rounded-md text-sm whitespace-nowrap ${activeTab === 'manage' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600'}`}>Tests</button>
                    <button onClick={() => setActiveTab('series')} className={`px-3 py-2 sm:px-4 rounded-md text-sm whitespace-nowrap ${activeTab === 'series' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600'}`}>Series</button>
                    <button onClick={() => setActiveTab('users')} className={`px-3 py-2 sm:px-4 rounded-md text-sm whitespace-nowrap ${activeTab === 'users' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600'}`}>Students</button>
                    <button onClick={() => setActiveTab('revenue')} className={`px-3 py-2 sm:px-4 rounded-md text-sm whitespace-nowrap ${activeTab === 'revenue' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600'}`}>Revenue</button>
                    <button onClick={() => setActiveTab('content')} className={`px-3 py-2 sm:px-4 rounded-md text-sm whitespace-nowrap ${activeTab === 'content' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600'}`}>Content & Config</button>
                    <button onClick={() => setActiveTab('notes')} className={`px-3 py-2 sm:px-4 rounded-md text-sm whitespace-nowrap ${activeTab === 'notes' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600'}`}>📚 Notes</button>
                    <button onClick={() => setActiveTab('create')} className={`px-3 py-2 sm:px-4 rounded-md text-sm whitespace-nowrap ${activeTab === 'create' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600'}`}>+ Create</button>
                    <button onClick={() => window.location.href = '/'} className="px-3 py-2 sm:px-4 rounded-md bg-red-100 text-red-700 hover:bg-red-200 font-bold flex items-center gap-1 text-sm whitespace-nowrap"><LogOut size={16} /> Logout</button>
                </div>
            </div>

            {/* Profile Tab */}
            {activeTab === 'profile' && (
                <div className="space-y-8 max-w-5xl mx-auto">
                    {/* Logged in Admin Profile */}
                    <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden">
                        <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-50 rounded-full blur-3xl opacity-60 pointer-events-none"></div>
                        <div className="w-32 h-32 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 shadow-inner z-10 shrink-0 border-4 border-white">
                            <User size={64} />
                        </div>
                        <div className="text-center md:text-left z-10">
                            <h3 className="text-3xl font-black text-gray-900 tracking-tight">{user?.name || 'Administrator'}</h3>
                            <p className="text-gray-500 font-medium mb-4">{user?.email}</p>
                            <div className="flex flex-wrap justify-center md:justify-start gap-2">
                                <span className="inline-block px-4 py-1.5 bg-emerald-100 text-emerald-800 rounded-full text-sm font-bold uppercase tracking-wider">{user?.role}</span>
                                {user?.role === 'admin' && (
                                    <span className="inline-block px-4 py-1.5 bg-purple-100 text-purple-800 rounded-full text-sm font-bold uppercase tracking-wider">
                                        Level {user?.adminLevel || 1} Admin
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Admin Team Leaderboard */}
                    <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100 relative">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 pb-6 border-b border-gray-100 gap-4">
                            <div>
                                <h3 className="text-2xl font-black text-gray-900 flex items-center gap-3">
                                    <Award className="text-indigo-600" size={28} /> Admin Team Leaderboard
                                </h3>
                                <p className="text-sm text-gray-500 mt-1 font-medium">Global ranking based on test creation and review activity</p>
                            </div>
                            <div className="flex gap-4 bg-gray-50 p-3 rounded-xl border border-gray-100 hidden sm:flex">
                                <div className="text-center px-4 border-r border-gray-200">
                                    <div className="text-[10px] font-black uppercase text-emerald-600 tracking-wider">Upload</div>
                                    <div className="text-xs font-bold text-gray-600">+10 pts</div>
                                </div>
                                <div className="text-center px-4">
                                    <div className="text-[10px] font-black uppercase text-blue-600 tracking-wider">Review</div>
                                    <div className="text-xs font-bold text-gray-600">+5 pts</div>
                                </div>
                            </div>
                        </div>

                        {/* Super Admins Section */}
                        {teamStats.superAdmins && teamStats.superAdmins.length > 0 && (
                            <div className="mb-10 text-center sm:text-left">
                                <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">👑 Super Admins (Level 1)</h4>
                                <div className="flex flex-wrap gap-4 justify-center sm:justify-start">
                                    {teamStats.superAdmins.map(admin => (
                                        <div key={admin.id} className="flex items-center gap-3 bg-gray-50 border border-gray-200 px-4 py-2 rounded-full shadow-sm hover:border-indigo-300 transition-colors">
                                            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold shrink-0 overflow-hidden">
                                                {admin.photoURL ? (
                                                    <img src={admin.photoURL} alt={admin.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                                ) : (
                                                    admin.name.charAt(0).toUpperCase()
                                                )}
                                            </div>
                                            <div className="text-left">
                                                <div className="text-sm font-bold text-gray-900 leading-tight">{admin.name}</div>
                                                <div className="text-[10px] uppercase font-bold text-indigo-500 tracking-wider">Super Admin</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="grid gap-4">
                            {(!teamStats.leaderboard) ? (
                                <div className="text-center p-8 text-gray-500 font-medium">Loading leaderboard...</div>
                            ) : teamStats.leaderboard.length === 0 ? (
                                <div className="text-center p-8 text-gray-500 font-medium">No activity to rank yet...</div>
                            ) : (
                                teamStats.leaderboard.map((stat) => (
                                    <div key={stat.id} className="group flex flex-col md:flex-row items-center bg-gray-50 hover:bg-white transition-all p-5 rounded-xl border border-gray-200 hover:border-indigo-300 shadow-sm hover:shadow-md gap-6 relative overflow-hidden">
                                        {/* Rank Indicator Bar */}
                                        <div className="absolute top-0 left-0 w-1.5 h-full rounded-l-xl transition-colors"
                                            style={{ backgroundColor: stat.rank === 1 ? '#FBBF24' : stat.rank === 2 ? '#9CA3AF' : stat.rank === 3 ? '#B45309' : '#818CF8' }}>
                                        </div>

                                        {/* Rank Circle */}
                                        <div className="flex items-center justify-center w-14 h-14 bg-white rounded-full shadow-md text-2xl font-black shrink-0 border-2"
                                            style={{
                                                color: stat.rank === 1 ? '#F59E0B' : stat.rank === 2 ? '#6B7280' : stat.rank === 3 ? '#92400E' : '#6366F1',
                                                borderColor: stat.rank === 1 ? '#FDE68A' : stat.rank === 2 ? '#E5E7EB' : stat.rank === 3 ? '#FEF3C7' : '#E0E7FF'
                                            }}>
                                            #{stat.rank}
                                        </div>

                                        {/* User Details */}
                                        <div className="flex items-center justify-center md:justify-start shrink-0 mr-2 md:mr-0 z-10 w-full md:w-auto mt-4 md:mt-0">
                                            <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold text-xl overflow-hidden border-2 border-white shadow-sm ring-2 ring-indigo-50">
                                                {stat.photoURL ? (
                                                    <img src={stat.photoURL} alt={stat.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                                ) : (
                                                    stat.name.charAt(0).toUpperCase()
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex-1 text-center md:text-left mt-2 md:mt-0 z-10">
                                            <h4 className="text-lg font-bold text-gray-900 justify-center md:justify-start gap-2 flex items-center">
                                                {stat.name}
                                                <span className="text-[10px] px-2 py-0.5 bg-gray-200 text-gray-700 rounded text-center font-bold tracking-widest uppercase">
                                                    L{stat.level}
                                                </span>
                                            </h4>
                                            <p className="text-xs text-gray-500 font-medium mt-0.5">{stat.email}</p>
                                        </div>

                                        {/* Stats Row */}
                                        <div className="flex gap-4 md:gap-8 items-center flex-wrap justify-center bg-white md:bg-transparent p-3 md:p-0 rounded-xl md:rounded-none border md:border-none border-gray-100 w-full md:w-auto">
                                            <div className="text-center">
                                                <div className="text-2xl font-black text-emerald-600">{stat.uploads}</div>
                                                <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Uploads</div>
                                            </div>
                                            <div className="text-center border-l border-r border-gray-100 md:border-gray-200 px-4 md:px-8">
                                                <div className="text-2xl font-black text-blue-600">{stat.reviews}</div>
                                                <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Reviews</div>
                                            </div>
                                            <div className="text-center bg-indigo-50/50 md:bg-indigo-50 px-4 md:px-6 py-2 rounded-xl md:border border-indigo-100">
                                                <div className="text-2xl font-black text-indigo-700">{stat.score}</div>
                                                <div className="text-[10px] uppercase font-bold text-indigo-500 tracking-wider">Points</div>
                                            </div>
                                        </div>

                                        {/* Badge */}
                                        <div className="shrink-0 text-center md:text-right w-full md:w-auto mt-2 md:mt-0">
                                            <span className="inline-block px-4 py-2 bg-gradient-to-r from-amber-50 to-orange-50 text-amber-900 text-xs font-black uppercase tracking-widest rounded-full shadow-sm border border-amber-200/50 group-hover:scale-105 transition-transform">
                                                {stat.badge}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Manage Tab */}
            {activeTab === 'manage' && (
                <div className="space-y-8">
                    {/* Helper to filter and group */}
                    {(() => {
                        const now = new Date();
                        const isExpired = (date) => date && new Date(date) < now;

                        // Unified sorting
                        const sortedTests = [...tests].sort((a, b) => {
                            if (sortTestsBy === 'newest') return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
                            if (sortTestsBy === 'oldest') return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
                            if (sortTestsBy === 'alpha-asc') return (a.title || '').localeCompare(b.title || '', undefined, { numeric: true, sensitivity: 'base' });
                            if (sortTestsBy === 'alpha-desc') return (b.title || '').localeCompare(a.title || '', undefined, { numeric: true, sensitivity: 'base' });
                            return 0;
                        });

                        const activeTests = sortedTests.filter(t => !isExpired(t.expiryDate) && t.isVisible !== false && t.status !== 'draft');
                        const hiddenTests = sortedTests.filter(t => !isExpired(t.expiryDate) && t.isVisible === false && t.status !== 'draft');
                        const draftTests = sortedTests.filter(t => t.status === 'draft');
                        const expiredTests = sortedTests.filter(t => isExpired(t.expiryDate) && t.status !== 'draft');

                        const renderTestTable = (testList, title, key, isDraft = false) => (
                            <div key={key} className="bg-white rounded-lg shadow overflow-hidden mb-6">
                                <div className="p-6 border-b border-gray-200 bg-gray-50"><h3 className="text-xl font-bold text-gray-800">{title} ({testList.length})</h3></div>
                                {testList.length === 0 ? (
                                    <div className="p-6 text-center text-gray-500">No tests found in this category.</div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-100">
                                                <tr>
                                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Title</th>
                                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Series</th>
                                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Category</th>
                                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Expiry</th>
                                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {testList.map((test) => (
                                                    <tr key={test._id} className="hover:bg-gray-50">
                                                        <td className="px-6 py-4 font-medium text-gray-900">
                                                            <div>{test.title}</div>
                                                            {user?.adminLevel === 1 && (
                                                                <div className="text-[10px] text-gray-400 mt-1 flex flex-col gap-1 font-normal">
                                                                    {test.createdByName && (
                                                                        <div className="flex items-center gap-1">
                                                                            <User size={10} /> Uploaded by: <span className="font-semibold text-gray-600">{test.createdByName}</span>
                                                                        </div>
                                                                    )}
                                                                    {test.updatedByName && (
                                                                        <div className="flex items-center gap-1 text-indigo-400">
                                                                            <User size={10} /> Edited by: <span className="font-semibold text-indigo-500">{test.updatedByName}</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            {(() => {
                                                                const matchedSeries = seriesList.filter(s => s.testIds?.includes(test._id));
                                                                if (matchedSeries.length === 0) {
                                                                    return <span className="text-xs text-gray-400 italic font-medium">No Series</span>;
                                                                }
                                                                if (matchedSeries.length === 1) {
                                                                    return (
                                                                        <span className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded text-[11px] font-bold border border-indigo-100">
                                                                            {matchedSeries[0].title}
                                                                        </span>
                                                                    );
                                                                }
                                                                return (
                                                                    <div className="flex flex-col gap-1">
                                                                        <span className="text-[11px] font-black text-indigo-600 uppercase tracking-tighter bg-indigo-50 w-fit px-1.5 rounded">{matchedSeries.length} Series</span>
                                                                        <div className="text-[9px] text-gray-400 leading-none">
                                                                            {matchedSeries.map(s => s.title).join(', ')}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })()}
                                                        </td>
                                                        <td className="px-6 py-4"><span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">{test.category}</span></td>
                                                        <td className="px-6 py-4 text-sm text-gray-500">
                                                            {test.expiryDate ? new Date(test.expiryDate).toLocaleDateString() : <span className="text-green-600">No Expiry</span>}
                                                        </td>
                                                        <td className="px-6 py-4 space-x-2">
                                                            <button
                                                                onClick={async () => {
                                                                    try {
                                                                        const token = await user?.getIdToken();
                                                                        const newStatus = !test.isVisible;
                                                                        const res = await fetch(`${API_BASE_URL}/api/tests/${test._id}/visibility`, {
                                                                            method: 'PUT',
                                                                            headers: {
                                                                                'Content-Type': 'application/json',
                                                                                'Authorization': `Bearer ${token}`
                                                                            },
                                                                            body: JSON.stringify({ isVisible: newStatus })
                                                                        });
                                                                        if (res.ok) {
                                                                            setTests(tests.map(t => t._id === test._id ? { ...t, isVisible: newStatus } : t));
                                                                        } else {
                                                                            const errData = await res.json().catch(() => ({}));
                                                                            console.error("Visibility Error:", errData);
                                                                        }
                                                                    } catch (e) {
                                                                        console.error("Visibility Toggle Error", e);
                                                                        alert("Error: " + (e.message || "Could not toggle visibility"));
                                                                    }
                                                                }}
                                                                className={`text-sm font-bold ${test.isVisible !== false ? 'text-green-600' : 'text-gray-400'}`}
                                                                title={test.isVisible !== false ? "Visible to Students" : "Hidden from Students"}
                                                            >
                                                                {test.isVisible !== false ? <Eye size={18} /> : <EyeOff size={18} />}
                                                            </button>
                                                            <button
                                                                onClick={async () => {
                                                                    setLoading(true);
                                                                    try {
                                                                        const token = await user?.getIdToken();
                                                                        const res = await fetch(`${API_BASE_URL}/api/tests/${test._id}`, {
                                                                            headers: { 'Authorization': `Bearer ${token}` }
                                                                        });
                                                                        const data = await res.json();
                                                                        setPreviewingTest(data);
                                                                    } catch (e) {
                                                                        console.error(e);
                                                                        alert("Failed to load test preview");
                                                                    } finally {
                                                                        setLoading(false);
                                                                    }
                                                                }}
                                                                className="text-indigo-600 hover:text-indigo-900 text-sm font-bold"
                                                                title="Preview Full Test"
                                                            >
                                                                <Search size={18} />
                                                            </button>
                                                            <button
                                                                onClick={async () => {
                                                                    setLoading(true);
                                                                    try {
                                                                        const token = await user?.getIdToken();
                                                                        const res = await fetch(`${API_BASE_URL}/api/tests/${test._id}`, { headers: { 'Authorization': `Bearer ${token}` } });
                                                                        if (!res.ok) throw new Error("Could not fetch full test details");
                                                                        const fullTest = await res.json();
                                                                        setEditingTest(fullTest);
                                                                    } catch (e) {
                                                                        alert("Failed to load test for editing");
                                                                    } finally {
                                                                        setLoading(false);
                                                                    }
                                                                }}
                                                                className="text-blue-600 hover:text-blue-900 text-sm font-bold"
                                                                title="Edit Test Details"
                                                            >
                                                                <Edit2 size={18} />
                                                            </button>
                                                            <button onClick={() => setShowAnalytics(test._id)} className="text-indigo-600 hover:text-indigo-900 text-sm font-bold">Stats</button>
                                                            <button
                                                                onClick={async () => {
                                                                    setLoading(true);
                                                                    try {
                                                                        const token = await user?.getIdToken();
                                                                        const res = await fetch(`${API_BASE_URL}/api/tests/${test._id}`, {
                                                                            headers: { 'Authorization': `Bearer ${token}` }
                                                                        });
                                                                        const fullTest = await res.json();
                                                                        setSplittingTest(fullTest);
                                                                    } catch (e) {
                                                                        alert("Failed to load test for splitting");
                                                                    } finally {
                                                                        setLoading(false);
                                                                    }
                                                                }}
                                                                className="text-orange-600 hover:text-orange-900 text-sm font-bold"
                                                                title="Create Subject-wise Tests"
                                                            >
                                                                Split
                                                            </button>
                                                            <button
                                                                onClick={async () => {
                                                                    setLoading(true);
                                                                    try {
                                                                        const token = await user?.getIdToken();
                                                                        const res = await fetch(`${API_BASE_URL}/api/tests/${test._id}`, {
                                                                            headers: { 'Authorization': `Bearer ${token}` }
                                                                        });
                                                                        if (!res.ok) throw new Error("Could not fetch test details");
                                                                        const fullTest = await res.json();

                                                                        // LOAD INTO CREATE TAB
                                                                        setQuestions(fullTest.questions || []);
                                                                        setTestDetails({
                                                                            title: fullTest.title || '',
                                                                            duration: fullTest.duration_minutes || fullTest.duration || 180,
                                                                            category: fullTest.category || 'JEE Main',
                                                                            subject: fullTest.subject || 'Full Mock',
                                                                            difficulty: fullTest.difficulty || 'medium',
                                                                            instructions: fullTest.instructions || '',
                                                                            isLive: !!fullTest.startTime,
                                                                            startTime: fullTest.startTime || '',
                                                                            endTime: fullTest.endTime || '',
                                                                            isVisible: fullTest.isVisible !== false,
                                                                            chapters: (fullTest.chapters || []).join(', ')
                                                                        });
                                                                        setIsUpdatingExisting(true);
                                                                        setEditingId(test._id);
                                                                        setActiveTab('create');
                                                                        alert("Test loaded into 'Create' tab. You can now fix questions and update.");
                                                                    } catch (e) {
                                                                        alert("Failed to load test: " + e.message);
                                                                    } finally {
                                                                        setLoading(false);
                                                                    }
                                                                }}
                                                                className="text-emerald-600 hover:text-emerald-900 text-sm font-bold border border-emerald-200 px-2 py-0.5 rounded bg-emerald-50"
                                                                title="Load to mark answers or fix questions"
                                                            >
                                                                Mark Ans
                                                            </button>
                                                            {/* Approve & Publish button — only in Draft section for Level 1/2 admins */}
                                                            {isDraft && (user?.adminLevel === 1 || user?.adminLevel === 2) && (
                                                                <button
                                                                    onClick={async () => {
                                                                        if (!window.confirm(`Publish "${test.title}" and make it visible to students?`)) return;
                                                                        try {
                                                                            const token = await user?.getIdToken();
                                                                            const res = await fetch(`${API_BASE_URL}/api/tests/${test._id}`, {
                                                                                method: 'PUT',
                                                                                headers: {
                                                                                    'Content-Type': 'application/json',
                                                                                    'Authorization': `Bearer ${token}`
                                                                                },
                                                                                body: JSON.stringify({
                                                                                    status: 'published',
                                                                                    isVisible: true,
                                                                                    updatedByName: user?.name || user?.displayName || (user?.email ? user.email.split('@')[0] : 'Admin')
                                                                                })
                                                                            });
                                                                            if (res.ok) {
                                                                                setTests(prev => prev.map(t => t._id === test._id ? { ...t, status: 'published', isVisible: true } : t));
                                                                                alert(`✅ "${test.title}" is now Published and visible to students!`);
                                                                            } else {
                                                                                const errData = await res.json().catch(() => ({}));
                                                                                alert('Failed to publish: ' + (errData.message || 'Unknown error'));
                                                                            }
                                                                        } catch (e) {
                                                                            alert('Error publishing test: ' + e.message);
                                                                        }
                                                                    }}
                                                                    className="flex items-center gap-1 text-xs font-bold text-white bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded-lg shadow transition-all"
                                                                    title="Approve and Publish this Draft"
                                                                >
                                                                    ✓ Approve & Publish
                                                                </button>
                                                            )}
                                                            <button onClick={() => handleDeleteTest(test._id)} className="text-red-500 hover:text-red-700 text-sm font-bold">Delete</button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        );

                        // Group by Category helper could be added here if highly specific UI needed, 
                        // for now splitting by Active/Expired as requested is a good start. 
                        // Requirement: "test series bhi categry wise ho aur same cheez test wale section me bhi"
                        // I will render grouped by category logic if I had time to write a complex reducer, 
                        // but sticking to Active vs Expired first is cleaner. 
                        // Let's add Category Filters? Or just Group headers? Group headers is better.

                        const categories = ['JEE Main', 'JEE Advanced', 'NEET', 'CAT', 'Board Exam', 'Others'];

                        return (
                            <div>
                                {showCustomMockModal && (
                                    <CustomMockGeneratorModal
                                        availableTests={tests}
                                        user={user}
                                        onClose={() => setShowCustomMockModal(false)}
                                        onSuccess={() => {
                                            setShowCustomMockModal(false);
                                            fetchTests(); // Refresh the list to show new drafts
                                            setActiveTab('manage'); // Ensure we stay on manage page
                                            window.scrollTo({ top: 0, behavior: 'smooth' });
                                        }}
                                    />
                                )}

                                <div className="flex justify-between items-center mb-6 border-b border-gray-200 pb-4">
                                    <h2 className="text-2xl font-bold text-gray-800">Manage All Tests</h2>
                                    <div className="flex items-center gap-3">
                                        <button 
                                            onClick={() => setShowCustomMockModal(true)}
                                            className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2"
                                            title="Combine multiple tests to generate new drafts"
                                        >
                                            <Combine size={18} /> Custom Generator
                                        </button>
                                        <div className="w-px h-6 bg-gray-300 mx-1 hidden md:block"></div>
                                        <label className="text-sm font-semibold text-gray-600">Sort By:</label>
                                        <select
                                            value={sortTestsBy}
                                            onChange={(e) => setSortTestsBy(e.target.value)}
                                            className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 bg-white focus:ring-2 focus:ring-indigo-500"
                                        >
                                            <option value="newest">Newest First</option>
                                            <option value="oldest">Oldest First</option>
                                            <option value="alpha-asc">Alphabetical (A→Z)</option>
                                            <option value="alpha-desc">Alphabetical (Z→A)</option>
                                        </select>
                                    </div>
                                </div>

                                {draftTests.length > 0 && (
                                    <>
                                        <h2 className="text-2xl font-bold text-indigo-800 mb-4 pb-2 border-b-2 border-indigo-500 inline-block">Drafts (Awaiting Approval)</h2>
                                        <p className="text-sm text-gray-500 mb-6">Tests uploaded by reviewers/uploaders saving as drafts. These are not visible anywhere until published.</p>
                                        {categories.map(cat => {
                                            const catTests = draftTests.filter(t => t.category === cat);
                                            if (catTests.length === 0) return null;
                                            return renderTestTable(catTests, `${cat} - Drafts`, `draft-${cat}`, true);
                                        })}
                                    </>
                                )}

                                <h2 className="text-2xl font-bold text-gray-800 mb-4 mt-8 pt-8 border-t-2 border-green-500 inline-block w-full">Active Tests (Visible)</h2>
                                {categories.map(cat => {
                                    const catTests = activeTests.filter(t => t.category === cat);
                                    if (catTests.length === 0) return null;
                                    return renderTestTable(catTests, `${cat} - Active`, cat);
                                })}
                                {activeTests.length === 0 && <p className="text-gray-500 italic mb-8">No active, visible tests.</p>}

                                <h2 className="text-2xl font-bold text-gray-800 mb-4 mt-8 pt-8 border-t-2 border-yellow-500 inline-block w-full">Hidden Tests (Drafts/Archived)</h2>
                                <p className="text-sm text-gray-500 mb-6">These tests are deliberately hidden via the eye toggle and cannot be seen or attempted by students.</p>
                                {categories.map(cat => {
                                    const catTests = hiddenTests.filter(t => t.category === cat);
                                    if (catTests.length === 0) return null;
                                    return renderTestTable(catTests, `${cat} - Hidden`, cat);
                                })}
                                {hiddenTests.length === 0 && <p className="text-gray-500 italic mb-8">No hidden tests.</p>}

                                <h2 className="text-2xl font-bold text-gray-800 mb-4 mt-8 pt-8 border-t-2 border-red-500 inline-block w-full">Expired Tests</h2>
                                {categories.map(cat => {
                                    const catTests = expiredTests.filter(t => t.category === cat);
                                    if (catTests.length === 0) return null;
                                    return renderTestTable(catTests, `${cat} - Expired`, cat);
                                })}
                            </div>
                        );
                    })()}
                </div>
            )}

            {/* Series Tab */}
            {activeTab === 'series' && (
                <div className="space-y-8">
                    {/* Create Series Section */}
                    <div className="bg-white p-6 rounded-lg shadow border border-indigo-100">
                        <h3 className="text-xl font-bold text-gray-800 mb-4 text-indigo-700">Create New Test Series</h3>
                        <CreateSeriesForm onSuccess={fetchSeries} />
                    </div>

                    {/* Logic for Active/Expired */}
                    {(() => {
                        const now = new Date();
                        const isExpired = (date) => date && new Date(date) < now;

                        const activeSeries = seriesList.filter(s => !isExpired(s.expiryDate));
                        const expiredSeries = seriesList.filter(s => isExpired(s.expiryDate));

                        const renderSeriesTable = (list, title, key) => (
                            <div key={key} className="bg-white rounded-lg shadow overflow-hidden mb-8">
                                <div className="p-6 border-b border-gray-200 bg-gray-50"><h3 className="text-xl font-bold text-gray-800">{title} ({list.length})</h3></div>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-100">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Title</th>
                                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Price</th>
                                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Expiry</th>
                                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Tests</th>
                                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {list.map((series) => (
                                                <tr key={series.id} className="hover:bg-gray-50">
                                                    <td className="px-6 py-4 font-medium text-gray-900">{series.title}</td>
                                                    <td className="px-6 py-4 font-bold text-green-600">₹{series.price}</td>
                                                    <td className="px-6 py-4 text-sm text-gray-500">
                                                        {series.expiryDate ? new Date(series.expiryDate).toLocaleDateString() : 'No Expiry'}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm">
                                                        <span className="bg-gray-100 px-2 py-1 rounded text-gray-700 font-bold">{series.testIds?.length || 0} Tests</span>
                                                    </td>
                                                    <td className="px-6 py-4 space-x-2">
                                                        <button
                                                            onClick={() => setManagingSeries(series)}
                                                            className="text-indigo-600 hover:text-indigo-900 font-bold text-sm bg-indigo-50 px-3 py-1 rounded hover:bg-indigo-100 transition"
                                                            title="Manage Tests in Series"
                                                        >
                                                            <List size={18} />
                                                        </button>
                                                        <button
                                                            onClick={() => setEditingSeries(series)}
                                                            className="text-blue-600 hover:text-blue-800"
                                                            title="Edit Series"
                                                        >
                                                            <Edit2 size={18} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteSeries(series.id)}
                                                            className="text-red-500 hover:text-red-700 bg-red-50 px-2 py-1 rounded transition ml-2"
                                                            title="Delete Series"
                                                        >
                                                            <Trash size={18} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {list.length === 0 && <tr><td colSpan="5" className="text-center py-6 text-gray-400">No series found.</td></tr>}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        );

                        const categories = ['JEE Main', 'JEE Advanced', 'NEET', 'CAT', 'Board Exam', 'Others'];

                        return (
                            <div>
                                <h2 className="text-2xl font-bold text-gray-800 mb-4">Active Series (Categorized)</h2>
                                {categories.map(cat => {
                                    const catSeries = activeSeries.filter(s => s.category === cat);
                                    if (catSeries.length === 0) return null;
                                    return renderSeriesTable(catSeries, `${cat}`, cat);
                                })}

                                <h2 className="text-2xl font-bold text-gray-800 mb-4 mt-8 pt-8 border-t">Expired Series</h2>
                                {categories.map(cat => {
                                    const catSeries = expiredSeries.filter(s => s.category === cat);
                                    if (catSeries.length === 0) return null;
                                    return renderSeriesTable(catSeries, `${cat} - Expired`, cat);
                                })}
                            </div>
                        );
                    })()}
                </div>
            )}

            {/* Dashboard Lock Screen for Protected Tabs */}
            {['users', 'revenue', 'content'].includes(activeTab) && !isMasterUnlocked && (
                <div className="flex items-center justify-center py-20">
                    <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8 max-w-md w-full text-center">
                        <InteractiveMascot isPasswordHidden={!showPassword} />
                        <h2 className="text-2xl font-black text-gray-900 mb-2">Restricted Access</h2>
                        <p className="text-gray-500 mb-8 text-sm leading-relaxed">Please enter the master password to view sensitive student, content, and revenue data.</p>

                        <form onSubmit={handleUnlockMaster} className="space-y-4">
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={masterPasswordInput}
                                    onChange={(e) => setMasterPasswordInput(e.target.value)}
                                    placeholder="Enter password"
                                    className="w-full pl-4 pr-12 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                                >
                                    {showPassword ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                                        </svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                            {masterUnlockError && (
                                <p className="text-red-500 text-sm font-medium">{masterUnlockError}</p>
                            )}
                            <button
                                type="submit"
                                disabled={isUnlocking}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg transition-colors flex justify-center items-center shadow-md disabled:bg-indigo-400"
                            >
                                {isUnlocking ? (
                                    <span className="flex items-center gap-2">
                                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                        Verifying...
                                    </span>
                                ) : "Unlock Admin Controls"}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Students Tab */}
            {activeTab === 'users' && isMasterUnlocked && (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="p-6 border-b border-gray-200 bg-gray-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                                Students Management ({usersList.length})
                            </h3>
                            <p className="text-xs text-gray-500 flex items-center gap-2">
                                View and filter active students
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                            <button onClick={() => setIsMasterUnlocked(false)} className="text-sm text-gray-500 hover:text-red-500 font-medium flex items-center gap-1 transition-colors mr-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                Lock Dashboard
                            </button>

                            <div className="relative flex-1 md:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                <input
                                    type="text"
                                    placeholder="Search by name or email..."
                                    className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={studentSearch || ''}
                                    onChange={(e) => setStudentSearch(e.target.value)}
                                />
                            </div>
                            <select
                                className="border rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                                value={studentFieldFilter || 'All'}
                                onChange={(e) => setStudentFieldFilter(e.target.value)}
                            >
                                <option value="All">All Fields</option>
                                <option value="JEE Main">JEE Main</option>
                                <option value="JEE Advanced">JEE Advanced</option>
                                <option value="NEET">NEET</option>
                                <option value="CAT">CAT</option>
                                <option value="Board">Board</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">User</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Contact</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Field & Class</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Location</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {usersList
                                    .filter(student => {
                                        const matchesSearch = (student.name?.toLowerCase() || '').includes(studentSearch.toLowerCase()) ||
                                            (student.email?.toLowerCase() || '').includes(studentSearch.toLowerCase());
                                        const studentField = student.interest || student.category || student.selectedField || 'Other';
                                        const matchesField = studentFieldFilter === 'All' ||
                                            studentField.toLowerCase() === studentFieldFilter.toLowerCase();
                                        return matchesSearch && matchesField;
                                    })
                                    .map((student) => (
                                        <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="h-10 w-10 flex-shrink-0">
                                                        {student.photoURL ? (
                                                            <img className="h-10 w-10 rounded-full object-cover border border-gray-200" src={student.photoURL} alt="" />
                                                        ) : (
                                                            <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-500 font-bold">
                                                                {student.name?.charAt(0) || 'U'}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="ml-4">
                                                        <div className="text-sm font-medium text-gray-900">{student.name}</div>
                                                        <div className="text-xs text-gray-500">{student.email}</div>
                                                        <div className="text-[10px] text-gray-400 mt-1 uppercase tracking-wide">{student.role}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-900">{student.phone || student.phoneNumber || 'N/A'}</div>
                                                <div className="text-xs text-blue-500">{student.authProvider === 'google' ? 'Google Auth' : 'Phone Auth'}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-bold text-indigo-600">
                                                    {student.interest || student.category || student.selectedField || <span className="text-gray-400 italic font-normal">Not Specified</span>}
                                                </div>
                                                <div className="text-xs text-gray-500">{student.class || 'No Class Info'}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-900">{student.city || 'N/A'}</div>
                                                <div className="text-xs text-gray-500">{student.state || 'N/A'}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {student.status === 'blocked' ? (
                                                    <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                                                        Blocked
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                                        Active
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                <div className="flex items-center space-x-3">
                                                    {/* Role Toggle */}
                                                    {user?.adminLevel === 1 && (
                                                        <button
                                                            onClick={() => handleUpdateRole(student.id, student.role === 'admin' ? 'student' : 'admin')}
                                                            className={`text-xs px-2 py-1 rounded border ${student.role === 'admin' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-gray-50 text-gray-600 border-gray-200'}`}
                                                        >
                                                            {student.role === 'admin' ? 'Demote' : 'Promote'}
                                                        </button>
                                                    )}

                                                    {/* Admin Level Assignment (For Level 1 Admins only) */}
                                                    {user?.adminLevel === 1 && student.role === 'admin' && (
                                                        <select
                                                            value={student.adminLevel || 1}
                                                            onChange={(e) => handleUpdateAdminLevel(student.id, e.target.value)}
                                                            className="text-xs px-2 py-1 rounded border bg-purple-50 text-purple-700 border-purple-200 outline-none"
                                                            title="Set Admin Level"
                                                        >
                                                            <option value={1}>L1 (Super)</option>
                                                            <option value={2}>L2 (Review)</option>
                                                            <option value={3}>L3 (Upload)</option>
                                                        </select>
                                                    )}

                                                    {/* Status Toggle (Block/Unblock) */}
                                                    <button
                                                        onClick={() => handleUpdateStatus(student.id, student.status || 'active')}
                                                        className={`text-xs px-2 py-1 rounded border font-bold ${student.status === 'blocked' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}
                                                    >
                                                        {student.status === 'blocked' ? 'Unblock' : 'Block'}
                                                    </button>

                                                    {/* View Report */}
                                                    <button
                                                        onClick={() => setViewingStudent(student)}
                                                        className="text-indigo-600 hover:text-indigo-900"
                                                        title="View Performance"
                                                    >
                                                        <BarChart2 size={18} />
                                                    </button>

                                                    {/* Delete User */}
                                                    <button
                                                        onClick={() => handleDeleteUser(student.id)}
                                                        className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded"
                                                        title="Delete User Permanently"
                                                    >
                                                        <Trash size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                {usersList.length === 0 && (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-4 text-center text-sm text-gray-500">
                                            No students found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}    {/* Revenue Tab */}
            {activeTab === 'revenue' && isMasterUnlocked && revenueStats && (
                <div className="space-y-6">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-green-50 p-6 rounded-lg text-center border border-green-200 shadow-sm transition-transform hover:-translate-y-1">
                            <h4 className="text-gray-600 font-bold uppercase tracking-wider text-sm flex items-center justify-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>
                                Total Revenue
                            </h4>
                            <p className="text-5xl font-black text-green-700 mt-3 drop-shadow-sm">₹{(revenueStats?.totalRevenue || 0).toLocaleString('en-IN')}</p>
                        </div>
                        <div className="bg-blue-50 p-6 rounded-lg text-center border border-blue-200 shadow-sm transition-transform hover:-translate-y-1">
                            <h4 className="text-gray-600 font-bold uppercase tracking-wider text-sm flex items-center justify-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor"><path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" /></svg>
                                Total Orders
                            </h4>
                            <p className="text-5xl font-black text-blue-700 mt-3 drop-shadow-sm">{revenueStats.totalOrders}</p>
                        </div>
                    </div>

                    {/* Transactions Table */}
                    <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
                        <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                                Recent Transactions
                            </h3>
                            <button onClick={() => setIsMasterUnlocked(false)} className="text-sm text-gray-500 hover:text-red-500 font-medium flex items-center gap-1 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                Lock Dashboard
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Student</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Item Name</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider border-l border-gray-100">Amount Paid</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider text-purple-600">Coupon Used</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider text-orange-600">Discount</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Ref ID</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {revenueStats.orders?.map((order) => (
                                        <tr key={order.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{order.userName}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-600">{order.itemName}</td>
                                            <td className="px-6 py-4 whitespace-nowrap font-bold text-green-600">₹{order.amount}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {order.couponCode ? (
                                                    <span className="px-2 py-1 text-xs font-bold rounded-full bg-purple-100 text-purple-700 font-mono">{order.couponCode}</span>
                                                ) : <span className="text-gray-300 text-xs">—</span>}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {order.discountAmount > 0 ? (
                                                    <span className="text-orange-600 font-bold text-sm">-₹{order.discountAmount}</span>
                                                ) : <span className="text-gray-300 text-xs">—</span>}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 py-1 text-xs font-bold rounded-full uppercase ${order.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                                    {order.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-400 font-mono">{order.paymentId || order.razorpayOrderId}</td>
                                        </tr>
                                    ))}
                                    {(!revenueStats.orders || revenueStats.orders.length === 0) && (
                                        <tr><td colSpan="8" className="text-center py-8 text-gray-500">No transactions found.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Content Tab */}
            {activeTab === 'content' && isMasterUnlocked && (
                <div className="space-y-8">
                    {/* Coupon Manager */}
                    <CouponManager user={user} />

                    {/* Syllabus Management */}
                    <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
                        <div className="flex justify-between items-start mb-6">
                            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                <BookOpen className="text-indigo-600" /> Syllabus Management
                            </h3>
                            <button onClick={() => setIsMasterUnlocked(false)} className="text-sm text-gray-500 hover:text-red-500 font-medium flex items-center gap-1 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                Lock Dashboard
                            </button>
                        </div>

                        <div className="max-w-3xl">
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Select Exam Category</label>
                                <div className="flex flex-wrap gap-2">
                                    {Object.keys(syllabusData).map(cat => (
                                        <button
                                            key={cat}
                                            onClick={() => setSelectedSyllabusCategory(cat)}
                                            className={`px-4 py-2 rounded-full text-sm font-bold border transition-colors ${selectedSyllabusCategory === cat
                                                ? 'bg-indigo-600 text-white border-indigo-600'
                                                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                                                }`}
                                        >
                                            {cat}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Syllabus PDF Link for <span className="text-indigo-600 font-bold">{selectedSyllabusCategory}</span>
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={syllabusLink || ''}
                                        onChange={(e) => setSyllabusLink(e.target.value)}
                                        placeholder="Paste Google Drive or PDF link here..."
                                        className="flex-1 border border-gray-300 rounded-md p-3 focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                    <button
                                        onClick={handleSaveSyllabus}
                                        disabled={savingSyllabus}
                                        className="px-6 py-3 bg-green-600 text-white font-bold rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {savingSyllabus ? 'Saving...' : <><Save size={18} /> Save Link</>}
                                    </button>
                                </div>
                                <p className="text-xs text-gray-500 mt-2">
                                    Paste the shareable link of the PDF (e.g., Google Drive link with "Anyone with the link" access).
                                </p>
                            </div>

                            {syllabusLink && (
                                <div className="p-4 bg-gray-50 rounded border border-gray-200">
                                    <p className="text-sm font-bold text-gray-700 mb-2">Preview Action:</p>
                                    <a
                                        href={syllabusLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-indigo-600 underline font-medium flex items-center gap-1"
                                    >
                                        <Download size={16} /> Download / View Syllabus
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Rescore results utility */}
                    <RescoreSection user={user} />

                    {/* Percentile Config */}
                    <PercentileConfig user={user} />
                </div>
            )}

            {/* Create Tab */}
            {activeTab === 'notes' && (
                <NotesManager />
            )}

            {activeTab === 'create' && (
                <div className="space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto pb-24">

                    {/* Header Details */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/60 backdrop-blur-xl border border-slate-200/60 p-6 rounded-3xl shadow-sm">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                                <BookOpen size={24} />
                            </div>
                            <div>
                                <h1 className="text-2xl font-black text-slate-900 tracking-tight">Create New Assessment</h1>
                                <p className="text-sm font-medium text-slate-500 mt-0.5">Design, configure, and publish tests beautifully.</p>
                            </div>
                        </div>
                        {isUpdatingExisting && (
                            <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200/60 px-5 py-3 rounded-2xl shadow-sm">
                                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 text-emerald-600">
                                    <Save size={16} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase text-emerald-700 tracking-wider">Update Mode Active</p>
                                    <p className="text-xs font-bold text-emerald-900 truncate max-w-[200px]">{testDetails.title}</p>
                                </div>
                                <button
                                    onClick={() => {
                                        setIsUpdatingExisting(false);
                                        setEditingId(null);
                                        setQuestions([]);
                                        setTestDetails({
                                            title: '', duration: 180, subject: 'Full Mock', category: 'JEE Main',
                                            difficulty: 'medium', totalMarks: 0, isLive: false, startTime: '', endTime: '', instructions: '',
                                            isVisible: true, calculator: false, chapters: ''
                                        });
                                    }}
                                    className="ml-2 w-8 h-8 flex items-center justify-center rounded-xl bg-white text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all border border-slate-100 shadow-sm"
                                    title="Exit Update Mode"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        {/* Main Settings & Builder */}
                        <div className="lg:col-span-12 space-y-8">

                            {/* Premium Test Details Card */}
                            <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden flex flex-col group transition-all hover:shadow-md">
                                <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-zinc-50/50">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-slate-900 text-white p-2 rounded-xl shadow-md"><Edit2 size={16} /></div>
                                        <div>
                                            <h3 className="text-base font-black text-slate-900 tracking-tight">Assessment Configuration</h3>
                                            <p className="text-[11px] font-medium text-slate-500 uppercase tracking-widest mt-0.5">Metadata & Permissions</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-8">
                                    <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">

                                        <div className="md:col-span-2 xl:col-span-2 group">
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1 group-focus-within:text-indigo-600 transition-colors">Assessment Title</label>
                                            <input type="text" name="title" value={testDetails.title || ''} onChange={handleTestChange} className="block w-full bg-slate-50 border border-slate-200/60 rounded-2xl px-4 py-3.5 text-sm font-bold text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all" placeholder="e.g., Target JEE Main Mock Test #1" />
                                        </div>

                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Target Category</label>
                                            <select name="category" value={testDetails.category || 'JEE Main'} onChange={handleTestChange} className="block w-full bg-slate-50 border border-slate-200/60 rounded-2xl px-4 py-3.5 text-sm font-bold text-slate-800 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all appearance-none cursor-pointer">
                                                <option value="JEE Main">JEE Main</option><option value="JEE Advanced">JEE Advanced</option><option value="NEET">NEET</option><option value="CAT">CAT</option><option value="Board Exam">Board Exam</option><option value="Others">Others</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Core Subject</label>
                                            <select name="subject" value={['Full Mock', 'Physics', 'Chemistry', 'Maths', 'Biology', 'English', 'Reasoning', 'General Knowledge'].includes(testDetails.subject) ? testDetails.subject : 'custom'} onChange={(e) => { const val = e.target.value; if (val === 'custom') { setTestDetails({ ...testDetails, subject: '' }); } else { setTestDetails({ ...testDetails, subject: val }); } }} className="block w-full bg-slate-50 border border-slate-200/60 rounded-2xl px-4 py-3.5 text-sm font-bold text-slate-800 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all appearance-none cursor-pointer">
                                                <option value="Full Mock">Full Mock (All)</option><option value="Physics">Physics</option><option value="Chemistry">Chemistry</option><option value="Maths">Maths</option><option value="Biology">Biology</option><option value="English">English</option><option value="Reasoning">Reasoning</option><option value="General Knowledge">General Knowledge</option><option value="custom">Other / Custom...</option>
                                            </select>
                                            {!['Full Mock', 'Physics', 'Chemistry', 'Maths', 'Biology', 'English', 'Reasoning', 'General Knowledge'].includes(testDetails.subject) && (
                                                <input type="text" value={testDetails.subject || ''} onChange={(e) => setTestDetails({ ...testDetails, subject: e.target.value })} className="mt-3 block w-full bg-indigo-50/50 border border-indigo-200 rounded-2xl px-4 py-3 text-sm font-bold text-indigo-900 focus:bg-white outline-none transition-all" placeholder="Enter Custom Subject..." autoFocus />
                                            )}
                                        </div>

                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Duration (Mins)</label>
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400"><Clock size={16} /></div>
                                                <input type="number" name="duration" value={testDetails.duration || 180} onChange={handleTestChange} className="block w-full pl-11 bg-slate-50 border border-slate-200/60 rounded-2xl px-4 py-3.5 text-sm font-bold text-slate-800 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all" />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Access Tier</label>
                                            <select name="accessType" value={testDetails.accessType || 'free'} onChange={handleTestChange} className="block w-full bg-slate-50 border border-slate-200/60 rounded-2xl px-4 py-3.5 text-sm font-bold text-slate-800 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all appearance-none cursor-pointer">
                                                <option value="free">Free Access</option>
                                                <option value="paid">Premium (Paid)</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Test Format</label>
                                            <select name="format" value={testDetails.format || 'full-mock'} onChange={handleTestChange} className="block w-full bg-slate-50 border border-slate-200/60 rounded-2xl px-4 py-3.5 text-sm font-bold text-slate-800 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all appearance-none cursor-pointer">
                                                <option value="full-mock">Full Mock Test</option>
                                                <option value="chapter-wise">Chapter Wise</option>
                                                <option value="part-test">Part Test</option>
                                            </select>
                                        </div>

                                        <div className="md:col-span-3 xl:col-span-2">
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Assign to Series (Optional)</label>
                                            <select name="seriesId" value={testDetails.seriesId || ''} onChange={handleTestChange} className="block w-full bg-slate-50 border border-slate-200/60 rounded-2xl px-4 py-3.5 text-sm font-bold text-slate-800 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all appearance-none cursor-pointer">
                                                <option value="">— Standalone Test (No Series) —</option>
                                                {seriesList.filter(s => s.category === testDetails.category).map(s => (
                                                    <option key={s.id} value={s.id}>{s.title}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="xl:col-span-2">
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Chapter Tags</label>
                                            <input type="text" name="chapters" value={testDetails.chapters || ''} onChange={handleTestChange} className="block w-full bg-slate-50 border border-slate-200/60 rounded-2xl px-4 py-3.5 text-sm font-bold text-slate-800 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all" placeholder="e.g. Kinematics, Optics..." />
                                        </div>

                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Max Attempts</label>
                                            <input type="number" name="maxAttempts" value={testDetails.maxAttempts || ''} onChange={handleTestChange} placeholder="Unlimited" className="block w-full bg-slate-50 border border-slate-200/60 rounded-2xl px-4 py-3.5 text-sm font-bold text-slate-800 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all" />
                                        </div>

                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Expiry Date</label>
                                            <input type="date" name="expiryDate" value={testDetails.expiryDate || ''} onChange={handleTestChange} className="block w-full bg-slate-50 border border-slate-200/60 rounded-2xl px-4 py-3.5 text-sm font-bold text-slate-800 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all" />
                                        </div>

                                        <div className="md:col-span-3 xl:col-span-4">
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Candidate Instructions</label>
                                            <textarea name="instructions" value={testDetails.instructions || ''} onChange={handleTestChange} rows={2} className="block w-full bg-slate-50 border border-slate-200/60 rounded-2xl px-4 py-3.5 text-sm font-mono text-slate-700 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all resize-none" placeholder="1. All questions are compulsory..." />
                                        </div>
                                    </div>

                                    {/* Section Optional Attempt Config — auto-computed from question queue */}
                                    {(() => {
                                        const pairs = [];
                                        const seen = new Set();
                                        questions.forEach(q => {
                                            const sub = q.subject || 'General';
                                            const sec = q.section || '';
                                            if (sec) {
                                                const key = `${sub}|||${sec}`;
                                                if (!seen.has(key)) { seen.add(key); pairs.push({ subject: sub, section: sec }); }
                                            }
                                        });
                                        if (pairs.length === 0) return null;
                                        return (
                                            <div className="mt-6 pt-6 border-t border-slate-100">
                                                <div className="mb-3 flex items-center gap-2">
                                                    <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Section Attempt Limits</span>
                                                    <span className="text-[10px] text-slate-400 font-medium">(optional — leave blank to require all)</span>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                                                    {pairs.map(({ subject, section }) => {
                                                        const meta = (testDetails.sectionMeta || []).find(m => m.subject === subject && m.section === section);
                                                        const totalInSection = questions.filter(q => (q.subject || 'General') === subject && (q.section || '') === section).length;
                                                        return (
                                                            <div key={`${subject}|||${section}`} className="flex items-center gap-3 bg-amber-50/60 border border-amber-200/60 rounded-2xl px-4 py-3">
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="text-[10px] font-black text-amber-900 uppercase tracking-wider truncate">{subject} › {section}</div>
                                                                    <div className="text-[9px] text-amber-700/70 font-medium">{totalInSection} question{totalInSection !== 1 ? 's' : ''} total</div>
                                                                </div>
                                                                <div className="flex items-center gap-1.5 shrink-0">
                                                                    <span className="text-[10px] text-slate-500 font-bold">Answer any</span>
                                                                    <input
                                                                        type="number"
                                                                        min="1"
                                                                        max={totalInSection}
                                                                        value={meta?.requiredAttempts ?? ''}
                                                                        onChange={(e) => {
                                                                            const val = e.target.value === '' ? null : Math.min(totalInSection, Math.max(1, parseInt(e.target.value) || 1));
                                                                            setTestDetails(prev => {
                                                                                const existing = (prev.sectionMeta || []).filter(m => !(m.subject === subject && m.section === section));
                                                                                return { ...prev, sectionMeta: val !== null ? [...existing, { subject, section, requiredAttempts: val }] : existing };
                                                                            });
                                                                        }}
                                                                        placeholder={String(totalInSection)}
                                                                        className="w-14 text-center border border-amber-300 rounded-lg px-2 py-1.5 text-sm font-bold text-amber-900 bg-white outline-none focus:ring-2 focus:ring-amber-400"
                                                                    />
                                                                    <span className="text-[10px] text-slate-500 font-bold">of {totalInSection}</span>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    <div className="pt-8 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

                                        <div className="flex flex-col gap-3 p-5 rounded-2xl bg-indigo-50/50 border border-indigo-100/60 transition-colors hover:bg-indigo-50">
                                            <div className="flex items-center justify-between">
                                                <label className="text-xs font-black text-indigo-900 uppercase tracking-widest cursor-pointer select-none" onClick={() => setTestDetails({ ...testDetails, calculator: !testDetails.calculator })}>Scientific Calculator</label>
                                                <button type="button" onClick={() => setTestDetails({ ...testDetails, calculator: !testDetails.calculator })} className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300 ease-in-out ${testDetails.calculator ? 'bg-indigo-600 shadow-inner' : 'bg-slate-300'}`}>
                                                    <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transform transition-transform duration-300 ease-in-out ${testDetails.calculator ? 'translate-x-5' : 'translate-x-0'}`} />
                                                </button>
                                            </div>
                                            <p className="text-[10px] font-medium text-indigo-700/70 leading-snug">Allow students to use on-screen advanced calculator during exam.</p>
                                        </div>

                                        <div className="flex flex-col gap-3 p-5 rounded-2xl bg-amber-50/50 border border-amber-100/60 transition-colors hover:bg-amber-50">
                                            <div className="flex items-center justify-between">
                                                <label className="text-xs font-black text-amber-900 uppercase tracking-widest cursor-pointer select-none" onClick={() => setTestDetails({ ...testDetails, isLive: !testDetails.isLive })}>Live Exam Mode</label>
                                                <button type="button" onClick={() => setTestDetails({ ...testDetails, isLive: !testDetails.isLive })} className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300 ease-in-out ${testDetails.isLive ? 'bg-amber-500 shadow-inner' : 'bg-slate-300'}`}>
                                                    <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transform transition-transform duration-300 ease-in-out ${testDetails.isLive ? 'translate-x-5' : 'translate-x-0'}`} />
                                                </button>
                                            </div>
                                            <p className="text-[10px] font-medium text-amber-700/70 leading-snug">Enforce strict start/end times & sync execution for all students.</p>
                                        </div>

                                        <div className="lg:col-span-2">
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Result Publishing Rule</label>
                                            <select name="resultVisibility" value={testDetails.resultVisibility || 'immediate'} onChange={handleTestChange} className="block w-full bg-slate-50 border border-slate-200/60 rounded-2xl px-4 py-3.5 text-sm font-bold text-slate-800 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all appearance-none cursor-pointer h-14">
                                                <option value="immediate">Publish Immediately After Submission</option>
                                                <option value="afterTestEnds">Publish Only When Live Window Ends</option>
                                                <option value="scheduled">Schedule Custom Date & Time...</option>
                                            </select>
                                        </div>
                                    </div>

                                    {(testDetails.isLive || testDetails.resultVisibility === 'scheduled') && (
                                        <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-top-4 duration-300">
                                            {testDetails.isLive && (
                                                <div className="flex items-center gap-4 p-5 rounded-2xl bg-amber-50 border border-amber-200/60">
                                                    <div className="flex flex-col flex-1">
                                                        <label className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">Live Start Time</label>
                                                        <input type="datetime-local" name="startTime" value={testDetails.startTime || ''} onChange={handleTestChange} className="bg-white border text-sm font-bold text-slate-800 border-amber-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-amber-500" />
                                                    </div>
                                                    <div className="flex flex-col flex-1">
                                                        <label className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">Live End Time</label>
                                                        <input type="datetime-local" name="endTime" value={testDetails.endTime || ''} onChange={handleTestChange} className="bg-white border text-sm font-bold text-slate-800 border-amber-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-amber-500" />
                                                    </div>
                                                </div>
                                            )}
                                            {testDetails.resultVisibility === 'scheduled' && (
                                                <div className="flex flex-col flex-1 p-5 rounded-2xl bg-indigo-50 border border-indigo-200/60">
                                                    <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">Result Release Datetime</label>
                                                    <input type="datetime-local" name="resultDeclarationTime" value={testDetails.resultDeclarationTime || ''} onChange={handleTestChange} className="bg-white border text-sm font-bold text-slate-800 border-indigo-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500" />
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Bulk Actions Command Center */}
                        <div className="lg:col-span-12">
                            <div className="relative overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 shadow-xl">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                                <div className="absolute bottom-0 left-0 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>

                                <div className="relative px-8 py-6 flex flex-col md:flex-row justify-between items-center gap-6">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-md">
                                            <Zap size={24} className="text-amber-400" />
                                        </div>
                                        <div>
                                            <h4 className="font-black text-white text-lg tracking-tight">Bulk Actions Command Center</h4>
                                            <p className="text-sm font-medium text-slate-400 mt-0.5">Rapidly add or process multiple questions at once.</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-3 mt-4 lg:mt-0">
                                        <button
                                            onClick={() => setShowBulkUpload(true)}
                                            className="px-5 py-3 bg-white/5 text-white rounded-2xl border border-white/10 font-bold flex items-center gap-2 hover:bg-white/10 transition-all text-sm backdrop-blur-md hover:-translate-y-0.5"
                                        >
                                            <UploadCloud size={18} className="text-indigo-400" /> Excel / CSV Upload
                                        </button>
                                        <button
                                            onClick={() => setShowPdfModal(true)}
                                            className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-violet-600 text-white rounded-2xl shadow-lg shadow-indigo-500/25 font-bold flex items-center gap-2 hover:shadow-indigo-500/40 transition-all text-sm hover:-translate-y-0.5 border border-indigo-400/50"
                                            title="Extract and upload images from PDF"
                                        >
                                            <ImageIcon size={18} /> Upload by PDF Image
                                        </button>
                                        <button
                                            onClick={() => setShowPdfTextModal(true)}
                                            className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-2xl shadow-lg shadow-emerald-500/25 font-bold flex items-center gap-2 hover:shadow-emerald-500/40 transition-all text-sm hover:-translate-y-0.5 border border-emerald-400/50"
                                            title="Extract text directly from PDF"
                                        >
                                            <Type size={18} /> Upload by PDF Text
                                        </button>
                                        <button
                                            onClick={() => setShowMarkerModal(true)}
                                            className="px-6 py-3 bg-gradient-to-r from-fuchsia-500 to-pink-600 text-white rounded-2xl shadow-lg shadow-pink-500/25 font-bold flex items-center gap-2 hover:shadow-pink-500/40 transition-all text-sm hover:-translate-y-0.5 border border-pink-400/50 relative overflow-hidden group"
                                            title="Extract text and equations automatically using Marker AI"
                                        >
                                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                                            <Zap size={18} className="relative z-10" /> <span className="relative z-10">Upload via Marker AI</span>
                                        </button>
                                        <button
                                            onClick={() => setShowGeminiModal(true)}
                                            className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-violet-700 text-white rounded-3xl shadow-2xl shadow-indigo-500/30 font-black flex items-center gap-3 hover:shadow-indigo-500/50 transition-all text-base hover:-translate-y-1 border border-indigo-400/50 relative overflow-hidden group"
                                            title="Apex AI high-precision Digitizer — MCQs, MSQs, & LaTeX"
                                        >
                                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                                            <Sparkles size={20} className="relative z-10 text-amber-300" /> 
                                            <span className="relative z-10">Apex AI Digitizer</span>
                                            <span className="relative z-10 bg-white/20 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">Pro</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Workspace Split */}
                        <div className="lg:col-span-12 grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">

                            {/* Left Column: Authoring Studio — takes up most space */}
                            <div className="xl:col-span-9 2xl:col-span-9 flex flex-col space-y-6">
                                <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden flex flex-col transition-all hover:shadow-md">
                                    <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-zinc-50/50">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-indigo-50 text-indigo-600 p-2 rounded-xl border border-indigo-100/50"><Plus size={16} /></div>
                                            <div>
                                                <h3 className="text-base font-black text-slate-900 tracking-tight">Question Authoring Studio</h3>
                                                <p className="text-[11px] font-medium text-slate-500 uppercase tracking-widest mt-0.5">Draft new questions</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-8 space-y-8">
                                        {/* Row 1: Settings */}
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Type</label>
                                                <select name="type" value={currentQuestion.type || 'mcq'} onChange={handleQuestionChange} className="block w-full bg-slate-50 border border-slate-200/60 rounded-2xl px-4 py-3 text-sm font-bold text-slate-800 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all appearance-none cursor-pointer">
                                                    <option value="mcq">Single Choice (MCQ)</option>
                                                    <option value="msq">Multi Choice (MSQ)</option>
                                                    <option value="integer">Numerical (Integer)</option>
                                                    <option value="matching">Matching (Matrix Match)</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Marks (+)</label>
                                                <input type="number" name="marks" value={currentQuestion.marks || 4} onChange={handleQuestionChange} className="block w-full bg-slate-50 border border-slate-200/60 rounded-2xl px-4 py-3 text-sm font-bold text-slate-800 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all" />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-rose-400 uppercase tracking-widest mb-2 ml-1">Penalty (-)</label>
                                                <input type="number" name="negativeMarks" value={currentQuestion.negativeMarks !== undefined ? currentQuestion.negativeMarks : 0} onChange={handleQuestionChange} className="block w-full bg-rose-50 border border-rose-200/60 rounded-2xl px-4 py-3 text-sm font-bold text-rose-700 focus:bg-white focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 outline-none transition-all" />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Topic Tag</label>
                                                <input type="text" name="topic" value={currentQuestion.topic || ''} onChange={handleQuestionChange} className="block w-full bg-slate-50 border border-slate-200/60 rounded-2xl px-4 py-3 text-sm font-bold text-slate-800 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all" placeholder="e.g. Optics" />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Section <span className="text-slate-300 font-normal normal-case">(optional)</span></label>
                                                <input type="text" name="section" value={currentQuestion.section || ''} onChange={handleQuestionChange} className="block w-full bg-slate-50 border border-slate-200/60 rounded-2xl px-4 py-3 text-sm font-bold text-slate-800 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all" placeholder="e.g. Section A" />
                                            </div>
                                        </div>

                                        {/* Row 2: Question Body */}
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Question Content</label>
                                                <div className="relative overflow-hidden inline-block group cursor-pointer">
                                                    <input key={fileInputKey} type="file" onChange={(e) => uploadImage(e.target.files[0], 'question')} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                                                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 group-hover:bg-indigo-100 transition-colors">
                                                        {uploadingImage ? <><Loader2 size={12} className="animate-spin" /> Uploading...</> : <><ImageIcon size={12} /> Attach Image</>}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="border border-slate-200 rounded-2xl overflow-hidden focus-within:ring-4 focus-within:ring-indigo-500/10 focus-within:border-indigo-500 transition-all shadow-sm">
                                                <RichMathEditor 
                                                    value={currentQuestion.text || ''}
                                                    onChange={(val) => handleQuestionChange({ target: { name: 'text', value: val } })}
                                                    onPaste={(e) => handlePaste(e, 'question')}
                                                    rows={5}
                                                    placeholder="Draft your question here. Visual Math and Text supported..."
                                                />
                                                {/* Live Preview area */}
                                                {(currentQuestion.text || currentQuestion.image) && (
                                                    <div className="p-5 bg-slate-50 border-t border-slate-100">
                                                        <p className="text-[9px] font-black text-slate-400 uppercase mb-3 tracking-widest flex items-center gap-1"><Eye size={10} /> Live Output Preview</p>
                                                        <div className="prose prose-sm max-w-none text-slate-800">
                                                            <MathText text={currentQuestion.text || '...'} />
                                                        </div>

                                                        {currentQuestion.type === 'matching' && currentQuestion.matchPairs && currentQuestion.matchPairs.length > 0 && (
                                                            <div className="mt-4 flex flex-col md:flex-row gap-4 w-full">
                                                                <div className="flex-1 bg-white border border-slate-200 rounded-lg shadow-sm">
                                                                    <div className="bg-slate-50 border-b px-2 py-1 font-bold text-[9px] text-slate-500 text-center rounded-t-lg uppercase tracking-widest">List I</div>
                                                                    <div className="p-0">
                                                                        {currentQuestion.matchPairs.map((pair, pIdx) => (
                                                                            <div key={pIdx} className="flex border-b last:border-0 items-center">
                                                                                <div className="px-2 py-2 w-8 text-center text-[10px] font-bold text-slate-400 bg-slate-50 border-r self-stretch flex items-center justify-center">{pIdx + 1}</div>
                                                                                <div className="px-3 py-2 text-[11px]"><MathText text={pair.left || '-'} /></div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                                <div className="flex-1 bg-white border border-slate-200 rounded-lg shadow-sm">
                                                                    <div className="bg-slate-50 border-b px-2 py-1 font-bold text-[9px] text-slate-500 text-center rounded-t-lg uppercase tracking-widest">List II</div>
                                                                    <div className="p-0">
                                                                        {currentQuestion.matchPairs.map((pair, pIdx) => (
                                                                            <div key={pIdx} className="flex border-b last:border-0 items-center">
                                                                                <div className="px-2 py-2 w-8 text-center text-[10px] font-bold text-slate-400 bg-slate-50 border-r self-stretch flex items-center justify-center">{String.fromCharCode(80 + pIdx)}</div>
                                                                                <div className="px-3 py-2 text-[11px]"><MathText text={pair.right || '-'} /></div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                        {currentQuestion.image && (
                                                            <div className="mt-4 inline-block relative group rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-white p-2">
                                                                <img src={currentQuestion.image} alt="Ref" className="max-h-64 object-contain rounded-lg" />
                                                                <button onClick={() => setCurrentQuestion({ ...currentQuestion, image: '' })} className="absolute top-3 right-3 bg-rose-500/90 text-white rounded-lg p-1.5 opacity-0 group-hover:opacity-100 transition shadow-lg hover:bg-rose-600"><Trash size={14} /></button>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {currentQuestion.type === 'matching' && (
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Matrix Match Pairs</label>
                                                    <button type="button" onClick={() => {
                                                        const pairs = currentQuestion.matchPairs || [];
                                                        setCurrentQuestion({...currentQuestion, matchPairs: [...pairs, {left:'', right:''}]});
                                                    }} className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 hover:bg-indigo-100 transition-colors">
                                                        + Add Pair
                                                    </button>
                                                </div>
                                                <div className="space-y-3">
                                                    {(currentQuestion.matchPairs || [{left:'', right:''}, {left:'', right:''}, {left:'', right:''}, {left:'', right:''}]).map((pair, idx) => (
                                                        <div key={idx} className="flex gap-4 items-center bg-slate-50 p-3 rounded-2xl border border-slate-200">
                                                            <div className="flex-1">
                                                                <div className="text-[10px] font-bold text-slate-400 mb-1 ml-1">Column I ({idx + 1})</div>
                                                                <RichMathEditor minimal={true} value={pair.left || ''} onChange={(val) => {
                                                                    const pairs = currentQuestion.matchPairs ? [...currentQuestion.matchPairs] : [{left:'', right:''}, {left:'', right:''}, {left:'', right:''}, {left:'', right:''}];
                                                                    pairs[idx] = { ...pairs[idx], left: val };
                                                                    setCurrentQuestion({...currentQuestion, matchPairs: pairs});
                                                                }} rows={1} placeholder={`Item ${idx + 1}`} />
                                                            </div>
                                                            <div className="flex-1">
                                                                <div className="text-[10px] font-bold text-slate-400 mb-1 ml-1">Column II ({String.fromCharCode(80 + idx)})</div>
                                                                <RichMathEditor minimal={true} value={pair.right || ''} onChange={(val) => {
                                                                    const pairs = currentQuestion.matchPairs ? [...currentQuestion.matchPairs] : [{left:'', right:''}, {left:'', right:''}, {left:'', right:''}, {left:'', right:''}];
                                                                    pairs[idx] = { ...pairs[idx], right: val };
                                                                    setCurrentQuestion({...currentQuestion, matchPairs: pairs});
                                                                }} rows={1} placeholder={`Item ${String.fromCharCode(80 + idx)}`} />
                                                            </div>
                                                            <button type="button" onClick={() => {
                                                                const pairs = (currentQuestion.matchPairs || []).filter((_, i) => i !== idx);
                                                                setCurrentQuestion({...currentQuestion, matchPairs: pairs});
                                                            }} className="p-2 bg-rose-100 text-rose-600 rounded-lg hover:bg-rose-200 transition mt-4"><Trash size={14}/></button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Row 3: Options Array */}
                                        {currentQuestion.type !== 'integer' && (
                                            <div className="space-y-4">
                                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Answer Options</label>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {currentQuestion.options.map((opt, idx) => {
                                                        const letter = String.fromCharCode(65 + idx);
                                                        const isCorrectMCQ = (currentQuestion.type === 'mcq' || currentQuestion.type === 'matching') && currentQuestion.correctOption === letter;
                                                        const isCorrectMSQ = currentQuestion.type === 'msq' && currentQuestion.correctOptions.includes(letter);
                                                        const isCorrect = isCorrectMCQ || isCorrectMSQ;

                                                        return (
                                                            <div key={idx} className={`group relative bg-white border ${isCorrect ? 'border-emerald-400 shadow-md shadow-emerald-500/10' : 'border-slate-200'} rounded-2xl p-5 transition-all outline-none focus-within:ring-4 focus-within:ring-indigo-500/10 focus-within:border-indigo-500`}>

                                                                {/* Correct Answer Quick Toggle Corner */}
                                                                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            if (currentQuestion.type === 'mcq' || currentQuestion.type === 'matching') {
                                                                                handleQuestionChange({ target: { name: 'correctOption', value: letter } });
                                                                            } else {
                                                                                handleMSQCheck(letter);
                                                                            }
                                                                        }}
                                                                        className={`text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-md border transition-all ${isCorrect ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200'}`}
                                                                    >
                                                                        {isCorrect ? 'Marked Correct' : 'Mark Correct'}
                                                                    </button>
                                                                </div>

                                                                <div className="flex items-start gap-4">
                                                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-[11px] font-black transition-colors ${isCorrect ? 'bg-emerald-500 text-white shadow-sm' : 'bg-slate-100 text-slate-500 group-focus-within:bg-indigo-600 group-focus-within:text-white'}`}>
                                                                        {letter}
                                                                    </div>
                                                                    <div className="flex-1 space-y-3 pt-0.5">
                                                                        <RichMathEditor 
                                                                            minimal={true}
                                                                            value={opt} 
                                                                            onChange={(val) => handleOptionChange(idx, val)} 
                                                                            onPaste={(e) => handlePaste(e, 'option', idx)}
                                                                            rows={2} 
                                                                            className="mb-2"
                                                                            placeholder="Enter option..." 
                                                                        />

                                                                        {(opt || currentQuestion.optionImages[idx]) && (
                                                                            <div className="pt-2 border-t border-slate-100">
                                                                                <MathText text={opt} className="text-xs text-slate-600 break-words" />
                                                                            </div>
                                                                        )}

                                                                        <div className="flex items-center gap-2 mt-2">
                                                                            <div className="relative overflow-hidden inline-block cursor-pointer">
                                                                                <input key={`${fileInputKey}-opt-${idx}`} type="file" onChange={(e) => uploadImage(e.target.files[0], 'option', idx)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                                                                                <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-500 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200 hover:bg-slate-100 transition-colors">
                                                                                    <ImageIcon size={10} /> Add Image
                                                                                </div>
                                                                            </div>
                                                                        </div>

                                                                        {currentQuestion.optionImages[idx] && (
                                                                            <div className="relative inline-block mt-2">
                                                                                <img src={currentQuestion.optionImages[idx]} alt="Opt" className="h-24 w-auto object-contain border border-slate-200 rounded-lg bg-slate-50 p-1 shadow-sm" />
                                                                                <button onClick={() => { const newImg = [...currentQuestion.optionImages]; newImg[idx] = null; setCurrentQuestion({ ...currentQuestion, optionImages: newImg }); }} className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full p-1 shadow-md hover:bg-rose-600 transition"><X size={10} /></button>
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

                                        {/* Answer Section (Explicit) */}
                                        <div className="relative overflow-hidden bg-emerald-50/80 border border-emerald-200/60 rounded-3xl p-8">
                                            <div className="flex items-center gap-3 mb-6 relative z-10">
                                                <div className="bg-emerald-100 text-emerald-600 p-2 rounded-xl"><CheckCircle size={18} /></div>
                                                <div>
                                                    <h4 className="text-sm font-black text-emerald-900 tracking-tight">Answer Key Selection</h4>
                                                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mt-0.5">Define Correct Evaluation</p>
                                                </div>
                                            </div>

                                            <div className="relative z-10">
                                                {(currentQuestion.type === 'mcq' || currentQuestion.type === 'matching') && (
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                        {currentQuestion.options.map((opt, idx) => {
                                                            const letter = String.fromCharCode(65 + idx);
                                                            const isSelected = currentQuestion.correctOption === letter;
                                                            return (
                                                                <button key={idx} onClick={() => handleQuestionChange({ target: { name: 'correctOption', value: letter } })} className={`px-4 py-4 rounded-2xl border-2 text-base font-black transition-all transform active:scale-95 ${isSelected ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/30 -translate-y-1' : 'bg-white border-emerald-100 text-emerald-700 hover:border-emerald-300 hover:shadow-md'}`}>
                                                                    {String.fromCharCode(65 + idx)}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                )}

                                                {currentQuestion.type === 'msq' && (
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                        {currentQuestion.options.map((opt, idx) => {
                                                            const letter = String.fromCharCode(65 + idx);
                                                            const isChecked = currentQuestion.correctOptions.includes(letter);
                                                            return (
                                                                <button key={idx} onClick={() => handleMSQCheck(letter)} className={`px-4 py-4 rounded-2xl border-2 text-base font-black transition-all transform active:scale-95 ${isChecked ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/30 -translate-y-1' : 'bg-white border-emerald-100 text-emerald-700 hover:border-emerald-300 hover:shadow-md'}`}>
                                                                    {letter}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                )}

                                                {currentQuestion.type === 'integer' && (
                                                    <div className="max-w-xs">
                                                        <input type="text" name="integerAnswer" value={currentQuestion.integerAnswer || ''} onChange={handleQuestionChange} className="block w-full bg-white border-2 border-emerald-200 rounded-2xl px-6 py-4 text-xl font-black focus:border-emerald-500 outline-none transition-all text-center text-slate-800 shadow-sm" placeholder="e.g. 42" />
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Optional Solution */}
                                        <div className="border border-slate-200/80 rounded-3xl overflow-hidden transition-all bg-white shadow-sm">
                                            <details className="group marker:content-['']">
                                                <summary className="flex items-center justify-between px-8 py-5 cursor-pointer bg-slate-50/50 hover:bg-slate-50 transition-colors w-full select-none">
                                                    <div className="flex items-center gap-3">
                                                        <div className="bg-slate-200/50 text-slate-600 p-2 rounded-xl group-open:bg-indigo-100 group-open:text-indigo-600 transition-colors"><Info size={16} /></div>
                                                        <div>
                                                            <h4 className="text-sm font-black text-slate-800 tracking-tight">Detailed Solution</h4>
                                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Optional Explanation</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-slate-400 group-open:rotate-180 transition-transform duration-300 bg-white p-2 rounded-full border border-slate-200 shadow-sm"><ChevronDown size={14} /></div>
                                                </summary>

                                                <div className="p-8 border-t border-slate-100 bg-white space-y-6">
                                                    <div className="flex items-center justify-between">
                                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Explanation Content</label>
                                                        <div className="relative overflow-hidden inline-block group cursor-pointer">
                                                            <input key={`${fileInputKey}-sol`} type="file" onChange={(e) => uploadImage(e.target.files[0], 'solution')} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                                                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 group-hover:bg-indigo-100 transition-colors">
                                                                <ImageIcon size={12} /> Attach Image
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="border border-slate-200 rounded-2xl overflow-hidden focus-within:ring-4 focus-within:ring-indigo-500/10 focus-within:border-indigo-500 transition-all shadow-sm">
                                                        <RichMathEditor 
                                                            value={currentQuestion.solution || ''}
                                                            onChange={(val) => handleQuestionChange({ target: { name: 'solution', value: val } })}
                                                            onPaste={(e) => handlePaste(e, 'solution')}
                                                            rows={4}
                                                            placeholder="Explain the concept, formulas, and steps used to derive the answer..."
                                                        />
                                                    </div>

                                                    {(currentQuestion.solutionImages || []).length > 0 && (
                                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                                                            {(currentQuestion.solutionImages || []).map((img, idx) => (
                                                                <div key={idx} className="relative group rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-white aspect-video flex items-center justify-center p-1">
                                                                    <img src={img} alt={`Sol ${idx}`} className="w-full h-full object-contain rounded-lg" />
                                                                    <button onClick={() => { const newImages = currentQuestion.solutionImages.filter((_, i) => i !== idx); setCurrentQuestion({ ...currentQuestion, solutionImages: newImages }); }} className="absolute m-1 top-0 right-0 bg-rose-500/90 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition shadow-lg hover:bg-rose-600"><Trash size={12} /></button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </details>
                                        </div>

                                        {/* Action Button */}
                                        <div className="pt-4 border-t border-slate-100">
                                            <button onClick={addQuestion} className="w-full group relative overflow-hidden bg-gradient-to-br from-indigo-500 to-violet-600 text-white py-4 rounded-2xl shadow-xl shadow-indigo-500/20 transition-all hover:shadow-indigo-500/40 hover:-translate-y-1 active:scale-95 active:translate-y-0">
                                                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out"></div>
                                                <div className="relative flex justify-center items-center font-black text-base tracking-wide">
                                                    <Plus size={20} className="mr-2" /> Append to Queue
                                                </div>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right Column: Queue Inspector — slim sidebar */}
                            <div className="xl:col-span-3 2xl:col-span-3 flex flex-col h-full max-h-[calc(100vh-12rem)] sticky top-6">
                                <div className="bg-slate-900 rounded-3xl shadow-xl overflow-hidden flex flex-col h-full border border-slate-800">

                                    {/* Queue Header */}
                                    <div className="relative overflow-hidden px-8 py-6 bg-slate-900 border-b border-slate-800 flex justify-between items-center z-10 shrink-0">
                                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-violet-500/10 pointer-events-none"></div>
                                        <div className="flex items-center gap-4 relative z-10">
                                            <div className="bg-white/10 text-white p-2.5 rounded-xl backdrop-blur-md border border-white/5"><List size={18} className="text-indigo-300" /></div>
                                            <div>
                                                <h3 className="text-white font-black text-lg tracking-tight flex items-center gap-2">
                                                    Draft Queue
                                                    <span className="bg-indigo-500 text-white text-xs px-2.5 py-0.5 rounded-full font-bold shadow-sm">{questions.length}</span>
                                                </h3>
                                                <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest mt-0.5">Ready for publication</p>
                                                {isUpdatingExisting && (
                                                    <p className="text-[10px] font-bold text-emerald-400 mt-1 flex items-center gap-1">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block"></span>
                                                        Appending to existing test — {questions.length} questions loaded
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex gap-2 relative z-10">
                                            <button onClick={() => setShowMergeModal(true)} className="p-2.5 bg-white/5 text-slate-300 rounded-xl hover:bg-white/10 hover:text-white transition-colors border border-white/5" title="Merge Tests"><Combine size={18} /></button>
                                            <button onClick={() => setShowQuickMarkModal(true)} className="p-2.5 bg-white/5 text-emerald-400 rounded-xl hover:bg-emerald-500/20 hover:text-emerald-300 transition-colors border border-white/5" title="Quick Mark Answers"><CheckCircle size={18} /></button>
                                            {questions.length > 0 && (
                                                <button onClick={handleExportQueue} className="p-2.5 bg-white/5 text-blue-400 rounded-xl hover:bg-blue-500/20 hover:text-blue-300 transition-colors border border-white/5" title="Export CSV"><Download size={18} /></button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Queue List */}
                                    <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-slate-900/50">
                                        {questions.length === 0 ? (
                                            <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4 opacity-60">
                                                <div className="w-20 h-20 rounded-full border-2 border-dashed border-slate-700 flex items-center justify-center bg-slate-800/50 mb-2">
                                                    <List size={32} className="text-slate-600" />
                                                </div>
                                                <p className="font-bold text-sm">Queue is empty</p>
                                                <p className="text-xs text-center max-w-[200px]">Questions you add will appear here for review before publishing.</p>
                                            </div>
                                        ) : (
                                            questions.map((q, idx) => (
                                                <div key={q._id ? `${q._id}_${idx}` : idx} className="group relative bg-slate-800 border border-slate-700 rounded-2xl p-5 hover:border-indigo-500/50 transition-all shadow-sm hover:shadow-lg hover:shadow-indigo-500/10">
                                                    <div className="absolute -top-3 -right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                                        <button onClick={() => moveQuestion(idx, 'up')} disabled={idx === 0} className="bg-slate-600 text-white p-2 rounded-xl shadow-lg hover:bg-slate-500 transition-transform hover:-translate-y-0.5 disabled:opacity-30" title="Move Up">▲</button>
                                                        <button onClick={() => moveQuestion(idx, 'down')} disabled={idx === questions.length - 1} className="bg-slate-600 text-white p-2 rounded-xl shadow-lg hover:bg-slate-500 transition-transform hover:-translate-y-0.5 disabled:opacity-30" title="Move Down">▼</button>
                                                        <button onClick={() => { setCurrentQuestion({ ...q }); removeQuestion(idx); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="bg-indigo-500 text-white p-2 rounded-xl shadow-lg hover:bg-indigo-600 transition-transform hover:-translate-y-0.5"><Edit3 size={14} /></button>
                                                        <button onClick={() => removeQuestion(idx)} className="bg-rose-500 text-white p-2 rounded-xl shadow-lg hover:bg-rose-600 transition-transform hover:-translate-y-0.5"><Trash size={14} /></button>
                                                    </div>

                                                    <div className="flex items-center justify-between mb-3 border-b border-slate-700/50 pb-3">
                                                        <div className="flex items-center gap-2">
                                                            <span className="px-2 py-1 bg-slate-700 text-slate-300 text-[9px] font-black tracking-widest uppercase rounded-md border border-slate-600">Q{idx + 1}</span>
                                                            <span className={`px-2 py-1 text-[9px] font-black tracking-widest uppercase rounded-md border ${q.type === 'mcq' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : q.type === 'msq' ? 'bg-purple-500/10 border-purple-500/20 text-purple-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}`}>{q.type}</span>
                                                            {q.section && <span className="px-2 py-1 text-[9px] font-black tracking-widest uppercase rounded-md border bg-amber-500/10 border-amber-500/20 text-amber-400">{q.section}</span>}
                                                        </div>
                                                        <div className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5 bg-slate-900 px-2 py-1 rounded-md border border-slate-800">
                                                            <span className="text-emerald-400">+{q.marks}</span> / <span className="text-rose-400">-{q.negativeMarks}</span>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-3">
                                                        <div className="text-sm font-medium text-slate-200 line-clamp-3 leading-relaxed">
                                                            <MathText text={q.text || 'No question text...'} />
                                                        </div>

                                                        {q.image && (
                                                            <div className="inline-block relative rounded-lg overflow-hidden border border-slate-700 bg-slate-900 p-1 cursor-zoom-in group/img" onClick={() => setZoomedImg(q.image)}>
                                                                <img src={q.image} alt="Thumb" className="h-16 w-auto object-contain rounded opacity-80 group-hover/img:opacity-100 transition-opacity" />
                                                                <div className="absolute inset-0 bg-indigo-500/20 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm"><Eye size={16} className="text-white" /></div>
                                                            </div>
                                                        )}

                                                        {/* Missing Answer Warning */}
                                                        {((q.type === 'mcq' && !q.correctOption) || (q.type === 'msq' && (!q.correctOptions || q.correctOptions.length === 0)) || (q.type === 'integer' && (q.integerAnswer === undefined || q.integerAnswer === ''))) && (
                                                            <div className="mt-3 flex items-start gap-2 text-[10px] font-bold text-rose-400 bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/20">
                                                                <AlertTriangle size={14} className="shrink-0 mt-0.5 hidden" />
                                                                <span><AlertCircle size={12} className="inline mr-1 mb-0.5" />Missing Answer Key</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>

                                    {/* Action Footer */}
                                    <div className="p-6 bg-slate-900 border-t border-slate-800 shrink-0 relative z-20 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
                                        <button
                                            onClick={handleSubmitTest}
                                            disabled={loading || questions.length === 0}
                                            className={`w-full relative group overflow-hidden py-4 rounded-2xl font-black text-white transition-all transform hover:-translate-y-1 active:scale-95 active:translate-y-0 flex items-center justify-center gap-3 ${loading || questions.length === 0 ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700' : isUpdatingExisting ? 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-xl shadow-emerald-500/20 hover:shadow-emerald-500/40' : 'bg-gradient-to-br from-indigo-500 to-blue-600 shadow-xl shadow-indigo-500/20 hover:shadow-indigo-500/40'}`}
                                        >
                                            {!(loading || questions.length === 0) && <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out"></div>}
                                            <div className="relative flex items-center gap-2">
                                                {loading ? (
                                                    <><Loader2 className="animate-spin text-indigo-400" size={20} /> <span className="text-slate-300">Processing...</span></>
                                                ) : (
                                                    <><Save size={20} /> {user?.adminLevel === 3 ? 'SAVE AS DRAFT' : (isUpdatingExisting ? 'SAVE CHANGES' : 'PUBLISH ASSESSMENT')}</>
                                                )}
                                            </div>
                                        </button>

                                        {!isUpdatingExisting && questions.length > 0 && (
                                            <p className="text-center text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-4">
                                                {questions.length} question{questions.length !== 1 ? 's' : ''} ready for deployment
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Edit Series Modal */}
            {
                editingSeries && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
                        <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-bold">Edit Series: {editingSeries.title}</h3>
                                <button onClick={() => setEditingSeries(null)}><X size={24} /></button>
                            </div>
                            <CreateSeriesForm
                                initialData={editingSeries}
                                onSuccess={() => {
                                    setEditingSeries(null);
                                    fetchSeries();
                                }}
                            />
                        </div>
                    </div>
                )
            }

            {/* Edit Test Modal */}
            {
                editingTest && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
                        <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold">Edit Test: {editingTest.title}</h3>
                                <button onClick={() => setEditingTest(null)}><X size={24} className="text-gray-500 hover:text-gray-800" /></button>
                            </div>
                            <form
                                onSubmit={async (e) => {
                                    e.preventDefault();

                                    // VALIDATION: We now allow saving partial tests (missing answers) to let admins save progress.
                                    if (editingTest.questions && Array.isArray(editingTest.questions)) {
                                        const missingAnswers = editingTest.questions.some(q =>
                                            (q.type === 'mcq' && !q.correctOption) ||
                                            (q.type === 'msq' && (!q.correctOptions || q.correctOptions.length === 0)) ||
                                            (q.type === 'integer' && (q.integerAnswer === undefined || q.integerAnswer === ''))
                                        );

                                        if (missingAnswers) {
                                            const confirmProceed = window.confirm("Some questions are missing answers! Save changes anyway?");
                                            if (!confirmProceed) return;
                                        }
                                    }

                                    try {
                                        const token = await user?.getIdToken();
                                        const res = await fetch(`${API_BASE_URL}/api/tests/${editingTest._id}`, {
                                            method: 'PUT',
                                            headers: {
                                                'Content-Type': 'application/json',
                                                'Authorization': `Bearer ${token}`
                                            },
                                            body: JSON.stringify(editingTest)
                                        });
                                        if (res.ok) {
                                            alert('Test updated successfully!');
                                            setEditingTest(null);
                                            fetchTests();
                                        } else {
                                            alert('Failed to update test');
                                        }
                                    } catch (error) {
                                        console.error('Update test error:', error);
                                        alert('Error updating test');
                                    }
                                }}
                                className="space-y-4"
                            >
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Test Title</label>
                                        <input
                                            type="text"
                                            value={editingTest.title || ''}
                                            onChange={(e) => setEditingTest({ ...editingTest, title: e.target.value })}
                                            className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Duration (Minutes)</label>
                                        <input
                                            type="number"
                                            value={editingTest.duration_minutes || editingTest.duration || ''}
                                            onChange={(e) => setEditingTest({ ...editingTest, duration: Number(e.target.value) })}
                                            className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Subject / Type</label>
                                        <input
                                            type="text"
                                            value={editingTest.subject || ''}
                                            onChange={(e) => setEditingTest({ ...editingTest, subject: e.target.value })}
                                            className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Category</label>
                                        <select
                                            value={editingTest.category || 'JEE Main'}
                                            onChange={(e) => setEditingTest({ ...editingTest, category: e.target.value })}
                                            className="mt-1 block w-full border border-gray-300 rounded-md p-2 bg-white"
                                        >
                                            <option value="JEE Main">JEE Main</option>
                                            <option value="JEE Advanced">JEE Advanced</option>
                                            <option value="NEET">NEET</option>
                                            <option value="CAT">CAT</option>
                                            <option value="Board Exam">Board Exam</option>
                                            <option value="Others">Others</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Total Marks</label>
                                        <input
                                            type="number"
                                            value={editingTest.total_marks || editingTest.totalMarks || ''}
                                            onChange={(e) => setEditingTest({ ...editingTest, totalMarks: Number(e.target.value) })}
                                            className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Max Attempts</label>
                                        <input
                                            type="number"
                                            value={editingTest.maxAttempts === null || editingTest.maxAttempts === undefined ? '' : editingTest.maxAttempts}
                                            onChange={(e) => setEditingTest({ ...editingTest, maxAttempts: e.target.value })}
                                            className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                                            placeholder="Leave empty for unlimited"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Result Visibility</label>
                                        <select
                                            value={editingTest.resultVisibility || 'immediate'}
                                            onChange={(e) => setEditingTest({ ...editingTest, resultVisibility: e.target.value })}
                                            className="mt-1 block w-full border border-gray-300 rounded-md p-2 bg-white"
                                        >
                                            <option value="immediate">Immediate (After Submit)</option>
                                            <option value="scheduled">Scheduled Time</option>
                                            <option value="afterTestEnds">After Test Ends</option>
                                        </select>
                                    </div>
                                    {editingTest.resultVisibility === 'scheduled' && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Result Time</label>
                                            <input
                                                type="datetime-local"
                                                value={editingTest.resultDeclarationTime ? new Date(new Date(editingTest.resultDeclarationTime).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''}
                                                onChange={(e) => setEditingTest({ ...editingTest, resultDeclarationTime: new Date(e.target.value).toISOString() })}
                                                className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                                            />
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Instructions</label>
                                    <textarea
                                        value={editingTest.instructions || ''}
                                        onChange={(e) => setEditingTest({ ...editingTest, instructions: e.target.value })}
                                        className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                                        rows="4"
                                    ></textarea>
                                </div>

                                {/* Section Attempt Limits */}
                                {(() => {
                                    const pairs = [];
                                    const seen = new Set();
                                    (editingTest.questions || []).forEach(q => {
                                        const sub = q.subject || 'General';
                                        const sec = q.section || '';
                                        if (sec) {
                                            const key = `${sub}|||${sec}`;
                                            if (!seen.has(key)) { seen.add(key); pairs.push({ subject: sub, section: sec }); }
                                        }
                                    });
                                    if (pairs.length === 0) return (
                                        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 font-medium">
                                            No sections found. Use the Mark &amp; Edit Editor to set sections on individual questions.
                                        </p>
                                    );
                                    return (
                                        <div>
                                            <label className="block text-sm font-bold text-amber-700 mb-2">
                                                Section Attempt Limits
                                                <span className="font-normal text-gray-400 text-xs ml-2">(blank = all required)</span>
                                            </label>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                {pairs.map(({ subject, section }) => {
                                                    const meta = (editingTest.sectionMeta || []).find(m => m.subject === subject && m.section === section);
                                                    const totalInSection = (editingTest.questions || []).filter(q => (q.subject || 'General') === subject && (q.section || '') === section).length;
                                                    return (
                                                        <div key={`${subject}|||${section}`} className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                                                            <div className="flex-1 text-xs font-bold text-amber-900 truncate">{subject} › {section} <span className="font-normal text-amber-600">({totalInSection}q)</span></div>
                                                            <span className="text-[10px] text-gray-500 font-bold">Any</span>
                                                            <input
                                                                type="number"
                                                                min="1"
                                                                max={totalInSection}
                                                                value={meta?.requiredAttempts ?? ''}
                                                                onChange={(e) => {
                                                                    const val = e.target.value === '' ? null : Math.min(totalInSection, Math.max(1, parseInt(e.target.value) || 1));
                                                                    setEditingTest(prev => {
                                                                        const existing = (prev.sectionMeta || []).filter(m => !(m.subject === subject && m.section === section));
                                                                        return { ...prev, sectionMeta: val !== null ? [...existing, { subject, section, requiredAttempts: val }] : existing };
                                                                    });
                                                                }}
                                                                placeholder={String(totalInSection)}
                                                                className="w-12 text-center border border-amber-300 rounded px-1 py-1 text-sm font-bold bg-white outline-none focus:ring-2 focus:ring-amber-400"
                                                            />
                                                            <span className="text-[10px] text-gray-500 font-bold">of {totalInSection}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })()}

                                <div className="flex justify-end gap-3 pt-4 border-t">
                                    <button type="button" onClick={() => setEditingTest(null)} className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50">Cancel</button>
                                    <button type="submit" className="px-4 py-2 bg-blue-600 text-white font-bold rounded-md hover:bg-blue-700">Save Changes</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Global Image Zoom Modal */}
            {zoomedImg && <ImageZoomModal imageUrl={zoomedImg} onClose={() => setZoomedImg(null)} />}

            {/* Split Test Modal */}
            {previewingTest && <TestPreviewModal test={previewingTest} onClose={() => setPreviewingTest(null)} />}
            {
                splittingTest && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
                        <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-2xl">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-bold text-gray-800">Split by Subject</h3>
                                <button onClick={() => setSplittingTest(null)}><X size={24} className="text-gray-400 hover:text-gray-600" /></button>
                            </div>

                            <p className="text-sm text-gray-600 mb-6 font-medium">
                                Detected subjects in <strong>{splittingTest.title}</strong>.
                                Select which subjects to extract into new independent tests:
                            </p>

                            <div className="space-y-3 mb-6">
                                {Array.from(new Set((splittingTest.questions || []).map(q => q.subject || 'Uncategorized'))).map(sub => (
                                    <div key={sub} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                                        <div className="flex-1">
                                            <span className="font-bold text-gray-700">{sub}</span>
                                            <div className="text-[10px] text-gray-400 font-bold uppercase">
                                                {splittingTest.questions.filter(q => (q.subject || 'Uncategorized') === sub).length} Questions
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => {
                                                const extractedQuestions = splittingTest.questions
                                                    .filter(q => (q.subject || 'Uncategorized') === sub)
                                                    .map(q => ({ ...q, _id: undefined })); // Strip IDs for new test
                                                setQuestions(extractedQuestions);
                                                setTestDetails({
                                                    ...splittingTest,
                                                    _id: undefined,
                                                    id: undefined,
                                                    title: splittingTest.title,
                                                    category: splittingTest.category,
                                                    subject: sub,
                                                    duration: splittingTest.duration,
                                                    difficulty: splittingTest.difficulty || 'medium',
                                                    instructions: splittingTest.instructions || '',
                                                    calculator: splittingTest.calculator || false,
                                                    visibility: 'private',
                                                    totalMarks: extractedQuestions.reduce((acc, q) => acc + Number(q.marks), 0)
                                                });
                                                setActiveTab('create');
                                                setSplittingTest(null);
                                                window.scrollTo({ top: 0, behavior: 'smooth' });
                                            }}
                                            className="bg-indigo-600 text-white px-3 py-1 rounded text-xs font-bold hover:bg-indigo-700 transition"
                                        >
                                            Extract & Edit
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <div className="flex justify-between items-center pt-4 border-t">
                                <button
                                    onClick={() => {
                                        setQuestions(splittingTest.questions);
                                        setTestDetails({
                                            ...splittingTest,
                                            _id: undefined,
                                            id: undefined,
                                            title: splittingTest.title,
                                            category: splittingTest.category,
                                            duration: splittingTest.duration,
                                            difficulty: splittingTest.difficulty || 'medium',
                                            instructions: splittingTest.instructions || '',
                                            calculator: splittingTest.calculator || false,
                                            visibility: 'private',
                                            totalMarks: splittingTest.questions.reduce((acc, q) => acc + Number(q.marks), 0)
                                        });
                                        setActiveTab('create');
                                        setSplittingTest(null);
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }}
                                    className="text-xs text-indigo-600 font-bold hover:underline"
                                >
                                    Edit Full Test Instead
                                </button>
                                <button onClick={() => setSplittingTest(null)} className="text-gray-500 text-sm font-bold">Cancel</button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Merge Tests Modal */}
            {
                showMergeModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
                        <div className="bg-white rounded-lg p-6 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-gray-800">Merge Existing Tests</h3>
                                <button onClick={() => setShowMergeModal(false)}><X size={24} className="text-gray-400 hover:text-gray-600" /></button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">New Test Title</label>
                                        <input
                                            type="text"
                                            id="mergeTitle"
                                            className="w-full border rounded-lg p-2 text-sm"
                                            placeholder="e.g. Combined JEE Mock Test"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-1">Duration (Min)</label>
                                            <input
                                                type="number"
                                                id="mergeDuration"
                                                className="w-full border rounded-lg p-2 text-sm"
                                                defaultValue="180"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-1">Category</label>
                                            <select id="mergeCategory" className="w-full border rounded-lg p-2 text-sm bg-white">
                                                <option value="JEE Main">JEE Main</option>
                                                <option value="JEE Advanced">JEE Advanced</option>
                                                <option value="NEET">NEET</option>
                                                <option value="Others">Others</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Select Tests to Merge</label>
                                    <div className="border rounded-lg max-h-[200px] overflow-y-auto p-2 space-y-1 bg-gray-50">
                                        {tests.map(t => (
                                            <label key={t._id} className="flex items-center gap-3 p-2 hover:bg-white rounded border border-transparent hover:border-gray-200 cursor-pointer transition">
                                                <input type="checkbox" name="mergeTestSelect" value={t._id} className="w-4 h-4 rounded text-indigo-600" />
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-sm font-bold text-gray-800 truncate">{t.title}</div>
                                                    <div className="text-[10px] text-gray-400 font-bold uppercase">{t.category} • {t.questionCount || 0} Qs</div>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-6">
                                <div className="flex gap-3">
                                    <div className="bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold mt-0.5">!</div>
                                    <p className="text-xs text-blue-800 leading-relaxed font-medium">
                                        <strong>Grouping & Shuffling Logic:</strong> Questions from all selected tests will be combined.
                                        Subject groups will be maintained, but questions <strong>within each subject</strong> will be shuffled.
                                    </p>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t">
                                <button onClick={() => setShowMergeModal(false)} className="px-6 py-2 text-gray-500 font-bold hover:bg-gray-50 rounded-lg transition">Cancel</button>
                                <button
                                    onClick={async () => {
                                        const selectedIds = Array.from(document.querySelectorAll('input[name="mergeTestSelect"]:checked')).map(el => el.value);
                                        const title = document.getElementById('mergeTitle').value;
                                        const duration = document.getElementById('mergeDuration').value;
                                        const category = document.getElementById('mergeCategory').value;

                                        if (selectedIds.length < 1) return alert("Select at least one test");
                                        if (!title) return alert("Please enter a title");

                                        setLoading(true);
                                        try {
                                            const token = await user?.getIdToken();
                                            const allFetchedQuestions = [];

                                            // Fetch questions for all selected tests
                                            for (const tid of selectedIds) {
                                                const res = await fetch(`${API_BASE_URL}/api/tests/${tid}`, {
                                                    headers: { 'Authorization': `Bearer ${token}` }
                                                });
                                                if (res.ok) {
                                                    const testData = await res.json();
                                                    if (testData.questions) {
                                                        // Strip IDs when merging into a new test to prevent collisions
                                                        const cleanQs = testData.questions.map(q => ({ ...q, _id: undefined }));
                                                        allFetchedQuestions.push(...cleanQs);
                                                    }
                                                } else {
                                                    const error = await res.json();
                                                    throw new Error(`Failed to fetch test ${tid}: ${error.message || res.statusText}`);
                                                }
                                            }

                                            if (allFetchedQuestions.length === 0) {
                                                alert("No questions found in selected tests.");
                                                return;
                                            }

                                            // Group and Load into Create form
                                            setQuestions(allFetchedQuestions);
                                            setTestDetails({
                                                ...testDetails,
                                                title: title,
                                                duration: Number(duration) || 180,
                                                category: category,
                                                totalMarks: allFetchedQuestions.reduce((acc, q) => acc + Number(q.marks), 0)
                                            });

                                            setShowMergeModal(false);
                                            setActiveTab('create');
                                            window.scrollTo({ top: 0, behavior: 'smooth' });

                                        } catch (e) {
                                            console.error("Merge logic error:", e);
                                            alert("Error preparing merge: " + (e.message || "Unknown error"));
                                        } finally {
                                            setLoading(false);
                                        }
                                    }}
                                    className="bg-indigo-600 text-white px-8 py-2 rounded-lg font-bold hover:bg-indigo-700 shadow-md transition"
                                >
                                    Merge & Customize
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Quick Marking Modal (Now Full Screen) */}
            {
                showQuickMarkModal && (
                    <div className="fixed inset-0 bg-white z-[70] flex flex-col overflow-hidden animate-in fade-in duration-200">
                        <div className="p-4 sm:p-6 border-b flex justify-between items-center bg-gray-50 shadow-sm shrink-0">
                            <div>
                                <h3 className="text-2xl font-black text-gray-800 flex items-center gap-3">
                                    <Edit2 className="text-blue-600" size={28} />
                                    Full-Page Test Editor & Marking Grid
                                </h3>
                                <p className="text-sm text-gray-500 font-bold mt-1">Edit questions, change types, and mark answers all in one place.</p>
                            </div>
                            <button onClick={() => setShowQuickMarkModal(false)} className="p-3 bg-white border shadow-sm hover:bg-red-50 hover:text-red-600 hover:border-red-200 rounded-xl transition-all text-gray-400 flex items-center gap-2 font-bold">
                                <X size={20} /> Close Editor
                            </button>
                        </div>

                        <div className="flex-1 overflow-hidden flex flex-col sm:flex-row">
                            {/* Sequential Grid */}
                            <div className="flex-1 overflow-y-auto p-4 border-r bg-white">
                                <table className="w-full text-left border-collapse">
                                    <thead className="sticky top-0 bg-gray-100 z-10 shadow-sm">
                                        <tr>
                                            <th className="p-3 text-xs font-black uppercase text-gray-500 border w-[60px] text-center">#</th>
                                            <th className="p-3 text-xs font-black uppercase text-gray-500 border w-1/2">Question & Options</th>
                                            <th className="p-3 text-xs font-black uppercase text-gray-500 border w-[130px]">Subject / Section</th>
                                            <th className="p-3 text-xs font-black uppercase text-gray-500 border w-[120px]">Type</th>
                                            <th className="p-3 text-xs font-black uppercase text-gray-500 border w-[200px]">Answer</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {questions.map((q, idx) => (
                                            <tr key={q._id ? `${q._id}_${idx}` : idx} className="hover:bg-blue-50/30 transition-colors">
                                                <td className="p-3 border text-center bg-gray-50/50">
                                                    <div className="flex flex-col items-center gap-1">
                                                        <span className="font-black text-lg text-gray-700">{idx + 1}</span>
                                                        <div className="flex gap-1">
                                                            <button
                                                                onClick={() => {
                                                                    if (idx === 0) return;
                                                                    const newQs = [...questions];
                                                                    [newQs[idx - 1], newQs[idx]] = [newQs[idx], newQs[idx - 1]];
                                                                    setQuestions(newQs);
                                                                }}
                                                                disabled={idx === 0}
                                                                className="p-1 hover:bg-gray-200 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                                                            ><ChevronUp size={16} /></button>
                                                            <button
                                                                onClick={() => {
                                                                    if (idx === questions.length - 1) return;
                                                                    const newQs = [...questions];
                                                                    [newQs[idx + 1], newQs[idx]] = [newQs[idx], newQs[idx + 1]];
                                                                    setQuestions(newQs);
                                                                }}
                                                                disabled={idx === questions.length - 1}
                                                                className="p-1 hover:bg-gray-200 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                                                            ><ChevronDown size={16} /></button>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-3 border">
                                                    <div className="flex flex-col gap-3">
                                                        {/* Question Visual & Edit */}
                                                        <div className="flex flex-col gap-2 bg-gray-50 p-2 rounded border border-gray-200">
                                                            <div className="flex justify-between items-center">
                                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Question Content</span>
                                                                <label className="text-[10px] bg-white border px-2 py-0.5 rounded cursor-pointer hover:bg-gray-100 flex items-center gap-1">
                                                                    <Upload size={10} /> {q.image ? 'Change Img' : 'Upload Img'}
                                                                    <input type="file" className="hidden" onChange={(e) => {
                                                                        const file = e.target.files[0];
                                                                        if (file) uploadImage(file, 'grid-q', idx);
                                                                    }} />
                                                                </label>
                                                            </div>
                                                            <div className="flex gap-3 items-start">
                                                                {q.image && (
                                                                    <div className="relative group shrink-0">
                                                                        <img src={q.image} alt="Q" className="w-20 h-20 object-contain rounded border bg-white cursor-zoom-in hover:scale-105 transition-transform" onClick={() => setZoomedImg(q.image)} />
                                                                        <button onClick={() => { const newQs = [...questions]; newQs[idx].image = ''; setQuestions(newQs); }} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100"><X size={12} /></button>
                                                                    </div>
                                                                )}
                                                                <div className="flex flex-col gap-2 flex-1 min-w-0">
                                                                    {q.text && (
                                                                        <div className="text-xs leading-relaxed text-gray-700 bg-white p-2 border rounded max-h-[100px] overflow-y-auto shadow-sm">
                                                                            <MathText text={q.text} />
                                                                        </div>
                                                                    )}
                                                                    <textarea
                                                                        className="w-full text-xs p-2 border hover:border-indigo-300 focus:border-indigo-600 rounded bg-white focus:ring-2 focus:ring-indigo-100 transition-all outline-none resize-y min-h-[60px] font-mono shadow-inner"
                                                                        value={q.text || ''}
                                                                        placeholder="Type or paste question text (LaTeX supported)..."
                                                                        onChange={(e) => {
                                                                            const newQs = [...questions];
                                                                            newQs[idx].text = e.target.value;
                                                                            setQuestions(newQs);
                                                                        }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Option Visuals */}
                                                        {q.type !== 'integer' && (
                                                            <div className="flex flex-col gap-1 b border p-2 bg-white rounded">
                                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Options</span>
                                                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                                                                    {[0, 1, 2, 3].map((optIdx) => (
                                                                        <div key={optIdx} className="flex flex-col gap-2 border border-gray-200 p-2 rounded bg-white relative group/optbox shadow-sm hover:border-indigo-300 transition-colors">
                                                                            <span className="absolute -top-2 -left-2 bg-gray-900 text-white text-[10px] font-black px-2 py-0.5 rounded shadow-sm z-10">{String.fromCharCode(65 + optIdx)}</span>

                                                                            {/* Image Controls */}
                                                                            <div className="flex justify-end gap-2 px-1 absolute top-1 right-1 z-10">
                                                                                <label className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded cursor-pointer hover:bg-indigo-100 opacity-0 group-hover/optbox:opacity-100 transition-opacity">
                                                                                    {q.optionImages?.[optIdx] ? 'Swap Img' : '+ Img'}
                                                                                    <input type="file" className="hidden" onChange={(e) => {
                                                                                        const file = e.target.files[0];
                                                                                        if (file) uploadImage(file, 'grid-opt', { qIdx: idx, oIdx: optIdx });
                                                                                    }} />
                                                                                </label>
                                                                                {q.optionImages?.[optIdx] && (
                                                                                    <button onClick={() => { const newQs = [...questions]; newQs[idx].optionImages[optIdx] = ''; setQuestions(newQs); }} className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded hover:bg-red-100 opacity-0 group-hover/optbox:opacity-100 transition-opacity">Del Img</button>
                                                                                )}
                                                                            </div>

                                                                            <div className="flex gap-2 items-start mt-4">
                                                                                {q.optionImages?.[optIdx] && (
                                                                                    <img src={q.optionImages[optIdx]} alt={`O${optIdx}`} className="h-16 w-16 object-contain rounded border cursor-zoom-in shrink-0" onClick={() => setZoomedImg(q.optionImages[optIdx])} />
                                                                                )}
                                                                                <div className="flex flex-col gap-1 flex-1 min-w-0">
                                                                                    {q.options?.[optIdx] && (
                                                                                        <div className="text-[11px] leading-tight text-gray-700 bg-gray-50 p-1.5 rounded border border-gray-100 overflow-x-auto">
                                                                                            <MathText text={q.options[optIdx]} />
                                                                                        </div>
                                                                                    )}
                                                                                    <textarea
                                                                                        className="w-full text-[11px] p-1.5 border hover:border-indigo-300 focus:border-indigo-600 rounded bg-white outline-none resize-y min-h-[40px] font-mono"
                                                                                        placeholder="Option text..."
                                                                                        value={q.options?.[optIdx] || ''}
                                                                                        onChange={(e) => {
                                                                                            const newQs = [...questions];
                                                                                            if (!newQs[idx].options) newQs[idx].options = ['', '', '', ''];
                                                                                            newQs[idx].options[optIdx] = e.target.value;
                                                                                            setQuestions(newQs);
                                                                                        }}
                                                                                    />
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="p-3 border align-top pt-4">
                                                    <div className="flex flex-col gap-1.5">
                                                        <input
                                                            type="text"
                                                            placeholder="Subject"
                                                            className="w-full text-xs p-1.5 border rounded outline-none focus:border-indigo-400 bg-gray-50"
                                                            value={q.subject || ''}
                                                            onChange={(e) => { const newQs = [...questions]; newQs[idx].subject = e.target.value; setQuestions(newQs); }}
                                                        />
                                                        <input
                                                            type="text"
                                                            placeholder="Section (opt.)"
                                                            className="w-full text-xs p-1.5 border rounded outline-none focus:border-amber-400 bg-amber-50"
                                                            value={q.section || ''}
                                                            onChange={(e) => { const newQs = [...questions]; newQs[idx].section = e.target.value; setQuestions(newQs); }}
                                                        />
                                                    </div>
                                                </td>
                                                <td className="p-3 border text-center align-top pt-4">
                                                    <select
                                                        className={`w-full text-xs font-bold p-1.5 rounded outline-none border cursor-pointer ${q.type === 'integer' ? 'bg-amber-50 border-amber-200 text-amber-700' : q.type === 'msq' ? 'bg-purple-50 border-purple-200 text-purple-700' : 'bg-blue-50 border-blue-200 text-blue-700'}`}
                                                        value={q.type}
                                                        onChange={(e) => {
                                                            const newQs = [...questions];
                                                            newQs[idx].type = e.target.value;
                                                            // Reset answers on type change to prevent invalid states
                                                            newQs[idx].correctOption = '';
                                                            newQs[idx].correctOptions = [];
                                                            newQs[idx].integerAnswer = '';
                                                            setQuestions(newQs);
                                                        }}
                                                    >
                                                        <option value="mcq">MCQ</option>
                                                        <option value="msq">MSQ</option>
                                                        <option value="integer">INTEGER</option>
                                                    </select>
                                                </td>
                                                <td className="p-3 border align-top pt-4">
                                                    {q.type === 'integer' ? (
                                                        <input
                                                            type="text"
                                                            placeholder="Inter value..."
                                                            className="w-full p-1.5 text-sm border-2 border-gray-200 rounded focus:border-blue-500 outline-none font-bold"
                                                            value={q.integerAnswer || ''}
                                                            onChange={(e) => {
                                                                const newQs = [...questions];
                                                                newQs[idx].integerAnswer = e.target.value;
                                                                setQuestions(newQs);
                                                            }}
                                                        />
                                                    ) : q.type === 'msq' ? (
                                                        <div className="flex gap-1">
                                                            {['A', 'B', 'C', 'D'].map(opt => {
                                                                const isSelected = (q.correctOptions || []).includes(opt);
                                                                return (
                                                                    <button
                                                                        key={opt}
                                                                        onClick={() => {
                                                                            const newQs = [...questions];
                                                                            const currentOpts = q.correctOptions || [];
                                                                            newQs[idx].correctOptions = isSelected
                                                                                ? currentOpts.filter(o => o !== opt)
                                                                                : [...currentOpts, opt].sort();
                                                                            setQuestions(newQs);
                                                                        }}
                                                                        className={`w-8 h-8 rounded font-black text-xs border-2 transition-all ${isSelected ? 'bg-purple-600 border-purple-600 text-white shadow-md scale-110' : 'bg-white border-gray-200 text-gray-400 hover:border-purple-300'}`}
                                                                    >
                                                                        {opt}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    ) : (
                                                        <div className="flex gap-1">
                                                            {['A', 'B', 'C', 'D'].map(opt => (
                                                                <button
                                                                    key={opt}
                                                                    onClick={() => {
                                                                        const newQs = [...questions];
                                                                        newQs[idx].correctOption = opt;
                                                                        setQuestions(newQs);
                                                                    }}
                                                                    className={`w-8 h-8 rounded font-black text-xs border-2 transition-all ${q.correctOption === opt ? 'bg-blue-600 border-blue-600 text-white shadow-md scale-110' : 'bg-white border-gray-200 text-gray-400 hover:border-blue-300'}`}
                                                                >
                                                                    {opt}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Bulk Entry Side Panel */}
                            <div className="w-full sm:w-72 bg-gray-50 p-6 flex flex-col gap-4 border-t sm:border-t-0">
                                <div className="space-y-1">
                                    <h4 className="text-sm font-black text-gray-800 uppercase tracking-tighter flex items-center gap-2">
                                        <Zap size={16} className="text-yellow-500 fill-yellow-500" /> Bulk String Entry
                                    </h4>
                                    <span className="text-[10px] text-gray-500 leading-tight block">Paste your answer key here and we'll parse it.</span>
                                </div>
                                <textarea
                                    className="flex-1 p-3 text-sm font-mono border-2 border-gray-200 rounded-xl focus:border-indigo-500 outline-none shadow-inner resize-none min-h-[150px]"
                                    placeholder="Examples:&#10;1A 2B 3C&#10;1.D 2.A&#10;1:B 2:D"
                                    value={quickMarkInput || ''}
                                    onChange={(e) => setQuickMarkInput(e.target.value)}
                                />
                                <button
                                    onClick={() => {
                                        if (!quickMarkInput.trim()) return;
                                        const newQs = [...questions];
                                        // Robust pattern matching for Number + Answer (A/B/C/D)
                                        const pairs = quickMarkInput.match(/(\d+)[.\s:-]*([ABCD])/gi);
                                        if (pairs) {
                                            pairs.forEach(pair => {
                                                const match = pair.match(/(\d+)[.\s:-]*([ABCD])/i);
                                                if (match) {
                                                    const qNum = parseInt(match[1]);
                                                    const ans = match[2].toUpperCase();
                                                    if (qNum > 0 && qNum <= newQs.length) {
                                                        const qIdx = qNum - 1;
                                                        if (newQs[qIdx].type === 'mcq' || !newQs[qIdx].type) {
                                                            newQs[qIdx].correctOption = ans;
                                                        } else if (newQs[qIdx].type === 'msq') {
                                                            if (!(newQs[qIdx].correctOptions || []).includes(ans)) {
                                                                newQs[qIdx].correctOptions = [...(newQs[qIdx].correctOptions || []), ans];
                                                            }
                                                        }
                                                    }
                                                }
                                            });
                                            setQuestions(newQs);
                                            setQuickMarkInput('');
                                            alert("Bulk answers applied successfully!");
                                        } else {
                                            alert("No valid answer patterns found (e.g. 1A 2B)");
                                        }
                                    }}
                                    className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 shadow-md transition-all active:scale-95"
                                >
                                    Parse & Apply
                                </button>
                                <div className="mt-auto p-3 bg-white rounded-lg border border-indigo-100 border-dashed">
                                    <p className="text-[10px] text-indigo-700 font-bold uppercase italic text-center">Changes are synced to draft. Remember to click "Update Test" to save permanently.</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-gray-100 border-t flex justify-end gap-3">
                            <button
                                onClick={() => {
                                    if (confirm("Are you sure you want to clear ALL answers in the current draft?")) {
                                        const newQs = questions.map(q => ({
                                            ...q,
                                            correctOption: '',
                                            correctOptions: [],
                                            integerAnswer: ''
                                        }));
                                        setQuestions(newQs);
                                    }
                                }}
                                className="text-red-600 font-bold px-4 py-2 hover:bg-red-50 rounded-lg transition"
                            >
                                Clear All Draft Answers
                            </button>
                            <button
                                onClick={async () => {
                                    const res = await handleSubmitTest();
                                    if (res !== false) {
                                        setShowQuickMarkModal(false);
                                    }
                                }}
                                className="bg-emerald-600 text-white px-8 py-2 rounded-lg font-black hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition flex items-center gap-2"
                            >
                                <Save size={18} /> SAVE & SYNC TO DB
                            </button>
                            <button
                                onClick={() => setShowQuickMarkModal(false)}
                                className="bg-slate-800 text-white px-8 py-2 rounded-lg font-black hover:bg-slate-900 shadow-lg shadow-slate-200 transition"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
