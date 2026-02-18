'use client';
import { useState, useEffect } from 'react';
import { X, Delete, Equal } from 'lucide-react';

const Calculator = ({ onClose }) => {
    const [display, setDisplay] = useState('0');
    const [memory, setMemory] = useState(0);
    const [scientificMode, setScientificMode] = useState(true);

    const handleNumber = (num) => {
        setDisplay(prev => prev === '0' ? String(num) : prev + num);
    };

    const handleOperator = (op) => {
        if (['+', '-', '*', '/', '%'].includes(display.slice(-1))) return;
        setDisplay(prev => prev + op);
    };

    const handleClear = () => setDisplay('0');

    const handleBackspace = () => {
        if (display.length === 1) setDisplay('0');
        else setDisplay(prev => prev.slice(0, -1));
    };

    const calculate = () => {
        try {
            // Unsafe eval replacement for simple math
            // eslint-disable-next-line no-new-func
            const result = new Function('return ' + display)();
            setDisplay(String(Number(result.toFixed(8)))); // Limit decimals
        } catch (e) {
            setDisplay('Error');
            setTimeout(() => setDisplay('0'), 1000);
        }
    };

    const safeMath = (func, val) => {
        try {
            const v = eval(display); // Calculate current expression first
            let res = 0;
            switch (func) {
                case 'sin': res = Math.sin(v); break;
                case 'cos': res = Math.cos(v); break;
                case 'tan': res = Math.tan(v); break;
                case 'log': res = Math.log10(v); break;
                case 'ln': res = Math.log(v); break;
                case 'sqrt': res = Math.sqrt(v); break;
                case 'pow2': res = Math.pow(v, 2); break;
                default: break;
            }
            if (isNaN(res)) throw new Error('NaN');
            setDisplay(String(Number(res.toFixed(8))));
        } catch (e) {
            setDisplay('Error');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 pointer-events-auto">
            <div className="bg-white rounded-lg shadow-2xl w-80 sm:w-96 overflow-hidden flex flex-col">
                {/* Header */}
                <div className="bg-blue-600 text-white p-3 flex justify-between items-center cursor-move">
                    <h3 className="font-bold text-sm flex items-center gap-2">
                        Scientific Calculator
                    </h3>
                    <button onClick={onClose} className="hover:bg-blue-700 rounded p-1"><X size={16} /></button>
                </div>

                {/* Display */}
                <div className="bg-gray-100 p-4 text-right border-b">
                    <div className="text-3xl font-mono text-gray-800 truncate">{display}</div>
                </div>

                {/* Keypad */}
                <div className="p-4 grid grid-cols-5 gap-2 bg-gray-50">
                    {/* Scientific Row 1 */}
                    <button onClick={() => safeMath('sin')} className="btn-calc-sci">sin</button>
                    <button onClick={() => safeMath('cos')} className="btn-calc-sci">cos</button>
                    <button onClick={() => safeMath('tan')} className="btn-calc-sci">tan</button>
                    <button onClick={() => setDisplay(prev => prev + '(')} className="btn-calc-sci">(</button>
                    <button onClick={() => setDisplay(prev => prev + ')')} className="btn-calc-sci">)</button>

                    {/* Scientific Row 2 */}
                    <button onClick={() => safeMath('log')} className="btn-calc-sci">log</button>
                    <button onClick={() => safeMath('ln')} className="btn-calc-sci">ln</button>
                    <button onClick={() => safeMath('sqrt')} className="btn-calc-sci">√</button>
                    <button onClick={() => safeMath('pow2')} className="btn-calc-sci">x²</button>
                    <button onClick={handleBackspace} className="btn-calc-red"><Delete size={16} /></button>

                    {/* Numbers & Ops */}
                    <button onClick={handleClear} className="btn-calc-red col-span-2">AC</button>
                    <button onClick={() => handleOperator('/')} className="btn-calc-op">÷</button>
                    <button onClick={() => handleOperator('*')} className="btn-calc-op">×</button>
                    <button onClick={() => handleOperator('-')} className="btn-calc-op">-</button>

                    <button onClick={() => handleNumber(7)} className="btn-calc-num">7</button>
                    <button onClick={() => handleNumber(8)} className="btn-calc-num">8</button>
                    <button onClick={() => handleNumber(9)} className="btn-calc-num">9</button>
                    <button onClick={() => handleOperator('+')} className="btn-calc-op row-span-2 h-full flex items-center justify-center">+</button>
                    <button onClick={() => setDisplay(Math.PI.toFixed(4))} className="btn-calc-sci">π</button>

                    <button onClick={() => handleNumber(4)} className="btn-calc-num">4</button>
                    <button onClick={() => handleNumber(5)} className="btn-calc-num">5</button>
                    <button onClick={() => handleNumber(6)} className="btn-calc-num">6</button>
                    <button onClick={() => setDisplay(Math.E.toFixed(4))} className="btn-calc-sci">e</button>

                    <button onClick={() => handleNumber(1)} className="btn-calc-num">1</button>
                    <button onClick={() => handleNumber(2)} className="btn-calc-num">2</button>
                    <button onClick={() => handleNumber(3)} className="btn-calc-num">3</button>
                    <button onClick={calculate} className="btn-calc-green row-span-2 h-full flex items-center justify-center"><Equal size={20} /></button>
                    <button onClick={() => handleNumber(0)} className="btn-calc-num col-span-2">0</button>

                    <button onClick={() => handleNumber('.')} className="btn-calc-num">.</button>
                    <button onClick={() => handleOperator('%')} className="btn-calc-sci">%</button>
                </div>
            </div>
            <style jsx>{`
                .btn-calc-num { @apply p-3 bg-white border border-gray-200 rounded shadow-sm font-bold text-gray-800 hover:bg-gray-50 active:scale-95 transition; }
                .btn-calc-op { @apply p-3 bg-gray-200 border border-gray-300 rounded shadow-sm font-bold text-gray-800 hover:bg-gray-300 active:scale-95 transition; }
                .btn-calc-sci { @apply p-2 bg-blue-50 border border-blue-100 rounded shadow-sm font-semibold text-xs text-blue-800 hover:bg-blue-100 active:scale-95 transition; }
                .btn-calc-red { @apply p-3 bg-red-100 border border-red-200 rounded shadow-sm font-bold text-red-700 hover:bg-red-200 active:scale-95 transition flex items-center justify-center; }
                .btn-calc-green { @apply p-3 bg-green-500 border border-green-600 rounded shadow-sm font-bold text-white hover:bg-green-600 active:scale-95 transition; }
            `}</style>
        </div>
    );
};

export default Calculator;
