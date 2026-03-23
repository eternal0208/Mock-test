'use client';
import { useEffect, useRef, useState } from 'react';

// MathLive only works in browser
let MathfieldElement;
if (typeof window !== 'undefined') {
    import('mathlive').then(mod => {
        MathfieldElement = mod.MathfieldElement;
    });
}

export default function MathTest() {
    const [isLoaded, setIsLoaded] = useState(false);
    const mfRef = useRef(null);
    const [latex, setLatex] = useState('');

    useEffect(() => {
        if (typeof window !== 'undefined') {
            import('mathlive').then(() => {
                setIsLoaded(true);
            });
        }
    }, []);

    useEffect(() => {
        if (isLoaded && mfRef.current) {
            mfRef.current.mathVirtualKeyboardPolicy = 'manual';
            mfRef.current.addEventListener('input', (ev) => {
                setLatex(mfRef.current.value);
            });
        }
    }, [isLoaded]);

    if (!isLoaded) return <div>Loading...</div>;

    return (
        <div className="p-10">
            <h1 className="text-2xl font-bold mb-4">MathLive Test</h1>
            
            <div className="border p-4 bg-white rounded">
                <math-field 
                    ref={mfRef} 
                    style={{width: '100%', minHeight: '100px', fontSize: '1.2rem', padding: '10px'}}
                ></math-field>
            </div>

            <div className="mt-4 p-4 bg-gray-100">
                Data: {latex}
            </div>
            
            <button className="mt-4 px-4 py-2 bg-blue-500 text-white rounded" onClick={() => {
                mfRef.current.executeCommand(['insert', '\\frac{a}{b}']);
            }}>Insert Fraction</button>
        </div>
    );
}
