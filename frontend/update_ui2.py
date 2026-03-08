import sys

with open('/Users/mylisa/Projects/Mock Test Website/frontend/components/Dashboard/AdminDashboard.js', 'r') as f:
    lines = f.readlines()

# The section starts at: {/* Add Question */}
# and ends right before: {/* Edit Series Modal */}

start_idx = -1
end_idx = -1

for i, line in enumerate(lines):
    if "{/* Add Question */}" in line:
        start_idx = i
    if "{/* Edit Series Modal */}" in line:
        end_idx = i
        break

if start_idx != -1 and end_idx != -1:
    print(f"Found section from {start_idx} to {end_idx}")
    
    new_content = """                            {/* SPLIT LAYOUT FOR QUESTIONS & QUEUE */}
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
                                
                                {/* Left Side: Add Question Form */}
                                <div className="lg:col-span-7">
                                    <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-200 relative">
                                        <h3 className="text-xl font-black mb-6 flex items-center text-gray-800 gap-2 border-b border-gray-100 pb-4">
                                            <div className="bg-blue-100 text-blue-600 rounded-lg p-2"><Plus size={20}/></div> 
                                            Add Manual Question
                                        </h3>

                                        {/* Type & Metadata */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 bg-gray-50 p-4 rounded-xl border border-gray-100">
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Type</label>
                                                <select name="type" value={currentQuestion.type || 'mcq'} onChange={handleQuestionChange} className="w-full border p-2 rounded-lg bg-white shadow-sm text-sm font-bold outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400">
                                                    <option value="mcq">MCQ</option>
                                                    <option value="msq">Multiple Select</option>
                                                    <option value="integer">Integer</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Subject</label>
                                                <select
                                                    name="subject"
                                                    value={['Physics', 'Chemistry', 'Maths', 'Biology', 'English', 'Reasoning', 'General Knowledge'].includes(currentQuestion.subject) ? currentQuestion.subject : 'custom'}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        if (val === 'custom') setCurrentQuestion({ ...currentQuestion, subject: '' });
                                                        else setCurrentQuestion({ ...currentQuestion, subject: val });
                                                    }}
                                                    className="w-full border p-2 rounded-lg bg-white shadow-sm text-sm font-bold outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                                                >
                                                    <option value="Physics">Physics</option>
                                                    <option value="Chemistry">Chemistry</option>
                                                    <option value="Maths">Maths</option>
                                                    <option value="Biology">Biology</option>
                                                    <option value="English">English</option>
                                                    <option value="Reasoning">Reasoning</option>
                                                    <option value="General Knowledge">Gen Know.</option>
                                                    <option value="custom">Other...</option>
                                                </select>
                                                {!['Physics', 'Chemistry', 'Maths', 'Biology', 'English', 'Reasoning', 'General Knowledge'].includes(currentQuestion.subject) && (
                                                    <input
                                                        type="text"
                                                        value={currentQuestion.subject || ''}
                                                        onChange={(e) => setCurrentQuestion({ ...currentQuestion, subject: e.target.value })}
                                                        className="w-full mt-2 border p-2 rounded-lg bg-blue-50 border-blue-200 focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none text-sm"
                                                        placeholder="Custom Subject"
                                                    />
                                                )}
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Marks</label>
                                                <input type="number" name="marks" value={currentQuestion.marks || 4} onChange={handleQuestionChange} className="w-full border p-2 rounded-lg bg-white shadow-sm text-sm font-bold text-green-700 outline-none focus:ring-2 focus:ring-green-100 focus:border-green-400" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Negative</label>
                                                <input
                                                    type="number"
                                                    name="negativeMarks"
                                                    value={currentQuestion.negativeMarks !== undefined ? currentQuestion.negativeMarks : 0}
                                                    onChange={handleQuestionChange}
                                                    className="w-full border p-2 rounded-lg bg-red-50 shadow-sm text-sm font-bold text-red-600 outline-none focus:ring-2 focus:ring-red-100 focus:border-red-400"
                                                />
                                            </div>
                                        </div>

                                        <div className="mb-6">
                                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Topic Tag (Optional)</label>
                                            <input type="text" name="topic" value={currentQuestion.topic || ''} onChange={handleQuestionChange} className="w-full border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-50 outline-none p-2.5 rounded-xl text-sm" placeholder="E.g., Rotational Motion, Thermodynamics" />
                                        </div>

                                        {/* Question Content */}
                                        <div className="mb-6">
                                            <label className="block text-sm font-black text-gray-700 mb-2">Question Text</label>
                                            <div className="border border-gray-200 rounded-xl mb-2 bg-white overflow-hidden shadow-sm focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-50 transition-all">
                                                <SubjectToolbar onInsert={(latex) => insertMath('text', latex)} />
                                                <textarea
                                                    name="text"
                                                    value={currentQuestion.text || ''}
                                                    onChange={handleQuestionChange}
                                                    rows={3}
                                                    className="block w-full p-3 outline-none border-b border-gray-100 min-h-[80px] bg-gray-50 pb-8"
                                                    placeholder="Enter question text here..."
                                                    onPaste={(e) => handlePaste(e, 'question')}
                                                />
                                                <div className="p-3 bg-white text-sm">
                                                    <p className="text-xs text-blue-500 font-bold uppercase mb-2 flex items-center gap-1"><Eye size={14}/> Live Preview</p>
                                                    <MathText text={currentQuestion.text || '...'} className="text-gray-900" />
                                                </div>
                                            </div>

                                            <div className="mt-3 flex items-center justify-between p-3 border border-dashed border-gray-300 rounded-lg bg-gray-50 hover:bg-blue-50 transition-colors">
                                                <label className="text-xs font-bold text-gray-600 flex items-center gap-2 cursor-pointer">
                                                    <ImageIcon size={16} className="text-blue-500"/> 
                                                    <span>Upload or Paste Question Image</span>
                                                    <input key={fileInputKey} type="file" onChange={(e) => uploadImage(e.target.files[0], 'question')} className="hidden" />
                                                </label>
                                                {uploadingImage && <span className="text-xs text-blue-500 font-bold animate-pulse">Uploading...</span>}
                                            </div>
                                            {currentQuestion.image && (
                                                <div className="mt-3 relative inline-block group">
                                                    <img src={currentQuestion.image} alt="Q Preview" className="max-h-60 w-auto object-contain border border-gray-200 rounded-lg shadow-sm bg-white p-1" />
                                                    <button onClick={() => setCurrentQuestion({...currentQuestion, image: ''})} className="absolute -top-2 -right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow"><Trash size={12}/></button>
                                                </div>
                                            )}
                                        </div>

                                        {/* Options Area */}
                                        {currentQuestion.type !== 'integer' && (
                                            <div className="space-y-4 mb-8">
                                                <label className="block text-sm font-black text-gray-700">Answer Options</label>
                                                <div className="grid grid-cols-1 gap-3">
                                                    {currentQuestion.options.map((opt, idx) => (
                                                        <div key={idx} className="flex flex-col gap-2 border border-gray-100 p-3 rounded-xl bg-gray-50 relative focus-within:border-blue-300 focus-within:ring-2 focus-within:ring-blue-50 transition-all">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 rounded-lg bg-white border shadow-sm text-gray-700 font-black flex items-center justify-center shrink-0">
                                                                    {String.fromCharCode(65 + idx)}
                                                                </div>
                                                                <input
                                                                    type="text"
                                                                    value={opt}
                                                                    onChange={(e) => handleOptionChange(idx, e.target.value)}
                                                                    className="flex-1 bg-transparent border-none focus:ring-0 p-0 text-sm outline-none placeholder-gray-400 font-medium text-gray-700"
                                                                    placeholder="Enter option text..."
                                                                    onPaste={(e) => handlePaste(e, 'option', idx)}
                                                                />
                                                                <label className="cursor-pointer text-gray-400 hover:text-blue-600 transition-colors p-2 bg-white rounded shadow-sm border" title="Upload Image">
                                                                    <ImageIcon size={16} />
                                                                    <input key={`${fileInputKey}-opt-${idx}`} type="file" onChange={(e) => uploadImage(e.target.files[0], 'option', idx)} className="hidden" />
                                                                </label>
                                                            </div>
                                                            {currentQuestion.optionImages[idx] && (
                                                                <div className="relative group ml-11 inline-block mt-1">
                                                                    <img src={currentQuestion.optionImages[idx]} alt={`Option ${idx} Img`} className="h-24 w-auto object-contain border border-gray-200 rounded bg-white shadow-sm p-1" />
                                                                    <button onClick={() => {
                                                                        const newImages = [...currentQuestion.optionImages];
                                                                        newImages[idx] = '';
                                                                        setCurrentQuestion({...currentQuestion, optionImages: newImages});
                                                                    }} className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow"><Trash size={10}/></button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Answer Section */}
                                        <div className="mb-6 p-5 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-100 shadow-inner">
                                            <label className="block text-sm font-black text-emerald-900 mb-3 flex items-center gap-2">
                                                <div className="bg-emerald-100 text-emerald-600 p-1 rounded"><CheckCircle size={16}/></div> Correct Answer Key
                                            </label>

                                            {currentQuestion.type === 'mcq' && (
                                                <select
                                                    name="correctOption"
                                                    value={(() => {
                                                        const val = currentQuestion.correctOption;
                                                        if (!val) return "";
                                                        const letterToIdx = { 'A': 0, 'B': 1, 'C': 2, 'D': 3 };
                                                        if (letterToIdx[val.toUpperCase()] !== undefined) {
                                                            const idx = letterToIdx[val.toUpperCase()];
                                                            return currentQuestion.options[idx] || `Option ${idx + 1}`;
                                                        }
                                                        return val;
                                                    })()}
                                                    onChange={handleQuestionChange}
                                                    className="block w-full border-2 border-emerald-200 p-3 rounded-lg bg-white outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 text-emerald-900 font-bold shadow-sm"
                                                >
                                                    <option value="">-- Select Correct Option --</option>
                                                    {currentQuestion.options.map((opt, idx) => (
                                                        <option key={idx} value={opt || `Option ${idx + 1}`}>Option {String.fromCharCode(65 + idx)}</option>
                                                    ))}
                                                </select>
                                            )}

                                            {currentQuestion.type === 'msq' && (
                                                <div className="flex gap-3 flex-wrap">
                                                    {currentQuestion.options.map((opt, idx) => {
                                                        const effectiveOpt = opt || `Option ${idx + 1}`;
                                                        const letter = String.fromCharCode(65 + idx);
                                                        const isChecked = currentQuestion.correctOptions.includes(effectiveOpt) ||
                                                            currentQuestion.correctOptions.includes(letter) ||
                                                            currentQuestion.correctOptions.includes(letter.toLowerCase());

                                                        return (
                                                            <label key={idx} className={`flex items-center justify-center min-w-[60px] h-12 rounded-lg cursor-pointer border-2 transition-all font-bold text-lg ${isChecked ? 'bg-emerald-500 border-emerald-600 text-white shadow-md' : 'bg-white border-emerald-200 text-emerald-700 hover:bg-emerald-100'}`}>
                                                                <input type="checkbox" checked={isChecked} onChange={() => handleMSQCheck(effectiveOpt)} className="hidden" />
                                                                {letter}
                                                            </label>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            {currentQuestion.type === 'integer' && (
                                                <input type="text" name="integerAnswer" value={currentQuestion.integerAnswer || ''} onChange={handleQuestionChange} className="block w-full border-2 border-emerald-200 p-3 rounded-lg bg-white outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 font-mono text-xl text-center shadow-sm font-bold text-emerald-900" placeholder="e.g. 42" />
                                            )}
                                        </div>

                                        {/* Solution Section */}
                                        <div className="mb-8 border border-gray-100 rounded-xl overflow-hidden shadow-sm">
                                            <div className="bg-purple-50 p-4 border-b border-purple-100 flex items-center justify-between">
                                                <label className="text-sm font-black text-purple-900 flex items-center gap-2">
                                                    <div className="bg-purple-100 text-purple-600 p-1 rounded"><BookOpen size={16}/></div> Detailed Solution <span className="text-purple-400 font-bold tracking-widest text-[10px] uppercase ml-1">Optional</span>
                                                </label>
                                            </div>
                                            <div className="p-4 bg-white">
                                                <div className="border border-gray-200 rounded-lg mb-3 overflow-hidden shadow-sm focus-within:border-purple-400 focus-within:ring-2 focus-within:ring-purple-50">
                                                    <SubjectToolbar onInsert={(latex) => insertMath('solution', latex)} />
                                                    <textarea
                                                        name="solution"
                                                        value={currentQuestion.solution || ''}
                                                        onChange={handleQuestionChange}
                                                        className="block w-full p-3 outline-none min-h-[100px] text-sm bg-gray-50 resize-y"
                                                        placeholder="Explain how to arrive at the answer..."
                                                        onPaste={(e) => handlePaste(e, 'solution')}
                                                    />
                                                </div>

                                                <div className="pt-2">
                                                    <label className="flex items-center gap-2 text-xs font-bold text-gray-500 cursor-pointer w-max hover:text-purple-600 transition-colors bg-white px-3 py-2 rounded-lg border border-dashed border-gray-300 shadow-sm">
                                                        <ImageIcon size={14} className="text-purple-500" /> Attach Solution Images
                                                        <input key={`${fileInputKey}-sol`} type="file" onChange={(e) => uploadImage(e.target.files[0], 'solution')} className="hidden" accept="image/*" />
                                                    </label>
                                                    {/* Multiple Solution Images */}
                                                    {(currentQuestion.solutionImages && currentQuestion.solutionImages.length > 0) && (
                                                        <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-3">
                                                            {(currentQuestion.solutionImages).map((img, idx) => (
                                                                <div key={idx} className="relative group bg-gray-50 border border-gray-200 rounded-lg p-2 aspect-video flex items-center justify-center">
                                                                    <img src={img} alt={`Sol ${idx}`} className="max-h-full max-w-full object-contain" />
                                                                    <button
                                                                        onClick={() => {
                                                                            const newImages = currentQuestion.solutionImages.filter((_, i) => i !== idx);
                                                                            setCurrentQuestion({ ...currentQuestion, solutionImages: newImages });
                                                                        }}
                                                                        className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition shadow hover:bg-red-600"
                                                                    >
                                                                        <Trash size={10} />
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <button onClick={addQuestion} className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 hover:-translate-y-0.5 transition-all flex justify-center items-center font-black text-lg tracking-wide group">
                                            <Plus size={24} className="mr-2 group-hover:rotate-90 transition-transform duration-300" /> ADD TO QUEUE
                                        </button>
                                    </div>
                                </div>
                                
                                {/* Right Side: Questions Queue */}
                                <div className="lg:col-span-5 flex flex-col pt-6 lg:pt-0 sticky top-[80px] h-[calc(100vh-100px)]">
                                    <div className="bg-gray-50 shadow-inner border border-gray-200 rounded-2xl flex flex-col h-full overflow-hidden">
                                        {/* Queue Header */}
                                        <div className="bg-white border-b border-gray-200 p-4 md:p-5 flex justify-between items-center shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)] z-10">
                                            <div>
                                                <h3 className="text-lg font-black text-gray-800 flex items-center gap-2">
                                                    <List className="text-indigo-500"/>
                                                    Question Queue 
                                                    <span className="bg-indigo-100 text-indigo-800 text-xs px-2.5 py-1.5 rounded-full ml-1 leading-none">{questions.length} Qs</span>
                                                </h3>
                                            </div>
                                            <div className="flex gap-2">
                                                {questions.length > 0 && (
                                                    <button onClick={handleExportQueue} title="Export CSV" className="p-2 bg-white border border-gray-200 shadow-sm text-gray-600 rounded-lg hover:bg-gray-50 hover:text-blue-600 transition-colors">
                                                        <Download size={18} />
                                                    </button>
                                                )}
                                                <button onClick={() => setShowQuickMarkModal(true)} title="Quick Mark Answers" className="p-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors">
                                                    <CheckCircle size={18} />
                                                </button>
                                                <button onClick={() => setShowMergeModal(true)} title="Merge existing test" className="p-2 bg-purple-50 border border-purple-200 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors">
                                                    <Layers size={18} />
                                                </button>
                                            </div>
                                        </div>
                                        
                                        {/* Queue Contents */}
                                        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                                            {questions.length === 0 ? (
                                                <div className="h-full flex flex-col items-center justify-center opacity-60 text-gray-500 p-8 text-center">
                                                    <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-4">
                                                        <BookOpen size={30} className="text-gray-400"/>
                                                    </div>
                                                    <p className="font-bold text-lg mb-1">Queue is empty</p>
                                                    <p className="text-sm">Questions added manually or via bulk tools will appear here.</p>
                                                </div>
                                            ) : questions.map((q, idx) => (
                                                <div key={idx} className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm relative group hover:border-blue-300 transition-colors">
                                                    <div className="absolute top-3 right-3 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={async () => {
                                                                // Populate currentQuestion with q data
                                                                setCurrentQuestion({ 
                                                                    ...q,
                                                                    // ensure defaults fallbacks
                                                                    optionImages: q.optionImages || [null,null,null,null],
                                                                    solutionImages: q.solutionImages || [] 
                                                                });
                                                                removeQuestion(idx);
                                                                window.scrollTo({ top: 100, behavior: 'smooth' });
                                                            }}
                                                            className="p-1.5 bg-blue-50 text-blue-600 border border-blue-100 rounded-md hover:bg-blue-100 transition-colors tooltip"
                                                            title="Edit Question"
                                                        >
                                                            <Edit2 size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => removeQuestion(idx)}
                                                            className="p-1.5 bg-red-50 text-red-600 border border-red-100 rounded-md hover:bg-red-100 transition-colors tooltip"
                                                            title="Delete"
                                                        >
                                                            <Trash size={14} />
                                                        </button>
                                                    </div>
                                                    
                                                    <div className="text-[10px] font-black text-indigo-700 mb-2 flex flex-wrap gap-2 items-center uppercase tracking-wider pr-16">
                                                        <span className="bg-indigo-100 px-2 py-0.5 rounded">Q{idx + 1}</span>
                                                        <span className="text-indigo-300">•</span>
                                                        <span>{q.type}</span>
                                                        <span className="text-indigo-300">•</span>
                                                        <span className="truncate max-w-[120px]" title={q.subject}>{q.subject}</span>
                                                    </div>
                                                    
                                                    <div className="flex gap-4 items-start">
                                                        <div className="text-sm flex-1 text-gray-700 line-clamp-3">
                                                            <MathText text={q.text || "No text provided (Image only)"} />
                                                            
                                                            {/* MISSING ANSWER WARNING */}
                                                            {((q.type === 'mcq' && !q.correctOption) ||
                                                                (q.type === 'msq' && (!q.correctOptions || q.correctOptions.length === 0)) ||
                                                                (q.type === 'integer' && (q.integerAnswer === undefined || q.integerAnswer === ''))) && (
                                                                    <div className="mt-2 text-red-600 bg-red-50 border border-red-100 px-2 py-1 rounded font-bold text-[10px] uppercase flex items-center gap-1.5 w-max">
                                                                        <AlertCircle size={12} className="animate-pulse" /> Missing Answer Key!
                                                                    </div>
                                                            )}
                                                        </div>
                                                        {q.image && (
                                                            <div className="shrink-0 bg-gray-50 border border-gray-200 rounded p-1">
                                                                <img
                                                                    src={q.image}
                                                                    alt="Thumb"
                                                                    className="w-14 h-14 rounded object-contain cursor-pointer transition-all hover:scale-110"
                                                                    onClick={() => setZoomedImg(q.image)}
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        
                                        {/* Sticky Footer Submit */}
                                        <div className="bg-white p-5 border-t border-gray-200 z-10 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.05)]">
                                            <button
                                                onClick={handleSubmitTest}
                                                disabled={loading || questions.length === 0}
                                                className={`w-full py-4 rounded-xl font-black text-white shadow-xl transition-all transform flex items-center justify-center gap-3 text-lg tracking-wide group
                                                    ${isUpdatingExisting ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 hover:-translate-y-1' 
                                                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 hover:-translate-y-1'} 
                                                    ${(loading || questions.length === 0) ? 'opacity-50 cursor-not-allowed hover:transform-none bg-gray-400 from-gray-400 to-gray-500 shadow-none' : ''}`}
                                            >
                                                {loading ? (
                                                    <Loader2 className="animate-spin" size={24} />
                                                ) : (
                                                    <Save size={24} className={questions.length > 0 ? "group-hover:scale-110 transition-transform" : ""} />
                                                )}
                                                {loading ? (isUpdatingExisting ? 'SAVING UPDATES...' : 'PUBLISHING TEST...') 
                                                         : (isUpdatingExisting ? 'UPDATE TEST NOW' : 'PUBLISH TEST NOW')}
                                            </button>
                                            <p className="text-center text-[11px] font-bold text-gray-400 mt-3 uppercase tracking-wider">
                                                {questions.length === 0 ? "Add questions to enable saving" : `${questions.length} questions ready to sync`}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                
                            </div>
"""

    lines[start_idx:end_idx] = [new_content + "\n"]

    with open('/Users/mylisa/Projects/Mock Test Website/frontend/components/Dashboard/AdminDashboard.js', 'w') as f:
        f.writelines(lines)
    print("Successfully replaced section!")
else:
    print("Could not find start or end markers.")
