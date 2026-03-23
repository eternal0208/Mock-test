'use client';
import 'katex/dist/katex.min.css';
import katex from 'katex';
import { useEffect, useRef } from 'react';

// Custom lightweight MathText component using KaTeX directly
const MathText = ({ text, className = '' }) => {
    const containerRef = useRef(null);

    useEffect(() => {
        if (!containerRef.current || !text) return;

        // Configuration for delimiters
        const options = {
            throwOnError: false,
            delimiters: [
                { left: '$$', right: '$$', display: true },
                { left: '$', right: '$', display: false },
                { left: '\\(', right: '\\)', display: false },
                { left: '\\[', right: '\\]', display: true }
            ]
        };

        // Render math in the container
        // Note: We need to import the auto-render extension to parse the string
        // but importing it in Next.js client component can be tricky if it's not ESM compatible.
        // Let's implement a simple regex based parser instead to avoid extra dependencies.

        // Simple Parser Logic:
        // Split by delimiters ($...$ or $$...$$)
        // We will assume $...$ for inline and $$...$$ for block.
        // This is a basic implementation. For full support, use 'katex/contrib/auto-render'.

        const renderMath = () => {
            const container = containerRef.current;
            if (!container) return;
            container.innerHTML = ''; 

            // Check if context has NO delimiters but looks like LaTeX (e.g. from MathLive)
            const hasDelimiters = text.includes('$') || text.includes('\\(') || text.includes('\\[');
            const looksLikeLatex = text.includes('\\') || text.includes('^') || text.includes('_');

            if (!hasDelimiters && looksLikeLatex) {
                // If it looks like raw LaTeX, wrap it in a span and render it
                const mathWrapper = document.createElement('span');
                try {
                    katex.render(text, mathWrapper, {
                        throwOnError: false,
                        displayMode: false // Prefer inline for natural look
                    });
                    container.appendChild(mathWrapper);
                    return;
                } catch (e) {
                    // Fallback to text if KaTeX fails
                }
            }

            // Standard regex-based delimiter parsing
            const regex = /(\$\$[\s\S]*?\$\$)|(\$[^\$]*?\$)|(\\\([\s\S]*?\\\))|(\\\[[\s\S]*?\\\])/g;
            let lastIndex = 0;
            let match;

            while ((match = regex.exec(text)) !== null) {
                // Text before math
                if (match.index > lastIndex) {
                    const textSpan = document.createElement('span');
                    textSpan.textContent = text.slice(lastIndex, match.index);
                    container.appendChild(textSpan);
                }

                // Math part
                const mathWrapper = document.createElement('span');
                const fullMatch = match[0];
                const isDisplay = fullMatch.startsWith('$$') || fullMatch.startsWith('\\[');
                
                // Remove delimiters
                let mathContent = fullMatch;
                if (fullMatch.startsWith('$$')) mathContent = fullMatch.slice(2, -2);
                else if (fullMatch.startsWith('$')) mathContent = fullMatch.slice(1, -1);
                else if (fullMatch.startsWith('\\(')) mathContent = fullMatch.slice(2, -2);
                else if (fullMatch.startsWith('\\[')) mathContent = fullMatch.slice(2, -2);

                try {
                    katex.render(mathContent, mathWrapper, {
                        throwOnError: false,
                        displayMode: isDisplay
                    });
                } catch (e) {
                    mathWrapper.textContent = fullMatch;
                    console.error("Katex Error", e);
                }
                container.appendChild(mathWrapper);
                lastIndex = regex.lastIndex;
            }

            // Remaining text
            if (lastIndex < text.length) {
                const textSpan = document.createElement('span');
                textSpan.textContent = text.slice(lastIndex);
                container.appendChild(textSpan);
            }
        };

        renderMath();

    }, [text]);

    if (!text) return null;

    return (
        <span ref={containerRef} className={`math-text-container ${className}`} />
    );
};

export default MathText;
