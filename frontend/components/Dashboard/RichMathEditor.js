'use client';
import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import SubjectToolbar from './SubjectToolbar';

const RichMathEditor = forwardRef(({ 
    value, 
    onChange, 
    placeholder = "Type your question here (Math and Text supported)...", 
    rows = 3,
    className = "",
    minimal = false
}, ref) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [showToolbar, setShowToolbar] = useState(!minimal);
    const mfRef = useRef(null);
    // Guard: do NOT overwrite field value while user has focus (typing)
    const isFocusedRef = useRef(false);
    // Track last value we programmatically set to avoid redundant re-sets
    const lastSetValueRef = useRef(null);

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
            mfRef.current.smartMode = true;
            mfRef.current.defaultMode = 'text';

            // Set initial value once on mount
            const cleanInitial = stripDelimiters(value);
            mfRef.current.value = cleanInitial || '';
            lastSetValueRef.current = cleanInitial || '';

            const handleInput = () => {
                if (onChange) {
                    const rawLatex = mfRef.current.value;
                    onChange(rawLatex || '');
                }
            };

            const handleFocus = () => { isFocusedRef.current = true; };
            const handleBlur = () => { isFocusedRef.current = false; };

            mfRef.current.addEventListener('input', handleInput);
            mfRef.current.addEventListener('focus', handleFocus);
            mfRef.current.addEventListener('blur', handleBlur);

            return () => {
                if (mfRef.current) {
                    mfRef.current.removeEventListener('input', handleInput);
                    mfRef.current.removeEventListener('focus', handleFocus);
                    mfRef.current.removeEventListener('blur', handleBlur);
                }
            };
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isLoaded]);

    // Handle external/programmatic changes to value
    // ONLY sync when user is NOT typing (not focused) AND value actually differs
    useEffect(() => {
        if (!isLoaded || !mfRef.current) return;
        if (isFocusedRef.current) return; // Do NOT interrupt user typing

        const cleanValue = stripDelimiters(value);
        // Only update if it's genuinely different from what we last set
        if (cleanValue !== lastSetValueRef.current) {
            mfRef.current.value = cleanValue || '';
            lastSetValueRef.current = cleanValue || '';
        }
    }, [value, isLoaded]);

    const handleToolbarInsert = (latex) => {
        if (mfRef.current) {
            mfRef.current.executeCommand(['insert', latex]);
            mfRef.current.focus();
        }
    };

    return (
        <div className={`border border-slate-200 rounded-2xl overflow-hidden focus-within:ring-4 focus-within:ring-indigo-500/10 focus-within:border-indigo-500 transition-all shadow-sm ${className}`}>
            {/* Lighter selection highlight override */}
            <style>{`
                math-field::part(virtual-keyboard-toggle) { display: none; }
                math-field .ML__selection { background: rgba(99, 102, 241, 0.18) !important; }
                math-field .ML__contains-caret { background: rgba(99, 102, 241, 0.10) !important; }
            `}</style>
            
            {/* Toolbar - Header and Symbols */}
            {(!minimal || showToolbar) && (
                <div className="bg-slate-50 border-b border-slate-200 flex flex-col">
                    {!minimal && (
                        <div className="px-3 py-1.5 flex items-center gap-2 border-b border-slate-200/50 bg-slate-100/50">
                            <div className="flex gap-1.5 mr-2">
                                <div className="w-2.5 h-2.5 rounded-full bg-rose-400/80"></div>
                                <div className="w-2.5 h-2.5 rounded-full bg-amber-400/80"></div>
                                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400/80"></div>
                            </div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Natural Math Editor</span>
                        </div>
                    )}
                    <div className="w-full">
                        <SubjectToolbar onInsert={handleToolbarInsert} compact={minimal} />
                    </div>
                </div>
            )}
            
            {/* Visual Editor (MathLive Field) */}
            <div className="bg-white px-2 py-2 relative">
                {minimal && (
                    <button 
                        type="button" 
                        onClick={() => setShowToolbar(!showToolbar)} 
                        className={`absolute top-2 right-2 p-1.5 rounded-lg text-xs font-bold transition-all z-10 ${
                            showToolbar ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-50 text-slate-400 hover:bg-slate-100 border border-slate-200 shadow-sm'
                        }`}
                        title="Toggle symbols"
                    >
                        Σ
                    </button>
                )}
                
                {!isLoaded ? (
                    <div className="animate-pulse h-10 flex items-center px-2 text-xs text-gray-400 rounded-lg">
                        Visual Editor loading...
                    </div>
                ) : (
                    <math-field 
                        ref={mfRef}
                        style={{
                            width: '100%', 
                            minHeight: `${rows * 24}px`, 
                            fontSize: '16px', 
                            padding: '10px',
                            paddingRight: minimal ? '40px' : '10px',
                            outline: 'none',
                            border: 'none',
                            backgroundColor: 'transparent'
                        }}
                        placeholder={placeholder}
                    />
                )}
            </div>

            {/* Hint Footer */}
            {!minimal && (
                <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400 font-medium">
                    <span>Type normally for text. Click symbols for visual math.</span>
                    <span>Visual Rendering Enabled</span>
                </div>
            )}
        </div>
    );
});

RichMathEditor.displayName = 'RichMathEditor';

/** Strip outer $...$ or $$...$$ delimiters if present */
function stripDelimiters(val) {
    if (!val || typeof val !== 'string') return val || '';
    if (val.startsWith('$$') && val.endsWith('$$')) return val.slice(2, -2);
    if (val.startsWith('$') && val.endsWith('$')) return val.slice(1, -1);
    return val;
}

export default RichMathEditor;
