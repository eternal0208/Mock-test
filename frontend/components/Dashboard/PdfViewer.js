'use client';
import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as pdfjs from 'pdfjs-dist';
import { 
    ZoomIn, ZoomOut, ChevronLeft, ChevronRight, X, 
    Brain, Sparkles, Image as ImageIcon, MousePointer, Hand,
    ChevronDown, Loader2, Database, Check,
    Target, Zap, Crosshair
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const PDFJS_VERSION = '5.4.624'; 
const workerSrc = `https://unpkg.com/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.mjs`;
pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

/**
 * APEX MOCK AI Viewer
 * Smart-positioned selection toolbar — shows above OR below the selection
 * based on available space, so it never goes off-screen.
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

    // ── Smart toolbar position ─────────────────────────────────────────
    // If selection.y < 72px from canvas top: not enough room above → show below
    // Otherwise show above (default)
    const toolbarPos = selection && selection.y < 72 ? 'below' : 'above';

    const toolbarPositionStyle = toolbarPos === 'above'
        ? { bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: '8px' }
        : { top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: '8px' };

    // Dropdowns flip too: when toolbar is below, dropdowns open upwards
    const dropdownStyle = toolbarPos === 'above'
        ? { top: 'calc(100% + 6px)', left: 0 }
        : { bottom: 'calc(100% + 6px)', left: 0 };

    // ── Page scan ─────────────────────────────────────────────────────
    const handleSurgicalScan = () => {
        onScanPage?.(canvasRef.current.toDataURL('image/png', 0.8), pageNum);
        setScannedPages(prev => new Set([...prev, pageNum]));
    };

    // ── Spacebar pan shortcut ─────────────────────────────────────────
    useEffect(() => {
        const down = (e) => { if (e.code === 'Space') { setSpacePressed(true); if (e.target === document.body) e.preventDefault(); } };
        const up = (e) => { if (e.code === 'Space') setSpacePressed(false); };
        window.addEventListener('keydown', down);
        window.addEventListener('keyup', up);
        return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
    }, []);

    // ── Click outside: close dropdowns ───────────────────────────────
    useEffect(() => {
        if (!showOptionsScroll && !showScanScroll) return;
        const handler = (e) => {
            if (!e.target.closest('.sel-btn') && !e.target.closest('.sel-drop')) {
                setShowOptionsScroll(false);
                setShowScanScroll(false);
            }
        };
        window.addEventListener('mousedown', handler, true);
        return () => window.removeEventListener('mousedown', handler, true);
    }, [showOptionsScroll, showScanScroll]);

    const currentMode = spacePressed ? 'pan' : interactionMode;

    // ── PDF load ──────────────────────────────────────────────────────
    useEffect(() => {
        if (!file) return;
        (async () => {
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
                setError(`PDF Load Error: ${err.message}`);
                console.error('[PDF Load Error]', err);
            } finally { 
                setLoading(false); 
            }
        })();
    }, [file]);

    // ── Page render ───────────────────────────────────────────────────
    const renderPage = useCallback(async () => {
        if (!pdf || !canvasRef.current) return;
        if (renderTaskRef.current) { renderTaskRef.current.cancel(); }
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
        return () => { if (renderTaskRef.current) renderTaskRef.current.cancel(); };
    }, [renderPage]);

    // ── Global mouse tracking for pan + selection ─────────────────────
    useEffect(() => {
        if (!isPanning && !isSelecting) return;
        const onMove = (e) => {
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
        const onUp = () => { setIsSelecting(false); setIsPanning(false); };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    }, [isPanning, isSelecting, lastPanPos, selection]);

    // ── Mouse down on canvas area ─────────────────────────────────────
    const handleMouseDown = (e) => {
        if (e.target.closest('.sel-btn') || e.target.closest('.sel-drop')) return;
        if (!canvasRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();

        setShowOptionsScroll(false);
        setShowScanScroll(false);

        if (interactionMode === 'pan' || spacePressed) {
            setIsPanning(true);
            setLastPanPos({ x: e.clientX, y: e.clientY });
        } else {
            const startX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
            const startY = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
            setSelection({ startX, startY, x: startX, y: startY, w: 0, h: 0 });
            setIsSelecting(true);
        }
    };

    // ── Crop capture ──────────────────────────────────────────────────
    const captureCrop = () => {
        if (!selection || selection.w < 10) return null;
        const canvas = canvasRef.current;
        const cropCanvas = document.createElement('canvas');
        const sX = canvas.width / canvas.offsetWidth;
        const sY = canvas.height / canvas.offsetHeight;
        cropCanvas.width = selection.w * sX;
        cropCanvas.height = selection.h * sY;
        const ctx = cropCanvas.getContext('2d');
        ctx.drawImage(canvas, selection.x * sX, selection.y * sY, selection.w * sX, selection.h * sY, 0, 0, cropCanvas.width, cropCanvas.height);
        return cropCanvas.toDataURL('image/png', 0.9);
    };

    // ── Render ────────────────────────────────────────────────────────
    return (
        <div className="flex flex-col h-full bg-slate-50 border-r border-slate-200/60 overflow-hidden relative">

            {/* ── TOP TOOLBAR ── */}
            <div className="bg-white border-b border-slate-200/40 p-3 flex items-center justify-between z-30 shadow-sm px-6 shrink-0">
                <div className="flex items-center gap-4">
                    {/* Page controls */}
                    <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200/60 shadow-inner">
                        <button onClick={() => setPageNum(p => Math.max(1, p - 1))} disabled={pageNum <= 1} className="p-2 text-slate-400 hover:text-indigo-600 transition disabled:opacity-20 rounded-lg">
                            <ChevronLeft size={15} />
                        </button>
                        <span className="text-[11px] font-black text-slate-700 px-2 min-w-[56px] text-center tracking-tight">
                            {pageNum} / {pdf?.numPages || '?'}
                        </span>
                        <button onClick={() => setPageNum(p => Math.min(pdf?.numPages, p + 1))} disabled={!pdf || pageNum >= pdf.numPages} className="p-2 text-slate-400 hover:text-indigo-600 transition disabled:opacity-20 rounded-lg">
                            <ChevronRight size={15} />
                        </button>
                    </div>
                    {/* Zoom controls */}
                    <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200/60 shadow-inner">
                        <button onClick={() => setScale(s => Math.max(0.5, s - 0.25))} className="p-2 text-slate-400 hover:text-indigo-600 transition rounded-lg"><ZoomOut size={15} /></button>
                        <span className="text-[10px] font-black text-indigo-600 w-10 text-center">{Math.round(scale * 100)}%</span>
                        <button onClick={() => setScale(s => Math.min(4, s + 0.25))} className="p-2 text-slate-400 hover:text-indigo-600 transition rounded-lg"><ZoomIn size={15} /></button>
                    </div>
                </div>

                <div className="flex items-center gap-2.5">
                    {/* Mode toggle */}
                    <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-200/60 shadow-inner">
                        <button onClick={() => setInteractionMode('select')} className={`p-2 rounded-lg transition-all ${interactionMode === 'select' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`} title="Select mode">
                            <Crosshair size={15} />
                        </button>
                        <button onClick={() => setInteractionMode('pan')} className={`p-2 rounded-lg transition-all ${interactionMode === 'pan' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`} title="Pan mode (Space)">
                            <Hand size={15} />
                        </button>
                    </div>
                    {/* AI Page Scan */}
                    <button onClick={handleSurgicalScan} className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-[10px] font-black shadow-lg transition-all uppercase tracking-widest active:scale-95 ${scannedPages.has(pageNum) ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/25'}`}>
                        {scannedPages.has(pageNum) ? <Check size={13} strokeWidth={3} /> : <Brain size={13} className="animate-pulse" />}
                        {scannedPages.has(pageNum) ? 'Extracted' : 'AI Page Scan'}
                    </button>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-rose-500 transition rounded-xl hover:bg-red-50"><X size={19} /></button>
                </div>
            </div>

            {/* ── VIEWER ── */}
            <div
                ref={containerRef}
                onMouseDown={handleMouseDown}
                className={`flex-1 overflow-auto relative bg-slate-100/50 select-none ${currentMode === 'pan' ? (isPanning ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-crosshair'}`}
            >
                <div className="min-w-full min-h-full flex items-center justify-center p-20">
                    {/* Canvas wrapper — overflow:visible so toolbar/dropdowns never clip */}
                    <div className="relative inline-block shadow-[0_20px_80px_rgba(0,0,0,0.10)] border border-slate-200 bg-white rounded-sm group/canvas" style={{ overflow: 'visible' }}>
                        <canvas ref={canvasRef} className="block pointer-events-none select-none" />

                        {/* Hover scan button overlay */}
                        {!scannedPages.has(pageNum) && (
                            <div className="absolute top-6 left-6 z-[60] pointer-events-auto opacity-0 group-hover/canvas:opacity-100 transition-opacity duration-200">
                                <button onClick={handleSurgicalScan} className="flex items-center gap-2.5 px-5 py-3 bg-white/85 backdrop-blur-xl border border-slate-200/60 rounded-3xl text-slate-700 text-[10px] font-black uppercase tracking-[0.15em] shadow-2xl hover:bg-white hover:scale-105 transition-all active:scale-95">
                                    <div className="w-7 h-7 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md">
                                        <Zap size={14} />
                                    </div>
                                    Extract Page {pageNum}
                                </button>
                            </div>
                        )}

                        {/* ── SELECTION BOX + SMART TOOLBAR ── */}
                        <AnimatePresence>
                            {selection && (
                                <motion.div
                                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                    className="absolute border-2 border-indigo-500 bg-indigo-500/5 z-50 pointer-events-none"
                                    style={{
                                        left: selection.x,
                                        top: selection.y,
                                        width: selection.w,
                                        height: selection.h,
                                        boxShadow: '0 0 0 9999px rgba(79,70,229,0.03)',
                                        overflow: 'visible'
                                    }}
                                >
                                    {/* Toolbar: only show after mouse released + min size */}
                                    {!isSelecting && selection.w > 20 && (
                                        <motion.div
                                            initial={{ scale: 0.9, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            className="absolute flex gap-1 p-1.5 bg-white/95 backdrop-blur-2xl border border-slate-200 shadow-2xl rounded-[22px] pointer-events-auto items-center z-[100]"
                                            style={toolbarPositionStyle}
                                        >
                                            {/* Q-BODY */}
                                            <button
                                                className="sel-btn flex items-center gap-1.5 bg-slate-900 text-white px-3.5 py-2 rounded-[14px] text-[10px] font-black hover:bg-black active:scale-95 transition-all"
                                                onClick={() => { onCropCapture?.(captureCrop()); setSelection(null); }}
                                            >
                                                <ImageIcon size={11} className="text-indigo-300" /> Q-BODY
                                            </button>

                                            {/* SOL-BODY */}
                                            <button
                                                className="sel-btn flex items-center gap-1.5 bg-amber-50 border border-amber-100 text-amber-700 hover:bg-amber-100 px-3.5 py-2 rounded-[14px] text-[10px] font-black active:scale-95 transition-all"
                                                onClick={() => { onSolutionCropCapture?.(captureCrop()); setSelection(null); }}
                                            >
                                                <Sparkles size={11} className="text-amber-500" /> SOL-BODY
                                            </button>

                                            {/* ── SET A-D dropdown ── */}
                                            <div className="relative">
                                                <button
                                                    className={`sel-btn flex items-center gap-1 px-3.5 py-2 rounded-[14px] text-[10px] font-black transition-all active:scale-95 ${showOptionsScroll ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                                    onClick={() => { setShowOptionsScroll(v => !v); setShowScanScroll(false); }}
                                                >
                                                    <Target size={11} /> SET A-D
                                                    <ChevronDown size={11} strokeWidth={3} className={`transition-transform ${showOptionsScroll ? 'rotate-180' : ''}`} />
                                                </button>
                                                <AnimatePresence>
                                                    {showOptionsScroll && (
                                                        <motion.div
                                                            initial={{ opacity: 0, scale: 0.93 }}
                                                            animate={{ opacity: 1, scale: 1 }}
                                                            exit={{ opacity: 0, scale: 0.93 }}
                                                            className="sel-drop absolute w-40 bg-white border border-slate-200 rounded-3xl p-1.5 shadow-2xl z-[110] flex flex-col gap-0.5"
                                                            style={dropdownStyle}
                                                        >
                                                            {['A', 'B', 'C', 'D'].map((opt, i) => (
                                                                <button
                                                                    key={opt}
                                                                    className="sel-btn flex items-center justify-between w-full text-left px-3 py-2.5 hover:bg-indigo-50 rounded-2xl text-[11px] font-black text-slate-600 transition-all group/o"
                                                                    onClick={() => { onOptionCropCapture?.(captureCrop(), i); setSelection(null); setShowOptionsScroll(false); }}
                                                                >
                                                                    <span>Capture {opt}</span>
                                                                    <span className="w-5 h-5 rounded-lg bg-slate-100 group-hover/o:bg-indigo-600 group-hover/o:text-white flex items-center justify-center text-[10px] transition-colors">{opt}</span>
                                                                </button>
                                                            ))}
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>

                                            {/* ── AI SCAN dropdown ── */}
                                            <div className="relative">
                                                <button
                                                    className={`sel-btn flex items-center gap-1 px-3.5 py-2 rounded-[14px] text-[10px] font-black transition-all active:scale-95 ${showScanScroll ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100'}`}
                                                    onClick={() => { setShowScanScroll(v => !v); setShowOptionsScroll(false); }}
                                                >
                                                    <Zap size={11} /> AI SCAN
                                                    <ChevronDown size={11} strokeWidth={3} className={`transition-transform ${showScanScroll ? 'rotate-180' : ''}`} />
                                                </button>
                                                <AnimatePresence>
                                                    {showScanScroll && (
                                                        <motion.div
                                                            initial={{ opacity: 0, scale: 0.93 }}
                                                            animate={{ opacity: 1, scale: 1 }}
                                                            exit={{ opacity: 0, scale: 0.93 }}
                                                            className="sel-drop absolute w-44 bg-white border border-slate-200 rounded-3xl p-1.5 shadow-2xl z-[110] flex flex-col gap-0.5"
                                                            style={dropdownStyle}
                                                        >
                                                            {[
                                                                { label: 'Full Question', mode: 'full', icon: <Crosshair size={10} /> },
                                                                { label: 'Target: Q-Text', mode: 'text' },
                                                                { label: 'Target: Options', mode: 'options' },
                                                                { label: 'Target: Solution', mode: 'solution' },
                                                            ].map(({ label, mode, icon }) => (
                                                                <button
                                                                    key={mode}
                                                                    className="sel-btn flex items-center justify-between w-full text-left px-3 py-2.5 hover:bg-emerald-50 rounded-2xl text-[10px] font-black text-slate-600 transition-all group/s"
                                                                    onClick={() => { onScanSelection?.(captureCrop(), mode); setSelection(null); setShowScanScroll(false); }}
                                                                >
                                                                    <span>{label}</span>
                                                                    {icon && <span className="w-5 h-5 rounded bg-emerald-50 group-hover/s:bg-emerald-500 group-hover/s:text-white flex items-center justify-center transition-colors">{icon}</span>}
                                                                </button>
                                                            ))}
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>

                                            <div className="w-px h-5 bg-slate-200 mx-0.5" />
                                            <button className="sel-btn p-1.5 text-slate-400 hover:text-rose-500 hover:bg-red-50 rounded-xl transition-all" onClick={() => setSelection(null)}>
                                                <X size={15} />
                                            </button>
                                        </motion.div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Loading overlay */}
                {loading && (
                    <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex items-center justify-center z-50">
                        <div className="flex flex-col items-center gap-3">
                            <Loader2 className="animate-spin text-indigo-600" size={40} strokeWidth={1.5} />
                            <p className="text-slate-700 font-black uppercase tracking-[0.2em] text-[10px]">Loading PDF...</p>
                        </div>
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div className="absolute inset-0 flex items-center justify-center z-50">
                        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center max-w-sm">
                            <p className="text-red-700 font-bold text-sm">{error}</p>
                        </div>
                    </div>
                )}
            </div>

            {/* ── FOOTER ── */}
            <div className="bg-white border-t border-slate-200/40 px-6 py-3 flex items-center justify-between z-30 shrink-0">
                <div className="flex items-center gap-8 text-[10px] text-slate-400 font-black uppercase tracking-[0.25em]">
                    <span className="flex items-center gap-1.5 text-slate-500"><MousePointer size={12} className="text-indigo-600" /> Drag to Select</span>
                    <span className="flex items-center gap-1.5"><Target size={12} /> Targeted Extract</span>
                    <span className="flex items-center gap-1.5 text-emerald-600"><Zap size={12} /> AI Scan</span>
                </div>
                <div className="flex items-center gap-2 opacity-40">
                    <img src="/logo.png" className="h-3.5 grayscale brightness-150" alt="Apex" />
                    <span className="text-[9px] font-black tracking-widest uppercase">Apex AI Engine v2.0</span>
                </div>
            </div>
        </div>
    );
};

export default PdfViewer;
