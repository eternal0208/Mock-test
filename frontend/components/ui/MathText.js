'use client';
import { useEffect, useRef, useState } from 'react';

// Custom MathText component using MathLive to identically match RichMathEditor
const MathText = ({ text, className = '' }) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const mfRef = useRef(null);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            // Dynamically import mathlive so it doesn't break SSR
            import('mathlive').then(() => {
                setIsLoaded(true);
            }).catch(err => console.error("Error loading MathLive:", err));
        }
    }, []);

    useEffect(() => {
        if (isLoaded && mfRef.current && text) {
            // Strip any wrapping `$$` or `$` that might have been added to the RAW string
            let cleanValue = text;
            if (typeof cleanValue === 'string') {
                if (cleanValue.startsWith('$$') && cleanValue.endsWith('$$')) {
                    cleanValue = cleanValue.substring(2, cleanValue.length - 2);
                } else if (cleanValue.startsWith('$') && cleanValue.endsWith('$')) {
                    cleanValue = cleanValue.substring(1, cleanValue.length - 1);
                }
            }
            
            // Set the value directly to the math-field
            // Since it was saved from MathLive's RichMathEditor, it will render flawlessly
            mfRef.current.value = cleanValue || '';
        }
    }, [isLoaded, text]);

    if (!text) return null;

    if (!isLoaded) {
        // Fallback before MathLive initializes
        return <span className={`math-text-container inline-block opacity-50 ${className}`}>{text}</span>;
    }

    return (
        <span className={`math-text-container inline-block ${className}`}>
            <math-field 
                ref={mfRef} 
                read-only="true"
                style={{
                    outline: 'none',
                    border: 'none',
                    backgroundColor: 'transparent',
                    boxShadow: 'none',
                    fontFamily: 'inherit',
                    display: 'inline-block',
                    padding: 0,
                    margin: 0
                }}
            />
        </span>
    );
};

export default MathText;
