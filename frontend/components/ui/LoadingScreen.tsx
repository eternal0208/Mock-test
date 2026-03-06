'use client';
import React from 'react';
import { motion } from 'framer-motion';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

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
                <DotLottieReact
                    src="https://lottie.host/585eaa49-82ac-4ffe-8958-524df205393d/GCwqhgbTtp.lottie"
                    loop
                    autoplay
                    className="w-32 h-32 md:w-48 md:h-48 mx-auto"
                />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mt-2 flex flex-col items-center"
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
