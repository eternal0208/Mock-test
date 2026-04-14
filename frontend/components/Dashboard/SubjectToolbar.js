'use client';
import { useState } from 'react';
import {
    Bold, Italic, Superscript, Subscript, Divide, Square, Sigma, Hash,
    Atom, TestTube, Activity, Calculator, BookOpen
} from 'lucide-react';

const SubjectToolbar = ({ onInsert, compact = false }) => {
    const [activeTab, setActiveTab] = useState('math');

    const tabs = [
        { id: 'math', label: 'Math', icon: <Calculator size={compact ? 11 : 14} /> },
        { id: 'physics', label: compact ? 'Phy' : 'Physics', icon: <Atom size={compact ? 11 : 14} /> },
        { id: 'chemistry', label: compact ? 'Chem' : 'Chemistry', icon: <TestTube size={compact ? 11 : 14} /> },
        { id: 'biology', label: compact ? 'Bio' : 'Biology', icon: <Activity size={compact ? 11 : 14} /> },
        { id: 'cat', label: 'CAT', icon: <BookOpen size={compact ? 11 : 14} /> },
    ];

    const symbolSets = {
        math: [
            { label: 'Fraction', latex: '\\frac{a}{b}', display: 'a/b' },
            { label: 'Power', latex: '^{n}', display: 'xⁿ' },
            { label: 'Subscript', latex: '_{n}', display: 'xₙ' },
            { label: 'Log', latex: '\\log', display: 'log' },
            { label: 'Log Base 10', latex: '\\log_{10}', display: 'log₁₀' },
            { label: 'Natural Log', latex: '\\ln', display: 'ln' },
            { label: 'e^x', latex: 'e^{x}', display: 'eˣ' },
            { label: '10^x', latex: '10^{x}', display: '10ˣ' },
            { label: 'Square Root', latex: '\\sqrt{x}', display: '√x' },
            { label: 'Nth Root', latex: '\\sqrt[n]{x}', display: 'ⁿ√x' },
            { label: 'Integral', latex: '\\int', display: '∫' },
            { label: 'Def. Integral', latex: '\\int_{a}^{b}', display: '∫a-b' },
            { label: 'Sum', latex: '\\sum', display: '∑' },
            { label: 'Product', latex: '\\prod', display: '∏' },
            { label: 'Limit', latex: '\\lim_{x \\to a}', display: 'lim' },
            { label: 'Infinity', latex: '\\infty', display: '∞' },
            { label: 'Implies', latex: '\\implies', display: '⟹' },
            { label: 'For All', latex: '\\forall', display: '∀' },
            { label: 'Exists', latex: '\\exists', display: '∃' },
            { label: 'Element Of', latex: '\\in', display: '∈' },
            { label: 'Not Element', latex: '\\notin', display: '∉' },
            { label: 'Union', latex: '\\cup', display: '∪' },
            { label: 'Intersection', latex: '\\cap', display: '∩' },
            { label: 'Matrix 2x2', latex: '\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}', display: '[2x2]' },
            { label: 'Matrix 3x3', latex: '\\begin{bmatrix} a & b & c \\\\ d & e & f \\\\ g & h & i \\end{bmatrix}', display: '[3x3]' },
            { label: 'Cases', latex: '\\begin{cases} a & x < 0 \\\\ b & x \\geq 0 \\end{cases}', display: '{cases}' },
            { label: 'Sin', latex: '\\sin\\theta', display: 'sin' },
            { label: 'Cos', latex: '\\cos\\theta', display: 'cos' },
            { label: 'Tan', latex: '\\tan\\theta', display: 'tan' },
            { label: 'Plus/Minus', latex: '\\pm', display: '±' },
            { label: 'Dot Product', latex: '\\cdot', display: '·' },
            { label: 'Cross Product', latex: '\\times', display: '×' },
            { label: 'Derivative', latex: '\\frac{d}{dx}', display: 'd/dx' },
            { label: 'Partial Deriv.', latex: '\\frac{\\partial}{\\partial x}', display: '∂/∂x' },
            { label: 'Absolute', latex: '|x|', display: '|x|' },
            { label: 'Alpha', latex: '\\alpha', display: 'α' },
            { label: 'Beta', latex: '\\beta', display: 'β' },
            { label: 'Gamma', latex: '\\gamma', display: 'γ' },
            { label: 'Delta (lower)', latex: '\\delta', display: 'δ' },
            { label: 'Epsilon', latex: '\\epsilon', display: 'ε' },
            { label: 'Theta', latex: '\\theta', display: 'θ' },
            { label: 'Lambda', latex: '\\lambda', display: 'λ' },
            { label: 'Mu', latex: '\\mu', display: 'μ' },
            { label: 'Pi', latex: '\\pi', display: 'π' },
            { label: 'Sigma', latex: '\\sigma', display: 'σ' },
            { label: 'Phi', latex: '\\phi', display: 'φ' },
            { label: 'Omega', latex: '\\omega', display: 'ω' },
        ],
        physics: [
            { label: 'Vector', latex: '\\vec{v}', display: 'v⃗' },
            { label: 'Force', latex: '\\vec{F}', display: 'F⃗' },
            { label: 'Delta', latex: '\\Delta', display: 'Δ' },
            { label: 'Omega (w)', latex: '\\omega', display: 'ω' },
            { label: 'Omega (O)', latex: '\\Omega', display: 'Ω' },
            { label: 'Lambda', latex: '\\lambda', display: 'λ' },
            { label: 'Mu', latex: '\\mu', display: 'μ' },
            { label: 'Rho', latex: '\\rho', display: 'ρ' },
            { label: 'Tau', latex: '\\tau', display: 'τ' },
            { label: 'Degree', latex: '^{\\circ}', display: '°' },
            { label: 'Right Arrow', latex: '\\rightarrow', display: '→' },
            { label: 'Left Arrow', latex: '\\leftarrow', display: '←' },
            { label: 'Up Arrow', latex: '\\uparrow', display: '↑' },
            { label: 'Down Arrow', latex: '\\downarrow', display: '↓' },
            { label: 'H-Bar', latex: '\\hbar', display: 'ℏ' },
            { label: 'Plank const', latex: 'h', display: 'h' },
            { label: 'Permittivity', latex: '\\epsilon_0', display: 'ε₀' },
            { label: 'Permeability', latex: '\\mu_0', display: 'μ₀' },
            { label: 'Magnetic Field', latex: '\\vec{B}', display: 'B⃗' },
            { label: 'Electric Field', latex: '\\vec{E}', display: 'E⃗' },
            { label: 'Acceleration', latex: '\\vec{a}', display: 'a⃗' },
            { label: 'Electron', latex: 'e^{-}', display: 'e⁻' },
            { label: 'Proton', latex: 'p^{+}', display: 'p⁺' },
            { label: 'Units (J)', latex: '\\text{J}', display: 'J' },
            { label: 'Units (N)', latex: '\\text{N}', display: 'N' },
            { label: 'Units (W)', latex: '\\text{W}', display: 'W' },
            { label: 'Units (Pa)', latex: '\\text{Pa}', display: 'Pa' },
            { label: 'Units (kg)', latex: '\\text{kg}', display: 'kg' },
        ],
        chemistry: [
            { label: 'Reaction', latex: '\\rightarrow', display: '→' },
            { label: 'Equilibrium', latex: '\\rightleftharpoons', display: '⇌' },
            { label: 'Gas Up', latex: '\\uparrow', display: '↑' },
            { label: 'Precipitate', latex: '\\downarrow', display: '↓' },
            { label: 'Delta / Heat', latex: '\\Delta', display: 'Δ' },
            { label: 'Degree', latex: '^{\\circ}', display: '°' },
            { label: 'Electron', latex: 'e^{-}', display: 'e⁻' },
            { label: 'Plus Charge', latex: '^{+}', display: '⁺' },
            { label: 'Minus Charge', latex: '^{-}', display: '⁻' },
            { label: 'Isotope', latex: '^{A}_{Z}\\text{X}', display: 'ᴬzX' },
            { label: 'H2O', latex: '\\text{H}_2\\text{O}', display: 'H₂O' },
            { label: 'CO2', latex: '\\text{CO}_2', display: 'CO₂' },
            { label: 'Benzene', latex: '\\text{C}_6\\text{H}_6', display: '⌬' }, // Text rep only
            { label: 'Acid Constant', latex: 'K_a', display: 'Kₐ' },
            { label: 'Base Constant', latex: 'K_b', display: 'K_b' },
            { label: 'Eq. Constant', latex: 'K_c', display: 'K_c' },
            { label: 'Enthalpy', latex: '\\Delta H^{\\circ}', display: 'ΔH°' },
            { label: 'Entropy', latex: '\\Delta S^{\\circ}', display: 'ΔS°' },
            { label: 'Gibbs Energy', latex: '\\Delta G^{\\circ}', display: 'ΔG°' },
            { label: 'Cell Potential', latex: 'E^{\\circ}_{\\text{cell}}', display: 'E°cell' },
            { label: 'pH', latex: '\\text{pH}', display: 'pH' },
            { label: 'Molarity', latex: '\\text{M}', display: 'M' },
        ],
        biology: [
            { label: 'Male', latex: '\\mars', display: '♂' }, // Requires package usually, but using unicode fallback for text
            { label: 'Female', latex: '\\venus', display: '♀' },
            { label: 'DNA', latex: '\\text{DNA}', display: 'DNA' },
            { label: 'RNA', latex: '\\text{RNA}', display: 'RNA' },
            { label: 'ATP', latex: '\\text{ATP}', display: 'ATP' },
            { label: 'O2', latex: '\\text{O}_2', display: 'O₂' },
            { label: 'CO2', latex: '\\text{CO}_2', display: 'CO₂' },
            { label: 'Micron', latex: '\\mu\\text{m}', display: 'µm' },
        ],
        cat: [
            { label: 'Plus', latex: '+', display: '+' },
            { label: 'Minus', latex: '-', display: '-' },
            { label: 'Multiply', latex: '\\times', display: '×' },
            { label: 'Divide', latex: '\\div', display: '÷' },
            { label: 'Equal', latex: '=', display: '=' },
            { label: 'Not Equal', latex: '\\neq', display: '≠' },
            { label: 'Approx', latex: '\\approx', display: '≈' },
            { label: 'Percentage', latex: '\\%', display: '%' },
            { label: 'Therefore', latex: '\\therefore', display: '∴' },
            { label: 'Because', latex: '\\because', display: '∵' },
            { label: 'Ratio', latex: ':', display: ':' },
            { label: 'Proportion', latex: '::', display: '::' },
            { label: 'Greater', latex: '>', display: '>' },
            { label: 'Less', latex: '<', display: '<' },
            { label: 'Geq', latex: '\\geq', display: '≥' },
            { label: 'Leq', latex: '\\leq', display: '≤' },
        ]
    };

    return (
        <div className="bg-slate-50/80 backdrop-blur-md border-b border-slate-200/60 rounded-t-2xl select-none relative z-10 w-full overflow-hidden shadow-[inset_0_-1px_0_0_rgba(226,232,240,1)]">
            {/* Tabs */}
            <div className={`flex border-b border-slate-200/60 overflow-x-auto apex-scrollbar bg-slate-100/50`}>
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-1.5 ${compact ? 'px-3 py-2 text-[10px]' : 'px-5 py-2.5 text-[11px]'} font-black uppercase tracking-widest transition-all whitespace-nowrap active:scale-95 ${activeTab === tab.id
                                ? 'bg-white text-indigo-600 border-b-2 border-indigo-500 shadow-sm'
                                : 'text-slate-400 hover:bg-slate-50 hover:text-slate-700'
                            }`}
                    >
                        {tab.icon} {tab.label}
                    </button>
                ))}
            </div>

            {/* Symbols Grid */}
            <div className={`flex gap-1.5 p-2 overflow-y-auto overflow-x-auto apex-scrollbar bg-slate-50 ${compact ? 'max-h-[85px] flex-nowrap' : 'flex-wrap max-h-[140px]'}`}>
                {symbolSets[activeTab].map((btn, idx) => (
                    <button
                        key={idx}
                        type="button"
                        onClick={() => onInsert(btn.latex)}
                        className={`${compact ? 'min-w-[32px] h-8 px-2 text-[11px]' : 'min-w-[36px] h-9 px-2 text-xs'} shrink-0 flex items-center justify-center bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-lg text-slate-700 hover:text-indigo-700 transition-all shadow-sm font-bold shadow-slate-200/40 active:scale-90`}
                        title={btn.label}
                    >
                        {btn.display}
                    </button>
                ))}
            </div>

            {!compact && (
                <div className="px-3 pb-2 bg-slate-50 text-[9px] font-bold text-slate-400 text-right uppercase tracking-[0.2em]">
                    Click to insert LaTeX Symbol
                </div>
            )}
        </div>
    );
};

export default SubjectToolbar;
