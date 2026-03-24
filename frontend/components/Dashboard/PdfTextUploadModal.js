'use client';
import { useState, useRef, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { Upload, X, ChevronLeft, ChevronRight, CheckCircle, Type, Loader2 } from 'lucide-react';
import RichMathEditor from './RichMathEditor';

// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

const PdfTextUploadModal = ({ onUpload, onClose, onZoom }) => {
    const [file, setFile] = useState(null);
    const [pdf, setPdf] = useState(null);
    const [numPages, setNumPages] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [scale, setScale] = useState(1.5);
    const [isDragging, setIsDragging] = useState(false);
    const [startPos, setStartPos] = useState({ x: 0, y: 0 });
    const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 });
    const [selection, setSelection] = useState(null);
    const [isMoving, setIsMoving] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [resizeHandle, setResizeHandle] = useState(null);
    const [uploadedCount, setUploadedCount] = useState(0);
    const [initialSelection, setInitialSelection] = useState(null);
    const [pdfSize, setPdfSize] = useState({ width: 0, height: 0 });
    const [isPdfLoading, setIsPdfLoading] = useState(false);
    const [isCapturing, setIsCapturing] = useState(false);
    const [activeSlot, setActiveSlot] = useState('question');
    // Resizable sidebar
    const [sidebarWidth, setSidebarWidth] = useState(450);
    const [isSidebarDragging, setIsSidebarDragging] = useState(false);
    const sidebarDragRef = useRef(null);

    // Extracted data for current question
    const [currentQuestionData, setCurrentQuestionData] = useState({
        text: '',
        options: ['', '', '', ''],
        correctOption: '',        // For MCQ
        correctOptions: [],       // For MSQ
        integerAnswer: '',         // For Integer
        type: 'mcq',
        optionsLayout: 'list',    // 'list' or 'grid'
        subject: 'Physics',
        section: '',              // Section within subject (e.g. 'Section A')
        topic: '',
        marks: 4,
        negativeMarks: 1,
        solution: ''
    });

    const [capturedHighlights, setCapturedHighlights] = useState([]);
    const [globalHighlights, setGlobalHighlights] = useState([]); // Persistent guides across all questions in this session
    const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
    const [isResizeMode, setIsResizeMode] = useState(false);

    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const overlayRef = useRef(null);
    const renderTaskRef = useRef(null);

    // Sidebar resize drag logic
    useEffect(() => {
        const onMouseMove = (e) => {
            if (!isSidebarDragging) return;
            const newWidth = window.innerWidth - e.clientX;
            setSidebarWidth(Math.min(700, Math.max(280, newWidth)));
        };
        const onMouseUp = () => setIsSidebarDragging(false);
        if (isSidebarDragging) {
            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mouseup', onMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };
    }, [isSidebarDragging]);

    const captureSelection = async () => {
        if (!selection || !pdf) {
            return;
        }

        setIsCapturing(true);
        try {
            const page = await pdf.getPage(currentPage);
            const viewport = page.getViewport({ scale });
            const textContent = await page.getTextContent();

            const selLeft   = selection.x;
            const selRight  = selection.x + selection.width;
            const selTop    = selection.y;
            const selBottom = selection.y + selection.height;

            const extracted = textContent.items
                .filter(item => {
                    const [screenX, screenY] = viewport.convertToViewportPoint(
                        item.transform[4],
                        item.transform[5]
                    );
                    return (
                        screenX >= selLeft - 8 && screenX <= selRight + 8 &&
                        screenY >= selTop - 8 && screenY <= selBottom + 8
                    );
                })
                .sort((a, b) => {
                    const [aX, aY] = viewport.convertToViewportPoint(a.transform[4], a.transform[5]);
                    const [bX, bY] = viewport.convertToViewportPoint(b.transform[4], b.transform[5]);
                    if (Math.abs(aY - bY) > 5) return aY - bY;
                    return aX - bX;
                })
                .map(item => item.str)
                .join(' ')
                .replace(/\s+/g, ' ')
                .trim();

            if (!extracted) {
                alert('Koi text nahi mila. Yeh PDF scan ki hui (image-based) ho sakti hai.');
                setIsCapturing(false);
                return;
            }

            // Add highlight
            setCapturedHighlights(prev => [...prev.filter(h => h.slot !== activeSlot || activeSlot === 'solution'), { ...selection, slot: activeSlot, page: currentPage }]);

            // Update question data based on active slot
            setCurrentQuestionData(prev => {
                const newData = { ...prev };
                if (activeSlot === 'question') {
                    newData.text = (newData.text ? newData.text + '\n' : '') + extracted;
                    setActiveSlot(prev.type === 'integer' ? 'solution' : 'optA');
                } else if (activeSlot === 'optA') {
                    newData.options[0] = (newData.options[0] ? newData.options[0] + ' ' : '') + extracted;
                    setActiveSlot('optB');
                } else if (activeSlot === 'optB') {
                    newData.options[1] = (newData.options[1] ? newData.options[1] + ' ' : '') + extracted;
                    setActiveSlot('optC');
                } else if (activeSlot === 'optC') {
                    newData.options[2] = (newData.options[2] ? newData.options[2] + ' ' : '') + extracted;
                    setActiveSlot('optD');
                } else if (activeSlot === 'optD') {
                    newData.options[3] = (newData.options[3] ? newData.options[3] + ' ' : '') + extracted;
                    setActiveSlot('solution');
                } else if (activeSlot === 'solution') {
                    newData.solution = (newData.solution ? newData.solution + '\n' : '') + extracted;
                }
                return newData;
            });

            // If it's one of the options (A, B, C) and we just captured, we can shift the selection box down automatically
            if (activeSlot.startsWith('opt') && activeSlot !== 'optD') {
                setSelection(prev => {
                    if (!prev) return null;
                    const newY = prev.y + prev.height + 15;
                    return { ...prev, y: Math.min(newY, pdfSize.height - prev.height) };
                });
            } else {
                setSelection(null);
            }
        } catch (error) {
            console.error("Error capturing selection:", error);
            alert("Failed to extract text: " + error.message);
        } finally {
            setIsCapturing(false);
        }
    };

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            const tag = e.target.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'MATH-FIELD' || e.target.isContentEditable) return;

            const key = e.key.toLowerCase();
            if ((e.ctrlKey || e.metaKey) && key === 'r') {
                e.preventDefault();
                setIsResizeMode(prev => !prev);
                return;
            }
            if (key === 'q') setActiveSlot('question');
            if (key === '1') setActiveSlot('optA');
            if (key === '2') setActiveSlot('optB');
            if (key === '3') setActiveSlot('optC');
            if (key === '4') setActiveSlot('optD');
            if (key === 's') setActiveSlot('solution');
            if (e.key === 'Enter' && selection) captureSelection();
            if (e.key === 'Escape') setSelection(null);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selection, activeSlot, currentPage, pdf, pdfSize]);

    // Load PDF
    useEffect(() => {
        if (!file) return;
        const loadPdf = async () => {
            setIsPdfLoading(true);
            try {
                const arrayBuffer = await file.arrayBuffer();
                const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
                const pdfDoc = await loadingTask.promise;
                setPdf(pdfDoc);
                setNumPages(pdfDoc.numPages);
                setCurrentPage(1);
            } catch (error) {
                console.error("Error loading PDF:", error);
                alert("Failed to load PDF: " + error.message);
            } finally {
                setIsPdfLoading(false);
            }
        };
        loadPdf();
    }, [file]);

    // Render Page
    useEffect(() => {
        if (!pdf || !canvasRef.current) return;
        const renderPage = async () => {
            try {
                if (renderTaskRef.current) await renderTaskRef.current.cancel();
                const page = await pdf.getPage(currentPage);
                const HIGH_RES_SCALE = 3;
                const baseViewport = page.getViewport({ scale });
                const viewport = page.getViewport({ scale: scale * HIGH_RES_SCALE });
                const canvas = canvasRef.current;
                const context = canvas.getContext('2d');
                if (!context) return;
                canvas.height = viewport.height;
                canvas.width = viewport.width;
                canvas.style.width = `${baseViewport.width}px`;
                canvas.style.height = `${baseViewport.height}px`;
                setPdfSize({ width: baseViewport.width, height: baseViewport.height });
                const renderTask = page.render({ canvasContext: context, viewport: viewport });
                renderTaskRef.current = renderTask;
                await renderTask.promise;
                renderTaskRef.current = null;
            } catch (error) {
                if (error.name !== 'RenderingCancelledException') console.error("Error rendering page:", error);
            }
        };
        renderPage();
        return () => { if (renderTaskRef.current) renderTaskRef.current.cancel(); };
    }, [pdf, currentPage, scale]);

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile?.type === 'application/pdf') setFile(selectedFile);
        else alert("Please select a PDF file");
    };

    const handleMouseDown = (e) => {
        if (!overlayRef.current) return;
        const rect = overlayRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        if (selection && x >= selection.x && x <= selection.x + selection.width && y >= selection.y && y <= selection.y + selection.height) {
            setIsMoving(true);
            setStartPos({ x, y });
            return;
        }
        setIsDragging(true);
        setStartPos({ x, y });
        setCurrentPos({ x, y });
        setSelection(null);
    };

    const handleResizeStart = (e, handle) => {
        e.stopPropagation();
        if (!overlayRef.current) return;
        const rect = overlayRef.current.getBoundingClientRect();
        setIsResizing(true);
        setResizeHandle(handle);
        setStartPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        setInitialSelection({ ...selection });
    };

    const handleMouseMove = (e) => {
        if (!overlayRef.current) return;
        const rect = overlayRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        if (isResizing && initialSelection) {
            const dx = x - startPos.x;
            const dy = y - startPos.y;
            let { x: nx, y: ny, width: nw, height: nh } = initialSelection;
            if (resizeHandle.includes('e')) nw = Math.max(10, initialSelection.width + dx);
            if (resizeHandle.includes('s')) nh = Math.max(10, initialSelection.height + dy);
            if (resizeHandle.includes('w')) { nx = Math.min(nx + nw - 10, nx + dx); nw = initialSelection.width - (nx - initialSelection.x); }
            if (resizeHandle.includes('n')) { ny = Math.min(ny + nh - 10, ny + dy); nh = initialSelection.height - (ny - initialSelection.y); }
            setSelection({ x: nx, y: ny, width: nw, height: nh });
            return;
        }
        if (isMoving && selection) {
            setSelection(prev => ({ ...prev, x: prev.x + (x - startPos.x), y: prev.y + (y - startPos.y) }));
            setStartPos({ x, y });
            return;
        }
        if (isDragging) setCurrentPos({ x, y });
    };

    const handleMouseUp = () => {
        if (isResizing) { setIsResizing(false); setResizeHandle(null); return; }
        if (isMoving) { setIsMoving(false); return; }
        if (!isDragging) return;
        setIsDragging(false);
        const x = Math.min(startPos.x, currentPos.x), y = Math.min(startPos.y, currentPos.y);
        const w = Math.abs(startPos.x - currentPos.x), h = Math.abs(startPos.y - currentPos.y);
        if (w > 5 && h > 5) setSelection({ x, y, width: w, height: h });
    };

    const handleAddToQueue = () => {
        if (!currentQuestionData.text.trim()) { alert("Please extract or type the question text."); return; }
        if ((currentQuestionData.type === 'mcq' || currentQuestionData.type === 'matching') && !currentQuestionData.correctOption) { alert('Please select the correct option.'); return; }
        if (currentQuestionData.type === 'msq' && currentQuestionData.correctOptions.length === 0) { alert("Please mark at least one correct answer"); return; }
        if (currentQuestionData.type === 'integer' && currentQuestionData.integerAnswer === '') { alert("Please enter the integer answer"); return; }

        onUpload([{ ...currentQuestionData }]);
        setCurrentQuestionData(prev => ({
            ...prev,
            text: '',
            options: ['', '', '', ''],
            correctOption: '',
            correctOptions: [],
            integerAnswer: '',
            solution: ''
        }));
        setGlobalHighlights(prev => [...prev, ...capturedHighlights]);
        setCapturedHighlights([]);
        setActiveSlot('question');
        setUploadedCount(prev => prev + 1);
        alert("Question added to queue!");
    };

    if (!file) {
        return (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[70] p-4 backdrop-blur-sm">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8 transform transition-all">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><Type className="text-indigo-600" /> PDF Text Extractor</h3>
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X size={24} className="text-gray-400" /></button>
                    </div>
                    <div className="border-3 border-dashed border-indigo-100 rounded-xl p-10 text-center hover:border-indigo-300 transition-colors group bg-indigo-50/30">
                        <Upload size={48} className="mx-auto text-indigo-400 mb-4 group-hover:scale-110 transition-transform" />
                        <label className="cursor-pointer">
                            <span className="bg-indigo-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-indigo-700 transition shadow-lg shadow-indigo-200 inline-block">Choose Text PDF</span>
                            <input type="file" accept=".pdf" className="hidden" onChange={handleFileChange} />
                        </label>
                        <p className="text-sm text-gray-500 mt-4 font-medium italic">Supports text-based test PDFs</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/90 flex z-[70] overflow-hidden flex-col md:flex-row" style={{ userSelect: isSidebarDragging ? 'none' : 'auto' }}>
            <div className="flex-1 flex flex-col h-full bg-[#0f1117] min-w-0">
                <div className="px-4 py-3 bg-[#1a1d27] border-b border-white/5 flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                        <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/8 hover:bg-white/15 text-gray-300"><ChevronLeft size={16} /></button>
                        <div className="bg-white/8 border border-white/10 rounded-lg px-3 py-1.5 text-xs font-bold text-white tabular-nums">{currentPage} <span className="text-gray-500">/ {numPages}</span></div>
                        <button onClick={() => setCurrentPage(p => Math.min(numPages, p + 1))} disabled={currentPage === numPages} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/8 hover:bg-white/15 text-gray-300"><ChevronRight size={16} /></button>
                    </div>
                    <div className="hidden lg:flex items-center gap-1.5 text-[9px] uppercase font-bold tracking-widest">
                        {[{ key: 'Q', label: 'Ques' }, { key: '1–4', label: 'Opt' }, { key: 'S', label: 'Sol' }, { key: '↵', label: 'Extract' }].map(({ key, label }) => (
                            <span key={key} className="flex items-center gap-1 border border-white/10 rounded-md px-2 py-1 bg-white/5 text-gray-400"><kbd className="font-black">{key}</kbd><span className="opacity-50">·</span>{label}</span>
                        ))}
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex items-center bg-white/8 border border-white/10 rounded-lg overflow-hidden">
                            <button onClick={() => setScale(s => Math.max(0.5, s - 0.2))} className="w-8 h-8 flex items-center justify-center text-gray-300 hover:bg-white/15">-</button>
                            <span className="px-2.5 text-xs font-bold text-white tabular-nums border-x border-white/10">{Math.round(scale * 100)}%</span>
                            <button onClick={() => setScale(s => Math.min(3, s + 0.2))} className="w-8 h-8 flex items-center justify-center text-gray-300 hover:bg-white/15">+</button>
                        </div>
                        <button onClick={() => setFile(null)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/8 hover:bg-red-500/30 text-gray-400"><X size={14} /></button>
                    </div>
                </div>

                <div className="flex-1 overflow-auto custom-scrollbar relative" ref={containerRef}>
                    <div className="relative inline-block m-4 shadow-2xl" onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} ref={overlayRef}>
                        <canvas ref={canvasRef} />
                        {capturedHighlights.map((h, i) => h.page === currentPage && (
                            <div key={i} className={`absolute border-2 ${h.slot === activeSlot ? 'border-indigo-400 bg-indigo-400/20' : 'border-emerald-400/40 bg-emerald-400/10'} rounded-sm pointer-events-none`} style={{ left: h.x, top: h.y, width: h.width, height: h.height }} />
                        ))}
                        {selection && (
                            <div className={`absolute border-2 border-indigo-400 bg-indigo-400/10 rounded-sm ${isMoving ? 'cursor-grabbing' : 'cursor-grab'}`} style={{ left: selection.x, top: selection.y, width: selection.width, height: selection.height }}>
                                {isResizeMode && ['nw', 'ne', 'sw', 'se', 'n', 's', 'w', 'e'].map(h => (
                                    <div key={h} className={`absolute bg-transparent z-50 ${h.length === 2 ? 'w-5 h-5 -m-2.5' : 'w-5 h-5 -translate-x-1/2 -translate-y-1/2'} ${h.includes('n') ? 'top-0' : h.includes('s') ? 'bottom-0' : 'top-1/2'} ${h.includes('w') ? 'left-0' : h.includes('e') ? 'right-0' : 'left-1/2'} cursor-${h}-resize`} onMouseDown={(e) => handleResizeStart(e, h)} />
                                ))}
                                <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 flex gap-2">
                                    <button onClick={(e) => { e.stopPropagation(); captureSelection(); }} className="bg-indigo-600 text-white px-4 py-2 rounded-full text-xs font-black shadow-xl flex items-center gap-1.5"><CheckCircle size={14} /> {isCapturing ? 'Extracting...' : `Extract to ${activeSlot}`}</button>
                                    <button onClick={(e) => { e.stopPropagation(); setSelection(null); }} className="bg-red-500 text-white px-4 py-2 rounded-full text-xs font-black shadow-xl"><X size={13} /></button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="w-1.5 flex-shrink-0 bg-white/5 hover:bg-indigo-500/60 cursor-col-resize transition-colors group relative flex items-center justify-center" onMouseDown={(e) => { e.preventDefault(); setIsSidebarDragging(true); }}>
                <div className="w-0.5 h-12 rounded-full bg-white/20 group-hover:bg-indigo-400 transition-colors" />
            </div>

            <div className="flex flex-col shadow-2xl overflow-y-auto bg-gray-100 flex-shrink-0" style={{ width: sidebarWidth }}>
                <div className="p-4 bg-white border-b flex items-center justify-between sticky top-0 z-10 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-black text-sm">T</div>
                        <div><h4 className="text-sm font-bold text-gray-800 leading-none">Text Question Builder</h4></div>
                    </div>
                </div>

                <div className="flex-1 p-4 space-y-3 overflow-y-auto">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden p-3 space-y-2.5">
                        <div onClick={() => setActiveSlot('question')} className={`cursor-pointer border rounded-xl p-2.5 transition-all ${activeSlot === 'question' ? 'ring-2 ring-indigo-500 bg-indigo-50' : 'border-gray-200'}`}>
                            <span className="text-[10px] font-black uppercase text-gray-400 mb-1 block">Question Text</span>
                            <RichMathEditor value={currentQuestionData.text} onChange={(val) => setCurrentQuestionData(prev => ({ ...prev, text: val }))} placeholder="Question text..." className="w-full text-xs" />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            {['optA', 'optB', 'optC', 'optD'].map((opt, i) => (
                                <div key={opt} onClick={() => setActiveSlot(opt)} className={`cursor-pointer border rounded-xl p-2.5 transition-all ${activeSlot === opt ? 'ring-2 ring-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                                    <span className="text-[10px] font-black uppercase text-gray-400 mb-1 block">Option {opt.slice(-1)}</span>
                                    <RichMathEditor value={currentQuestionData.options[i]} onChange={(val) => { setCurrentQuestionData(prev => { const newOpts = [...prev.options]; newOpts[i] = val; return { ...prev, options: newOpts }; }); }} placeholder={`Option ${opt.slice(-1)}...`} className="w-full text-[10px]" />
                                </div>
                            ))}
                        </div>
                        <div onClick={() => setActiveSlot('solution')} className={`cursor-pointer border rounded-xl p-2.5 transition-all ${activeSlot === 'solution' ? 'ring-2 ring-violet-500 bg-violet-50' : 'border-gray-200'}`}>
                            <span className="text-[10px] font-black uppercase text-gray-400 mb-1 block">Solution</span>
                            <RichMathEditor value={currentQuestionData.solution} onChange={(val) => setCurrentQuestionData(prev => ({ ...prev, solution: val }))} placeholder="Solution text..." className="w-full text-xs" />
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t bg-white space-y-2 sticky bottom-0">
                    <button onClick={handleAddToQueue} disabled={!currentQuestionData.text.trim()} className="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-40 transition-all flex items-center justify-center gap-2 text-sm"><CheckCircle size={16} /> Save & Next Question</button>
                    <button onClick={onClose} className="w-full text-gray-400 py-1 font-bold text-[9px] hover:text-gray-600 transition uppercase tracking-widest text-center">Close</button>
                </div>
            </div>

            <style jsx>{`.custom-scrollbar::-webkit-scrollbar { width: 6px; } .custom-scrollbar::-webkit-scrollbar-track { background: transparent; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #374151; border-radius: 3px; }`}</style>
        </div>
    );
};

export default PdfTextUploadModal;
