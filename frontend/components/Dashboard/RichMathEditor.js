'use client';
import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import SubjectToolbar from './SubjectToolbar';

// Flat, simple symbol list shown in option fields (minimal mode)
const QUICK_SYMBOLS = [
    { d: 'a/b', l: '\\frac{a}{b}' },
    { d: 'xⁿ', l: '^{n}' },
    { d: 'xₙ', l: '_{n}' },
    { d: '√x', l: '\\sqrt{x}' },
    { d: '∫', l: '\\int' },
    { d: '∑', l: '\\sum' },
    { d: '∞', l: '\\infty' },
    { d: '±', l: '\\pm' },
    { d: '×', l: '\\times' },
    { d: '÷', l: '\\div' },
    { d: '≠', l: '\\neq' },
    { d: '≈', l: '\\approx' },
    { d: '≤', l: '\\leq' },
    { d: '≥', l: '\\geq' },
    { d: 'α', l: '\\alpha' },
    { d: 'β', l: '\\beta' },
    { d: 'γ', l: '\\gamma' },
    { d: 'θ', l: '\\theta' },
    { d: 'λ', l: '\\lambda' },
    { d: 'μ', l: '\\mu' },
    { d: 'π', l: '\\pi' },
    { d: 'σ', l: '\\sigma' },
    { d: 'ω', l: '\\omega' },
    { d: 'Δ', l: '\\Delta' },
    { d: '→', l: '\\rightarrow' },
    { d: '⇌', l: '\\rightleftharpoons' },
    { d: 'd/dx', l: '\\frac{d}{dx}' },
    { d: '∂/∂x', l: '\\frac{\\partial}{\\partial x}' },
    { d: '|x|', l: '|x|' },
    { d: 'vec', l: '\\vec{v}' },
];

