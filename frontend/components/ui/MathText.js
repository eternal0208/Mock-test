'use client';
import { useEffect, useRef } from 'react';

// Custom MathText component using MathJax for robust LaTeX rendering
const MathText = ({ text, className = '' }) => {
    const containerRef = useRef(null);

    useEffect(() => {
        if (!containerRef.current || !text) return;

        // Ensure text is wrapped in delimiters if it's raw from MathLive
        // MathLive often outputs bare LaTeX like `\frac{1}{2}`
        let content = text;
        const hasDelimiters = content.includes('$$') || content.includes('\\[') || content.includes('\\(') || (content.includes('$') && !content.includes('\\$'));
        
        if (!hasDelimiters) {
            // Assume it's a pure MathLive LaTeX string
            content = `\\( ${content} \\)`; 
        }

        containerRef.current.innerHTML = content;

        if (window.MathJax) {
            window.MathJax.typesetPromise([containerRef.current]).catch((err) => console.error('MathJax error:', err));
        }

    }, [text]);

    if (!text) return null;

    return (
        <span ref={containerRef} className={`math-text-container inline-block ${className}`} />
    );
};

export default MathText;
