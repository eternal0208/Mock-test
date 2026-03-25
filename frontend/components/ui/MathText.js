'use client';
import { useEffect, useRef, useState } from 'react';

// Hybrid MathText: Uses MathLive for raw LaTeX to avoid double exponent errors,
// but safely falls back to standard HTML injection + MathJax for text containing images/layout tags.
const MathText = ({ text, className = '' }) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const mfRef = useRef(null);
    const containerRef = useRef(null);
    
    // Check if the content is HTML (like images or <p> tags from rich editors)
    const containsHtml = typeof text === 'string' && /<[a-z][\s\S]*>/i.test(text);

    useEffect(() => {
        if (typeof window !== 'undefined' && !containsHtml) {
            import('mathlive').then(() => {
                setIsLoaded(true);
            }).catch(err => console.error("Error loading MathLive:", err));
        }
    }, [containsHtml]);

    useEffect(() => {
        if (!text) return;

        if (containsHtml) {
            // HTML PATH: Safely Inject HTML and Typeset with MathJax
            if (containerRef.current) {
                let content = text;
                const hasDelimiters = content.includes('$$') || content.includes('\\[') || content.includes('\\(') || (content.includes('$') && !content.includes('\\$'));
                
                // Only wrap if there are no delimiters AND it doesn't look like purely structural HTML
                if (!hasDelimiters && !content.includes('<img')) {
                    // It's text with some minor HTML tags, wrap it just in case it contains native latex
                    // content = `\\( ${content} \\)`; 
                    // Wait, wrapping HTML strings in \( usually breaks MathJax. Better to leave it RAW.
                }

                containerRef.current.innerHTML = content;

                if (window.MathJax) {
                    window.MathJax.typesetPromise([containerRef.current]).catch(err => console.error(err));
                }
            }
        } else if (isLoaded && mfRef.current) {
            // PURE LATEX PATH: Use MathLive exactly like the Editor
            let cleanValue = text;
            if (typeof cleanValue === 'string') {
                if (cleanValue.startsWith('$$') && cleanValue.endsWith('$$')) {
                    cleanValue = cleanValue.substring(2, cleanValue.length - 2);
                } else if (cleanValue.startsWith('$') && cleanValue.endsWith('$')) {
                    cleanValue = cleanValue.substring(1, cleanValue.length - 1);
                }
            }
            mfRef.current.value = cleanValue || '';
        }
    }, [isLoaded, text, containsHtml]);

    if (!text) return null;

    if (containsHtml) {
        return <span ref={containerRef} className={`math-text-container inline-block w-full overflow-hidden text-slate-900 ${className}`} />;
    }

    if (!isLoaded) {
        return <span className={`math-text-container inline-block text-slate-900 ${className}`}>{text}</span>;
    }

    return (
        <span className={`math-text-container inline-block max-w-full overflow-x-auto no-scrollbar text-slate-900 ${className}`}>
            <math-field 
                ref={mfRef} 
                read-only="true"
                style={{
                    outline: 'none',
                    border: 'none',
                    backgroundColor: 'transparent',
                    boxShadow: 'none',
                    fontFamily: 'inherit',
                    color: '#1e293b',
                    '--math-text-color': '#1e293b',
                    display: 'block',
                    padding: 0,
                    margin: 0
                }}
            />
        </span>
    );
};

export default MathText;
