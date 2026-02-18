'use client';

import { X, ZoomIn, ZoomOut } from 'lucide-react';
import { useState, useEffect } from 'react';

interface ImageViewerProps {
    src: string;
    alt: string;
    onClose: () => void;
}

export default function ImageViewer({ src, alt, onClose }: ImageViewerProps) {
    const [scale, setScale] = useState(1);
    const [dragging, setDragging] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [startPos, setStartPos] = useState({ x: 0, y: 0 });

    // Reset state when src changes
    useEffect(() => {
        setScale(1);
        setPosition({ x: 0, y: 0 });
    }, [src]);

    // Handle Zoom
    const handleZoomIn = (e: React.MouseEvent) => {
        e.stopPropagation();
        setScale(prev => Math.min(prev + 0.5, 4));
    };

    const handleZoomOut = (e: React.MouseEvent) => {
        e.stopPropagation();
        setScale(prev => Math.max(prev - 0.5, 1));
    };

    // Close on Escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    if (!src) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
            onClick={onClose}
        >
            {/* Controls */}
            <div className="absolute top-4 right-4 flex gap-2 z-10">
                <button
                    onClick={handleZoomOut}
                    className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                    title="Zoom Out"
                >
                    <ZoomOut size={24} />
                </button>
                <button
                    onClick={handleZoomIn}
                    className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                    title="Zoom In"
                >
                    <ZoomIn size={24} />
                </button>
                <button
                    onClick={onClose}
                    className="p-2 bg-white/10 hover:bg-red-500/80 rounded-full text-white transition-colors ml-2"
                    title="Close"
                >
                    <X size={24} />
                </button>
            </div>

            {/* Image Container */}
            <div
                className="relative w-full h-full max-w-5xl max-h-screen flex items-center justify-center overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <img
                    src={src}
                    alt={alt || 'Full screen preview'}
                    className="max-w-full max-h-full object-contain transition-transform duration-200 ease-out select-none"
                    style={{
                        transform: `scale(${scale}) translate(${position.x}px, ${position.y}px)`,
                        cursor: scale > 1 ? 'grab' : 'zoom-in'
                    }}
                    onClick={scale === 1 ? handleZoomIn : undefined}
                />
            </div>

            <div className="absolute bottom-6 left-0 right-0 text-center text-white/50 text-sm pointer-events-none">
                Scroll or pinch to zoom • Click/Tap to close
            </div>
        </div>
    );
}
