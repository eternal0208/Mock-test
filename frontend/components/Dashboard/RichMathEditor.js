'use client';
import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import SubjectToolbar from './SubjectToolbar';

const RichMathEditor = forwardRef(({ 
    value, 
    onChange, 
    placeholder = "Type your question here (Math and Text supported)...", 
    rows = 3,
    className = "" 
}, ref) => {
    const [isLoaded, setIsLoaded] = useState(false);
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
            // Configure MathLive
            mfRef.current.mathVirtualKeyboardPolicy = 'manual'; // We use our own toolbar or native keyboard
            
            // Set initial value only once to prevent cursor jumping
            if (value && mfRef.current.value !== value) {
                mfRef.current.value = value;
            }

            const handleInput = (ev) => {
                if (onChange) {
                    onChange(mfRef.current.value);
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

    // Effect to update external value changes
    useEffect(() => {
        if (isLoaded && mfRef.current && value !== undefined && value !== mfRef.current.value) {
            mfRef.current.value = value;
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
            {/* Toolbar styled like minimal OS window */}
            <div className="bg-slate-100 border-b border-slate-200 px-3 py-2 flex items-center gap-2">
                <div className="flex gap-1.5 mr-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-rose-400/80"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-400/80"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400/80"></div>
                </div>
                <div className="flex-1 opacity-80">
                    <SubjectToolbar onInsert={handleToolbarInsert} />
                </div>
            </div>
            
            {/* Editor area - MathLive Field */}
            <div className="bg-white px-2 py-4">
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
                            padding: '10px',
                            outline: 'none',
                            border: 'none',
                            backgroundColor: 'transparent'
                        }}
                    >
                    </math-field>
                )}
            </div>
            
            {/* Helpful tooltip about typing regular text vs math */}
            <div className="px-4 py-2 bg-indigo-50/50 border-t border-indigo-100/50 flex justify-between items-center text-[10px] text-indigo-400 font-medium">
                <span>Tip: Click symbols above to insert complex math. Edit seamlessly inline.</span>
                <span>Visual rendering powered by MathLive</span>
            </div>
        </div>
    );
});

RichMathEditor.displayName = 'RichMathEditor';

export default RichMathEditor;
