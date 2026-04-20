'use client';
import { useState, useEffect, useRef, useMemo } from 'react';
import { 
    X, Send, Brain, Loader2, Trash2, Plus, Sparkles, 
    Layout, CheckCircle2, FileText, Settings, 
    Save, ChevronRight, ChevronLeft, Layers, 
    Hash, MinusCircle, Database,
    Edit3, Image as ImageIcon, Zap, Merge, Sparkle,
    Command, ListChecks, ArrowUpCircle, ArrowDownCircle, MousePointer2,
    Calendar, Clock, AlignLeft, ShieldCheck, Check,
    Eye, Info, Activity, Wand2, Target, Type as TypeIcon, AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../lib/config';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { storage } from '../../lib/firebase';
import RichMathEditor from './RichMathEditor';
import LiveEditableField from './LiveEditableField';
import PdfViewer from './PdfViewer';
import MathText from '@/components/ui/MathText';
import 'katex/dist/katex.min.css';

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

/**
 * APEX MOCK AI Workbench
 * A high-fidelity, light-themed digitization environment.
 */
const GeminiPdfUploadModal = ({ onUpload, onClose, allSeries = [] }) => {
    const { user } = useAuth();
    const editorScrollRef = useRef(null);
    const [testMeta, setTestMeta] = useState({ title: '', duration: 180, category: 'JEE Main', difficulty: 'Medium', subject: 'General', seriesId: '', instructions: '' });
    const [pdfFile, setPdfFile] = useState(null);
    const [extractedQuestions, setExtractedQuestions] = useState([]);
    const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
    const [isScanning, setIsScanning] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);
    const [scanStatus, setScanStatus] = useState('');
    const [scanError, setScanError] = useState('');
    const [showMeta, setShowMeta] = useState(false);
    const [showCommandCentre, setShowCommandCentre] = useState(false);
    const [extractDiagrams, setExtractDiagrams] = useState(true);

    // ✅ BODY SCROLL LOCK: Freeze background when Apex Workbench is active
    useEffect(() => {
        const originalStyle = window.getComputedStyle(document.body).overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = originalStyle; };
    }, []);

    const activeQ = useMemo(() => {
        if (activeQuestionIndex < 0 || activeQuestionIndex >= extractedQuestions.length) return null;
        return extractedQuestions[activeQuestionIndex];
    }, [extractedQuestions, activeQuestionIndex]);

    const updateActiveQuestion = (field, value) => {
        setExtractedQuestions(prev => {
            const next = [...prev];
            if (activeQuestionIndex < 0 || activeQuestionIndex >= next.length) return prev;
            next[activeQuestionIndex] = { ...next[activeQuestionIndex], [field]: value };
            return next;
        });
    };

    const handleOptionImageUpdate = (data, idx) => {
        setExtractedQuestions(prev => {
            const next = [...prev];
            if (activeQuestionIndex < 0 || activeQuestionIndex >= next.length) return prev;
            const q = { ...next[activeQuestionIndex] };
            const imgs = [...(q.optionImages || ['', '', '', ''])];
            imgs[idx] = data;
            next[activeQuestionIndex] = { ...q, optionImages: imgs };
            return next;
        });
    };



    const handleDeleteQuestion = (idx) => {
        setExtractedQuestions(prev => {
            const next = prev.filter((_, i) => i !== idx);
            if (activeQuestionIndex === idx) {
                setActiveQuestionIndex(Math.min(idx, next.length - 1));
            } else if (activeQuestionIndex > idx) {
                setActiveQuestionIndex(activeQuestionIndex - 1);
            }
            return next;
        });
    };

    const handleMergeQuestions = (sourceIdx, targetIdx) => {
        setExtractedQuestions(prev => {
            const next = [...prev];
            const source = next[sourceIdx];
            const target = { ...next[targetIdx] };

            // Core Concatenation Logic
            target.text = (target.text + "\n" + (source.text || "")).trim();
            target.solution = (target.solution + "\n" + (source.solution || "")).trim();
            
            // Transfer missing image
            if (!target.image && source.image) target.image = source.image;
            if (!target.solutionImage && source.solutionImage) target.solutionImage = source.solutionImage;
            
            // Transfer metadata if missing
            if (!target.subject && source.subject) target.subject = source.subject;
            if (!target.section && source.section) target.section = source.section;

            // Simple option merge if target is empty
            if ((!target.options || target.options.every(o => !o)) && source.options) {
                target.options = source.options;
                if (source.optionImages) target.optionImages = source.optionImages;
            }

            next[targetIdx] = target;
            next.splice(sourceIdx, 1);

            // Correct active index
            if (activeQuestionIndex === sourceIdx) setActiveQuestionIndex(targetIdx > sourceIdx ? targetIdx - 1 : targetIdx);
            else if (activeQuestionIndex > sourceIdx) setActiveQuestionIndex(activeQuestionIndex - 1);

            return next;
        });
    };

    const handleBulkAction = (action, payload) => {
        setExtractedQuestions(prev => prev.map(q => {
            if (action === 'setMarks') return { ...q, marks: payload };
            if (action === 'setNegMarks') return { ...q, negativeMarks: payload };
            if (action === 'setSubject') return { ...q, subject: payload };
            if (action === 'setSection') return { ...q, section: payload };
            if (action === 'stageAll') return { ...q, isStaged: true };
            if (action === 'unstageAll') return { ...q, isStaged: false };
            if (action === 'clearAllImages') return { ...q, image: null, optionImages: ['', '', '', ''], solutionImage: null };
            return q;
        }));
        setShowCommandCentre(false);
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.type !== 'application/pdf') {
            alert('Please upload a PDF file only.');
            return;
        }

        setScanError('');
        setScanStatus('');
        setPdfFile(file);
    };

    const handleScan = async (base64Image = null, isSelection = false, scanMode = 'full') => {
        if (!base64Image && !pdfFile) {
            setScanError('Please select a PDF file first.');
            return;
        }

        setIsScanning(true);
        setScanError('');
        setScanStatus(isSelection ? (scanMode === 'full' ? 'Digitizing Selection...' : `Targeted Scan: ${scanMode}`) : 'Surgical Page OCR...');

        try {
            const token = await user.getIdToken();

            const formData = new FormData();
            if (base64Image) {
                formData.append('base64Image', base64Image);
                formData.append('isSelection', isSelection.toString());
                formData.append('scanMode', scanMode);
            } else {
                formData.append('pdf', pdfFile);
            }
            formData.append('isImageDirect', !!base64Image ? 'true' : 'false');
            formData.append('extractDiagrams', extractDiagrams ? 'true' : 'false');

            const res = await fetch(`${API_BASE_URL}/api/admin/tests/parse-pdf-gemini`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (!res.ok) {
                const text = await res.text();
                throw new Error(`Scan server error ${res.status}: ${text.slice(0, 700)}`);
            }

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let accumulated = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                accumulated += chunk;
                const lines = accumulated.split('\n');
                accumulated = lines.pop();

                for (const line of lines) {
                    if (!line.trim()) continue;

                    let payload = line.trim();
                    if (payload.startsWith('data:')) {
                        payload = payload.replace(/^data:\s*/, '');
                    }

                    if (!payload.startsWith('{')) continue;

                    try {
                        const data = JSON.parse(payload);

                        if (data.status) {
                            const message = data.message || data.status;
                            setScanStatus(message);
                            if (data.status === 'error' || data.status === 'fatal_error') {
                                setScanError(message);
                            }
                        }

                        if (data.question) {
                            setExtractedQuestions(prev => {
                                // ─── TARGETED SCAN: Merge into active question ───
                                if (scanMode !== 'full') {
                                    if (prev.length === 0) {
                                        setScanError(`⚠️ Targeted scan (${scanMode}) requires at least one question in the queue. Add a question first.`);
                                        return prev;
                                    }
                                    const next = [...prev];
                                    const targetIdx = activeQuestionIndex >= 0 && activeQuestionIndex < next.length
                                        ? activeQuestionIndex
                                        : next.length - 1;
                                    const q = { ...next[targetIdx] };

                                    if (scanMode === 'text') {
                                        // Text-only scan: grab text field, fallback to solution
                                        const extracted = data.question.text || data.question.solution || '';
                                        if (extracted) {
                                            q.text = (q.text ? q.text + '\n' : '') + extracted;
                                            setScanStatus(`✅ Q-Text merged into Question ${targetIdx + 1}`);
                                        } else {
                                            setScanError('⚠️ No text content found in scan result. Try scanning the question text area again.');
                                        }
                                    } else if (scanMode === 'solution') {
                                        // Solution scan: Gemini sometimes puts solution in "solution", "text", or both
                                        const extracted = data.question.solution || data.question.text || '';
                                        if (extracted) {
                                            q.solution = (q.solution ? q.solution + '\n' : '') + extracted;
                                            setScanStatus(`✅ Solution merged into Question ${targetIdx + 1}`);
                                        } else {
                                            setScanError('⚠️ No solution content found in scan. Try again or manually type the solution.');
                                        }
                                    } else if (scanMode === 'options') {
                                        // Options scan: Grab from options array, or parse from text as fallback
                                        const newOpts = [...(q.options || ['', '', '', ''])];
                                        let merged = false;

                                        if (data.question.options && Array.isArray(data.question.options) && data.question.options.some(o => o)) {
                                            data.question.options.forEach((opt, i) => { if (opt) newOpts[i] = opt; });
                                            merged = true;
                                        } else if (data.question.text) {
                                            // Fallback: Gemini may have put options as "A) ... B) ... C) ... D) ..." in text
                                            const rawText = data.question.text;
                                            const aMatch = rawText.match(/(?:^|\n)\s*(?:\(A\)|A[).:])\s*(.+?)(?=\n\s*(?:\(B\)|B[).:])|$)/si);
                                            const bMatch = rawText.match(/\n\s*(?:\(B\)|B[).:])\s*(.+?)(?=\n\s*(?:\(C\)|C[).:])|$)/si);
                                            const cMatch = rawText.match(/\n\s*(?:\(C\)|C[).:])\s*(.+?)(?=\n\s*(?:\(D\)|D[).:])|$)/si);
                                            const dMatch = rawText.match(/\n\s*(?:\(D\)|D[).:])\s*(.+?)$/si);
                                            if (aMatch) { newOpts[0] = aMatch[1].trim(); merged = true; }
                                            if (bMatch) { newOpts[1] = bMatch[1].trim(); merged = true; }
                                            if (cMatch) { newOpts[2] = cMatch[1].trim(); merged = true; }
                                            if (dMatch) { newOpts[3] = dMatch[1].trim(); merged = true; }
                                        }

                                        if (merged) {
                                            q.options = newOpts;
                                            setScanStatus(`✅ Options merged into Question ${targetIdx + 1}`);
                                        } else {
                                            setScanError('⚠️ No options found in scan. Try again or type them manually.');
                                        }
                                    }

                                    next[targetIdx] = q;
                                    return next;
                                }

                                // ─── FULL SCAN: Add as new question ───
                                const prevQ = prev.length > 0 ? prev[prev.length - 1] : null;

                                const newQ = {
                                    ...data.question,
                                    qNumber: (prev.length + 1),
                                    marks: data.question.marks !== undefined ? data.question.marks : (prevQ?.marks ?? 4),
                                    negativeMarks: data.question.negativeMarks !== undefined ? data.question.negativeMarks : (prevQ?.negativeMarks ?? 1),
                                    type: data.question.type || (prevQ?.type ?? 'mcq'),
                                    subject: data.question.subject || (prevQ?.subject ?? testMeta.subject),
                                    section: data.question.section || (prevQ?.section ?? ''),
                                    isStaged: false
                                };
                                // Auto-focus first question of a new scan session
                                if (prev.length === 0) setActiveQuestionIndex(0);
                                return [...prev, newQ];
                            });
                        }
                    } catch (e) {
                        console.error('Parse Error:', e);
                    }
                }
            }
        } catch (error) {
            console.error('Scan Failed:', error);
            setScanError(error.message);
            setScanStatus('Scan failed. Check console and backend logs.');
        } finally {
            setIsScanning(false);
        }
    };
    
    const handleCropCapture = (data) => {
        if (!activeQ) return;
        updateActiveQuestion('image', data);
    };

    const handleSolutionCropCapture = (data) => {
        if (!activeQ) return;
        // Append to solutionImages array, initializing if needed
        setExtractedQuestions(prev => {
            const next = [...prev];
            const idx = activeQuestionIndex;
            if (idx < 0 || idx >= next.length) return prev;
            const q = { ...next[idx] };
            const imgs = q.solutionImages ? [...q.solutionImages] : [];
            imgs.push(data);
            q.solutionImages = imgs;
            next[idx] = q;
            return next;
        });
    };

    const handleOptionCropCapture = (data, idx) => {
        if (!activeQ) return;
        handleOptionImageUpdate(data, idx);
    };

    const handlePublish = async () => {
        const stagedQuestions = extractedQuestions.filter(q => q.isStaged);
        if (stagedQuestions.length === 0) return alert("Please stage at least one question into the Queue!");

        // Validation only for staged ones
        const invalidQ = stagedQuestions.findIndex((q) => {
            if (q.type === 'mcq' && !q.correctOption) return true;
            if (q.type === 'msq' && (!q.correctOptions || q.correctOptions.length === 0)) return true;
            if (q.type === 'integer' && (q.correctValue === undefined || q.correctValue === '')) return true;
            return false;
        });

        if (invalidQ !== -1) {
            const originalIndex = extractedQuestions.findIndex(q => q === stagedQuestions[invalidQ]);
            setActiveQuestionIndex(originalIndex);
            return alert(`Staged Question ${invalidQ + 1} is missing a correct answer key!`);
        }

        setIsPublishing(true);
        setScanStatus("Uploading images to Cloud Storage...");

        try {
            const finalQuestions = [];
            for (const q of stagedQuestions) {
                const updatedQ = { ...q };

                const uploadBase64 = async (b64) => {
                    if (!b64 || !b64.startsWith('data:image')) return b64;
                    const filename = `images/mock_tests/img_${Date.now()}_${Math.random().toString(36).substring(2,10)}`;
                    const imgRef = ref(storage, filename);
                    await uploadString(imgRef, b64, 'data_url');
                    return await getDownloadURL(imgRef);
                };

                if (updatedQ.image) updatedQ.image = await uploadBase64(updatedQ.image);
                if (updatedQ.solutionImage) updatedQ.solutionImage = await uploadBase64(updatedQ.solutionImage);
                if (updatedQ.solutionImages && updatedQ.solutionImages.length) {
                    updatedQ.solutionImages = await Promise.all(updatedQ.solutionImages.map(img => uploadBase64(img)));
                }
                if (updatedQ.optionImages) {
                    updatedQ.optionImages = await Promise.all(updatedQ.optionImages.map(img => uploadBase64(img)));
                }

                finalQuestions.push(updatedQ);
            }

            onUpload(finalQuestions);
            setIsPublishing(false);
            onClose();
        } catch (err) {
            console.error("Upload error:", err);
            alert("Failed to upload images. Check console.");
            setIsPublishing(false);
        }
    };

    return (
        <AnimatePresence>
            <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-[999] bg-slate-100/80 backdrop-blur-xl flex flex-col font-sans h-screen"
            >
                {/* --- APEX BRANDED HEADER --- */}
                <header className="h-16 bg-white border-b border-slate-200/60 flex items-center justify-between px-6 shrink-0 z-[110] shadow-sm">
                    <div className="flex items-center gap-4">
                        <img src="/logo.png" className="h-9 w-auto" alt="APEX MOCK Logo" />
                        <div className="h-6 w-[1.5px] bg-slate-200 rounded-full" />
                        <h1 className="text-lg font-black tracking-tight flex items-center gap-2">
                            <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">AI WORKBENCH</span>
                            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] rounded-full font-bold uppercase tracking-widest border border-indigo-100 shadow-sm animate-pulse">Pro Edition</span>
                        </h1>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setExtractDiagrams(!extractDiagrams)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition-all border shadow-sm ${extractDiagrams ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-slate-50 border-slate-200/60 text-slate-500 hover:bg-slate-100'}`}
                            title="Auto-reconstruct diagrams, graphs, and chemical equations as SVG"
                        >
                            <ImageIcon size={14} className={extractDiagrams ? 'text-indigo-600' : 'text-slate-400'} />
                            {extractDiagrams ? 'Extracting Diagrams' : 'Ignore Diagrams'}
                        </button>
                        <button 
                            onClick={() => setShowMeta(true)}
                            className="group flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-white text-slate-600 rounded-xl font-bold text-xs transition-all border border-slate-200/60 shadow-sm"
                        >
                            <Settings size={14} className="group-hover:rotate-45 transition-transform" />
                            Project Specs
                        </button>
                        <button 
                            onClick={() => setShowCommandCentre(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
                        >
                            <Command size={14} />
                            Bulk Ops
                        </button>
                        <button 
                            onClick={handlePublish} disabled={isPublishing || extractedQuestions.length === 0}
                            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 text-white rounded-xl font-black text-xs transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
                        >
                            {isPublishing ? <Loader2 className="animate-spin" size={14} /> : <ArrowUpCircle size={14} />}
                            TRANSFER QUEUE ({extractedQuestions.filter(q => q.isStaged).length})
                        </button>
                        <div className="h-6 w-[1.5px] bg-slate-200 rounded-full mx-1" />
                        <button onClick={onClose} className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-500 rounded-lg transition-colors">
                            <X size={20} />
                        </button>
                    </div>
                </header>

                <div className="flex-1 flex overflow-hidden h-[calc(100vh-64px)]">
                    {/* --- LEFT: APEX TRACKER (GLASS LIST) --- */}
                    <aside className="w-72 bg-white/60 border-r border-slate-200/60 overflow-y-auto apex-scrollbar flex flex-col shadow-inner shrink-0">
                        <div className="p-4 border-b border-slate-200/30 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md z-10">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Inventory</span>
                            <span className="text-[10px] font-black bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">{extractedQuestions.length} Items</span>
                        </div>
                        <div className="flex-1 p-3 space-y-1.5">
                            {extractedQuestions.map((q, idx) => {
                                const textLength = (q.text || '').length + (q.solution || '').length + (q.options || []).join('').length;
                                const isHeavyText = textLength > 2500;
                                
                                return (
                                <div key={idx} className="relative group">
                                    <button
                                        onClick={() => setActiveQuestionIndex(idx)}
                                        onDoubleClick={() => { setActiveQuestionIndex(idx); editorScrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }}
                                        className={`w-full flex items-center gap-3 p-3 pl-4 rounded-2xl transition-all border ${activeQuestionIndex === idx ? 'bg-indigo-600 text-white border-indigo-500 shadow-xl shadow-indigo-500/30 scale-[1.02]' : 'bg-white hover:bg-indigo-50 text-slate-600 border-slate-200/40'}`}
                                    >
                                        <div className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-black ${activeQuestionIndex === idx ? 'bg-white/20' : 'bg-slate-100/50'}`}>
                                            {idx + 1}
                                        </div>
                                        <div className="flex-1 text-left">
                                            <p className="text-[10px] font-black uppercase truncate tracking-tighter opacity-80">{q.subject || 'General'}</p>
                                            <p className="text-[11px] font-bold truncate max-w-[120px]">{q.text?.substring(0, 20) || 'Empty Question...'}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="flex flex-col gap-0.5 items-center">
                                                {isHeavyText && <AlertTriangle size={12} className={`animate-pulse ${activeQuestionIndex === idx ? 'text-amber-300' : 'text-amber-500'}`} title="High text size limit warning!" />}
                                                {(q.image || (q.optionImages && q.optionImages.some(img => img)) || q.solutionImage) && <div className={`w-1.5 h-1.5 rounded-full mt-1 ${activeQuestionIndex === idx ? 'bg-indigo-200' : 'bg-blue-400'}`} />}
                                                {(q.correctOption || q.correctValue !== undefined) && <div className={`w-1.5 h-1.5 rounded-full ${activeQuestionIndex === idx ? 'bg-emerald-200' : 'bg-emerald-400'}`} />}
                                            </div>
                                            {q.isStaged && (
                                                <div className={`p-1 rounded-full ${activeQuestionIndex === idx ? 'bg-white text-indigo-600' : 'bg-emerald-500 text-white shadow-sm'}`}>
                                                    <Check size={10} strokeWidth={4} />
                                                </div>
                                            )}
                                        </div>
                                    </button>

                                    {/* APEX WORKBENCH: QUICK TOOLS ON HOVER */}
                                    <div className="absolute right-0 top-0 bottom-0 pr-1 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 z-20 pointer-events-none">
                                        <div className="bg-white/80 backdrop-blur-md p-1.5 rounded-xl border border-slate-200/40 shadow-xl flex items-center gap-1.5 pointer-events-auto scale-90 origin-right transition-transform group-hover:scale-100">
                                            {idx > 0 && (
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); handleMergeQuestions(idx, idx - 1); }}
                                                    className="p-1 px-1.5 hover:bg-indigo-50 text-indigo-600 rounded-md transition-all flex flex-col items-center gap-0.5"
                                                    title="Merge into Previous"
                                                >
                                                    <ArrowUpCircle size={12} />
                                                    <span className="text-[7px] font-black uppercase">Up</span>
                                                </button>
                                            )}
                                            {idx < extractedQuestions.length - 1 && (
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); handleMergeQuestions(idx, idx + 1); }}
                                                    className="p-1 px-1.5 hover:bg-slate-50 text-slate-600 rounded-md transition-all flex flex-col items-center gap-0.5"
                                                    title="Merge into Next"
                                                >
                                                    <ArrowDownCircle size={12} />
                                                    <span className="text-[7px] font-black uppercase">Down</span>
                                                </button>
                                            )}
                                            <div className="h-4 w-px bg-slate-200 mx-0.5" />
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleDeleteQuestion(idx); }}
                                                className="p-1 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-all"
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                );
                            })}
                            <button 
                                onClick={() => setExtractedQuestions([...extractedQuestions, { text: '', options: ['', '', '', ''], type: 'mcq' }])}
                                className="w-full flex items-center justify-center gap-3 p-4 border-2 border-dashed border-indigo-100 hover:border-indigo-400 rounded-3xl text-slate-400 hover:text-indigo-600 transition-all font-black text-xs group bg-slate-50/30 hover:bg-white hover:shadow-xl shadow-indigo-500/5"
                            >
                                <div className="w-8 h-8 rounded-full bg-slate-100 group-hover:bg-indigo-50 flex items-center justify-center transition-colors">
                                    <Plus size={16} className="group-hover:rotate-90 transition-transform" />
                                </div>
                                <span className="uppercase tracking-[0.2em] font-black">Append Segment</span>
                            </button>
                        </div>
                    </aside>

                    {/* --- CENTER: PDF VIEWER (FOCUSED) --- */}
                    <main className="flex-1 bg-slate-50 border-r border-slate-200/60 overflow-hidden relative">
                        {pdfFile ? (
                            <PdfViewer 
                                file={pdfFile} 
                                onScanPage={(img) => handleScan(img, false, 'full')}
                                onScanSelection={(img, scanMode = 'full') => handleScan(img, true, scanMode)}
                                onCropCapture={handleCropCapture}
                                onSolutionCropCapture={handleSolutionCropCapture}
                                onOptionCropCapture={handleOptionCropCapture}
                                theme="light"
                                onClose={() => setPdfFile(null)}
                            />
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center p-12 text-center">
                                <motion.div 
                                    animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 4 }}
                                    className="w-24 h-24 bg-indigo-50 rounded-[40px] flex items-center justify-center mb-6 border-b-4 border-indigo-200 shadow-xl"
                                >
                                    <FileText size={40} className="text-indigo-600" />
                                </motion.div>
                                <h3 className="text-2xl font-black text-slate-800 mb-3 tracking-tight">Deploy Apex Intelligence</h3>
                                <p className="text-slate-500 text-sm max-w-sm mb-8 font-medium">Upload your exam PDF to initiate high-precision AI question extraction and formatting.</p>
                                <label className="cursor-pointer px-10 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-3xl font-black text-md transition-all shadow-2xl shadow-indigo-500/40 active:scale-95 flex items-center gap-3">
                                    <Layers size={18} /> SELECT PDF SOURCE
                                    <input type="file" className="hidden" accept=".pdf" onChange={handleFileUpload} />
                                </label>
                            </div>
                        )}
                        
                        {isScanning && (
                            <div className="absolute inset-0 bg-white/60 backdrop-blur-md z-50 flex flex-col items-center justify-center p-8 text-center border-x border-slate-200">
                                <div className="relative">
                                    <Loader2 className="text-indigo-600 animate-spin" size={64} strokeWidth={1} />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <Brain size={24} className="text-indigo-600 animate-pulse" />
                                    </div>
                                </div>
                                <h4 className="mt-8 text-xl font-black text-slate-800 flex items-center gap-2">
                                    <Sparkles size={18} className="text-amber-400" />
                                    APEX AI EXTRACTION
                                </h4>
                                <p className="mt-2 text-slate-500 font-bold uppercase tracking-widest text-[10px] bg-slate-100 px-4 py-1.5 rounded-full border border-slate-200">{scanStatus || 'Analysing structure...'}</p>
                                {scanError && (
                                    <p className="mt-2 text-rose-600 font-black uppercase tracking-widest text-[10px] bg-rose-50 px-4 py-1.5 rounded-full border border-rose-100">{scanError}</p>
                                )}
                                <div className="mt-6 w-64 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                    <motion.div 
                                        initial={{ x: '-100%' }} animate={{ x: '100%' }} transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                                        className="w-full h-full bg-indigo-600" 
                                    />
                                </div>
                            </div>
                        )}
                    </main>

                    {/* --- RIGHT: APEX EDITOR (ELITE LIGHT) --- */}
                    <aside className="w-[500px] bg-white overflow-y-auto apex-scrollbar scroll-smooth shrink-0 border-l border-slate-200/40">
                        <AnimatePresence mode="wait">
                            {activeQ ? (
                                <motion.div 
                                    key={activeQuestionIndex}
                                    initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                                    className="p-8 space-y-10"
                                >
                                    <div ref={editorScrollRef} className="flex items-center justify-between border-b border-slate-100 pb-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-xl font-black text-indigo-600 border border-slate-100 shadow-sm">
                                                {activeQuestionIndex + 1}
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Active Context</h3>
                                                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">Apex AI Extraction #{activeQuestionIndex + 1}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button 
                                                onClick={() => updateActiveQuestion('isStaged', !activeQ.isStaged)}
                                                className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-black text-[10px] transition-all uppercase tracking-widest ${activeQ.isStaged ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                                            >
                                                {activeQ.isStaged ? <CheckCircle2 size={13} /> : <Target size={13} />}
                                                {activeQ.isStaged ? 'Staged' : 'Add to Queue'}
                                            </button>
                                            <button 
                                                onClick={() => {
                                                    const next = extractedQuestions.filter((_, i) => i !== activeQuestionIndex);
                                                    setExtractedQuestions(next);
                                                    if (activeQuestionIndex >= next.length) setActiveQuestionIndex(Math.max(0, next.length - 1));
                                                }}
                                                className="p-3 bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white rounded-2xl transition-all shadow-sm"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Pattern Selector */}
                                    <div className="space-y-4">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Activity size={10} /> Pattern Architecture</span>
                                        <div className="flex p-1.5 bg-slate-100/50 rounded-2xl border border-slate-200/40 gap-1.5 shadow-inner">
                                            {[
                                                { id: 'mcq', icon: Target, label: 'MCQ' },
                                                { id: 'msq', icon: Layout, label: 'MSQ' },
                                                { id: 'integer', icon: Hash, label: 'INT' },
                                                { id: 'matching', icon: Merge, label: 'MTM' }
                                            ].map(t => (
                                                <button
                                                    key={t.id}
                                                    onClick={() => updateActiveQuestion('type', t.id)}
                                                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-black text-[10px] transition-all ${activeQ.type === t.id ? 'bg-white text-indigo-600 shadow-lg shadow-indigo-500/10 border border-slate-200 scale-[1.03]' : 'text-slate-400 hover:bg-white/50'}`}
                                                >
                                                    <t.icon size={13} /> {t.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Content Editor */}
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><TypeIcon size={10} /> Core Question</span>
                                            <button 
                                                onClick={() => handleScan(null, false)}
                                                className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 underline underline-offset-4"
                                            >
                                                Rescan Document...
                                            </button>
                                        </div>
                                        <div className="bg-slate-50/50 rounded-[32px] border border-slate-200/60 p-3">
                                            <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-2 px-1 flex items-center gap-1.5"><Eye size={9}/> Click preview to edit · Esc to discard</p>
                                            <LiveEditableField
                                                value={activeQ.text || ''}
                                                onChange={(val) => updateActiveQuestion('text', val)}
                                                placeholder="Click here to write/edit question text…"
                                                rows={4}
                                                previewClass="text-slate-800 text-base leading-relaxed"
                                                label="Q-Text"
                                            />
                                        </div>
                                        {activeQ.image && (
                                            <div className="relative group rounded-3xl overflow-hidden border-2 border-slate-100 shadow-xl bg-white p-2">
                                                <img src={activeQ.image} alt="Diagram" className="w-full h-auto rounded-2xl" />
                                                <button 
                                                    onClick={() => updateActiveQuestion('image', null)}
                                                    className="absolute top-4 right-4 p-2 bg-rose-500 text-white rounded-xl shadow-lg opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Options Hub */}
                                    {activeQ.type !== 'integer' && (
                                        <div className="space-y-6">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><ListChecks size={10} /> Response Architecture</span>
                                            <div className="grid gap-4">
                                                {activeQ.options?.map((opt, idx) => {
                                                    const letter = OPTION_LABELS[idx];
                                                    const isSelected = activeQ.type === 'msq' ? activeQ.correctOptions?.includes(letter) : activeQ.correctOption === letter;
                                                    
                                                    return (
                                                        <div key={idx} className={`p-5 rounded-[28px] border transition-all ${isSelected ? 'bg-emerald-50/50 border-emerald-400 ring-4 ring-emerald-500/5' : 'bg-white border-slate-100 hover:border-slate-200 shadow-sm'}`}>
                                                            <div className="flex items-start gap-4 mb-4">
                                                                <button
                                                                    onClick={() => {
                                                                        if (activeQ.type === 'mcq' || activeQ.type === 'matching') updateActiveQuestion('correctOption', letter);
                                                                        else {
                                                                            const opts = activeQ.correctOptions || [];
                                                                            const next = opts.includes(letter) ? opts.filter(o => o !== letter) : [...opts, letter];
                                                                            updateActiveQuestion('correctOptions', next);
                                                                        }
                                                                    }}
                                                                    className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm transition-all ${isSelected ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/40 rotate-12 scale-110' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'}`}
                                                                >
                                                                    {letter}
                                                                </button>
                                                                <div className="flex-1">
                                                                    <LiveEditableField
                                                                        value={opt}
                                                                        onChange={(val) => {
                                                                            const next = [...activeQ.options];
                                                                            next[idx] = val;
                                                                            updateActiveQuestion('options', next);
                                                                        }}
                                                                        placeholder={`Option ${letter}…`}
                                                                        rows={2}
                                                                        previewClass="text-slate-700 text-sm"
                                                                        label={`Option ${letter}`}
                                                                    />
                                                                </div>
                                                            </div>
                                                            {activeQ.optionImages?.[idx] && (
                                                                <div className="mt-3 relative group w-max border-2 border-slate-50 rounded-2xl overflow-hidden shadow-sm">
                                                                    <img src={activeQ.optionImages[idx]} className="h-24 md:h-32 object-contain bg-white p-2" alt="Option Diagram" />
                                                                    <button 
                                                                        onClick={() => handleOptionImageUpdate('', idx)}
                                                                        className="absolute top-2 right-2 p-1.5 bg-rose-500 text-white rounded-lg shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                                                                    >
                                                                        <Trash2 size={12} />
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Integer Result */}
                                    {activeQ.type === 'integer' && (
                                        <div className="p-8 bg-slate-50 rounded-[32px] border border-slate-200/60 shadow-inner space-y-4">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Zap size={10} /> Quantitative Anchor</span>
                                            <input 
                                                type="number" step="any"
                                                value={activeQ.correctValue || ''}
                                                onChange={(e) => updateActiveQuestion('correctValue', e.target.value)}
                                                className="w-full bg-white border-2 border-slate-200/60 rounded-2xl px-6 py-5 text-2xl font-black text-indigo-600 focus:border-indigo-500 outline-none shadow-xl shadow-slate-200/40 transition-all"
                                                placeholder="0.00"
                                            />
                                        </div>
                                    )}

                                    {/* Solution Strategy */}
                                    <div className="space-y-6">
                                        <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-1.5"><Sparkles size={10} /> Solution Strategy</span>
                                        <div className="p-3 bg-amber-50/30 rounded-[32px] border border-amber-100/50 shadow-sm">
                                            <p className="text-[9px] font-black text-amber-400 uppercase tracking-widest mb-1 px-1 flex items-center gap-1.5"><Eye size={9}/> Click preview to edit</p>
                                            <LiveEditableField
                                                value={activeQ.solution || ''}
                                                onChange={(val) => updateActiveQuestion('solution', val)}
                                                placeholder="Click to write/edit solution…"
                                                rows={5}
                                                previewClass="text-slate-600 text-sm leading-relaxed"
                                                label="Solution"
                                            />
                                        </div>
                                        {/* Multiple Solution Images */}
                                        <div className="flex flex-col gap-4 mt-4">
                                            {activeQ.solutionImages?.map((img, sIdx) => (
                                                <div key={sIdx} className="relative group rounded-3xl overflow-hidden border-2 border-amber-100/50 shadow-md bg-white p-2 animate-in fade-in zoom-in-95 duration-200">
                                                    <img src={img} alt={`Solution Diagram ${sIdx + 1}`} className="w-full h-auto rounded-2xl" />
                                                    <button 
                                                        onClick={() => {
                                                            const next = activeQ.solutionImages.filter((_, i) => i !== sIdx);
                                                            updateActiveQuestion('solutionImages', next);
                                                        }}
                                                        className="absolute top-4 right-4 p-2 bg-rose-500 text-white rounded-xl shadow-lg opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100"
                                                        title="Remove Image"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            ))}
                                            
                                            {/* Legacy single image support */}
                                            {activeQ.solutionImage && !activeQ.solutionImages?.includes(activeQ.solutionImage) && (
                                                <div className="relative group rounded-3xl overflow-hidden border-2 border-amber-100/50 shadow-md bg-white p-2 animate-in fade-in zoom-in-95 duration-200">
                                                    <img src={activeQ.solutionImage} alt="Legacy Solution Diagram" className="w-full h-auto rounded-2xl" />
                                                    <button 
                                                        onClick={() => updateActiveQuestion('solutionImage', null)}
                                                        className="absolute top-4 right-4 p-2 bg-rose-500 text-white rounded-xl shadow-lg opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100"
                                                        title="Remove Legacy Image"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Specialized Metadata */}
                                    <div className="bg-indigo-50/50 p-8 rounded-[40px] border border-indigo-100/50 space-y-6">
                                        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-1.5"><ShieldCheck size={12} /> Authority Controls</span>
                                        <div className="grid grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Subject</label>
                                                {/* Subject Dropdown (fixed options) */}
                                                <select
                                                    value={activeQ.subject || ''}
                                                    onChange={(e) => updateActiveQuestion('subject', e.target.value)}
                                                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold text-slate-700 shadow-sm"
                                                >
                                                    <option value="" disabled>Select Subject</option>
                                                    <option value="Mathematics">Mathematics</option>
                                                    <option value="Physics">Physics</option>
                                                    <option value="Chemistry">Chemistry</option>
                                                    <option value="Biology">Biology</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Section</label>
                                                <select value={activeQ.section || ''} onChange={(e) => updateActiveQuestion('section', e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold text-slate-700 shadow-sm outline-none">
                                                    <option value="">None</option>
                                                    <option value="Section A">Section A</option>
                                                    <option value="Section B">Section B</option>
                                                    <option value="Section C">Section C</option>
                                                    <option value="Section D">Section D</option>
                                                    <option value="Section E">Section E</option>
                                                    <option value="Section F">Section F</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Rewards</label>
                                                <input type="number" value={activeQ.marks || 4} onChange={(e) => updateActiveQuestion('marks', parseInt(e.target.value))} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold text-slate-700 shadow-sm" />
                                            </div>
                                            <div>
                                                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Deduction</label>
                                                <input type="number" value={activeQ.negativeMarks || 1} onChange={(e) => updateActiveQuestion('negativeMarks', parseInt(e.target.value))} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold text-slate-700 shadow-sm" />
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400 p-12 text-center">
                                    <Sparkle size={48} className="mb-6 opacity-20 animate-spin-slow text-indigo-600" />
                                    <p className="text-sm font-bold opacity-60">Apex AI Editor Standby</p>
                                    <p className="text-[10px] uppercase font-black tracking-widest mt-2 opacity-30">Select data from inventory to modulate</p>
                                </div>
                            )}
                        </AnimatePresence>
                    </aside>
                </div>

                {/* --- APEX SUB-MODALS (LIGHT) --- */}
                {showMeta && (
                    <div className="fixed inset-0 z-[200] bg-slate-200/60 backdrop-blur-md flex items-center justify-center p-4">
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden border border-slate-200/80">
                            <div className="px-8 py-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                                <h3 className="text-lg font-black text-slate-800 flex items-center gap-3">
                                    <img src="/logo.png" className="h-6" alt="Apex Logo" />
                                    AUTHORITY SPECS
                                </h3>
                                <button onClick={() => setShowMeta(false)} className="p-2 hover:bg-white rounded-full transition-colors"><X size={20} /></button>
                            </div>
                            <div className="p-8 grid grid-cols-2 gap-x-8 gap-y-6">
                                <div className="col-span-2 space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase px-1">Identity</label>
                                    <input value={testMeta.title} onChange={(e) => setTestMeta({...testMeta, title: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-200 focus:border-indigo-500 rounded-2xl px-4 py-3 font-bold text-slate-700 outline-none transition-all" placeholder="Enter test title..." />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase px-1">Target Series</label>
                                    <select value={testMeta.seriesId} onChange={(e) => setTestMeta({...testMeta, seriesId: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-200 focus:border-indigo-500 rounded-2xl px-4 py-3 font-bold text-slate-700 outline-none transition-all">
                                        <option value="">Select Series</option>
                                        {allSeries.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase px-1">Chronology (m)</label>
                                    <input type="number" value={testMeta.duration} onChange={(e) => setTestMeta({...testMeta, duration: parseInt(e.target.value)})} className="w-full bg-slate-50 border-2 border-slate-200 focus:border-indigo-500 rounded-2xl px-4 py-3 font-bold text-slate-700 outline-none transition-all" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase px-1">Complexity</label>
                                    <select value={testMeta.difficulty} onChange={(e) => setTestMeta({...testMeta, difficulty: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-200 focus:border-indigo-500 rounded-2xl px-4 py-3 font-bold text-slate-700 outline-none transition-all">
                                        <option>Easy</option><option>Medium</option><option>Hard</option><option>Elite</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase px-1">Classification</label>
                                    <input value={testMeta.subject} onChange={(e) => setTestMeta({...testMeta, subject: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-200 focus:border-indigo-500 rounded-2xl px-4 py-3 font-bold text-slate-700 outline-none transition-all" />
                                </div>
                                <div className="col-span-2 pt-4">
                                    <button onClick={() => setShowMeta(false)} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-md shadow-xl shadow-indigo-500/30 hover:bg-indigo-700 transition-all active:scale-95">LOCK SPECIFICATIONS</button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}

                {showCommandCentre && (
                    <div className="fixed inset-0 z-[200] bg-slate-200/60 backdrop-blur-md flex items-center justify-center p-4">
                        <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-white w-full max-w-xl rounded-[40px] shadow-2xl overflow-hidden border border-slate-200/80">
                            <div className="px-8 py-6 bg-slate-50 border-b border-slate-100 flex items-center gap-3">
                                <Command className="text-indigo-600" />
                                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Global Metadata Hub</h3>
                            </div>
                            <div className="p-8 space-y-10">
                                <div className="grid grid-cols-2 gap-8">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Universal Rewards</label>
                                        <div className="flex gap-2.5">
                                            {[4, 1, 2].map(m => (
                                                <button 
                                                    key={m} 
                                                    onClick={() => handleBulkAction('setMarks', m)} 
                                                    className="flex-1 py-4 bg-slate-50 hover:bg-indigo-600 hover:text-white rounded-2xl font-black transition-all border border-slate-200/40 text-slate-700 hover:shadow-xl hover:shadow-indigo-500/20 active:scale-95"
                                                >
                                                    +{m}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Universal Penalty</label>
                                        <div className="flex gap-2.5">
                                            {[1, 0, 2].map(m => (
                                                <button 
                                                    key={m} 
                                                    onClick={() => handleBulkAction('setNegMarks', m)} 
                                                    className="flex-1 py-4 bg-slate-50 hover:bg-rose-500 hover:text-white rounded-2xl font-black transition-all border border-slate-200/40 text-slate-700 hover:shadow-xl hover:shadow-rose-500/20 active:scale-95"
                                                >
                                                    -{m}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Subject Synchronization</label>
                                    <div className="flex gap-2.5 flex-wrap">
                                        {['Physics', 'Chemistry', 'Mathematics', 'Biology', 'Logical Reasoning'].map(s => (
                                            <button 
                                                key={s} 
                                                onClick={() => handleBulkAction('setSubject', s)} 
                                                className="px-5 py-3 bg-white hover:bg-indigo-50 rounded-2xl text-[11px] font-black text-slate-600 border border-slate-200 shadow-sm hover:border-indigo-200 transition-all active:scale-95"
                                            >
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="pt-6 flex gap-4">
                                    <button 
                                        onClick={() => handleBulkAction('stageAll', null)} 
                                        className="flex-1 py-5 bg-indigo-600 text-white rounded-3xl font-black text-xs hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
                                    >
                                        STAGE ALL ITEMS
                                    </button>
                                    <button 
                                        onClick={() => handleBulkAction('clearAllImages', null)} 
                                        className="flex-1 py-5 bg-rose-50 text-rose-600 rounded-3xl font-black text-xs hover:bg-rose-500 hover:text-white transition-all shadow-sm active:scale-90"
                                    >
                                        PURGE ALL MEDIA
                                    </button>
                                    <button 
                                        onClick={() => setShowCommandCentre(false)} 
                                        className="flex-1 py-5 bg-slate-900 text-white rounded-3xl font-black text-xs hover:shadow-2xl shadow-indigo-500/30 transition-all active:scale-95"
                                    >
                                        RESUME DIGITIZER
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </motion.div>
        </AnimatePresence>
    );
};

export default GeminiPdfUploadModal;
