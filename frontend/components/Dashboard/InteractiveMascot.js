import React, { useState, useEffect } from 'react';

const InteractiveMascot = ({ isPasswordHidden }) => {
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const [offset, setOffset] = useState({ x: 0, y: 0 });

    useEffect(() => {
        const handleMouseMove = (e) => {
            setMousePosition({ x: e.clientX, y: e.clientY });
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    useEffect(() => {
        // Calculate the pupil offset
        // We assume the face is relatively centered on the screen for this rough calculation.
        // The numbers 30 and 20 dictate how far the pupil moves within the eyeball bounds.
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;

        const maxMovementX = 8;
        const maxMovementY = 8;

        const offsetX = ((mousePosition.x - centerX) / centerX) * maxMovementX;
        const offsetY = ((mousePosition.y - centerY) / centerY) * maxMovementY;

        setOffset({
            x: Math.max(-maxMovementX, Math.min(maxMovementX, offsetX)),
            y: Math.max(-maxMovementY, Math.min(maxMovementY, offsetY)),
        });
    }, [mousePosition]);

    // Mascot Base Theme
    const skinColor = "#FFDFD3"; // Peach
    const darkSkinColor = "#F9C3B4"; // Shade

    return (
        <div className="flex justify-center items-center h-24 mb-4">
            <svg
                width="100"
                height="100"
                viewBox="0 0 100 100"
                xmlns="http://www.w3.org/2000/svg"
                className="drop-shadow-sm transition-transform hover:scale-105 duration-300"
            >
                {/* Face Base */}
                <circle cx="50" cy="50" r="45" fill={skinColor} />

                {/* Blush */}
                <ellipse cx="25" cy="55" rx="8" ry="4" fill="#FFB7B2" opacity="0.6" />
                <ellipse cx="75" cy="55" rx="8" ry="4" fill="#FFB7B2" opacity="0.6" />

                {isPasswordHidden ? (
                    /* ----- HIDDEN STATE (Both Eyes Closed tightly) ----- */
                    <g>
                        {/* Left Eye Closed (<) */}
                        <path d="M 20 40 L 35 48 L 20 56" fill="none" stroke="#4A4A4A" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                        {/* Right Eye Closed (>) */}
                        <path d="M 80 40 L 65 48 L 80 56" fill="none" stroke="#4A4A4A" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />

                        {/* Nervous/Straight Mouth */}
                        <path d="M 40 65 Q 50 63 60 65" fill="none" stroke="#4A4A4A" strokeWidth="3" strokeLinecap="round" />

                        {/* Sweat Drop */}
                        <path d="M 15 20 Q 20 30 15 40 Q 10 30 15 20" fill="#90CDF4" opacity="0.8" />
                    </g>
                ) : (
                    /* ----- REVEALED STATE (One Eye Open, One Winking) ----- */
                    <g>
                        {/* Left Eye (Wide Open & Tracking) */}
                        <circle cx="30" cy="40" r="14" fill="#FFFFFF" stroke="#4A4A4A" strokeWidth="2" />
                        {/* Left Pupil (Tracking Mouse) */}
                        <circle
                            cx={30 + offset.x}
                            cy={40 + offset.y}
                            r="6"
                            fill="#4A4A4A"
                        />
                        {/* Left Eye Shine */}
                        <circle cx={28 + offset.x} cy={38 + offset.y} r="2" fill="#FFFFFF" />

                        {/* Right Eye (Winking / Squinting) */}
                        <path d="M 62 42 Q 72 35 82 42" fill="none" stroke="#4A4A4A" strokeWidth="4" strokeLinecap="round" />
                        <path d="M 64 42 L 67 46" fill="none" stroke="#4A4A4A" strokeWidth="2" strokeLinecap="round" />
                        <path d="M 72 40 L 72 45" fill="none" stroke="#4A4A4A" strokeWidth="2" strokeLinecap="round" />
                        <path d="M 80 42 L 77 46" fill="none" stroke="#4A4A4A" strokeWidth="2" strokeLinecap="round" />

                        {/* Happy Mouth */}
                        <path d="M 40 65 Q 50 75 60 65" fill="none" stroke="#4A4A4A" strokeWidth="3" strokeLinecap="round" />
                        {/* Tongue */}
                        <path d="M 45 68 Q 50 78 55 68" fill="#FF8BA7" />
                    </g>
                )}
            </svg>
        </div>
    );
};

export default InteractiveMascot;
