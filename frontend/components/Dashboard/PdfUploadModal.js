'use client';
import { useState, useRef, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { Upload, X, ChevronLeft, ChevronRight, Crop, CheckCircle, Image as ImageIcon, Loader2 } from 'lucide-react';
import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

// Initialize PDF.js worker
// Initialize PDF.js worker - Use unpkg as a more reliable version-specific CDN
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

const PdfUploadModal = ({ onUpload, onClose, onZoom }) => {
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
    const [isPdfLoading, setIsPdfLoading] = useState(false);
    const [isCapturing, setIsCapturing] = useState(false);
    const [activeSlot, setActiveSlot] = useState('question'); // question, optA, optB, optC, optD, solution

    // Extracted data for current question
    const [currentQuestionData, setCurrentQuestionData] = useState({
        text: '',
        image: null,
        options: ['', '', '', ''],
        optionImages: [null, null, null, null],
        correctOption: '',        // For MCQ
        correctOptions: [],       // For MSQ
        integerAnswer: '',         // For Integer
        type: 'mcq',
        optionsLayout: 'list',    // 'list' or 'grid'
        questionImageSize: 'medium', // 'small' | 'medium' | 'large'
        optionsImageSize: 'medium', // 'small' | 'medium' | 'large'
        subject: 'Physics',
        topic: '',
        marks: 4,
        negativeMarks: 1
    });

    const [capturedHighlights, setCapturedHighlights] = useState([]);
    const [globalHighlights, setGlobalHighlights] = useState([]); // Persistent guides across all questions in this session
    const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
    const [isResizeMode, setIsResizeMode] = useState(false);

    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const overlayRef = useRef(null);
    const renderTaskRef = useRef(null);

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

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
    }, [selection, activeSlot, currentPage]);

    // Load PDF
    useEffect(() => {
        if (!file) return;

        const loadPdf = async () => {
            console.log("Starting to load PDF...");
            setIsPdfLoading(true);
            try {
                const arrayBuffer = await file.arrayBuffer();
                console.log("ArrayBuffer created, size:", arrayBuffer.byteLength);
                const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });

                loadingTask.onProgress = (progress) => {
                    console.log("Loading progress:", (progress.loaded / progress.total * 100).toFixed(1) + "%");
                };

                const pdfDoc = await loadingTask.promise;
                console.log("PDF loaded successfully, pages:", pdfDoc.numPages);
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
                // Cancel previous render task if it exists
                if (renderTaskRef.current) {
                    await renderTaskRef.current.cancel();
                }

                const page = await pdf.getPage(currentPage);
                const viewport = page.getViewport({ scale });
                const canvas = canvasRef.current;
                const context = canvas.getContext('2d');

                if (!context) return;

                canvas.height = viewport.height;
                canvas.width = viewport.width;

                const renderContext = {
                    canvasContext: context,
                    viewport: viewport
                };

                const renderTask = page.render(renderContext);
                renderTaskRef.current = renderTask;

                await renderTask.promise;
                renderTaskRef.current = null;
            } catch (error) {
                if (error.name === 'RenderingCancelledException') {
                    // Ignore cancellation errors
                    return;
                }
                console.error("Error rendering page:", error);
            }
        };

        renderPage();

        // Cleanup on unmount or dependency change
        return () => {
            if (renderTaskRef.current) {
                renderTaskRef.current.cancel();
            }
        };
    }, [pdf, currentPage, scale]);

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile && selectedFile.type === 'application/pdf') {
            setFile(selectedFile);
        } else {
            alert("Please select a PDF file");
        }
    };

    const handleMouseDown = (e) => {
        if (!canvasRef.current || !overlayRef.current) return;
        const rect = overlayRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Check if click is inside existing selection to move it
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
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        setIsResizing(true);
        setResizeHandle(handle);
        setStartPos({ x, y });
        setInitialSelection({ ...selection });
    };

    const handleMouseMove = (e) => {
        if (!overlayRef.current) return;
        const rect = overlayRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const SNAP_THRESHOLD = 8;
        let snapX = x;
        let snapY = y;

        const allSnappableBoxes = [...globalHighlights, ...capturedHighlights];

        // Apply magnetic snapping against previously captured options on this page
        allSnappableBoxes.forEach(h => {
            if (h.page !== currentPage) return;
            // Snap to left edges
            if (Math.abs(x - h.x) < SNAP_THRESHOLD) snapX = h.x;
            // Snap to right edges
            if (Math.abs(x - (h.x + h.width)) < SNAP_THRESHOLD) snapX = h.x + h.width;

            // Snap to top edges
            if (Math.abs(y - h.y) < SNAP_THRESHOLD) snapY = h.y;
            // Snap to bottom edges
            if (Math.abs(y - (h.y + h.height)) < SNAP_THRESHOLD) snapY = h.y + h.height;
        });

        // Set the active box mapping for the visual smart guide lines
        const snappedBox = allSnappableBoxes.find(h =>
            Math.abs(snapX - h.x) < SNAP_THRESHOLD ||
            Math.abs(snapX - (h.x + h.width)) < SNAP_THRESHOLD ||
            Math.abs(snapY - h.y) < SNAP_THRESHOLD ||
            Math.abs(snapY - (h.y + h.height)) < SNAP_THRESHOLD
        );

        if (snappedBox) {
            setActiveBox({
                left: snappedBox.x,
                right: snappedBox.x + snappedBox.width,
                top: snappedBox.y,
                bottom: snappedBox.y + snappedBox.height
            });
        } else {
            setActiveBox(null);
        }

        if (isResizing && initialSelection) {
            const dx = snapX - startPos.x; // Use snapped coordinates for resizing!
            const dy = snapY - startPos.y;
            let newX = initialSelection.x;
            let newY = initialSelection.y;
            let newWidth = initialSelection.width;
            let newHeight = initialSelection.height;

            if (resizeHandle.includes('e')) newWidth = Math.max(10, initialSelection.width + dx);
            if (resizeHandle.includes('s')) newHeight = Math.max(10, initialSelection.height + dy);
            if (resizeHandle.includes('w')) {
                newX = Math.min(initialSelection.x + initialSelection.width - 10, initialSelection.x + dx);
                newWidth = initialSelection.width - (newX - initialSelection.x);
            }
            if (resizeHandle.includes('n')) {
                newY = Math.min(initialSelection.y + initialSelection.height - 10, initialSelection.y + dy);
                newHeight = initialSelection.height - (newY - initialSelection.y);
            }

            setSelection({ x: newX, y: newY, width: newWidth, height: newHeight });
            return;
        }

        if (isMoving && selection) {
            let dx = snapX - startPos.x;
            let dy = snapY - startPos.y;

            setSelection(prev => {
                let newX = prev.x + dx;
                let newY = prev.y + dy;

                // Also snap the actual box coordinates when dragging it around entirely
                allSnappableBoxes.forEach(h => {
                    if (h.page !== currentPage) return;
                    if (Math.abs(newX - h.x) < SNAP_THRESHOLD) newX = h.x;
                    if (Math.abs(newY - h.y) < SNAP_THRESHOLD) newY = h.y;
                });

                return { ...prev, x: newX, y: newY };
            });
            setStartPos({ x: snapX, y: snapY });
            return;
        }

        if (!isDragging) return;
        setCurrentPos({ x: snapX, y: snapY });
    };

    const handleMouseUp = () => {
        if (isResizing) {
            setIsResizing(false);
            setResizeHandle(null);
            return;
        }

        if (isMoving) {
            setIsMoving(false);
            return;
        }

        if (!isDragging) return;
        setIsDragging(false);

        // Finalize selection
        const x = Math.min(startPos.x, currentPos.x);
        const y = Math.min(startPos.y, currentPos.y);
        const width = Math.abs(startPos.x - currentPos.x);
        const height = Math.abs(startPos.y - currentPos.y);

        if (width > 5 && height > 5) {
            setSelection({ x, y, width, height });
        }

        setActiveBox(null);
    };

    const handleDeleteImage = async (slotId, imageUrl, e) => {
        e.stopPropagation();

        // Remove from Firebase if it's a firebase URL
        if (imageUrl && imageUrl.includes('firebase')) {
            try {
                const imageRef = ref(storage, imageUrl);
                await deleteObject(imageRef);
            } catch (error) {
                console.error("Error deleting image from firebase:", error);
                // Continue with local state deletion even if Firebase fails
            }
        }

        setCurrentQuestionData(prev => {
            const newData = { ...prev };
            if (slotId === 'question') newData.image = null;
            else if (slotId.startsWith('opt')) newData.optionImages[['optA', 'optB', 'optC', 'optD'].indexOf(slotId)] = null;
            else newData.solutionImages = [];
            return newData;
        });
        setCapturedHighlights(prev => prev.filter(h => h.slot !== slotId));
    };

    const captureSelection = async () => {
        if (!selection || !canvasRef.current || !pdf) {
            console.warn("Capture aborted: selection, canvas, or PDF missing", { selection: !!selection, canvas: !!canvasRef.current, pdf: !!pdf });
            return;
        }

        setIsCapturing(true);
        console.log("Capturing selection for slot:", activeSlot);
        try {
            const tempCanvas = document.createElement('canvas');

            // Auto-downscale max width to 1000px
            const MAX_WIDTH = 1000;
            let targetWidth = selection.width;
            let targetHeight = selection.height;

            if (targetWidth > MAX_WIDTH) {
                const scaleFactor = MAX_WIDTH / targetWidth;
                targetWidth = MAX_WIDTH;
                targetHeight = Math.floor(targetHeight * scaleFactor);
            }

            tempCanvas.width = targetWidth;
            tempCanvas.height = targetHeight;
            const tempCtx = tempCanvas.getContext('2d');

            tempCtx.drawImage(
                canvasRef.current,
                selection.x, selection.y, selection.width, selection.height,
                0, 0, targetWidth, targetHeight
            );

            // Export as WebP for significant file size savings over JPEG on text/high-contrast lines
            const blob = await new Promise(resolve => tempCanvas.toBlob(resolve, 'image/webp', 0.8));
            console.log("Blob created, size:", blob.size);
            const fileName = `pdf_extract_${Date.now()}_${activeSlot}.webp`;
            const storagePath = `pdf_uploads/${fileName}`;
            const storageRef = ref(storage, storagePath);

            console.log("Uploading to path:", storagePath);
            await uploadBytes(storageRef, blob);
            const url = await getDownloadURL(storageRef);
            console.log("Generated Download URL success:", url.substring(0, 50) + "...");

            // Add highlight
            setCapturedHighlights(prev => [...prev.filter(h => h.slot !== activeSlot || activeSlot === 'solution'), { ...selection, slot: activeSlot, page: currentPage }]);

            // Update question data based on active slot
            setCurrentQuestionData(prev => {
                const newData = { ...prev };
                if (activeSlot === 'question') {
                    newData.image = url;
                    setActiveSlot(prev.type === 'integer' ? 'solution' : 'optA');
                } else if (activeSlot === 'optA') {
                    newData.optionImages[0] = url;
                    setActiveSlot('optB');
                } else if (activeSlot === 'optB') {
                    newData.optionImages[1] = url;
                    setActiveSlot('optC');
                } else if (activeSlot === 'optC') {
                    newData.optionImages[2] = url;
                    setActiveSlot('optD');
                } else if (activeSlot === 'optD') {
                    newData.optionImages[3] = url;
                    setActiveSlot('solution');
                } else if (activeSlot === 'solution') {
                    newData.solutionImages = [...(prev.solutionImages || []), url];
                }
                return newData;
            });

            if (activeSlot.startsWith('opt') && activeSlot !== 'optD' && canvasRef.current) {
                setSelection(prev => {
                    if (!prev) return null;
                    const newY = prev.y + prev.height + 15; // Shift down by height + gap
                    return { ...prev, y: Math.min(newY, canvasRef.current.height - prev.height) };
                });
            } else {
                setSelection(null);
            }

            console.log("Capture completed successfully");
        } catch (error) {
            console.error("Error capturing selection:", error);
            alert("Failed to capture and upload image: " + error.message);
        } finally {
            setIsCapturing(false);
        }
    };

    const handleAddToQueue = () => {
        if (!currentQuestionData.image) {
            alert("Please at least select the question area");
            return;
        }

        // Validation for answers
        if (currentQuestionData.type === 'mcq' && !currentQuestionData.correctOption) {
            alert("Please mark the correct answer"); return;
        }
        if (currentQuestionData.type === 'msq' && currentQuestionData.correctOptions.length === 0) {
            alert("Please mark at least one correct answer"); return;
        }
        if (currentQuestionData.type === 'integer' && currentQuestionData.integerAnswer === '') {
            alert("Please enter the integer answer"); return;
        }

        const questionToPush = {
            ...currentQuestionData,
            text: currentQuestionData.text || '',
            options: currentQuestionData.options.map((opt, i) => opt || ''),
            solutionImages: currentQuestionData.solutionImages || []
        };

        onUpload([questionToPush]);

        // Reset for next question (partial reset - keep subject/marks/type for faster flow)
        setCurrentQuestionData(prev => ({
            ...prev,
            text: '',
            image: null,
            options: ['', '', '', ''],
            optionImages: [null, null, null, null],
            correctOption: '',
            correctOptions: [],
            integerAnswer: '',
            optionsLayout: prev.optionsLayout || 'list',
            questionImageSize: prev.questionImageSize || 'medium',
            optionsImageSize: prev.optionsImageSize || 'medium',
            topic: '',
            solutionImages: []
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
                        <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                            <ImageIcon className="text-indigo-600" /> PDF to Mock Test
                        </h3>
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X size={24} className="text-gray-400" /></button>
                    </div>
                    <div className="border-3 border-dashed border-indigo-100 rounded-xl p-10 text-center hover:border-indigo-300 transition-colors group bg-indigo-50/30">
                        <Upload size={48} className="mx-auto text-indigo-400 mb-4 group-hover:scale-110 transition-transform" />
                        <label className="cursor-pointer">
                            <span className="bg-indigo-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-indigo-700 transition shadow-lg shadow-indigo-200 inline-block">
                                Choose Mock PDF
                            </span>
                            <input type="file" accept=".pdf" className="hidden" onChange={handleFileChange} />
                        </label>
                        <p className="text-sm text-gray-500 mt-4 font-medium italic">Supports standard test PDFs (AITS, JEE, etc.)</p>
                    </div>
                </div>
            </div>
        );
    }

    let activeBox = null;
    if (isDragging) {
        activeBox = {
            left: Math.min(startPos.x, currentPos.x),
            top: Math.min(startPos.y, currentPos.y),
            right: Math.max(startPos.x, currentPos.x),
            bottom: Math.max(startPos.y, currentPos.y)
        };
    } else if (selection) {
        activeBox = {
            left: selection.x,
            top: selection.y,
            right: selection.x + selection.width,
            bottom: selection.y + selection.height
        };
    }

    return (
        <div className="fixed inset-0 bg-black/90 flex z-[70] overflow-hidden flex-col md:flex-row">
            {/* Left: PDF Viewer */}
            <div className="flex-1 flex flex-col h-full bg-[#0f1117] min-w-0">

                {/* Toolbar */}
                <div className="px-4 py-3 bg-[#1a1d27] border-b border-white/5 flex items-center justify-between gap-3 flex-wrap">

                    {/* Left: Page Nav */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/8 hover:bg-white/15 text-gray-300 disabled:opacity-30 transition"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <div className="bg-white/8 border border-white/10 rounded-lg px-3 py-1.5 text-xs font-bold text-white tabular-nums">
                            {currentPage} <span className="text-gray-500">/ {numPages}</span>
                        </div>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(numPages, p + 1))}
                            disabled={currentPage === numPages}
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/8 hover:bg-white/15 text-gray-300 disabled:opacity-30 transition"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>

                    {/* Center: Keyboard shortcut chips */}
                    <div className="hidden lg:flex items-center gap-1.5 text-[9px] uppercase font-bold tracking-widest">
                        {[
                            { key: 'Q', label: 'Question' },
                            { key: '1–4', label: 'Options' },
                            { key: 'S', label: 'Solution' },
                            { key: '↵', label: 'Crop' },
                            { key: '^R', label: 'Resize' },
                            { key: 'Esc', label: 'Clear' },
                        ].map(({ key, label }) => (
                            <span key={key} className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-md px-2 py-1 text-gray-400">
                                <kbd className="text-white font-black">{key}</kbd>
                                <span className="text-gray-600">·</span>
                                {label}
                            </span>
                        ))}
                    </div>

                    {/* Right: Zoom + Close */}
                    <div className="flex items-center gap-2">
                        <div className="flex items-center bg-white/8 border border-white/10 rounded-lg overflow-hidden">
                            <button
                                onClick={() => setScale(s => Math.max(0.5, s - 0.25))}
                                className="w-8 h-8 flex items-center justify-center text-gray-300 hover:bg-white/15 text-lg font-bold transition"
                            >−</button>
                            <span className="px-2.5 text-xs font-bold text-white tabular-nums border-x border-white/10 py-1.5">
                                {Math.round(scale * 100)}%
                            </span>
                            <button
                                onClick={() => setScale(s => Math.min(3, s + 0.25))}
                                className="w-8 h-8 flex items-center justify-center text-gray-300 hover:bg-white/15 text-lg font-bold transition"
                            >+</button>
                        </div>
                        <button
                            onClick={() => setFile(null)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/8 hover:bg-red-500/30 text-gray-400 hover:text-red-400 transition border border-white/10"
                        >
                            <X size={14} />
                        </button>
                    </div>
                </div>

                {/* Active Slot Indicator Bar */}
                <div className="px-4 py-2 bg-[#151820] border-b border-white/5 flex items-center gap-2 overflow-x-auto">
                    <span className="text-[9px] text-gray-600 font-bold uppercase tracking-widest whitespace-nowrap mr-1">Active:</span>
                    {[
                        { id: 'question', label: 'Q', color: 'indigo' },
                        ...(currentQuestionData.type !== 'integer' ? [
                            { id: 'optA', label: 'A', color: 'blue' },
                            { id: 'optB', label: 'B', color: 'blue' },
                            { id: 'optC', label: 'C', color: 'blue' },
                            { id: 'optD', label: 'D', color: 'blue' },
                        ] : []),
                        { id: 'solution', label: 'S', color: 'violet' },
                    ].map(slot => (
                        <button
                            key={slot.id}
                            onClick={() => setActiveSlot(slot.id)}
                            className={`flex-shrink-0 px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider transition-all ${activeSlot === slot.id
                                ? slot.color === 'violet'
                                    ? 'bg-violet-500 text-white shadow-lg shadow-violet-500/30'
                                    : slot.color === 'blue'
                                        ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                                        : 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30'
                                : 'bg-white/5 text-gray-500 hover:bg-white/10 hover:text-gray-300'
                                }`}
                        >
                            {slot.label === 'A' || slot.label === 'B' || slot.label === 'C' || slot.label === 'D' ? `Opt ${slot.label}` : slot.label === 'Q' ? 'Question' : 'Solution'}
                        </button>
                    ))}
                    <div className="ml-auto flex flex-shrink-0 items-center gap-3">
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                            <kbd className="bg-white/10 px-1 rounded text-white">Right-Click</kbd> to save
                        </span>
                        {capturedHighlights.length > 0 && (
                            <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-md">
                                {capturedHighlights.length} zone{capturedHighlights.length > 1 ? 's' : ''} set
                            </span>
                        )}
                    </div>
                </div>

                {/* Canvas viewport */}
                <div
                    className="flex-1 overflow-auto custom-scrollbar relative"
                    ref={containerRef}
                    onContextMenu={(e) => {
                        e.preventDefault();
                        if (!isCapturing && currentQuestionData.image) {
                            handleAddToQueue();
                        }
                    }}
                    style={{
                        background: 'radial-gradient(ellipse at center, #1e2130 0%, #0f1117 100%)',
                    }}
                >
                    <div
                        className="relative mx-auto my-8"
                        style={{
                            width: canvasRef.current?.width || 'auto',
                            transformOrigin: 'top center',
                        }}
                    >
                        {/* Canvas shadow glow */}
                        <div
                            className="absolute inset-0 rounded-xl pointer-events-none"
                            style={{ boxShadow: '0 0 60px 10px rgba(99,102,241,0.08), 0 32px 80px rgba(0,0,0,0.6)' }}
                        />
                        <canvas ref={canvasRef} className="rounded-xl bg-white relative z-0 block" />

                        {/* Measuring Grid Overlay */}
                        {file && (
                            <div
                                className="absolute inset-0 z-0 pointer-events-none opacity-[0.06] rounded-xl"
                                style={{
                                    backgroundImage: `
                                        linear-gradient(to right, #818cf8 1px, transparent 1px),
                                        linear-gradient(to bottom, #818cf8 1px, transparent 1px)
                                    `,
                                    backgroundSize: '40px 40px'
                                }}
                            />
                        )}

                        <div
                            ref={overlayRef}
                            className={`absolute inset-0 touch-none z-10 rounded-xl ${isResizing ? 'cursor-grabbing' :
                                isMoving ? 'cursor-grabbing' :
                                    'cursor-crosshair'
                                }`}
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                        >
                            {/* Global Historical Highlights (Faint) */}
                            {globalHighlights.filter(h => h.page === currentPage).map((h, i) => (
                                <div
                                    key={`global-${i}`}
                                    className="absolute border border-white/20 bg-white/3 pointer-events-none rounded-sm"
                                    style={{ left: h.x, top: h.y, width: h.width, height: h.height }}
                                />
                            ))}

                            {/* Captured Highlights */}
                            {capturedHighlights.filter(h => h.page === currentPage).map((h, i) => (
                                <div
                                    key={i}
                                    className="absolute border border-indigo-400/70 bg-indigo-400/10 pointer-events-none rounded-sm flex items-start justify-start p-1"
                                    style={{ left: h.x, top: h.y, width: h.width, height: h.height }}
                                >
                                    <span className="bg-indigo-500 text-white text-[8px] px-1.5 py-0.5 rounded font-black uppercase shadow-md leading-none">
                                        {h.slot === 'question' ? 'Q' : h.slot.replace('opt', '')}
                                    </span>
                                </div>
                            ))}

                            {/* Alignment Smart Guides */}
                            {activeBox && (
                                <>
                                    <div className="absolute pointer-events-none z-0 border-t border-dashed border-indigo-400/40" style={{ left: 0, right: 0, top: activeBox.top }} />
                                    <div className="absolute pointer-events-none z-0 border-t border-dashed border-indigo-400/40" style={{ left: 0, right: 0, top: activeBox.bottom }} />
                                    <div className="absolute pointer-events-none z-0 border-l border-dashed border-indigo-400/40" style={{ top: 0, bottom: 0, left: activeBox.left }} />
                                    <div className="absolute pointer-events-none z-0 border-l border-dashed border-indigo-400/40" style={{ top: 0, bottom: 0, left: activeBox.right }} />
                                </>
                            )}

                            {/* Live drag selection box */}
                            {isDragging && (
                                <div
                                    className="absolute border-2 border-indigo-400 bg-indigo-400/15 pointer-events-none rounded-sm"
                                    style={{
                                        left: Math.min(startPos.x, currentPos.x),
                                        top: Math.min(startPos.y, currentPos.y),
                                        width: Math.abs(startPos.x - currentPos.x),
                                        height: Math.abs(startPos.y - currentPos.y)
                                    }}
                                />
                            )}

                            {/* Final / moveable selection box */}
                            {selection && !isDragging && (
                                <div
                                    className={`absolute border-2 border-emerald-400 bg-emerald-400/10 rounded-sm ${isMoving ? 'cursor-grabbing' : 'cursor-grab hover:bg-emerald-400/20'}`}
                                    style={{
                                        left: selection.x,
                                        top: selection.y,
                                        width: selection.width,
                                        height: selection.height
                                    }}
                                >
                                    {/* Conditionally Rendered Resizing Handles */}
                                    {isResizeMode && (
                                        <>
                                            {/* Resizing Handles (Invisible Hitboxes) */}
                                            <div className="absolute top-0 left-0 w-5 h-5 bg-transparent -mt-2.5 -ml-2.5 cursor-nwse-resize z-50" onMouseDown={(e) => handleResizeStart(e, 'nw')} />
                                            <div className="absolute top-0 right-0 w-5 h-5 bg-transparent -mt-2.5 -mr-2.5 cursor-nesw-resize z-50" onMouseDown={(e) => handleResizeStart(e, 'ne')} />
                                            <div className="absolute bottom-0 left-0 w-5 h-5 bg-transparent -mb-2.5 -ml-2.5 cursor-nesw-resize z-50" onMouseDown={(e) => handleResizeStart(e, 'sw')} />
                                            <div className="absolute bottom-0 right-0 w-5 h-5 bg-transparent -mb-2.5 -mr-2.5 cursor-nwse-resize z-50" onMouseDown={(e) => handleResizeStart(e, 'se')} />
                                            <div className="absolute top-0 left-1/2 w-5 h-5 bg-transparent -mt-2.5 -translate-x-1/2 cursor-ns-resize z-50" onMouseDown={(e) => handleResizeStart(e, 'n')} />
                                            <div className="absolute bottom-0 left-1/2 w-5 h-5 bg-transparent -mb-2.5 -translate-x-1/2 cursor-ns-resize z-50" onMouseDown={(e) => handleResizeStart(e, 's')} />
                                            <div className="absolute top-1/2 left-0 w-5 h-5 bg-transparent -ml-2.5 -translate-y-1/2 cursor-ew-resize z-50" onMouseDown={(e) => handleResizeStart(e, 'w')} />
                                            <div className="absolute top-1/2 right-0 w-5 h-5 bg-transparent -mr-2.5 -translate-y-1/2 cursor-ew-resize z-50" onMouseDown={(e) => handleResizeStart(e, 'e')} />

                                            {/* Corner dot handles (visual, to indicate resize mode is active) */}
                                            <div className="absolute top-0 left-0 w-2 h-2 bg-indigo-400 border border-white rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none shadow-sm" />
                                            <div className="absolute top-0 right-0 w-2 h-2 bg-indigo-400 border border-white rounded-full translate-x-1/2 -translate-y-1/2 pointer-events-none shadow-sm" />
                                            <div className="absolute bottom-0 left-0 w-2 h-2 bg-indigo-400 border border-white rounded-full -translate-x-1/2 translate-y-1/2 pointer-events-none shadow-sm" />
                                            <div className="absolute bottom-0 right-0 w-2 h-2 bg-indigo-400 border border-white rounded-full translate-x-1/2 translate-y-1/2 pointer-events-none shadow-sm" />
                                        </>
                                    )}

                                    {/* Action popup - outside of resize mode check */}
                                    <div
                                        className="absolute -bottom-14 left-1/2 -translate-x-1/2 flex gap-2 z-50 cursor-default"
                                        onMouseDown={(e) => e.stopPropagation()}
                                        onMouseUp={(e) => e.stopPropagation()}
                                    >
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                captureSelection();
                                            }}
                                            disabled={!pdf || isCapturing}
                                            className={`bg-green-600 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-lg flex items-center gap-1.5 whitespace-nowrap ${(!pdf || isCapturing) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-700 hover:-translate-y-0.5 max-md:hidden active:scale-95'} transition-all`}
                                        >
                                            <CheckCircle size={14} /> {isCapturing ? 'Saving...' : `Capture → ${activeSlot === 'question' ? 'Q' : activeSlot === 'solution' ? 'S' : activeSlot.replace('opt', '')}`}
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelection(null);
                                            }}
                                            className="bg-red-600 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-lg flex items-center gap-1.5 whitespace-nowrap hover:bg-red-700 hover:-translate-y-0.5 active:scale-95 transition-all"
                                        >
                                            <X size={13} /> Clear
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>


            {/* Right: Redesigned Sidebar */}
            <div className="w-[450px] bg-gray-100 flex flex-col shadow-2xl overflow-y-auto">

                {/* Header */}
                <div className="p-4 bg-white border-b flex items-center justify-between sticky top-0 z-10 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-black text-sm">Q</div>
                        <div>
                            <h4 className="text-sm font-bold text-gray-800 leading-none">Question Builder</h4>
                            <p className="text-[10px] text-gray-400 font-medium mt-0.5">
                                {uploadedCount > 0 ? <span className="text-indigo-600 font-bold">{uploadedCount} uploaded</span> : "Fill in details & capture zones"}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {numPages > 0 && <div className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">PG {currentPage}/{numPages}</div>}
                        <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 transition"><X size={14} /></button>
                    </div>
                </div>

                <div className="flex-1 p-4 space-y-3 overflow-y-auto">

                    {/* CARD 1: Core Details */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="px-4 pt-3 pb-1 border-b border-gray-50">
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Core Details</span>
                        </div>
                        <div className="p-3 space-y-2.5">
                            <div className="grid grid-cols-3 gap-2">
                                {/* Type */}
                                <div>
                                    <label className="block text-[9px] font-bold text-gray-400 uppercase mb-1">Type</label>
                                    <select
                                        value={currentQuestionData.type}
                                        onChange={(e) => {
                                            const newType = e.target.value;
                                            setCurrentQuestionData({ ...currentQuestionData, type: newType });
                                            if (newType === 'integer' && activeSlot.startsWith('opt')) {
                                                setActiveSlot('solution');
                                            }
                                        }}
                                        className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none bg-gray-50"
                                    >
                                        <option value="mcq">MCQ</option>
                                        <option value="msq">MSQ</option>
                                        <option value="integer">Integer</option>
                                    </select>
                                </div>
                                {/* Marks */}
                                <div>
                                    <label className="block text-[9px] font-bold text-emerald-500 uppercase mb-1">+ Marks</label>
                                    <input
                                        type="number"
                                        value={currentQuestionData.marks}
                                        onChange={(e) => setCurrentQuestionData({ ...currentQuestionData, marks: parseInt(e.target.value) || 0 })}
                                        className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-bold bg-emerald-50 text-emerald-700 focus:ring-2 focus:ring-emerald-400 outline-none text-center"
                                    />
                                </div>
                                {/* Negative */}
                                <div>
                                    <label className="block text-[9px] font-bold text-red-400 uppercase mb-1">- Negative</label>
                                    <input
                                        type="number"
                                        value={currentQuestionData.negativeMarks}
                                        onChange={(e) => setCurrentQuestionData({ ...currentQuestionData, negativeMarks: parseInt(e.target.value) || 0 })}
                                        className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-bold bg-red-50 text-red-600 focus:ring-2 focus:ring-red-300 outline-none text-center"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                {/* Subject */}
                                <div>
                                    <label className="block text-[9px] font-bold text-gray-400 uppercase mb-1">Subject</label>
                                    <select
                                        value={['Physics', 'Chemistry', 'Maths', 'Biology', 'English', 'Reasoning', 'General Knowledge'].includes(currentQuestionData.subject) ? currentQuestionData.subject : 'custom'}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (val === 'custom') setCurrentQuestionData({ ...currentQuestionData, subject: '' });
                                            else setCurrentQuestionData({ ...currentQuestionData, subject: val });
                                        }}
                                        className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none bg-gray-50"
                                    >
                                        <option value="Physics">Physics</option>
                                        <option value="Chemistry">Chemistry</option>
                                        <option value="Maths">Maths</option>
                                        <option value="Biology">Biology</option>
                                        <option value="English">English</option>
                                        <option value="Reasoning">Reasoning</option>
                                        <option value="General Knowledge">Gen. Knowledge</option>
                                        <option value="custom">Others...</option>
                                    </select>
                                </div>
                                {/* Topic */}
                                <div>
                                    <label className="block text-[9px] font-bold text-gray-400 uppercase mb-1">Topic / Tag</label>
                                    <input
                                        type="text"
                                        value={currentQuestionData.topic}
                                        onChange={(e) => setCurrentQuestionData({ ...currentQuestionData, topic: e.target.value })}
                                        placeholder="e.g. Kinematics"
                                        className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-medium bg-gray-50 focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                            </div>

                            {/* Custom Subject Input */}
                            {!['Physics', 'Chemistry', 'Maths', 'Biology', 'English', 'Reasoning', 'General Knowledge'].includes(currentQuestionData.subject) && (
                                <input
                                    type="text"
                                    value={currentQuestionData.subject}
                                    onChange={(e) => setCurrentQuestionData({ ...currentQuestionData, subject: e.target.value })}
                                    placeholder="Enter Subject Name..."
                                    className="w-full border border-indigo-200 rounded-lg px-3 py-1.5 text-xs font-bold bg-indigo-50 text-indigo-700 outline-none focus:ring-2 focus:ring-indigo-400"
                                />
                            )}
                        </div>
                    </div>

                    {/* CARD 2: Capture Slots */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="px-4 pt-3 pb-1 border-b border-gray-50 flex items-center justify-between">
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Capture Zones</span>
                            <span className="text-[9px] text-indigo-500 font-bold">Draw box on PDF → Click active zone</span>
                        </div>
                        <div className="p-3 space-y-1.5">
                            {/* Question Slot - Full width */}
                            {[{ id: 'question', label: 'Question', key: 'Q', img: currentQuestionData.image }].map(slot => (
                                <div
                                    key={slot.id}
                                    onClick={() => setActiveSlot(slot.id)}
                                    className={`cursor-pointer border rounded-xl p-2.5 transition-all ${activeSlot === slot.id ? 'ring-2 ring-indigo-500 bg-indigo-50 border-indigo-300' : 'hover:border-indigo-200 hover:bg-gray-50 border-gray-200'}`}
                                >
                                    <div className="flex items-center justify-between mb-1.5">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[9px] w-5 h-5 flex items-center justify-center rounded-md font-black transition-colors ${activeSlot === slot.id ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500'}`}>{slot.key}</span>
                                            <span className={`text-xs font-bold uppercase tracking-wide ${activeSlot === slot.id ? 'text-indigo-700' : 'text-gray-600'}`}>{slot.label}</span>
                                        </div>
                                        {slot.img ? <CheckCircle size={14} className="text-emerald-500" /> : <div className="w-3 h-3 rounded-full border-2 border-gray-300" />}
                                    </div>
                                    {slot.img ? (
                                        <div className="relative group/img overflow-hidden rounded-lg">
                                            <img src={slot.img} alt={slot.id} className="h-12 w-full object-contain border bg-white cursor-zoom-in hover:brightness-95 transition rounded-lg" onClick={(e) => { e.stopPropagation(); if (onZoom) onZoom(slot.img); else window.open(slot.img, '_blank'); }} />
                                            <button onClick={(e) => handleDeleteImage(slot.id, slot.img, e)} className="absolute top-1 right-1 bg-red-500 text-white p-0.5 rounded opacity-0 group-hover/img:opacity-100 hover:bg-red-600 transition z-10"><X size={10} /></button>
                                        </div>
                                    ) : (
                                        <div className="h-7 flex items-center justify-center text-[9px] text-gray-400 border border-dashed border-gray-200 rounded-lg italic bg-gray-50">Draw on PDF to capture</div>
                                    )}
                                </div>
                            ))}

                            {/* Options - 2x2 Grid (only for MCQ/MSQ) */}
                            {currentQuestionData.type !== 'integer' && (
                                <div className="grid grid-cols-2 gap-1.5">
                                    {[
                                        { id: 'optA', label: 'Option A', key: '1', img: currentQuestionData.optionImages[0] },
                                        { id: 'optB', label: 'Option B', key: '2', img: currentQuestionData.optionImages[1] },
                                        { id: 'optC', label: 'Option C', key: '3', img: currentQuestionData.optionImages[2] },
                                        { id: 'optD', label: 'Option D', key: '4', img: currentQuestionData.optionImages[3] },
                                    ].map(slot => (
                                        <div
                                            key={slot.id}
                                            onClick={() => setActiveSlot(slot.id)}
                                            className={`cursor-pointer border rounded-xl p-2 transition-all ${activeSlot === slot.id ? 'ring-2 ring-indigo-500 bg-indigo-50 border-indigo-300' : 'hover:border-indigo-200 hover:bg-gray-50 border-gray-200'}`}
                                        >
                                            <div className="flex items-center justify-between mb-1">
                                                <div className="flex items-center gap-1.5">
                                                    <span className={`text-[8px] w-4 h-4 flex items-center justify-center rounded font-black ${activeSlot === slot.id ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500'}`}>{slot.key}</span>
                                                    <span className={`text-[10px] font-bold ${activeSlot === slot.id ? 'text-indigo-700' : 'text-gray-500'}`}>{slot.label}</span>
                                                </div>
                                                {slot.img ? <CheckCircle size={11} className="text-emerald-500" /> : <div className="w-2.5 h-2.5 rounded-full border border-gray-300" />}
                                            </div>
                                            {slot.img ? (
                                                <div className="relative group/img">
                                                    <img src={slot.img} alt={slot.id} className="h-8 w-full object-contain border bg-white cursor-zoom-in hover:brightness-95 transition rounded" onClick={(e) => { e.stopPropagation(); if (onZoom) onZoom(slot.img); else window.open(slot.img, '_blank'); }} />
                                                    <button onClick={(e) => handleDeleteImage(slot.id, slot.img, e)} className="absolute top-0 right-0 bg-red-500 text-white p-0.5 rounded opacity-0 group-hover/img:opacity-100 hover:bg-red-600 transition z-10"><X size={8} /></button>
                                                </div>
                                            ) : (
                                                <div className="h-5 flex items-center justify-center text-[8px] text-gray-400 border border-dashed border-gray-200 rounded italic bg-gray-50">Capture</div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Solution Slot - Full width */}
                            {[{ id: 'solution', label: 'Solution', key: 'S', img: currentQuestionData.solutionImages?.[0] }].map(slot => (
                                <div
                                    key={slot.id}
                                    onClick={() => setActiveSlot(slot.id)}
                                    className={`cursor-pointer border rounded-xl p-2.5 transition-all ${activeSlot === slot.id ? 'ring-2 ring-violet-500 bg-violet-50 border-violet-300' : 'hover:border-violet-200 hover:bg-gray-50 border-gray-200'}`}
                                >
                                    <div className="flex items-center justify-between mb-1.5">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[9px] w-5 h-5 flex items-center justify-center rounded-md font-black transition-colors ${activeSlot === slot.id ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-500'}`}>{slot.key}</span>
                                            <span className={`text-xs font-bold uppercase tracking-wide ${activeSlot === slot.id ? 'text-violet-700' : 'text-gray-600'}`}>{slot.label}</span>
                                            <span className="text-[8px] text-gray-400 italic font-normal">(optional)</span>
                                        </div>
                                        {slot.img ? <CheckCircle size={14} className="text-emerald-500" /> : <div className="w-3 h-3 rounded-full border-2 border-gray-300" />}
                                    </div>
                                    {slot.img ? (
                                        <div className="relative group/img overflow-hidden rounded-lg">
                                            <img src={slot.img} alt={slot.id} className="h-12 w-full object-contain border bg-white cursor-zoom-in hover:brightness-95 transition rounded-lg" onClick={(e) => { e.stopPropagation(); if (onZoom) onZoom(slot.img); else window.open(slot.img, '_blank'); }} />
                                            <button onClick={(e) => handleDeleteImage(slot.id, slot.img, e)} className="absolute top-1 right-1 bg-red-500 text-white p-0.5 rounded opacity-0 group-hover/img:opacity-100 hover:bg-red-600 transition z-10"><X size={10} /></button>
                                        </div>
                                    ) : (
                                        <div className="h-7 flex items-center justify-center text-[9px] text-gray-400 border border-dashed border-gray-200 rounded-lg italic bg-gray-50">Draw on PDF to capture</div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* CARD 3: Answer Key */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="px-4 pt-3 pb-1 border-b border-gray-50">
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                                {currentQuestionData.type === 'integer' ? 'Integer Answer' : 'Mark Correct Answer'}
                            </span>
                        </div>
                        <div className="p-3">
                            {currentQuestionData.type === 'integer' ? (
                                <input
                                    type="number"
                                    value={currentQuestionData.integerAnswer}
                                    onChange={(e) => setCurrentQuestionData({ ...currentQuestionData, integerAnswer: e.target.value })}
                                    className="w-full border-2 border-indigo-200 rounded-xl px-4 py-3 text-2xl font-black text-indigo-700 focus:ring-4 focus:ring-indigo-100 text-center outline-none bg-indigo-50 placeholder:text-indigo-300"
                                    placeholder="0"
                                />
                            ) : (
                                <div className="grid grid-cols-4 gap-2">
                                    {['A', 'B', 'C', 'D'].map(opt => {
                                        const isSelected = currentQuestionData.type === 'msq'
                                            ? currentQuestionData.correctOptions.includes(opt)
                                            : currentQuestionData.correctOption === opt;
                                        return (
                                            <button
                                                key={opt}
                                                onClick={() => {
                                                    if (currentQuestionData.type === 'msq') {
                                                        const newOpts = isSelected
                                                            ? currentQuestionData.correctOptions.filter(o => o !== opt)
                                                            : [...currentQuestionData.correctOptions, opt];
                                                        setCurrentQuestionData({ ...currentQuestionData, correctOptions: newOpts });
                                                    } else {
                                                        setCurrentQuestionData({ ...currentQuestionData, correctOption: opt });
                                                    }
                                                }}
                                                className={`py-2.5 rounded-xl font-black text-sm border-2 transition-all ${isSelected ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-100 scale-105' : 'bg-white text-gray-500 hover:bg-gray-50 border-gray-200 hover:border-emerald-300 hover:text-emerald-600'}`}
                                            >
                                                {opt}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* CARD 4: Advanced Display Settings (Collapsible) */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <button
                            onClick={() => setShowAdvancedSettings(s => !s)}
                            className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50 transition"
                        >
                            <div className="flex items-center gap-2">
                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Advanced Display Settings</span>
                                {(currentQuestionData.optionsLayout === 'grid' || currentQuestionData.questionImageSize !== 'medium' || currentQuestionData.optionsImageSize !== 'medium') && (
                                    <span className="text-[8px] bg-indigo-100 text-indigo-600 font-bold px-1.5 py-0.5 rounded-full">Modified</span>
                                )}
                            </div>
                            <span className={`text-gray-400 text-xs font-bold transition-transform ${showAdvancedSettings ? 'rotate-180' : ''}`}>▾</span>
                        </button>

                        {showAdvancedSettings && (
                            <div className="px-3 pb-3 space-y-3 border-t border-gray-50 pt-3">
                                {/* Layout Preference */}
                                {currentQuestionData.type !== 'integer' && (
                                    <div>
                                        <label className="block text-[9px] font-bold text-gray-400 uppercase mb-1.5">Option Layout Format</label>
                                        <div className="grid grid-cols-2 gap-2 bg-gray-100 p-1 rounded-xl">
                                            <button
                                                onClick={() => setCurrentQuestionData({ ...currentQuestionData, optionsLayout: 'list' })}
                                                className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${currentQuestionData.optionsLayout === 'list' || !currentQuestionData.optionsLayout ? 'bg-white text-indigo-700 shadow border border-indigo-100' : 'text-gray-500 hover:text-gray-700'}`}
                                            >
                                                <div className="flex flex-col gap-[2px]">
                                                    <div className="w-3 h-0.5 bg-current rounded" />
                                                    <div className="w-3 h-0.5 bg-current rounded" />
                                                    <div className="w-3 h-0.5 bg-current rounded" />
                                                    <div className="w-3 h-0.5 bg-current rounded" />
                                                </div>
                                                Line Wise (1x4)
                                            </button>
                                            <button
                                                onClick={() => setCurrentQuestionData({ ...currentQuestionData, optionsLayout: 'grid' })}
                                                className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${currentQuestionData.optionsLayout === 'grid' ? 'bg-white text-indigo-700 shadow border border-indigo-100' : 'text-gray-500 hover:text-gray-700'}`}
                                            >
                                                <div className="grid grid-cols-2 gap-[2px]">
                                                    <div className="w-1.5 h-1.5 border border-current rounded-sm" />
                                                    <div className="w-1.5 h-1.5 border border-current rounded-sm" />
                                                    <div className="w-1.5 h-1.5 border border-current rounded-sm" />
                                                    <div className="w-1.5 h-1.5 border border-current rounded-sm" />
                                                </div>
                                                Grid (2x2)
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Question Image Size */}
                                <div>
                                    <label className="block text-[9px] font-bold text-gray-400 uppercase mb-1.5">Question Image Height</label>
                                    <div className="grid grid-cols-3 gap-1 bg-gray-100 p-1 rounded-xl">
                                        {['small', 'medium', 'large'].map((size) => (
                                            <button
                                                key={`q-${size}`}
                                                onClick={() => setCurrentQuestionData({ ...currentQuestionData, questionImageSize: size })}
                                                className={`py-1.5 rounded-lg text-[9px] font-bold uppercase transition-all ${currentQuestionData.questionImageSize === size || (!currentQuestionData.questionImageSize && size === 'medium') ? 'bg-white text-indigo-700 shadow border border-indigo-100' : 'text-gray-500 hover:text-gray-700'}`}
                                            >
                                                {size === 'small' ? 'Sm 1-2 lines' : size === 'medium' ? 'Md 3-5 lines' : 'Lg Diagram'}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Options Image Size */}
                                {currentQuestionData.type !== 'integer' && (
                                    <div>
                                        <label className="block text-[9px] font-bold text-gray-400 uppercase mb-1.5">Options Image Height</label>
                                        <div className="grid grid-cols-3 gap-1 bg-gray-100 p-1 rounded-xl">
                                            {['small', 'medium', 'large'].map((size) => (
                                                <button
                                                    key={`o-${size}`}
                                                    onClick={() => setCurrentQuestionData({ ...currentQuestionData, optionsImageSize: size })}
                                                    className={`py-1.5 rounded-lg text-[9px] font-bold uppercase transition-all ${currentQuestionData.optionsImageSize === size || (!currentQuestionData.optionsImageSize && size === 'medium') ? 'bg-white text-indigo-700 shadow border border-indigo-100' : 'text-gray-500 hover:text-gray-700'}`}
                                                >
                                                    {size === 'small' ? 'Sm Words' : size === 'medium' ? 'Md 2-3 lines' : 'Lg Graph'}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                </div>

                {/* Footer Action Buttons */}
                <div className="p-4 border-t bg-white space-y-2 sticky bottom-0 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
                    {isPdfLoading && (
                        <div className="flex items-center justify-center gap-2 text-indigo-500 text-[10px] font-bold animate-pulse">
                            <Loader2 className="animate-spin" size={12} /> Loading PDF...
                        </div>
                    )}
                    {isCapturing && (
                        <div className="flex items-center justify-center gap-2 text-emerald-600 text-[10px] font-bold animate-pulse">
                            <Loader2 className="animate-spin" size={12} /> Extracting & Uploading...
                        </div>
                    )}
                    <button
                        onClick={handleAddToQueue}
                        disabled={
                            isPdfLoading ||
                            isCapturing ||
                            !currentQuestionData.image ||
                            (currentQuestionData.type === 'mcq' && !currentQuestionData.correctOption) ||
                            (currentQuestionData.type === 'msq' && currentQuestionData.correctOptions.length === 0) ||
                            (currentQuestionData.type === 'integer' && currentQuestionData.integerAnswer === '')
                        }
                        className="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 flex items-center justify-center gap-2 text-sm"
                    >
                        <CheckCircle size={16} />
                        Save &amp; Next Question
                    </button>
                    <button onClick={onClose} className="w-full text-gray-400 py-1 font-bold text-[9px] hover:text-gray-600 transition uppercase tracking-widest text-center">Done / Close Extraction</button>
                </div>
            </div>


            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: #111827;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #374151;
                    border-radius: 5px;
                    border: 2px solid #111827;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #4B5563;
                }
            `}</style>
        </div>
    );
};

export default PdfUploadModal;
