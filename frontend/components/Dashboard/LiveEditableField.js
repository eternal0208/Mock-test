'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import MathText from '@/components/ui/MathText';
import { Pencil, Check, Zap, Keyboard, Eye } from 'lucide-react';
import SubjectToolbar from './SubjectToolbar';
import RichMathEditor from './RichMathEditor';

/**
 * LiveEditableField – a lightweight inline editor for LaTeX/text fields.
 *
 * Features:
 *   • Click the rendered preview (or pencil icon) to switch to a textarea.
 *   • Press Ctrl+Enter or click outside to commit changes.
 *   • Press Escape to discard edits.
 *   • Uses a ref (`draftRef`) to always capture the latest draft value –
 *     prevents React‑batching race conditions where `onBlur` could read a stale
 *     state.
 *   • Auto‑resizes the textarea to fit content.
 */
export default function LiveEditableField({
    value = '',
    onChange,
    placeholder = 'Click to edit…',
    rows = 3,
    className = '',
    previewClass = '',
    label = '',
}) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(value);
    const [showSymbols, setShowSymbols] = useState(false);
    const [editorMode, setEditorMode] = useState('raw'); // 'raw' or 'visual'
    const taRef = useRef(null);
    const visualRef = useRef(null);
    const draftRef = useRef(value); // always holds latest draft

    // Keep draftRef in sync with draft state
    useEffect(() => {
        draftRef.current = draft;
    }, [draft]);

    // Sync draft when parent updates value (e.g., switching questions)
    useEffect(() => {
        if (!editing) {
            setDraft(value);
            draftRef.current = value;
        }
    }, [value, editing]);

    // Auto‑focus textarea when entering edit mode or switching modes
    useEffect(() => {
        if (editing) {
            if (editorMode === 'raw' && taRef.current) {
                taRef.current.focus();
                // Move cursor to end to avoid jumping
                const len = taRef.current.value.length;
                taRef.current.setSelectionRange(len, len);
            }
            // RichMathEditor (visual mode) handles its own initial focus
        }
    }, [editing, editorMode]);

    const startEdit = useCallback(() => {
        setDraft(value);
        draftRef.current = value;
        setEditing(true);
    }, [value]);

    const commit = useCallback(() => {
        setEditing(false);
        onChange?.(draftRef.current);
    }, [onChange]);

    const handleKey = useCallback((e) => {
        if (e.key === 'Escape') {
            setDraft(value);
            draftRef.current = value;
            setEditing(false);
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            commit();
        }
    }, [commit, value]);

    const handleChange = useCallback((e) => {
        setDraft(e.target.value);
        draftRef.current = e.target.value;
        onChange?.(e.target.value);
    }, [onChange]);

    const handleInsertSymbol = useCallback((latex) => {
        if (editorMode === 'visual') {
            if (visualRef.current) {
                visualRef.current.insertLatex(latex);
            }
            return;
        }

        if (!taRef.current) return;
        const start = taRef.current.selectionStart;
        const end = taRef.current.selectionEnd;
        const text = draftRef.current;
        const before = text.substring(0, start);
        const after = text.substring(end);
        const newVal = before + latex + after;
        
        setDraft(newVal);
        draftRef.current = newVal;
        onChange?.(newVal);
        
        // Return focus and set cursor position after symbol insert
        setTimeout(() => {
            if (taRef.current) {
                taRef.current.focus();
                const pos = start + latex.length;
                taRef.current.setSelectionRange(pos, pos);
            }
        }, 10);
    }, [onChange, editorMode]);

    // Auto‑resize textarea to fit content
    const autoResize = useCallback(() => {
        if (taRef.current) {
            taRef.current.style.height = 'auto';
            taRef.current.style.height = taRef.current.scrollHeight + 'px';
        }
    }, []);

    useEffect(() => {
        if (editing) autoResize();
    }, [editing, draft, autoResize]);

    return (
        <div className={`relative group/lef ${className}`}>
            {editing ? (
                <div className="relative">
                    <div className="flex items-center justify-between mb-2 px-1">
                        <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest flex items-center gap-1.5">
                            {label || 'Editor'} — {editorMode === 'visual' ? 'Visual Math Mode' : 'Raw Text Mode'}
                        </span>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onMouseDown={(e) => { 
                                    e.preventDefault(); 
                                    if (visualRef.current) visualRef.current.blur();
                                    setEditorMode('raw'); 
                                }}
                                className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border transition-all ${editorMode === 'raw' ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-200 text-slate-400 hover:text-indigo-500 hover:border-indigo-200'}`}
                            >
                                <Keyboard size={10} className="inline mb-0.5 mr-1" /> Raw
                            </button>
                            <button
                                type="button"
                                onMouseDown={(e) => { 
                                    e.preventDefault(); 
                                    if (taRef.current) taRef.current.blur();
                                    setEditorMode('visual'); 
                                }}
                                className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border transition-all ${editorMode === 'visual' ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-200 text-slate-400 hover:text-indigo-500 hover:border-indigo-200'}`}
                            >
                                <Eye size={10} className="inline mb-0.5 mr-1" /> Visual
                            </button>
                        </div>
                    </div>

                    <div className={editorMode === 'visual' ? 'block' : 'hidden'}>
                        <RichMathEditor
                            ref={visualRef}
                            value={draft}
                            onChange={(val) => {
                                setDraft(val);
                                draftRef.current = val;
                                onChange?.(val);
                            }}
                            placeholder={placeholder}
                            minimal={true}
                            rows={rows}
                            className="w-full"
                        />
                    </div>
                    <div className={editorMode === 'raw' ? 'block' : 'hidden'}>
                        <textarea
                            ref={taRef}
                            value={draft}
                            onChange={handleChange}
                            onKeyDown={handleKey}
                            onBlur={commit}
                            onInput={autoResize}
                            rows={rows}
                            placeholder={placeholder}
                            spellCheck={false}
                            className="w-full font-mono text-[13px] text-slate-800 bg-white border border-indigo-500 focus:border-indigo-400 shadow-xl shadow-indigo-500/10 rounded-2xl px-4 py-3 resize-none outline-none leading-relaxed placeholder:text-slate-600 transition-all"
                            style={{ minHeight: `${rows * 24}px` }}
                        />
                    </div>

                    <div className="flex items-center justify-between mt-1.5 px-1">
                        <div className="flex items-center gap-3">
                            <span className="text-[9px] text-slate-400 font-medium whitespace-nowrap">
                                Ctrl+Enter to save · Esc to discard
                            </span>
                            <button
                                type="button"
                                onMouseDown={(e) => { e.preventDefault(); setShowSymbols(!showSymbols); }}
                                className={`flex items-center gap-1.2 text-[9px] font-black uppercase tracking-wider transition-colors ${showSymbols ? 'text-indigo-600' : 'text-slate-400 hover:text-indigo-500'}`}
                            >
                                <Zap size={10} className={showSymbols ? 'fill-indigo-600' : ''} /> Symbols {showSymbols ? 'ON' : 'OFF'}
                            </button>
                        </div>
                        <button
                            type="button"
                            onMouseDown={(e) => { e.preventDefault(); commit(); }}
                            className="flex items-center gap-1 text-[9px] font-black text-emerald-600 uppercase tracking-wide hover:text-emerald-700"
                        >
                            <Check size={10} strokeWidth={3} /> Done
                        </button>
                    </div>

                    {showSymbols && (
                        <div 
                            onMouseDown={(e) => e.preventDefault()}
                            className="mt-3 overflow-hidden rounded-2xl border border-indigo-100 shadow-lg shadow-indigo-500/5 animate-in slide-in-from-top-1 duration-200"
                        >
                            <SubjectToolbar onInsert={handleInsertSymbol} compact={true} />
                        </div>
                    )}
                </div>
            ) : (
                <div
                    onClick={startEdit}
                    title="Click to edit"
                    className="relative cursor-text min-h-[36px] rounded-2xl px-4 py-3 border-2 border-transparent hover:border-indigo-200 hover:bg-indigo-50/30 transition-all group/preview"
                >
                    {value ? (
                        <MathText
                            text={value}
                            className={`text-slate-800 leading-relaxed select-text ${previewClass}`}
                        />
                    ) : (
                        <span className="text-slate-400 italic text-sm">{placeholder}</span>
                    )}
                    <span className="absolute top-2 right-2 p-1.5 rounded-lg bg-white border border-slate-200 shadow-sm text-slate-400 opacity-0 group-hover/preview:opacity-100 transition-opacity pointer-events-none">
                        <Pencil size={11} />
                    </span>
                </div>
            )}
        </div>
    );
}
