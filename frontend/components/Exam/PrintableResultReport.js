import React, { forwardRef } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import MathText from '../MathText';

const PrintableResultReport = forwardRef(({ result, test, effectiveQuestions, percentage, rankData, maxMarks }, ref) => {
    if (!result || !test) return null;

    // Chart Data Preparation
    const pieData = [
        { name: 'Correct', value: result.correctAnswers || 0, color: '#22c55e' },
        { name: 'Incorrect', value: result.wrongAnswers || 0, color: '#ef4444' },
        { name: 'Unattempted', value: (result.totalQuestions - ((result.correctAnswers || 0) + (result.wrongAnswers || 0))) || 0, color: '#9ca3af' }
    ];

    const COLORS = ['#22c55e', '#ef4444', '#9ca3af'];

    const getOptionLabel = (idx) => String.fromCharCode(65 + idx);

    return (
        <div ref={ref} className="print-only">
            {/* Global Print Styles explicitly targeting standard A4 */}
            <style type="text/css" media="print">
                {`
                    @page {
                        size: A4;
                        margin: 20mm 15mm;
                    }
                    body {
                        background-color: white !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    .page-break {
                        page-break-after: always;
                    }
                    .avoid-break {
                        page-break-inside: avoid;
                    }
                    .watermark {
                        position: fixed;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%) rotate(-45deg);
                        font-size: 100px;
                        font-weight: 900;
                        color: rgba(200, 200, 200, 0.15);
                        z-index: -1;
                        pointer-events: none;
                        white-space: nowrap;
                    }
                `}
            </style>

            {/* Repeating Watermark */}
            <div className="watermark">APEX MOCK TEST</div>

            {/* --- FRONT PAGE --- */}
            <div className="page-break flex flex-col justify-between p-8" style={{ minHeight: '250mm' }}>
                <div>
                    {/* Header */}
                    <div className="border-b-4 border-blue-900 pb-8 mb-12 flex justify-between items-end">
                        <div>
                            <h1 className="text-5xl font-black text-blue-900 tracking-tighter shadow-sm">APEX MOCK TEST</h1>
                            <p className="text-xl font-medium text-gray-500 mt-2 uppercase tracking-widest">Detailed Performance Analysis</p>
                        </div>
                        <div className="text-right">
                            <div className="text-sm text-gray-400 font-bold uppercase tracking-wider mb-1">Generated On</div>
                            <div className="text-lg font-bold text-gray-800">{new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                        </div>
                    </div>

                    {/* Report Metadata */}
                    <div className="bg-gray-50 border border-gray-200 rounded-2xl p-8 mb-12 shadow-sm">
                        <div className="grid grid-cols-2 gap-8">
                            <div>
                                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-1">Test Title</h3>
                                <p className="text-2xl font-bold text-blue-900">{test.title}</p>
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-1">Test Subject</h3>
                                <p className="text-xl font-semibold text-gray-700">{test.subject}</p>
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-1">Attempt Date</h3>
                                <p className="text-lg font-medium text-gray-800">{new Date(result.submittedAt).toLocaleString()}</p>
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-1">Time Taken</h3>
                                <p className="text-lg font-medium text-gray-800">{Math.floor(result.time_taken / 60)}m {result.time_taken % 60}s <span className="text-gray-400">/ {test.duration_minutes}m</span></p>
                            </div>
                        </div>
                    </div>

                    {/* Core Performance Grid */}
                    <h2 className="text-2xl font-black text-gray-800 mb-6 uppercase tracking-wider">Performance Overview</h2>
                    <div className="grid grid-cols-4 gap-4 mb-12">
                        <div className="bg-white border-2 border-blue-100 rounded-xl p-6 text-center shadow-sm">
                            <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Total Score</div>
                            <div className="text-4xl font-black text-blue-600">{result.score}<span className="text-lg text-blue-300">/{maxMarks}</span></div>
                        </div>
                        <div className="bg-white border-2 border-green-100 rounded-xl p-6 text-center shadow-sm">
                            <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Accuracy</div>
                            <div className="text-4xl font-black text-green-600">{result.accuracy}%</div>
                        </div>
                        <div className="bg-white border-2 border-purple-100 rounded-xl p-6 text-center shadow-sm">
                            <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Percentage</div>
                            <div className="text-4xl font-black text-purple-600">{percentage}%</div>
                        </div>
                        <div className="bg-white border-2 border-yellow-100 rounded-xl p-6 text-center shadow-sm">
                            <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Test Rank</div>
                            <div className="text-4xl font-black text-yellow-600">#{rankData.rank}<span className="text-lg text-yellow-300">/{rankData.total}</span></div>
                        </div>
                    </div>

                    {/* Charting Section */}
                    <div className="grid grid-cols-2 gap-8 items-center mb-8">
                        <div className="h-64 flex flex-col items-center">
                            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4">Attempt Distribution</h3>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                        {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="flex gap-4 mt-2">
                                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-green-500"></div><span className="text-xs font-bold">Correct ({pieData[0].value})</span></div>
                                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-red-500"></div><span className="text-xs font-bold">Incorrect ({pieData[1].value})</span></div>
                                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-gray-400"></div><span className="text-xs font-bold">Skipped ({pieData[2].value})</span></div>
                            </div>
                        </div>
                        <div className="h-64 border border-gray-100 rounded-xl p-6 bg-gray-50 flex flex-col justify-center">
                            <div className="space-y-4">
                                <div>
                                    <div className="flex justify-between text-sm font-bold mb-1"><span>Correct Answers</span><span className="text-green-600">{result.correctAnswers || 0}</span></div>
                                    <div className="w-full bg-gray-200 rounded-full h-2"><div className="bg-green-500 h-2 rounded-full" style={{ width: `${((result.correctAnswers || 0) / result.totalQuestions) * 100}%` }}></div></div>
                                </div>
                                <div>
                                    <div className="flex justify-between text-sm font-bold mb-1"><span>Incorrect Answers</span><span className="text-red-600">{result.wrongAnswers || 0}</span></div>
                                    <div className="w-full bg-gray-200 rounded-full h-2"><div className="bg-red-500 h-2 rounded-full" style={{ width: `${((result.wrongAnswers || 0) / result.totalQuestions) * 100}%` }}></div></div>
                                </div>
                                <div>
                                    <div className="flex justify-between text-sm font-bold mb-1"><span>Unattempted</span><span className="text-gray-500">{pieData[2].value}</span></div>
                                    <div className="w-full bg-gray-200 rounded-full h-2"><div className="bg-gray-400 h-2 rounded-full" style={{ width: `${(pieData[2].value / result.totalQuestions) * 100}%` }}></div></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer block */}
                <div className="text-center pt-8 border-t border-gray-200">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Page 1 • Analytics Summary</p>
                </div>
            </div>

            {/* --- QUESTIONS SECTION --- */}
            <div className="p-4">
                <h2 className="text-3xl font-black text-gray-800 mb-8 pb-4 border-b-4 border-gray-800 uppercase tracking-wider">Detailed Solutions</h2>

                {effectiveQuestions.map((q, idx) => {
                    let userAttempt;
                    if (q._reconstructed) {
                        userAttempt = result.attempt_data[idx];
                    } else {
                        userAttempt = result.attempt_data.find(a => a.questionText === q.text);
                    }

                    let isAttempted = false;
                    const isCorrect = userAttempt?.isCorrect;
                    const selectedOption = userAttempt?.selectedOption;

                    if (userAttempt) {
                        if (Array.isArray(selectedOption)) {
                            isAttempted = selectedOption.length > 0;
                        } else {
                            isAttempted = selectedOption !== undefined && selectedOption !== null && selectedOption !== '';
                        }
                    }

                    const isOptionSelected = (optVal) => {
                        if (!isAttempted) return false;
                        if (Array.isArray(selectedOption)) return selectedOption.includes(optVal);
                        return selectedOption === optVal;
                    };

                    const isOptionCorrect = (optVal) => {
                        if (q.type === 'msq' && Array.isArray(q.correctOptions)) return q.correctOptions.includes(optVal);
                        return q.correctOption === optVal;
                    };

                    return (
                        <div key={idx} className="avoid-break mb-10 pb-8 border-b-2 border-gray-100">
                            {/* Question Header */}
                            <div className="flex justify-between items-center mb-4 bg-gray-50 p-3 rounded-lg border border-gray-200">
                                <div className="flex items-center gap-3">
                                    <span className="text-xl font-black text-blue-900">Q{idx + 1}.</span>
                                    <span className="text-xs px-2 py-1 rounded bg-white border border-gray-300 uppercase font-bold text-gray-600">
                                        {q.type === 'integer' ? 'INTEGER' : (q.type === 'msq' ? 'MSQ' : 'MCQ')}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                                        Marks: {isCorrect ? `+${q.marks}` : (isAttempted ? `-${q.negativeMarks}` : '0')}
                                    </span>
                                    {isAttempted ? (
                                        isCorrect ? (
                                            <span className="text-xs px-3 py-1 rounded-full bg-green-100 text-green-800 font-bold border border-green-300">✔ Correct</span>
                                        ) : (
                                            <span className="text-xs px-3 py-1 rounded-full bg-red-100 text-red-800 font-bold border border-red-300">✘ Incorrect</span>
                                        )
                                    ) : (
                                        <span className="text-xs px-3 py-1 rounded-full bg-gray-200 text-gray-600 font-bold border border-gray-300">⊘ Skipped</span>
                                    )}
                                </div>
                            </div>

                            {/* Question Content */}
                            <div className="mb-6 px-2">
                                <div className="text-base text-gray-900 font-medium mb-3">
                                    <MathText text={q.text} />
                                </div>
                                {q.image && (
                                    <img src={q.image} alt="Question" className="max-h-64 object-contain rounded border border-gray-200 mt-2" />
                                )}
                            </div>

                            {/* Options */}
                            {q.type !== 'integer' && q.options && q.options.length > 0 && (
                                <div className="grid grid-cols-2 gap-4 mb-6 px-2">
                                    {q.options.map((opt, optIdx) => {
                                        const effectiveOpt = opt || `Option ${optIdx + 1}`;
                                        const selected = isOptionSelected(effectiveOpt);
                                        const correct = isOptionCorrect(effectiveOpt);

                                        let style = "border-gray-200 bg-white text-gray-600";
                                        let marker = null;

                                        if (correct && selected) {
                                            style = "border-green-500 bg-green-50 ring-1 ring-green-500 font-medium text-green-900";
                                            marker = "✔ Correct Selection";
                                        } else if (correct) {
                                            style = "border-green-400 bg-green-50 font-medium text-green-800";
                                            marker = "✔ Correct Answer";
                                        } else if (selected) {
                                            style = "border-red-400 bg-red-50 text-red-800 font-medium";
                                            marker = "✘ Your Answer";
                                        }

                                        return (
                                            <div key={optIdx} className={`p-3 rounded border text-sm flex flex-col ${style}`}>
                                                <div className="flex items-start gap-2 mb-1">
                                                    <span className="font-bold shrink-0">{getOptionLabel(optIdx)}.</span>
                                                    <div className="flex-1"><MathText text={effectiveOpt} /></div>
                                                </div>
                                                {marker && <span className={`text-[10px] uppercase tracking-wider font-bold mt-2 pt-2 border-t ${correct ? 'border-green-200 text-green-700' : 'border-red-200 text-red-600'}`}>{marker}</span>}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Integer Answer */}
                            {q.type === 'integer' && (
                                <div className="flex gap-8 mb-6 px-2">
                                    <div className="p-3 border rounded bg-gray-50 border-gray-200 min-w-[120px]">
                                        <div className="text-xs font-bold text-gray-500 uppercase mb-1">Your Answer</div>
                                        <div className={`font-mono text-lg font-bold ${isAttempted ? (isCorrect ? 'text-green-600' : 'text-red-600') : 'text-gray-400'}`}>
                                            {isAttempted ? selectedOption : 'N/A'}
                                        </div>
                                    </div>
                                    <div className="p-3 border rounded bg-green-50 border-green-200 min-w-[120px]">
                                        <div className="text-xs font-bold text-green-700 uppercase mb-1">Correct Answer</div>
                                        <div className="font-mono text-lg font-bold text-green-700">{q.integerAnswer}</div>
                                    </div>
                                </div>
                            )}

                            {/* Solution */}
                            <div className="mt-4 px-2">
                                <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100">
                                    <h4 className="text-xs font-bold text-blue-800 uppercase tracking-widest mb-3 flex items-center gap-2">
                                        <span className="text-base">💡</span> Official Solution
                                    </h4>

                                    {q.solution ? (
                                        <div className="text-sm text-gray-800 leading-relaxed mb-3"><MathText text={q.solution} /></div>
                                    ) : (
                                        (!q.solutionImages || q.solutionImages.length === 0) && !q.solutionImage ? (
                                            <p className="text-sm italic text-gray-500">No official text solution provided.</p>
                                        ) : null
                                    )}

                                    {/* Images */}
                                    {q.solutionImages && q.solutionImages.length > 0 ? (
                                        <div className="grid grid-cols-1 gap-2 mt-2">
                                            {q.solutionImages.map((img, i) => (
                                                <img key={i} src={img} alt={`Solution ${i + 1}`} className="max-h-64 object-contain rounded border border-gray-200 bg-white" />
                                            ))}
                                        </div>
                                    ) : (
                                        q.solutionImage && (
                                            <img src={q.solutionImage} alt="Solution" className="max-h-64 object-contain rounded border border-gray-200 bg-white mt-2" />
                                        )
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
});

PrintableResultReport.displayName = 'PrintableResultReport';

export default PrintableResultReport;