const RichMathEditor = forwardRef(({ 
    value, 
    onChange, 
    placeholder = "Type your question here (Math and Text supported)...", 
    rows = 3,
    className = "",
    minimal = false
}, ref) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [showSymbols, setShowSymbols] = useState(false);
    const mfRef = useRef(null);

    useImperativeHandle(ref, () => ({
        insertLatex: (latex) => {
            if (mfRef.current) {
                mfRef.current.executeCommand(['insert', latex]);
                mfRef.current.focus();
            }
        }
    }));

    useEffect(() => {
        if (typeof window !== 'undefined') {
            import('mathlive').then(() => {
                setIsLoaded(true);
            });
        }
    }, []);

    useEffect(() => {
        if (isLoaded && mfRef.current) {
            mfRef.current.mathVirtualKeyboardPolicy = 'manual';
            
            if (value !== undefined) {
                let cleanValue = value;
                if (typeof cleanValue === 'string') {
                    if (cleanValue.startsWith('$$') && cleanValue.endsWith('$$')) {
                        cleanValue = cleanValue.substring(2, cleanValue.length - 2);
                    } else if (cleanValue.startsWith('$') && cleanValue.endsWith('$')) {
                        cleanValue = cleanValue.substring(1, cleanValue.length - 1);
                    }
                }
                if (mfRef.current.value !== cleanValue) {
                    mfRef.current.value = cleanValue || '';
                }
            }

            const handleInput = () => {
                if (onChange) {
                    const rawLatex = mfRef.current.value;
                    onChange(rawLatex ? `$$${rawLatex}$$` : '');
                }
            };

            mfRef.current.addEventListener('input', handleInput);
            return () => {
                if (mfRef.current) {
                    mfRef.current.removeEventListener('input', handleInput);
                }
            };
        }
    }, [isLoaded, onChange]);

    useEffect(() => {
        if (isLoaded && mfRef.current && value !== undefined) {
            let cleanValue = value;
            if (typeof cleanValue === 'string') {
                if (cleanValue.startsWith('$$') && cleanValue.endsWith('$$')) {
                    cleanValue = cleanValue.substring(2, cleanValue.length - 2);
                } else if (cleanValue.startsWith('$') && cleanValue.endsWith('$')) {
                    cleanValue = cleanValue.substring(1, cleanValue.length - 1);
                }
            }
            if (mfRef.current.value !== cleanValue) {
                mfRef.current.value = cleanValue || '';
            }
        }
    }, [value, isLoaded]);

    const insertLatex = (latex) => {
        if (mfRef.current) {
            mfRef.current.executeCommand(['insert', latex]);
            mfRef.current.focus();
        }
    };

    // ── MINIMAL / OPTION EDITOR ──────────────────────────────────────────────
    if (minimal) {
        return (
            <div className={`rounded-xl border border-slate-200 bg-white overflow-hidden ${className}`}>
                {/* Math input area */}
                <div className="relative">
                    {!isLoaded ? (
                        <div className="h-10 flex items-center px-3 text-xs text-slate-400 animate-pulse">Loading…</div>
                    ) : (
                        <math-field
                            ref={mfRef}
                            default-mode="text"
                            style={{
                                width: '100%',
                                minHeight: `${rows * 20}px`,
                                fontSize: '14px',
                                padding: '6px 10px',
                                paddingRight: '40px',
                                outline: 'none',
                                border: 'none',
                                backgroundColor: 'transparent',
                            }}
                        />
                    )}
                    {/* Toggle button placed inside input on the right */}
                    <button
                        type="button"
                        onClick={() => setShowSymbols(p => !p)}
                        title="Insert symbol"
                        className={`absolute top-1/2 right-2 -translate-y-1/2 w-7 h-7 rounded-md flex items-center justify-center text-base transition-colors ${
                            showSymbols
                                ? 'bg-indigo-100 text-indigo-600'
                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                    >
                        Σ
                    </button>
                </div>

                {/* Symbol strip — full width, wraps to fill box */}
                {showSymbols && (
                    <div className="border-t border-slate-100 bg-slate-50 px-2 py-2 flex flex-wrap gap-1 w-full">
                        {QUICK_SYMBOLS.map((s, i) => (
                            <button
                                key={i}
                                type="button"
                                title={s.l}
                                onClick={() => insertLatex(s.l)}
                                className="min-w-[30px] h-7 px-1.5 rounded-md bg-white border border-slate-200 text-[13px] text-slate-700 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 transition-colors shadow-sm"
                            >
                                {s.d}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    // ── FULL / QUESTION EDITOR ───────────────────────────────────────────────
    return (
        <div className={`border border-slate-200 rounded-2xl overflow-hidden focus-within:ring-4 focus-within:ring-indigo-500/10 focus-within:border-indigo-500 transition-all shadow-sm ${className}`}>
            {/* Toolbar Header */}
            <div className="bg-slate-50 border-b border-slate-200 flex flex-col">
                <div className="px-3 py-1.5 flex items-center gap-2 border-b border-slate-200/50 bg-slate-100/50">
                    <div className="flex gap-1.5 mr-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-rose-400/80"></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-400/80"></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-400/80"></div>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Visual Math Studio</span>
                </div>
                <div className="w-full">
                    <SubjectToolbar onInsert={insertLatex} />
                </div>
            </div>

            {/* Editor */}
            <div className="bg-white px-2 py-2">
                {!isLoaded ? (
                    <div className="animate-pulse h-24 bg-gray-50 flex items-center justify-center text-xs text-gray-400 rounded-lg">
                        Loading Visual Math Editor...
                    </div>
                ) : (
                    <math-field
                        ref={mfRef}
                        style={{
                            width: '100%',
                            minHeight: `${rows * 24}px`,
                            fontSize: '15px',
                            padding: '8px',
                            outline: 'none',
                            border: 'none',
                            backgroundColor: 'transparent'
                        }}
                    />
                )}
            </div>

            {/* Footer tip */}
            <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400 font-medium">
                <span>Tip: Click symbols above to insert math. Edit seamlessly inline.</span>
                <span>Powered by MathLive</span>
            </div>
        </div>
    );
});

RichMathEditor.displayName = 'RichMathEditor';

export default RichMathEditor;
