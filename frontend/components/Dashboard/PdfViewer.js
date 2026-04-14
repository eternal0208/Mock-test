'use client';
import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as pdfjs from 'pdfjs-dist';
import { 
    ZoomIn, ZoomOut, ChevronLeft, ChevronRight, X, 
    Brain, Sparkles, Image as ImageIcon, MousePointer, Hand,
    ChevronDown, Loader2, Database, Layers, FileText, Check,
    Target, Zap, Crosshair
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const PDFJS_VERSION = '5.4.624'; 
const workerSrc = `https://unpkg.com/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.mjs`;
pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

/**
 * APEX MOCK AI Viewer
 * A high-precision light-themed PDF engine for AI extraction.
 */
const PdfViewer = ({ file, onScanPage, onScanSelection, onCropCapture, onSolutionCropCapture, onOptionCropCapture, onClose }) => {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const renderTaskRef = useRef(null);
    
    const [pdf, setPdf] = useState(null);
    const [pageNum, setPageNum] = useState(1);
    const [scale, setScale] = useState(1.5);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isSelecting, setIsSelecting] = useState(false);
    const [selection, setSelection] = useState(null); 
    const [showOptionsScroll, setShowOptionsScroll] = useState(false);
    const [showScanScroll, setShowScanScroll] = useState(false);
    const [interactionMode, setInteractionMode] = useState('select'); // 'select' | 'pan'
    const [isPanning, setIsPanning] = useState(false);
    const [lastPanPos, setLastPanPos] = useState({ x: 0, y: 0 });
    const [spacePressed, setSpacePressed] = useState(false);
    const [scannedPages, setScannedPages] = useState(new Set());

    // Sync from parent if needed, or handle locally
    const handleSurgicalScan = () => {
        onScanPage?.(canvasRef.current.toDataURL('image/png', 0.8), pageNum);
        setScannedPages(prev => new Set([...prev, pageNum]));
    };

    // ✅ SHORTCUTS: Spacebar for temporary panning
    useEffect(() => {
        const handleKeyDown = (e) => { if (e.code === 'Space') { setSpacePressed(true); if (e.target === document.body) e.preventDefault(); } };
        const handleKeyUp = (e) => { if (e.code === 'Space') setSpacePressed(false); };
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => { window.removeEventListener('keydown', handleKeyDown); window.removeEventListener('keyup', handleKeyUp); };
    }, []);

    const currentMode = spacePressed ? 'pan' : interactionMode;

    useEffect(() => {
        if (!file) return;
        const load = async () => {
            setLoading(true);
            setError(null);
            try {
                const arrayBuffer = await file.arrayBuffer();
                const loadingTask = pdfjs.getDocument({ 
                    data: arrayBuffer, 
                    cMapUrl: `https://unpkg.com/pdfjs-dist@${PDFJS_VERSION}/cmaps/`, 
                    cMapPacked: true 
                });
                const loadedPdf = await loadingTask.promise;
                setPdf(loadedPdf);
                setPageNum(1);
            } catch (err) { 
                setError(`Decoding Authority Failure: ${err.message}`); 
                console.error('[PDF Load Error]', err);
            } finally { 
                setLoading(false); 
            }
        };
        load();
    }, [file]);

    const renderPage = useCallback(async () => {
        if (!pdf || !canvasRef.current) return;

        if (renderTaskRef.current) {
            renderTaskRef.current.cancel();
        }

        try {
            const page = await pdf.getPage(pageNum);
            const viewport = page.getViewport({ scale });
            const canvas = canvasRef.current;
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            
            const renderTask = page.render({ canvasContext: context, viewport: viewport });
            renderTaskRef.current = renderTask;
            
            await renderTask.promise;
            renderTaskRef.current = null;
        } catch (err) {
            if (err.name === 'RenderingCancelledException') return;
            console.error('PDF Render Error:', err);
        }
    }, [pdf, pageNum, scale]);

    useEffect(() => { 
        renderPage(); 
        return () => {
            if (renderTaskRef.current) renderTaskRef.current.cancel();
        };
    }, [renderPage]);

    // ✅ GLOBAL MOUSE TRACKING: Window-level tracking for smooth panning/selection
    useEffect(() => {
        if (!isPanning && !isSelecting) return;

        const handleGlobalMouseMove = (e) => {
            if (isPanning) {
                const dx = e.clientX - lastPanPos.x;
                const dy = e.clientY - lastPanPos.y;
                if (containerRef.current) {
                    containerRef.current.scrollLeft -= dx;
                    containerRef.current.scrollTop -= dy;
                }
                setLastPanPos({ x: e.clientX, y: e.clientY });
            } else if (isSelecting && selection) {
                const rect = canvasRef.current.getBoundingClientRect();
                const curX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
                const curY = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
                setSelection(prev => ({
                    ...prev,
                    x: Math.min(prev.startX, curX),
                    y: Math.min(prev.startY, curY),
                    w: Math.abs(prev.startX - curX),
                    h: Math.abs(prev.startY - curY)
                }));
            }
        };

        const handleGlobalMouseUp = () => {
            setIsSelecting(false);
            setIsPanning(false);
        };

        window.addEventListener('mousemove', handleGlobalMouseMove);
        window.addEventListener('mouseup', handleGlobalMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleGlobalMouseMove);
            window.removeEventListener('mouseup', handleGlobalMouseUp);
        };
    }, [isPanning, isSelecting, lastPanPos, selection]);

    const handleMouseDown = (e) => {
        // ✅ APEX FIX: Allow clicks on the selection toolbar buttons
        if (e.target.closest('.selection-btn')) return;
        
        const rect = canvasRef.current.getBoundingClientRect();
        
        if (interactionMode === 'pan' || spacePressed) {
            setIsPanning(true);
            setLastPanPos({ x: e.clientX, y: e.clientY });
        } else if (interactionMode === 'select') {
            const startX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
            const startY = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
            setSelection({ startX, startY, x: startX, y: startY, w: 0, h: 0 });
            setIsSelecting(true);
        }
    };

    const captureCrop = () => {
        if (!selection || selection.w < 10) return null;
        const canvas = canvasRef.current;
        const cropCanvas = document.createElement('canvas');
        const sX = canvas.width / canvas.offsetWidth, sY = canvas.height / canvas.offsetHeight;
        cropCanvas.width = selection.w * sX; cropCanvas.height = selection.h * sY;
        const ctx = cropCanvas.getContext('2d');
        ctx.drawImage(canvas, selection.x * sX, selection.y * sY, selection.w * sX, selection.h * sY, 0, 0, cropCanvas.width, cropCanvas.height);
        return cropCanvas.toDataURL('image/png', 0.9);
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 border-r border-slate-200/60 overflow-hidden relative">
            {/* TOOLBAR */}
            <div className="bg-white border-b border-slate-200/40 p-3 flex items-center justify-between z-30 shadow-sm px-6">
                <div className="flex items-center gap-5">
                    <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200/60 shadow-inner">
                        <button onClick={() => setPageNum(p => Math.max(1, p - 1))} disabled={pageNum <= 1} className="p-2 text-slate-400 hover:text-indigo-600 transition disabled:opacity-20"><ChevronLeft size={16} /></button>
                        <span className="text-[11px] font-black text-slate-700 px-3 min-w-[60px] text-center tracking-tighter">PAGE {pageNum} / {pdf?.numPages || '?'}</span>
                        <button onClick={() => setPageNum(p => Math.min(pdf?.numPages, p + 1))} disabled={!pdf || pageNum >= pdf.numPages} className="p-2 text-slate-400 hover:text-indigo-600 transition disabled:opacity-20"><ChevronRight size={16} /></button>
                    </div>
                    <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200/60 shadow-inner">
                        <button onClick={() => setScale(s => Math.max(0.5, s - 0.25))} className="p-2 text-slate-400 hover:text-indigo-600 transition"><ZoomOut size={16} /></button>
                        <span className="text-[10px] font-black text-indigo-600 w-12 text-center">{Math.round(scale * 100)}%</span>
                        <button onClick={() => setScale(s => Math.min(4, s + 0.25))} className="p-2 text-slate-400 hover:text-indigo-600 transition"><ZoomIn size={16} /></button>
                    </div>
                </div>
                
                <div className="flex items-center gap-3">
                    <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-200/60 shadow-inner mr-2">
                        <button onClick={() => setInteractionMode('select')} className={`p-2 rounded-lg transition-all ${interactionMode === 'select' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`} title="Select (S)"><Crosshair size={16} /></button>
                        <button onClick={() => setInteractionMode('pan')} className={`p-2 rounded-lg transition-all ${interactionMode === 'pan' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`} title="Pan (H / Space)"><Hand size={16} /></button>
                    </div>
                    <button onClick={handleSurgicalScan} className={`flex items-center gap-2 px-6 py-2.5 rounded-2xl text-[10px] font-black shadow-lg transition-all uppercase tracking-widest active:scale-95 ${scannedPages.has(pageNum) ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-emerald-500/10' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20'}`}>
                        {scannedPages.has(pageNum) ? <Check size={13} strokeWidth={4} /> : <Brain size={13} className="animate-pulse" />}
                        {scannedPages.has(pageNum) ? 'P-Extracted' : 'AI Page Scan'}
                    </button>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-rose-500 transition"><X size={20} /></button>
                </div>
            </div>

            {/* VIEWER ENGINE: UNIVERSAL MOVE CONTAINER */}
            <div 
                ref={containerRef} 
                onMouseDown={handleMouseDown}
                className={`flex-1 overflow-auto apex-scrollbar relative bg-slate-50/50 select-none ${currentMode === 'pan' ? (isPanning ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-crosshair'}`}
            >
                <div className="min-w-full min-h-full flex items-center justify-center p-24">
                    <div className="relative inline-block shadow-[0_30px_100px_rgba(0,0,0,0.12)] border border-slate-200 bg-white rounded-sm group/canvas overflow-hidden transition-shadow">
                        <canvas ref={canvasRef} className="block selection-none pointer-events-none" />
                        
                        {/* SURGICAL OVERLAY: Click to Scan current context */}
                        {!scannedPages.has(pageNum) && (
                            <div className="absolute top-8 left-8 z-[60] pointer-events-auto opacity-0 group-hover/canvas:opacity-100 transition-opacity">
                                <button 
                                    onClick={handleSurgicalScan}
                                    className="flex items-center gap-3 px-6 py-3.5 bg-white/80 backdrop-blur-xl border border-slate-200/60 rounded-3xl text-slate-800 text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl hover:bg-white hover:scale-105 transition-all active:scale-95 group/scanbtn"
                                >
                                    <div className="w-8 h-8 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 group-hover/scanbtn:rotate-12 transition-transform">
                                        <Zap size={16} />
                                    </div>
                                    Extract Page {pageNum}
                                </button>
                            </div>
                        )}
                        
                        <AnimatePresence>
                            {selection && (
                                <motion.div 
                                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                    className="absolute border-2 border-indigo-500 bg-indigo-500/5 shadow-[0_0_40px_rgba(79,70,229,0.15)] z-50 pointer-events-none" 
                                    style={{ left: selection.x, top: selection.y, width: selection.w, height: selection.h }}
                                >
                                    {!isSelecting && selection.w > 20 && (
                                        <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="absolute -top-14 left-1/2 -translate-x-1/2 flex gap-1.5 p-1.5 bg-white backdrop-blur-3xl border border-slate-200 shadow-2xl rounded-3xl pointer-events-auto items-center">
                                            <button 
                                                onClick={() => { onCropCapture?.(captureCrop()); setSelection(null); }} 
                                                className="selection-btn group/qbtn flex items-center gap-2 bg-slate-900 border border-slate-800 text-white px-5 py-2.5 rounded-2xl text-[10px] font-black transition-all hover:bg-black active:scale-95"
                                            >
                                                <ImageIcon size={13} className="text-indigo-400 group-hover/qbtn:scale-110 transition-transform" /> 
                                                Q-BODY
                                            </button>
                                            <button 
                                                onClick={() => { onSolutionCropCapture?.(captureCrop()); setSelection(null); }} 
                                                className="selection-btn group/sbtn flex items-center gap-2 bg-amber-50 border border-amber-100 text-amber-700 hover:bg-amber-100 px-5 py-2.5 rounded-2xl text-[10px] font-black transition-all active:scale-95"
                                            >
                                                <Sparkles size={13} className="text-amber-500 group-hover/sbtn:rotate-12 transition-transform" /> 
                                                SOL-BODY
                                            </button>
                                            <div className="relative">
                                                <button 
                                                    onClick={() => { setShowOptionsScroll(!showOptionsScroll); setShowScanScroll(false); }} 
                                                    className={`selection-btn flex items-center gap-2 px-5 py-2.5 rounded-2xl text-[10px] font-black transition-all active:scale-95 shadow-lg ${showOptionsScroll ? 'bg-indigo-600 text-white shadow-indigo-500/20' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                                                >
                                                    <Target size={13} /> SET A-D <ChevronDown size={13} strokeWidth={3} className={showOptionsScroll ? 'rotate-180 transition-transform' : ''} />
                                                </button>
                                                <AnimatePresence>
                                                    {showOptionsScroll && (
                                                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute top-14 left-0 w-48 bg-white border border-slate-200/60 rounded-3xl p-2 shadow-2xl z-[70] flex flex-col gap-1.5 backdrop-blur-xl">
                                                            {['A', 'B', 'C', 'D'].map((opt, i) => (
                                                                <button key={opt} onClick={() => { onOptionCropCapture?.(captureCrop(), i); setSelection(null); setShowOptionsScroll(false); }} className="selection-btn w-full text-left px-4 py-3 hover:bg-indigo-50 rounded-2xl text-[11px] font-black text-slate-600 transition-all uppercase tracking-tighter flex items-center justify-between group/optitem">
                                                                    <span>Capture {opt}</span>
                                                                    <div className="w-6 h-6 rounded-lg bg-slate-100 group-hover/optitem:bg-indigo-600 group-hover/optitem:text-white flex items-center justify-center transition-colors">{opt}</div>
                                                                </button>
                                                            ))}
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                            <div className="relative">
                                                <button 
                                                    onClick={() => { setShowScanScroll(!showScanScroll); setShowOptionsScroll(false); }} 
                                                    className={`selection-btn group/scanbtn flex items-center gap-2 px-5 py-2.5 rounded-2xl text-[10px] font-black transition-all active:scale-95 shadow-sm ${showScanScroll ? 'bg-emerald-600 text-white shadow-emerald-500/20' : 'bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100'}`}
                                                >
                                                    <Zap size={13} className={!showScanScroll ? 'group-hover/scanbtn:scale-125 transition-transform' : ''} /> AI SCAN <ChevronDown size={13} strokeWidth={3} className={showScanScroll ? 'rotate-180 transition-transform' : ''} />
                                                </button>
                                                <AnimatePresence>
                                                    {showScanScroll && (
                                                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute bottom-14 left-0 w-44 bg-white border border-slate-200/60 rounded-3xl p-2 shadow-2xl z-[70] flex flex-col gap-1.5 backdrop-blur-xl">
                                                            <button onClick={() => { onScanSelection?.(captureCrop(), 'full'); setSelection(null); setShowScanScroll(false); }} className="selection-btn w-full text-left px-4 py-2.5 hover:bg-emerald-50 rounded-2xl text-[10px] font-black text-slate-600 transition-all uppercase tracking-tighter shadow-sm border border-transparent hover:border-emerald-100 flex items-center justify-between group/o1">
                                                                <span>Full Question</span>
                                                                <div className="w-5 h-5 rounded bg-emerald-100/50 flex items-center justify-center group-hover/o1:bg-emerald-500 group-hover/o1:text-white transition"><Crosshair size={10} /></div>
                                                            </button>
                                                            <button onClick={() => { onScanSelection?.(captureCrop(), 'text'); setSelection(null); setShowScanScroll(false); }} className="selection-btn w-full text-left px-4 py-2.5 hover:bg-indigo-50 rounded-2xl text-[10px] font-black text-slate-600 transition-all uppercase tracking-tighter" >Target: Q-Text</button>
                                                            <button onClick={() => { onScanSelection?.(captureCrop(), 'options'); setSelection(null); setShowScanScroll(false); }} className="selection-btn w-full text-left px-4 py-2.5 hover:bg-indigo-50 rounded-2xl text-[10px] font-black text-slate-600 transition-all uppercase tracking-tighter" >Target: Options</button>
                                                            <button onClick={() => { onScanSelection?.(captureCrop(), 'solution'); setSelection(null); setShowScanScroll(false); }} className="selection-btn w-full text-left px-4 py-2.5 hover:bg-indigo-50 rounded-2xl text-[10px] font-black text-slate-600 transition-all uppercase tracking-tighter" >Target: Solution</button>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                            <div className="w-[1.5px] h-6 bg-slate-100 mx-1"></div>
                                            <button onClick={() => setSelection(null)} className="selection-btn p-2 text-slate-400 hover:text-rose-500 transition"><X size={18} /></button>
                                        </motion.div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {loading && (
                    <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center z-50">
                        <div className="flex flex-col items-center gap-4">
                            <Loader2 className="animate-spin text-indigo-600" size={48} strokeWidth={1.5} />
                            <p className="text-slate-800 font-black uppercase tracking-[0.2em] text-[10px]">Optimizing Source Engine...</p>
                        </div>
                    </div>
                )}
            </div>
            
            {/* FOOTER */}
            <div className="bg-white border-t border-slate-200/40 px-8 py-3.5 flex items-center justify-between z-30">
                <div className="flex items-center gap-10 text-[10px] text-slate-400 font-black uppercase tracking-[0.3em]">
                    <span className="flex items-center gap-2 text-slate-600"><MousePointer size={13} className="text-indigo-600" /> Click-Drag Selection</span>
                    <span className="flex items-center gap-2"><Target size={13} /> Targeted Extraction</span>
                    <span className="flex items-center gap-2"><Database size={13} /> Cloud Sync Ready</span>
                </div>
                <div className="flex items-center gap-2 opacity-40">
                    <img src="/logo.png" className="h-4 grayscale brightness-150" alt="Apex" />
                    <span className="text-[9px] font-black tracking-widest uppercase">Apex AI Engine v2.0</span>
                </div>
            </div>
        </div>
    );
};

export default PdfViewer;
