'use client';
import { Bold, Italic, Superscript, Subscript, Divide, Square, Sigma, Hash } from 'lucide-react';

const MathToolbar = ({ onInsert }) => {

    // Helper to insert LaTeX at cursor position or append
    const buttons = [
        { label: 'Fraction', latex: '$\\frac{a}{b}$', icon: <span className="font-mono text-xs">a/b</span>, tooltip: 'Insert Fraction' },
        { label: 'Power', latex: '$^{n}$', icon: <Superscript size={14} />, tooltip: 'Superscript / Power' },
        { label: 'Subscript', latex: '$_{n}$', icon: <Subscript size={14} />, tooltip: 'Subscript' },
        { label: 'Square Root', latex: '$\\sqrt{x}$', icon: <span className="font-mono text-xs">√</span>, tooltip: 'Square Root' },
        { label: 'Nth Root', latex: '$\\sqrt[n]{x}$', icon: <span className="font-mono text-xs">ⁿ√</span>, tooltip: 'Nth Root' },
        { label: 'Indefinite Integral', latex: '$\\int x dx$', icon: <span className="font-mono text-xs">∫</span>, tooltip: 'Indefinite Integral' },
        { label: 'Definite Integral', latex: '$\\int_{a}^{b} x dx$', icon: <span className="font-mono text-xs">∫a-b</span>, tooltip: 'Definite Integral (Limits)' },
        { label: 'Limit', latex: '$\\lim_{x \\to a}$', icon: <span className="font-mono text-xs">lim</span>, tooltip: 'Limit x→a' },
        { label: 'Limit Infinity', latex: '$\\lim_{x \\to \\infty}$', icon: <span className="font-mono text-xs">lim→∞</span>, tooltip: 'Limit x→Infinity' },
        { label: 'Sum', latex: '$\\sum_{i=1}^{n}$', icon: <Sigma size={14} />, tooltip: 'Summation' },
        { label: 'Product', latex: '$\\prod_{i=1}^{n}$', icon: <span className="font-mono text-xs">∏</span>, tooltip: 'Product' },
        { label: 'Infinity', latex: '$\\infty$', icon: <span className="font-mono text-xs">∞</span>, tooltip: 'Infinity' },
        { label: 'Matrix 2x2', latex: '$\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}$', icon: <span className="font-mono text-xs">[::]</span>, tooltip: '2x2 Matrix' },
        { label: 'Cases', latex: '$f(x) = \\begin{cases} a & x < 0 \\\\ b & x \\geq 0 \\end{cases}$', icon: <span className="font-mono text-xs">{`{`}</span>, tooltip: 'Cases / Piecewise' },
        { label: 'PlusMinus', latex: '$\\pm$', icon: <span className="font-mono text-xs">±</span>, tooltip: 'Plus Minus' },
        { label: 'Approx', latex: '$\\approx$', icon: <span className="font-mono text-xs">≈</span>, tooltip: 'Approximately Equal' },
        { label: 'NotEqual', latex: '$\\neq$', icon: <span className="font-mono text-xs">≠</span>, tooltip: 'Not Equal' },
        { label: 'Leq', latex: '$\\leq$', icon: <span className="font-mono text-xs">≤</span>, tooltip: 'Less Than Equal' },
        { label: 'Geq', latex: '$\\geq$', icon: <span className="font-mono text-xs">≥</span>, tooltip: 'Greater Than Equal' },
        { label: 'Alpha', latex: '$\\alpha$', icon: <span className="font-mono text-xs">α</span>, tooltip: 'Alpha' },
        { label: 'Beta', latex: '$\\beta$', icon: <span className="font-mono text-xs">β</span>, tooltip: 'Beta' },
        { label: 'Theta', latex: '$\\theta$', icon: <span className="font-mono text-xs">θ</span>, tooltip: 'Theta' },
        { label: 'Example', latex: '$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$', icon: <span className="font-mono text-xs font-bold">Eq</span>, tooltip: 'Quadratic Formula Example' },
    ];

    return (
        <div className="flex flex-wrap gap-1 p-2 bg-gray-100 border-b border-gray-300 rounded-t-md">
            {buttons.map((btn, idx) => (
                <button
                    key={idx}
                    type="button"
                    onClick={() => onInsert(btn.latex)}
                    className="p-1.5 hover:bg-white rounded border border-transparent hover:border-gray-300 text-gray-700 transition-colors"
                    title={btn.tooltip}
                >
                    {btn.icon}
                </button>
            ))}
        </div>
    );
};

export default MathToolbar;
