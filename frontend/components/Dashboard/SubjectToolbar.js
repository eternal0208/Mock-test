'use client';
import { useState } from 'react';
import {
    Bold, Italic, Superscript, Subscript, Divide, Square, Sigma, Hash,
    Atom, TestTube, Activity, Calculator, BookOpen
} from 'lucide-react';

const SubjectToolbar = ({ onInsert }) => {
    const [activeTab, setActiveTab] = useState('math');

    const tabs = [
        { id: 'math', label: 'Math', icon: <Calculator size={14} /> },
        { id: 'physics', label: 'Physics', icon: <Atom size={14} /> },
        { id: 'chemistry', label: 'Chemistry', icon: <TestTube size={14} /> },
        { id: 'biology', label: 'Biology', icon: <Activity size={14} /> },
        { id: 'cat', label: 'CAT/Gen', icon: <BookOpen size={14} /> },
    ];

    const symbolSets = {
        math: [
            { label: 'Fraction', latex: '$\\frac{a}{b}$', display: 'a/b' },
            { label: 'Power', latex: '$^{n}$', display: 'xⁿ' },
            { label: 'Subscript', latex: '$_{n}$', display: 'xₙ' },
            { label: 'Square Root', latex: '$\\sqrt{x}$', display: '√x' },
            { label: 'Nth Root', latex: '$\\sqrt[n]{x}$', display: 'ⁿ√x' },
            { label: 'Integral', latex: '$\\int$', display: '∫' },
            { label: 'Def. Integral', latex: '$\\int_{a}^{b}$', display: '∫a-b' },
            { label: 'Sum', latex: '$\\sum$', display: '∑' },
            { label: 'Product', latex: '$\\prod$', display: '∏' },
            { label: 'Limit', latex: '$\\lim_{x \\to a}$', display: 'lim' },
            { label: 'Infinity', latex: '$\\infty$', display: '∞' },
            { label: 'Implies', latex: '$\\implies$', display: '⟹' },
            { label: 'For All', latex: '$\\forall$', display: '∀' },
            { label: 'Exists', latex: '$\\exists$', display: '∃' },
            { label: 'Element Of', latex: '$\\in$', display: '∈' },
            { label: 'Not Element', latex: '$\\notin$', display: '∉' },
            { label: 'Union', latex: '$\\cup$', display: '∪' },
            { label: 'Intersection', latex: '$\\cap$', display: '∩' },
            { label: 'Matrix 2x2', latex: '$\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}$', display: '[2x2]' },
            { label: 'Matrix 3x3', latex: '$\\begin{bmatrix} a & b & c \\\\ d & e & f \\\\ g & h & i \\end{bmatrix}$', display: '[3x3]' },
            { label: 'Cases', latex: '$\\begin{cases} a & x < 0 \\\\ b & x \\geq 0 \\end{cases}$', display: '{cases}' },
            { label: 'Sin', latex: '$\\sin\\theta$', display: 'sin' },
            { label: 'Cos', latex: '$\\cos\\theta$', display: 'cos' },
            { label: 'Tan', latex: '$\\tan\\theta$', display: 'tan' },
            { label: 'Alpha', latex: '$\\alpha$', display: 'α' },
            { label: 'Beta', latex: '$\\beta$', display: 'β' },
            { label: 'Theta', latex: '$\\theta$', display: 'θ' },
            { label: 'Pi', latex: '$\\pi$', display: 'π' },
        ],
        physics: [
            { label: 'Vector', latex: '$\\vec{v}$', display: 'v⃗' },
            { label: 'Force', latex: '$\\vec{F}$', display: 'F⃗' },
            { label: 'Delta', latex: '$\\Delta$', display: 'Δ' },
            { label: 'Omega (w)', latex: '$\\omega$', display: 'ω' },
            { label: 'Omega (O)', latex: '$\\Omega$', display: 'Ω' },
            { label: 'Lambda', latex: '$\\lambda$', display: 'λ' },
            { label: 'Mu', latex: '$\\mu$', display: 'μ' },
            { label: 'Rho', latex: '$\\rho$', display: 'ρ' },
            { label: 'Tau', latex: '$\\tau$', display: 'τ' },
            { label: 'Degree', latex: '$^{\\circ}$', display: '°' },
            { label: 'Right Arrow', latex: '$\\rightarrow$', display: '→' },
            { label: 'Left Arrow', latex: '$\\leftarrow$', display: '←' },
            { label: 'Up Arrow', latex: '$\\uparrow$', display: '↑' },
            { label: 'Down Arrow', latex: '$\\downarrow$', display: '↓' },
            { label: 'H-Bar', latex: '$\\hbar$', display: 'ℏ' },
            { label: 'Electron', latex: '$e^{-}$', display: 'e⁻' },
            { label: 'Proton', latex: '$p^{+}$', display: 'p⁺' },
            { label: 'Units (J)', latex: '$\\text{J}$', display: 'J' },
            { label: 'Units (N)', latex: '$\\text{N}$', display: 'N' },
            { label: 'Units (W)', latex: '$\\text{W}$', display: 'W' },
            { label: 'Units (Pa)', latex: '$\\text{Pa}$', display: 'Pa' },
            { label: 'Units (kg)', latex: '$\\text{kg}$', display: 'kg' },
        ],
        chemistry: [
            { label: 'Reaction', latex: '$\\rightarrow$', display: '→' },
            { label: 'Equilibrium', latex: '$\\rightleftharpoons$', display: '⇌' },
            { label: 'Gas Up', latex: '$\\uparrow$', display: '↑' },
            { label: 'Precipitate', latex: '$\\downarrow$', display: '↓' },
            { label: 'Delta / Heat', latex: '$\\Delta$', display: 'Δ' },
            { label: 'Degree', latex: '$^{\\circ}$', display: '°' },
            { label: 'Electron', latex: '$e^{-}$', display: 'e⁻' },
            { label: 'Plus Charge', latex: '$^{+}$', display: '⁺' },
            { label: 'Minus Charge', latex: '$^{-}$', display: '⁻' },
            { label: 'H2O', latex: '$\\text{H}_2\\text{O}$', display: 'H₂O' },
            { label: 'CO2', latex: '$\\text{CO}_2$', display: 'CO₂' },
            { label: 'Benzene', latex: 'C_6H_6', display: '⌬' }, // Text rep only
            { label: 'Acid Constant', latex: '$K_a$', display: 'Kₐ' },
            { label: 'Base Constant', latex: '$K_b$', display: 'Kb' },
            { label: 'pH', latex: '$\\text{pH}$', display: 'pH' },
            { label: 'Molarity', latex: '$\\text{M}$', display: 'M' },
        ],
        biology: [
            { label: 'Male', latex: '$\\mars$', display: '♂' }, // Requires package usually, but using unicode fallback for text
            { label: 'Female', latex: '$\\venus$', display: '♀' },
            { label: 'DNA', latex: '$\\text{DNA}$', display: 'DNA' },
            { label: 'RNA', latex: '$\\text{RNA}$', display: 'RNA' },
            { label: 'ATP', latex: '$\\text{ATP}$', display: 'ATP' },
            { label: 'O2', latex: '$\\text{O}_2$', display: 'O₂' },
            { label: 'CO2', latex: '$\\text{CO}_2$', display: 'CO₂' },
            { label: 'Micron', latex: '$\\mu\\text{m}$', display: 'µm' },
        ],
        cat: [
            { label: 'Plus', latex: '$+$', display: '+' },
            { label: 'Minus', latex: '$-$', display: '-' },
            { label: 'Multiply', latex: '$\\times$', display: '×' },
            { label: 'Divide', latex: '$\\div$', display: '÷' },
            { label: 'Equal', latex: '$=$', display: '=' },
            { label: 'Not Equal', latex: '$\\neq$', display: '≠' },
            { label: 'Approx', latex: '$\\approx$', display: '≈' },
            { label: 'Percentage', latex: '$\\%$', display: '%' },
            { label: 'Therefore', latex: '$\\therefore$', display: '∴' },
            { label: 'Because', latex: '$\\because$', display: '∵' },
            { label: 'Ratio', latex: '$:$', display: ':' },
            { label: 'Proportion', latex: '$::$', display: '::' },
            { label: 'Greater', latex: '$>$', display: '>' },
            { label: 'Less', latex: '$<$', display: '<' },
            { label: 'Geq', latex: '$\\geq$', display: '≥' },
            { label: 'Leq', latex: '$\\leq$', display: '≤' },
        ]
    };

    return (
        <div className="bg-gray-50 border-b border-gray-300 rounded-t-lg select-none">
            {/* Tabs */}
            <div className="flex border-b border-gray-200 overflow-x-auto">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2 text-xs font-bold transition-colors whitespace-nowrap ${activeTab === tab.id
                                ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                            }`}
                    >
                        {tab.icon} {tab.label}
                    </button>
                ))}
            </div>

            {/* Symbols Grid */}
            <div className="flex flex-wrap gap-1 p-2 max-h-32 overflow-y-auto custom-scrollbar">
                {symbolSets[activeTab].map((btn, idx) => (
                    <button
                        key={idx}
                        type="button"
                        onClick={() => onInsert(btn.latex)}
                        className="min-w-[32px] h-8 px-2 flex items-center justify-center bg-white hover:bg-blue-50 border border-gray-200 hover:border-blue-300 rounded text-sm text-gray-700 transition shadow-sm font-medium"
                        title={btn.label}
                    >
                        {btn.display}
                    </button>
                ))}
            </div>

            <div className="px-2 pb-1 text-[10px] text-gray-400 text-right italic">
                Click to insert LaTeX
            </div>
        </div>
    );
};

export default SubjectToolbar;
