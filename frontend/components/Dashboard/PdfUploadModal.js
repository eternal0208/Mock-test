'use client';
import { useState, useRef, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { Upload, X, ChevronLeft, ChevronRight, Crop, CheckCircle, Image as ImageIcon, Loader2 } from 'lucide-react';
import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

// Initialize PDF.js worker
// Initialize PDF.js worker - Use unpkg as a more reliable version-specific CDN
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

const PdfUploadModal = ({ onUpload, onClose }) => {
    const [file, setFile] = useState(null);
    const [pdf, setPdf] = useState(null);
    const [numPages, setNumPages] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [scale, setScale] = useState(1.5);
    const [isDragging, setIsDragging] = useState(false);
    const [startPos, setStartPos] = useState({ x: 0, y: 0 });
    const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 });
    const [selection, setSelection] = useState(null);
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
        subject: 'Physics',
        topic: '',
        marks: 4,
        negativeMarks: 1
    });

    const [capturedHighlights, setCapturedHighlights] = useState([]);

    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const overlayRef = useRef(null);
    const renderTaskRef = useRef(null);

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            const key = e.key.toLowerCase();
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
        if (!canvasRef.current) return;
        const rect = overlayRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        setIsDragging(true);
        setStartPos({ x, y });
        setCurrentPos({ x, y });
        setSelection(null);
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;
        const rect = overlayRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        setCurrentPos({ x, y });
    };

    const handleMouseUp = () => {
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
            tempCanvas.width = selection.width;
            tempCanvas.height = selection.height;
            const tempCtx = tempCanvas.getContext('2d');

            tempCtx.drawImage(
                canvasRef.current,
                selection.x, selection.y, selection.width, selection.height,
                0, 0, selection.width, selection.height
            );

            const blob = await new Promise(resolve => tempCanvas.toBlob(resolve, 'image/jpeg', 0.9));
            console.log("Blob created, size:", blob.size);
            const fileName = `pdf_extract_${Date.now()}_${activeSlot}.jpg`;
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
                    setActiveSlot('optA');
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

            setSelection(null);
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
            alert("Please select the correct option"); return;
        }
        if (currentQuestionData.type === 'msq' && currentQuestionData.correctOptions.length === 0) {
            alert("Please select at least one correct option"); return;
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
            topic: '',
            solutionImages: []
        }));
        setCapturedHighlights([]);
        setActiveSlot('question');
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

    return (
        <div className="fixed inset-0 bg-black/80 flex z-[70] overflow-hidden">
            {/* Left: PDF Viewer */}
            <div className="flex-1 flex flex-col h-full bg-gray-900 border-r border-gray-700">
                <div className="p-4 bg-gray-800 flex justify-between items-center border-b border-gray-700">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} className="p-2 bg-gray-700 text-white rounded hover:bg-gray-600 disabled:opacity-50" disabled={currentPage === 1}><ChevronLeft /></button>
                        <span className="text-white font-bold bg-gray-900 px-3 py-1 rounded">Page {currentPage} of {numPages}</span>
                        <button onClick={() => setCurrentPage(p => Math.min(numPages, p + 1))} className="p-2 bg-gray-700 text-white rounded hover:bg-gray-600 disabled:opacity-50" disabled={currentPage === numPages}><ChevronRight /></button>
                    </div>
                    <div className="flex items-center gap-4 text-[10px] text-gray-400 hidden xl:flex uppercase font-bold tracking-tighter">
                        <span className="bg-gray-700/50 px-2 py-1 rounded border border-gray-600"><b>Q</b>: Question</span>
                        <span className="bg-gray-700/50 px-2 py-1 rounded border border-gray-600"><b>1-4</b>: Options</span>
                        <span className="bg-gray-700/50 px-2 py-1 rounded border border-gray-600"><b>S</b>: Solution</span>
                        <span className="bg-gray-700/50 px-2 py-1 rounded border border-gray-600"><b>Enter</b>: Crop</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex bg-gray-700 rounded p-1">
                            <button onClick={() => setScale(s => Math.max(0.5, s - 0.25))} className="p-2 text-white hover:bg-gray-600 rounded">-</button>
                            <span className="px-3 py-2 text-white font-mono">{Math.round(scale * 100)}%</span>
                            <button onClick={() => setScale(s => Math.min(3, s + 0.25))} className="p-2 text-white hover:bg-gray-600 rounded">+</button>
                        </div>
                        <button onClick={() => setFile(null)} className="p-2 text-gray-400 hover:text-white"><X size={24} /></button>
                    </div>
                </div>

                <div className="flex-1 overflow-auto bg-gray-900 p-8 custom-scrollbar relative" ref={containerRef}>
                    <div
                        className="relative mx-auto"
                        style={{
                            width: canvasRef.current?.width || 'auto',
                            transformOrigin: 'top center',
                        }}
                    >
                        <canvas ref={canvasRef} className="shadow-2xl rounded bg-white" />
                        <div
                            ref={overlayRef}
                            className="absolute inset-0 cursor-crosshair touch-none"
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                        >
                            {/* Captured Highlights */}
                            {capturedHighlights.filter(h => h.page === currentPage).map((h, i) => (
                                <div
                                    key={i}
                                    className="absolute border border-indigo-500 bg-indigo-500/10 pointer-events-none flex items-start justify-start p-1"
                                    style={{ left: h.x, top: h.y, width: h.width, height: h.height }}
                                >
                                    <span className="bg-indigo-600 text-white text-[8px] px-1 rounded font-bold uppercase shadow-sm">{h.slot === 'question' ? 'Q' : h.slot.replace('opt', '')}</span>
                                </div>
                            ))}

                            {isDragging && (
                                <div
                                    className="absolute border-2 border-indigo-500 bg-indigo-500/20 pointer-events-none"
                                    style={{
                                        left: Math.min(startPos.x, currentPos.x),
                                        top: Math.min(startPos.y, currentPos.y),
                                        width: Math.abs(startPos.x - currentPos.x),
                                        height: Math.abs(startPos.y - currentPos.y)
                                    }}
                                />
                            )}
                            {selection && !isDragging && (
                                <div
                                    className="absolute border-2 border-green-500 bg-green-500/10"
                                    style={{
                                        left: selection.x,
                                        top: selection.y,
                                        width: selection.width,
                                        height: selection.height
                                    }}
                                >
                                    <div className="absolute -bottom-14 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                                        <button
                                            onClick={captureSelection}
                                            disabled={!pdf || isCapturing}
                                            className={`bg-green-600 text-white px-5 py-2.5 rounded-full text-sm font-bold shadow-xl flex items-center gap-2 whitespace-nowrap ring-4 ring-white ${(!pdf || isCapturing) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-700'}`}
                                        >
                                            <CheckCircle size={18} /> {isCapturing ? 'Saving...' : `Use for ${activeSlot} (Enter)`}
                                        </button>
                                        <button
                                            onClick={() => setSelection(null)}
                                            className="bg-gray-800 text-white p-2.5 rounded-full shadow-xl hover:bg-black transition-colors ring-4 ring-white"
                                        >
                                            <X size={18} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Right: Slots & Preview */}
            <div className="w-96 bg-white flex flex-col shadow-2xl overflow-y-auto">
                <div className="p-6 border-b bg-indigo-50 flex items-center justify-between">
                    <div>
                        <h4 className="text-xl font-bold text-gray-800 tracking-tight">Review & Add</h4>
                        <p className="text-[10px] text-indigo-600 font-bold uppercase">Mapping PDF to data</p>
                    </div>
                    {numPages > 0 && <div className="text-[10px] font-bold text-gray-400 bg-white px-2 py-1 rounded border shadow-sm">PAGE {currentPage}</div>}
                </div>

                <div className="p-6 space-y-4 flex-1">
                    {/* Meta Info Section */}
                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Type</label>
                                <select
                                    value={currentQuestionData.type}
                                    onChange={(e) => setCurrentQuestionData({ ...currentQuestionData, type: e.target.value })}
                                    className="w-full border rounded-lg px-2 py-1.5 text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                                >
                                    <option value="mcq">MCQ</option>
                                    <option value="msq">MSQ</option>
                                    <option value="integer">Integer</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Subject</label>
                                <select
                                    value={['Physics', 'Chemistry', 'Maths', 'Biology', 'English', 'Reasoning', 'General Knowledge'].includes(currentQuestionData.subject) ? currentQuestionData.subject : 'custom'}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (val === 'custom') setCurrentQuestionData({ ...currentQuestionData, subject: '' });
                                        else setCurrentQuestionData({ ...currentQuestionData, subject: val });
                                    }}
                                    className="w-full border rounded-lg px-2 py-1.5 text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                                >
                                    <option value="Physics">Physics</option>
                                    <option value="Chemistry">Chemistry</option>
                                    <option value="Maths">Maths</option>
                                    <option value="Biology">Biology</option>
                                    <option value="English">English</option>
                                    <option value="Reasoning">Reasoning</option>
                                    <option value="General Knowledge">General Knowledge</option>
                                    <option value="custom">Others...</option>
                                </select>
                            </div>
                        </div>

                        {/* Custom Subject Input */}
                        {!['Physics', 'Chemistry', 'Maths', 'Biology', 'English', 'Reasoning', 'General Knowledge'].includes(currentQuestionData.subject) && (
                            <input
                                type="text"
                                value={currentQuestionData.subject}
                                onChange={(e) => setCurrentQuestionData({ ...currentQuestionData, subject: e.target.value })}
                                placeholder="Enter Subject Name..."
                                className="w-full border rounded-lg px-3 py-2 text-xs font-bold bg-white text-indigo-600 border-indigo-100"
                            />
                        )}

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Marks</label>
                                <input
                                    type="number"
                                    value={currentQuestionData.marks}
                                    onChange={(e) => setCurrentQuestionData({ ...currentQuestionData, marks: parseInt(e.target.value) || 0 })}
                                    className="w-full border rounded-lg px-2 py-1.5 text-xs font-bold"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-red-400 uppercase mb-1">Negative</label>
                                <input
                                    type="number"
                                    value={currentQuestionData.negativeMarks}
                                    onChange={(e) => setCurrentQuestionData({ ...currentQuestionData, negativeMarks: parseInt(e.target.value) || 0 })}
                                    className="w-full border rounded-lg px-2 py-1.5 text-xs font-bold bg-red-50 border-red-100 text-red-600"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Topic / Tag</label>
                            <input
                                type="text"
                                value={currentQuestionData.topic}
                                onChange={(e) => setCurrentQuestionData({ ...currentQuestionData, topic: e.target.value })}
                                placeholder="e.g. Kinematics"
                                className="w-full border rounded-lg px-3 py-2 text-xs font-medium"
                            />
                        </div>
                    </div>

                    {/* Slot Selectors */}
                    <div className="space-y-2">
                        {[
                            { id: 'question', label: 'Question', key: 'Q', img: currentQuestionData.image },
                            ...(currentQuestionData.type === 'integer' ? [] : [
                                { id: 'optA', label: 'Option A', key: '1', img: currentQuestionData.optionImages[0] },
                                { id: 'optB', label: 'Option B', key: '2', img: currentQuestionData.optionImages[1] },
                                { id: 'optC', label: 'Option C', key: '3', img: currentQuestionData.optionImages[2] },
                                { id: 'optD', label: 'Option D', key: '4', img: currentQuestionData.optionImages[3] },
                            ]),
                            { id: 'solution', label: 'Solution', key: 'S', img: currentQuestionData.solutionImages?.[0] }
                        ].map(slot => (
                            <div
                                key={slot.id}
                                onClick={() => setActiveSlot(slot.id)}
                                className={`group cursor-pointer border rounded-xl p-2.5 transition-all ${activeSlot === slot.id ? 'ring-2 ring-indigo-500 bg-indigo-50 border-indigo-200 shadow-sm' : 'hover:border-indigo-100 hover:bg-gray-50 border-gray-100'}`}
                            >
                                <div className="flex justify-between items-center mb-1">
                                    <div className="flex items-center gap-2">
                                        <span className={`text-[9px] w-4 h-4 flex items-center justify-center rounded border font-bold transition-colors ${activeSlot === slot.id ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-gray-100 text-gray-400'}`}>{slot.key}</span>
                                        <span className={`text-[10px] font-bold uppercase tracking-wider ${activeSlot === slot.id ? 'text-indigo-700' : 'text-gray-500'}`}>{slot.label}</span>
                                    </div>
                                    {slot.img ? <CheckCircle size={14} className="text-green-500 fill-green-50" /> : <div className="w-3 h-3 rounded-full border border-gray-200" />}
                                </div>
                                {slot.img ? (
                                    <div className="relative group/img overflow-hidden">
                                        <img src={slot.img} alt={slot.id} className="h-10 w-full object-contain rounded border bg-white" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity rounded">
                                            <button
                                                onClick={(e) => handleDeleteImage(slot.id, slot.img, e)}
                                                className="bg-red-500 text-white p-1 rounded hover:bg-red-600 shadow-lg"
                                                title="Delete this image"
                                            >
                                                <X size={12} />
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="h-6 flex items-center justify-center text-[9px] text-gray-400 border border-dashed rounded italic bg-white/50">
                                        Capture Area
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="pt-2 border-t mt-2">
                        {currentQuestionData.type === 'integer' ? (
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Integer Answer</label>
                                <input
                                    type="number"
                                    value={currentQuestionData.integerAnswer}
                                    onChange={(e) => setCurrentQuestionData({ ...currentQuestionData, integerAnswer: e.target.value })}
                                    className="w-full border rounded-lg px-4 py-3 text-lg font-bold text-indigo-700 focus:ring-4 focus:ring-indigo-100 text-center"
                                    placeholder="Enter Result"
                                />
                            </div>
                        ) : (
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">
                                    {currentQuestionData.type === 'msq' ? 'Select Correct Option(s)' : 'Select Correct Option'}
                                </label>
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
                                                className={`py-2 rounded-lg font-bold border transition-all ${isSelected ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg transform scale-105 z-10' : 'bg-white text-gray-600 hover:bg-gray-50 border-gray-200'}`}
                                            >
                                                {opt}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-6 border-t bg-gray-50 space-y-3">
                    {isPdfLoading && (
                        <div className="flex items-center justify-center gap-2 text-indigo-600 text-[11px] font-bold mb-2 animate-pulse">
                            <Loader2 className="animate-spin" size={14} /> LOADING PDF DOCUMENT...
                        </div>
                    )}
                    {isCapturing && (
                        <div className="flex items-center justify-center gap-2 text-green-600 text-[11px] font-bold mb-2 animate-pulse">
                            <Loader2 className="animate-spin" size={14} /> EXTRACTING & UPLOADING...
                        </div>
                    )}
                    <button
                        onClick={handleAddToQueue}
                        disabled={isPdfLoading || isCapturing || !currentQuestionData.image || !currentQuestionData.correctOption}
                        className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-50 transition-all transform active:scale-95 flex items-center justify-center gap-2"
                    >
                        Save & Next Question
                    </button>
                    <button onClick={onClose} className="w-full text-gray-400 py-1 font-bold text-[10px] hover:text-gray-600 transition-colors uppercase tracking-widest text-center">Done / Close Extraction</button>
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
