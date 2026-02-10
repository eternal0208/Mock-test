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
            container.innerHTML = ''; // Clear

            // Regex to find math segments
            // This regex matches $$...$$ or $...$
            // Using non-greedy matching
            const regex = /(\$\$[\s\S]*?\$\$)|(\$[^\$]*?\$)/g;

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
                const isDisplay = fullMatch.startsWith('$$');
                // Remove delimiters
                const mathContent = isDisplay
                    ? fullMatch.slice(2, -2)
                    : fullMatch.slice(1, -1);

                try {
                    katex.render(mathContent, mathWrapper, {
                        throwOnError: false,
                        displayMode: isDisplay
                    });
                } catch (e) {
                    mathWrapper.textContent = fullMatch; // Fallback
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
