const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../frontend/components/Dashboard/PdfMarkerUploadModal.js');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Rename Component Name
content = content.replace(/PdfTextUploadModal/g, 'PdfMarkerUploadModal');
content = content.replace(/PDF Text Extractor/g, 'PDF AI Marker Extractor');

// 2. Add new states
const stateInjection = `    const [isParsing, setIsParsing] = useState(false);
    const [parsedQuestions, setParsedQuestions] = useState([]);
    const [currentParsedIndex, setCurrentParsedIndex] = useState(0);`;

content = content.replace(/(const \[activeSlot, setActiveSlot\] = useState\('question'\);)/, `$1\n${stateInjection}`);

// 3. Update the handleFileChange function
const handleFileChangeCode = `
    const handleFileChange = async (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile?.type === 'application/pdf') {
            setFile(selectedFile);
            setIsParsing(true);
            const formData = new FormData();
            formData.append('pdf', selectedFile);

            try {
                // Assuming auth token is in localStorage for the request
                const token = JSON.parse(localStorage.getItem('user'))?.token || localStorage.getItem('token');
                if (!token) throw new Error("Authentication error");

                const res = await fetch('/api/admin/tests/parse-pdf-marker', {
                    method: 'POST',
                    headers: { 'Authorization': \`Bearer \${token}\` },
                    body: formData
                });
                const data = await res.json();
                if (data.success && data.questions) {
                    const mappedQuestions = data.questions.map(q => ({
                        text: q.text || '',
                        image: null,
                        optionImages: [null, null, null, null],
                        options: q.options || ['', '', '', ''],
                        correctOption: q.correctOption || 'A',
                        correctOptions: q.correctOptions || [],
                        integerAnswer: q.integerAnswer || '',
                        type: q.type || 'mcq',
                        optionsLayout: 'list',
                        subject: 'Physics',
                        section: '',
                        topic: '',
                        marks: 4,
                        negativeMarks: 1,
                        solution: q.solution || '',
                        solutionImages: [],
                        questionImageSize: 'medium',
                        optionsImageSize: 'medium'
                    }));
                    setParsedQuestions(mappedQuestions);
                    if (mappedQuestions.length > 0) {
                        setCurrentQuestionData(mappedQuestions[0]);
                        setCurrentParsedIndex(0);
                    }
                } else {
                    alert("Parsing failed: " + (data.error || "Unknown error"));
                }
            } catch (err) {
                console.error("Upload error", err);
                alert("Failed to parse PDF using Marker: " + err.message);
            } finally {
                setIsParsing(false);
            }
        } else {
            alert("Please select a PDF file");
        }
    };
`;
// Find the exact match for `const handleFileChange...` until the end of the block
content = content.replace(/const handleFileChange = \(e\) => \{[\s\S]*?alert\("Please select a PDF file"\);[\s\S]*?\};/, handleFileChangeCode.trim());

// 4. Update handleAddToQueue into a function that saves changes onto parsed array, and add onSubmitAll
const nextQuestionCode = `
    const handleNextQuestion = () => {
        const nextIdx = currentParsedIndex + 1;
        
        // Save current to array
        setParsedQuestions(prev => {
            const arr = [...prev];
            arr[currentParsedIndex] = { ...currentQuestionData };
            return arr;
        });

        if (nextIdx < parsedQuestions.length) {
            setCurrentParsedIndex(nextIdx);
            setCurrentQuestionData(parsedQuestions[nextIdx]);
            setActiveSlot('question');
            setCapturedHighlights([]);
        } else {
            alert("You are on the last question.");
        }
    };

    const handlePrevQuestion = () => {
        const prevIdx = currentParsedIndex - 1;
        
        // Save current to array
        setParsedQuestions(prev => {
            const arr = [...prev];
            arr[currentParsedIndex] = { ...currentQuestionData };
            return arr;
        });

        if (prevIdx >= 0) {
            setCurrentParsedIndex(prevIdx);
            setCurrentQuestionData(parsedQuestions[prevIdx]);
            setActiveSlot('question');
            setCapturedHighlights([]);
        }
    };

    const handleSubmitAllQueue = () => {
        // Save current changes first
        const finalArray = [...parsedQuestions];
        finalArray[currentParsedIndex] = { ...currentQuestionData };
        
        onUpload(finalArray);
        onClose();
    };
`;
content = content.replace(/const handleAddToQueue = \(\) => \{[\s\S]*?alert\("Question added to queue!"\);\n    \};/, nextQuestionCode.trim());

// 5. Replace the bottom buttons in the JSX
const oldButtons = `<button onClick={handleAddToQueue} disabled={!currentQuestionData.text.trim()} className="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-40 transition-all flex items-center justify-center gap-2 text-sm"><CheckCircle size={16} /> Save & Next Question</button>
                    <button onClick={onClose} className="w-full text-gray-400 py-1 font-bold text-[9px] hover:text-gray-600 transition uppercase tracking-widest text-center">Close</button>`;

const newButtons = `<div className="flex gap-2">
                        <button onClick={handlePrevQuestion} disabled={currentParsedIndex === 0} className="w-1/2 bg-gray-200 text-gray-700 py-2.5 rounded-xl font-bold hover:bg-gray-300 disabled:opacity-40 transition-all">Previous</button>
                        <button onClick={handleNextQuestion} disabled={currentParsedIndex === parsedQuestions.length - 1} className="w-1/2 bg-indigo-100 text-indigo-700 py-2.5 rounded-xl font-bold hover:bg-indigo-200 disabled:opacity-40 transition-all">Next</button>
                    </div>
                    <button onClick={handleSubmitAllQueue} className="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 text-sm"><CheckCircle size={16} /> Submit {parsedQuestions.length} Questions</button>
                    <button onClick={onClose} className="w-full text-gray-400 py-1 font-bold text-[9px] hover:text-gray-600 transition uppercase tracking-widest text-center">Discard</button>`;

content = content.replace(oldButtons, newButtons);

// 6. Update the "if (!file)" loader state to show parsing status
const oldLoader = `<p className="text-sm text-gray-500 mt-4 font-medium italic">Supports text-based test PDFs</p>
                    </div>
                </div>
            </div>
        );
    }`;
const newLoader = `<p className="text-sm text-gray-500 mt-4 font-medium italic">Marker AI will parse equations and text locally</p>
                        {isParsing && (
                            <div className="mt-8 flex flex-col items-center animate-pulse">
                                <Loader2 size={32} className="text-indigo-500 animate-spin mb-3" />
                                <p className="text-indigo-700 font-bold">Scanning PDF and converting to LaTeX using Marker...</p>
                                <p className="text-xs text-indigo-400 max-w-[250px] mx-auto mt-2">This may take 1-2 minutes depending on length.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }`;
content = content.replace(oldLoader, newLoader);

// 7. Re-write the title to indicate question indexing
content = content.replace(/<h4 className="text-sm font-bold text-gray-800 leading-none">Text Question Builder<\/h4>/, `<h4 className="text-sm font-bold text-gray-800 leading-none">Review: Q{currentParsedIndex + 1} of {parsedQuestions.length}</h4>`);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully transformed PdfMarkerUploadModal.js');
