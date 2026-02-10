'use client';
import 'katex/dist/katex.min.css';
import Latex from 'react-latex-next';

// Wrapper component to safely render mixed text and LaTeX
const MathText = ({ text, className = '' }) => {
    if (!text) return null;

    // Basic error boundary in case Latex component fails
    try {
        return (
            <span className={`math-text-container ${className}`}>
                <Latex>{text}</Latex>
            </span>
        );
    } catch (e) {
        console.error("Math Render Error:", e);
        return <span className={className}>{text}</span>;
    }
};

export default MathText;
