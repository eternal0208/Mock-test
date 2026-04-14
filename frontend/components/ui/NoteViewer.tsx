'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Download, Maximize2, Minimize2, RotateCw, Loader2 } from 'lucide-react';
import { API_BASE_URL } from '@/lib/config';

// Dynamically load pdfjs-dist to avoid SSR issues
let pdfjsLib: any = null;
let cachedLogo: HTMLImageElement | null = null;

interface NoteViewerProps {
    fileUrl: string;
    title: string;
    isDownloadable: boolean;
    onClose: () => void;
}

export default function NoteViewer({ fileUrl, title, isDownloadable, onClose }: NoteViewerProps) {
    const [pdf, setPdf] = useState<any>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [scale, setScale] = useState(1.0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [rendering, setRendering] = useState(false);
    const [isPremiumLocked, setIsPremiumLocked] = useState(false);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const viewerRef = useRef<HTMLDivElement>(null);

    // Load PDF.js library
    useEffect(() => {
        const loadPdfJs = async () => {
            if (!pdfjsLib) {
                pdfjsLib = await import('pdfjs-dist');
                pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
            }
            try {
                const proxyUrl = `${API_BASE_URL}/api/notes/proxy?url=${encodeURIComponent(fileUrl)}`;
                const loadingTask = pdfjsLib.getDocument(proxyUrl);
                const pdfDoc = await loadingTask.promise;
                setPdf(pdfDoc);
                setTotalPages(pdfDoc.numPages);
                setLoading(false);
            } catch (err: any) {
                console.error('PDF Load Error:', err);
                setError('Failed to load PDF. The file may be corrupted or inaccessible.');
                setLoading(false);
            }
        };
        loadPdfJs();
    }, [fileUrl]);

    // Render current page
    const renderPage = useCallback(async (pageNum: number) => {
        if (!pdf || !canvasRef.current || rendering) return;
        setRendering(true);

        try {
            const page = await pdf.getPage(pageNum);
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            // Calculate viewport to fit container width and height
            const containerWidth = containerRef.current?.clientWidth || 800;
            const containerHeight = containerRef.current?.clientHeight || 800;
            const originalViewport = page.getViewport({ scale: 1 });
            
            // Use minimum of width or height fit to ensure the whole page fits on screen
            const fitScaleWidth = (containerWidth - 32) / originalViewport.width; 
            const fitScaleHeight = (containerHeight - 32) / originalViewport.height;
            const fitScale = Math.min(fitScaleWidth, fitScaleHeight); 
            const effectiveScale = fitScale * scale;

            const viewport = page.getViewport({ scale: effectiveScale });

            // Set canvas dimensions for sharp rendering (force min 3x DPR for extreme clarity to fix blur)
            const dpr = Math.max(window.devicePixelRatio || 1, 3);
            canvas.width = viewport.width * dpr;
            canvas.height = viewport.height * dpr;
            canvas.style.width = `${viewport.width}px`;
            canvas.style.height = `${viewport.height}px`;

            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';

            await page.render({
                canvasContext: ctx,
                viewport: viewport
            }).promise;

            // Apply Premium Image Watermark Overlay
            ctx.save();
            ctx.translate(viewport.width / 2, viewport.height / 2);
            
            // Load and draw logo watermark
            if (!cachedLogo) {
                cachedLogo = new window.Image();
                cachedLogo.src = '/logo.png';
                await new Promise((resolve) => {
                    cachedLogo!.onload = resolve;
                    cachedLogo!.onerror = resolve;
                });
            }

            ctx.globalAlpha = 0.15; // Set watermark transparency
            
            if (cachedLogo.complete && cachedLogo.width > 0) {
                const imgWidth = viewport.width * 0.5; // 50% of page width
                const aspect = cachedLogo.height / cachedLogo.width;
                const imgHeight = imgWidth * aspect;
                
                // Keep image straight, no rotation, heavily blended
                ctx.drawImage(cachedLogo, -imgWidth / 2, -imgHeight / 2, imgWidth, imgHeight);
            
                // Tagline (Smaller, spaced out below logo)
                const subFontSize = Math.max(16, 24 * effectiveScale);
                ctx.font = `700 ${subFontSize}px system-ui, -apple-system, sans-serif`;
                ctx.fillStyle = '#0f172a';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.globalAlpha = 0.08;
                ctx.fillText('S T I C K   T O   S U C C E S S', 0, (imgHeight / 2) + (24 * effectiveScale));
            }
            
            ctx.restore();

        } catch (err) {
            console.error('Page render error:', err);
        } finally {
            setRendering(false);
        }
    }, [pdf, scale, rendering]);

    useEffect(() => {
        if (pdf) renderPage(currentPage);
    }, [pdf, currentPage, scale, renderPage]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                e.preventDefault();
                setCurrentPage(p => Math.min(p + 1, totalPages));
            } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                e.preventDefault();
                setCurrentPage(p => Math.max(p - 1, 1));
            } else if (e.key === 'Escape') {
                if (isFullscreen) toggleFullscreen();
                else onClose();
            } else if (e.key === '+' || e.key === '=') {
                e.preventDefault();
                setScale(s => Math.min(s + 0.25, 3));
            } else if (e.key === '-') {
                e.preventDefault();
                setScale(s => Math.max(s - 0.25, 0.5));
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [totalPages, isFullscreen, onClose]);

    const toggleFullscreen = () => {
        if (!viewerRef.current) return;
        if (!document.fullscreenElement) {
            viewerRef.current.requestFullscreen().catch(() => { });
            setIsFullscreen(true);
        } else {
            document.exitFullscreen().catch(() => { });
            setIsFullscreen(false);
        }
    };

    const handleDownload = () => {
        const a = document.createElement('a');
        a.href = fileUrl;
        a.download = title + '.pdf';
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    if (loading) {
        return (
            <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl z-[100] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center animate-pulse">
                            <Loader2 className="text-white animate-spin" size={36} />
                        </div>
                    </div>
                    <p className="text-white/80 font-semibold text-lg">Loading PDF...</p>
                    <p className="text-white/40 text-sm">{title}</p>
                </div>
            </div>
        );
    }

    if (isPremiumLocked) {
        return (
            <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-2xl z-[100] flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl p-8 sm:p-10 max-w-md text-center shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-white/10 animate-in zoom-in duration-300">
                    <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <span className="text-4xl">👑</span>
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 mb-3" style={{ fontFamily: 'var(--font-headline)' }}>Premium Content</h3>
                    <p className="text-slate-600 mb-8 font-medium leading-relaxed">
                        This study material is reserved for premium students. Enroll in a paid test series in your field to unlock all premium notes.
                    </p>
                    <div className="flex flex-col gap-3">
                        <button
                            onClick={() => window.location.href = '/dashboard'}
                            className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition shadow-lg shadow-indigo-200"
                        >
                            Explore Paid Series
                        </button>
                        <button
                            onClick={onClose}
                            className="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition"
                        >
                            Maybe Later
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl p-8 max-w-md text-center shadow-2xl">
                    <div className="text-5xl mb-4">📄</div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">Could not open PDF</h3>
                    <p className="text-slate-500 mb-6">{error}</p>
                    <button
                        onClick={onClose}
                        className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div ref={viewerRef} className="fixed inset-0 z-[100] flex flex-col" style={{ background: '#1a1a2e' }}>
            {/* Top Bar */}
            <div className="shrink-0 flex items-center justify-between px-3 sm:px-6 py-2.5 sm:py-3" style={{ background: 'rgba(15,15,35,0.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <button onClick={onClose} className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition shrink-0" title="Close">
                        <X size={20} />
                    </button>
                    <div className="min-w-0">
                        <h3 className="text-white font-bold text-sm sm:text-base truncate">{title}</h3>
                        <p className="text-white/40 text-[10px] sm:text-xs font-medium">
                            Page {currentPage} of {totalPages}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                    {/* Zoom controls */}
                    <div className="hidden sm:flex items-center gap-1 bg-white/5 rounded-xl px-2 py-1 border border-white/10">
                        <button onClick={() => setScale(s => Math.max(s - 0.25, 0.5))} className="p-1.5 text-white/60 hover:text-white transition" title="Zoom Out">
                            <ZoomOut size={16} />
                        </button>
                        <span className="text-white/70 text-xs font-bold min-w-[3rem] text-center">{Math.round(scale * 100)}%</span>
                        <button onClick={() => setScale(s => Math.min(s + 0.25, 3))} className="p-1.5 text-white/60 hover:text-white transition" title="Zoom In">
                            <ZoomIn size={16} />
                        </button>
                        <button onClick={() => setScale(1)} className="p-1.5 text-white/60 hover:text-white transition" title="Reset">
                            <RotateCw size={14} />
                        </button>
                    </div>

                    {/* Mobile zoom */}
                    <div className="flex sm:hidden items-center gap-0.5">
                        <button onClick={() => setScale(s => Math.max(s - 0.25, 0.5))} className="p-2 text-white/60 hover:text-white transition">
                            <ZoomOut size={18} />
                        </button>
                        <span className="text-white/60 text-[10px] font-bold w-8 text-center">{Math.round(scale * 100)}%</span>
                        <button onClick={() => setScale(s => Math.min(s + 0.25, 3))} className="p-2 text-white/60 hover:text-white transition">
                            <ZoomIn size={18} />
                        </button>
                    </div>

                    {isDownloadable && (
                        <button onClick={handleDownload} className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition shadow-lg shadow-emerald-500/20 active:scale-95" title="Download PDF">
                            <Download size={16} /> <span className="hidden sm:inline text-sm">Download</span>
                        </button>
                    )}

                    <button onClick={toggleFullscreen} className="hidden sm:block p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition" title="Fullscreen">
                        {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                    </button>
                </div>
            </div>

            {/* PDF Canvas Area */}
            <div 
                ref={containerRef} 
                className="flex-1 overflow-auto flex justify-center" 
                style={{ background: 'linear-gradient(180deg, #12122a 0%, #1a1a35 100%)' }}
                onContextMenu={!isDownloadable ? (e) => e.preventDefault() : undefined}
            >
                <div className="py-4 sm:py-8 px-2 sm:px-4">
                    <div className="relative bg-white rounded-lg shadow-2xl shadow-black/50 overflow-hidden select-none">
                        <canvas ref={canvasRef} />
                        {rendering && (
                            <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                                <Loader2 className="text-indigo-500 animate-spin" size={32} />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Bottom Navigation Bar */}
            <div className="shrink-0 flex items-center justify-center gap-3 sm:gap-4 px-4 py-2.5 sm:py-3" style={{ background: 'rgba(15,15,35,0.95)', backdropFilter: 'blur(20px)', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <button
                    onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                    disabled={currentPage === 1}
                    className="flex items-center gap-1.5 px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm transition disabled:opacity-20 disabled:cursor-not-allowed"
                    style={{ background: currentPage === 1 ? 'transparent' : 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.8)' }}
                >
                    <ChevronLeft size={16} /> <span className="hidden sm:inline">Previous</span>
                </button>

                {/* Page input */}
                <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10">
                    <input
                        type="number"
                        value={currentPage}
                        onChange={e => {
                            const val = parseInt(e.target.value);
                            if (val >= 1 && val <= totalPages) setCurrentPage(val);
                        }}
                        className="w-10 sm:w-12 bg-transparent text-white text-center font-bold text-sm outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        min={1}
                        max={totalPages}
                    />
                    <span className="text-white/40 text-xs font-bold">/ {totalPages}</span>
                </div>

                <button
                    onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="flex items-center gap-1.5 px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm transition disabled:opacity-20 disabled:cursor-not-allowed"
                    style={{ background: currentPage === totalPages ? 'transparent' : 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.8)' }}
                >
                    <span className="hidden sm:inline">Next</span> <ChevronRight size={16} />
                </button>
            </div>
        </div>
    );
}
