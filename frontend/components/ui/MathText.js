'use client';
import { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

/**
 * Universal MathText Component
 * Renders mixed text and LaTeX content (Inline & Block).
 * Supports: $...$, $$...$$, \(...\), \[...\]
 */
const MathText = ({ text = '', className = '' }) => {
    const renderedParts = useMemo(() => {
        if (!text || typeof text !== 'string') return null;

        // Pattern for matching block ($$, \[) and inline ($, \() math
        // Order matters: check longer delimiters first
        const mathRegex = /(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\$[\s\S]+?\$|\\\([\s\S]+?\\\))/g;
        
        const parts = text.split(mathRegex);

        return parts.map((part, index) => {
            if (!part) return null;

            // Block Math: $$...$$ or \[...\]
            if ((part.startsWith('$$') && part.endsWith('$$')) || 
                (part.startsWith('\\\[') && part.endsWith('\\\]'))) {
                let math = '';
                if (part.startsWith('$$')) math = part.slice(2, -2);
                else math = part.slice(2, -2); // Remove \[ and \]
                
                try {
                    const html = katex.renderToString(math, { 
                        displayMode: true, 
                        throwOnError: false,
                        strict: false
                    });
                    return <div key={index} className="my-4 overflow-x-auto no-scrollbar" dangerouslySetInnerHTML={{ __html: html }} />;
                } catch (e) {
                    return <div key={index} className="text-rose-500 font-mono text-xs my-2">{part}</div>;
                }
            }

            // Inline Math: $...$ or \(...\)
            if ((part.startsWith('$') && part.endsWith('$')) || 
                (part.startsWith('\\\(') && part.endsWith('\\\right)'))) {
                let math = '';
                if (part.startsWith('$')) math = part.slice(1, -1);
                else math = part.slice(2, -2); // Remove \( and \)
                
                try {
                    const html = katex.renderToString(math, { 
                        displayMode: false, 
                        throwOnError: false,
                        strict: false
                    });
                    return <span key={index} className="inline-block px-0.5" dangerouslySetInnerHTML={{ __html: html }} />;
                } catch (e) {
                    return <span key={index} className="text-rose-500 font-mono text-xs">{part}</span>;
                }
            }

            // Regular Text / HTML
            // Check if part looks like HTML (SVG, etc.)
            const isHTML = /<[a-z][\s\S]*>/i.test(part);
            if (isHTML) {
                return <span key={index} dangerouslySetInnerHTML={{ __html: part }} />;
            }

            // Plain text: split on \n and render <br/> so multiline content
            // (chemistry reactions, multi-step solutions, options) shows correctly
            const lines = part.split('\n');
            if (lines.length === 1) {
                return <span key={index}>{part}</span>;
            }
            return (
                <span key={index}>
                    {lines.map((line, li) => (
                        <span key={li}>
                            {line}
                            {li < lines.length - 1 && <br />}
                        </span>
                    ))}
                </span>
            );
        });
    }, [text]);

    if (!text) return null;

    return (
        <div className={`math-text-root leading-relaxed ${className}`}>
            {renderedParts}
        </div>
    );
};

export default MathText;
