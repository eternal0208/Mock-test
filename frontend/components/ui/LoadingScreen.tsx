'use client';
import React from 'react';
import { motion } from 'framer-motion';

interface LoadingScreenProps {
    fullScreen?: boolean;
    text?: string;
}

export default function LoadingScreen({ fullScreen = true, text = "Loading Experience..." }: LoadingScreenProps) {
    const containerClasses = fullScreen
        ? "fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/80 backdrop-blur-md"
        : "w-full min-h-[400px] flex flex-col items-center justify-center bg-transparent";

    return (
        <div className={containerClasses}>
            <div className="relative">
                {/* Outer Ring */}
                <motion.div
                    className="w-20 h-20 border-4 border-indigo-200 rounded-full"
                    animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                />

                {/* Spinning Gradient Ring */}
                <motion.div
                    className="absolute inset-0 w-20 h-20 border-4 border-t-indigo-600 border-r-transparent border-b-purple-500 border-l-transparent rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />

                {/* Inner Dot */}
                <motion.div
                    className="absolute inset-0 m-auto w-3 h-3 bg-indigo-600 rounded-full"
                    animate={{ scale: [1, 1.5, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mt-6 flex flex-col items-center"
            >
                <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
                    {text}
                </h3>
                <div className="flex gap-1 mt-2">
                    <motion.div
                        className="w-2 h-2 bg-indigo-400 rounded-full"
                        animate={{ y: [0, -6, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                    />
                    <motion.div
                        className="w-2 h-2 bg-indigo-400 rounded-full"
                        animate={{ y: [0, -6, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: 0.1 }}
                    />
                    <motion.div
                        className="w-2 h-2 bg-indigo-400 rounded-full"
                        animate={{ y: [0, -6, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                    />
                </div>
            </motion.div>
        </div>
    );
}
