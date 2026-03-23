'use client';
import { useRef, useState, forwardRef, useImperativeHandle } from 'react';
import SubjectToolbar from './SubjectToolbar';

// Symbols for the quick strip in options
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
    const [showSymbols, setShowSymbols] = useState(false);
    const textareaRef = useRef(null);

    useImperativeHandle(ref, () => ({
        insertLatex: (latex) => {
            handleInsert(latex);
        },
        focus: () => {
            if (textareaRef.current) textareaRef.current.focus();
        }
    }));

    const handleInsert = (latex) => {
        const el = textareaRef.current;
        if (!el) return;

        const start = el.selectionStart;
        const end = el.selectionEnd;
        const textToInsert = `$${latex}$`;
        const currentText = value || '';
        
        const newText = currentText.substring(0, start) + textToInsert + currentText.substring(end);
        
        if (onChange) {
            onChange(newText);
        }

        // Return focus and move cursor
        setTimeout(() => {
            el.focus();
            const newPos = start + textToInsert.length;
            el.setSelectionRange(newPos, newPos);
        }, 0);
    };

    // ── OPTION EDITOR (MINIMAL) ──────────────────────────────────────────────
    if (minimal) {
        return (
            <div className={`rounded-xl border border-slate-200 bg-white overflow-hidden ${className}`}>
                <div className="relative">
                    <textarea
                        ref={textareaRef}
                        rows={rows}
                        placeholder={placeholder}
                        value={value || ''}
                        onChange={(e) => onChange && onChange(e.target.value)}
                        className="w-full resize-none outline-none border-none bg-transparent text-sm text-slate-800 leading-relaxed placeholder-slate-400 pr-10"
                        style={{ padding: '10px 40px 10px 12px', minHeight: `${rows * 24}px` }}
                    />
                    <button
                        type="button"
                        onClick={() => setShowSymbols(p => !p)}
                        title="Math Symbols"
                        className={`absolute top-2 right-2 w-7 h-7 rounded-md flex items-center justify-center text-sm font-bold transition-all ${
                            showSymbols ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700'
                        }`}
                    >
                        Σ
                    </button>
                </div>

                {showSymbols && (
                    <div className="border-t border-slate-100 bg-slate-50 px-2 py-2 flex flex-wrap gap-1 w-full animate-in slide-in-from-top-2 duration-200">
                        {QUICK_SYMBOLS.map((s, i) => (
                            <button
                                key={i}
                                type="button"
                                onClick={() => handleInsert(s.l)}
                                className="min-w-[32px] h-8 px-2 rounded-md bg-white border border-slate-200 text-[13px] text-slate-700 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 transition-all shadow-sm active:scale-95"
                            >
                                {s.d}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    // ── QUESTION EDITOR (FULL) ───────────────────────────────────────────────
    return (
        <div className={`border border-slate-200 rounded-3xl overflow-hidden focus-within:ring-4 focus-within:ring-indigo-500/10 focus-within:border-indigo-500 transition-all shadow-sm ${className}`}>
            <div className="bg-slate-50 border-b border-slate-200 flex flex-col">
                <div className="px-4 py-3 flex items-center gap-2 border-b border-slate-200/50 bg-slate-100/50">
                    <div className="flex gap-1.5 mr-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-rose-400/80"></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-400/80"></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-400/80"></div>
                    </div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Question Studio</span>
                </div>
                <div className="w-full">
                    <SubjectToolbar onInsert={handleInsert} />
                </div>
            </div>

            <div className="bg-white">
                <textarea
                    ref={textareaRef}
                    rows={rows}
                    placeholder={placeholder}
                    value={value || ''}
                    onChange={(e) => onChange && onChange(e.target.value)}
                    className="w-full resize-none outline-none border-none bg-transparent text-base text-slate-800 leading-relaxed placeholder-slate-400 p-6 font-normal min-h-[200px]"
                />
            </div>

            <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                <span className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                    Normal Text Enabled
                </span>
                <span>Type math as $latex$</span>
            </div>
        </div>
    );
});

RichMathEditor.displayName = 'RichMathEditor';

export default RichMathEditor;
