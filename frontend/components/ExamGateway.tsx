'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight, BookOpen, Target, Award, Sparkles, GraduationCap } from 'lucide-react';

const exams = [
    {
        id: 'neet',
        title: 'NEET',
        desc: 'Medical Entrance',
        icon: BookOpen,
        color: 'from-teal-500 to-emerald-600',
        href: '/neet',
        stat: '15k+ Students',
        glow: 'shadow-teal-500/20'
    },
    {
        id: 'jee-mains',
        title: 'JEE Mains',
        desc: 'Engineering Prep',
        icon: Target,
        color: 'from-blue-600 to-indigo-700',
        href: '/jee-mains',
        stat: '20k+ Users',
        glow: 'shadow-blue-500/20'
    },
    {
        id: 'jee-adv',
        title: 'JEE Advanced',
        desc: 'IIT Entrance',
        icon: Award,
        color: 'from-rose-500 to-pink-600',
        href: '/jee-advanced',
        stat: 'Top 500 AIR',
        glow: 'shadow-rose-500/20'
    },
    {
        id: 'board',
        title: 'Board Exams',
        desc: '10th & 12th',
        icon: GraduationCap,
        color: 'from-orange-500 to-amber-600',
        href: '#',
        stat: 'Coming Soon',
        glow: 'shadow-orange-500/20',
        isComingSoon: true
    },
    {
        id: 'cat',
        title: 'CAT',
        desc: 'MBA Entrance',
        icon: Sparkles,
        color: 'from-purple-600 to-violet-700',
        href: '#',
        stat: 'Coming Soon',
        glow: 'shadow-purple-500/20',
        isComingSoon: true
    },
    {
        id: 'others',
        title: 'Other Exams',
        desc: 'More Competitive Exams',
        icon: Sparkles, // reusing icon or you can use something else
        color: 'from-gray-500 to-slate-700',
        href: '#',
        stat: 'Coming Soon',
        glow: 'shadow-gray-500/20',
        isComingSoon: true
    }
];

export default function ExamGateway() {
    const [hovered, setHovered] = useState<string | null>(null);

    return (
        <div className="w-full max-w-7xl mx-auto px-4 perspective-1000 mb-20">
            <h3 className="text-3xl md:text-4xl font-black text-center mb-12 text-slate-800 flex items-center justify-center gap-4 tracking-tight">
                <span className="w-12 h-1.5 bg-gradient-to-r from-indigo-600 to-violet-600 rounded-full opacity-80"></span>
                Select Your Exam Goal
                <span className="w-12 h-1.5 bg-gradient-to-l from-indigo-600 to-violet-600 rounded-full opacity-80"></span>
            </h3>

            {/* Desktop: Horizontal Focus Grid */}
            <div className="hidden md:flex gap-4 h-[400px] items-stretch">
                {exams.map((exam) => (
                    <Link
                        key={exam.id}
                        href={exam.isComingSoon ? '#' : exam.href}
                        className={`relative flex-1 rounded-[2rem] overflow-hidden ${exam.isComingSoon ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'} transition-all duration-700 ease-[0.23,1,0.32,1] group ${hovered === exam.id ? 'flex-[2.5]' : 'flex-1'} ${!exam.isComingSoon && 'hover:flex-[2.5]'}`}
                        onMouseEnter={() => !exam.isComingSoon && setHovered(exam.id)}
                        onMouseLeave={() => setHovered(null)}
                        onClick={(e) => exam.isComingSoon && e.preventDefault()}
                    >
                        <motion.div
                            layoutId={`card-${exam.id}`}
                            className={`h-full w-full bg-gradient-to-br ${exam.isComingSoon ? 'from-gray-400 to-gray-600' : exam.color} relative p-6 md:p-8 flex flex-col justify-between shadow-2xl border border-white/20 ${exam.isComingSoon ? 'shadow-gray-500/10 grayscale-[0.5]' : exam.glow}`}
                        >
                            {/* Background Pattern */}
                            <div className="absolute inset-0 opacity-30 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay transition-opacity duration-700 group-hover:opacity-10" />
                            <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors duration-300" />

                            {/* Top Section */}
                            <div className="relative z-10 flex justify-between items-start">
                                <div className="bg-white/20 backdrop-blur-md p-3 rounded-2xl border border-white/20 shadow-inner">
                                    <exam.icon className="text-white" size={28} />
                                </div>
                                <span className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-md backdrop-blur-sm ${exam.isComingSoon ? 'bg-yellow-500/30 text-yellow-100 border border-yellow-500/50' : 'bg-black/20 text-white/80'}`}>
                                    {exam.stat}
                                </span>
                            </div>

                            {/* Bottom Section */}
                            <div className="relative z-10">
                                <h2 className="text-2xl md:text-3xl font-black text-white mb-2 leading-tight group-hover:text-4xl transition-all duration-500">
                                    {exam.title}
                                </h2>
                                <p className="text-white/80 font-medium text-sm md:text-base group-hover:text-white transition-colors duration-500">
                                    {exam.desc}
                                </p>

                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{
                                        opacity: hovered === exam.id ? 1 : 0,
                                        height: hovered === exam.id ? 'auto' : 0
                                    }}
                                    className="overflow-hidden"
                                >
                                    <div className="mt-6 flex items-center gap-2 text-slate-900 font-bold text-sm md:text-base bg-white w-fit px-6 py-3 rounded-full shadow-[0_4px_15px_rgba(0,0,0,0.1)] hover:shadow-[0_8px_25px_rgba(0,0,0,0.2)] hover:scale-105 transition-all duration-300 transform">
                                        Start Preparation <ArrowRight size={18} className="text-indigo-600" />
                                    </div>
                                </motion.div>
                            </div>

                            {/* Decorative Blur */}
                            <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-white/20 blur-3xl rounded-full" />
                        </motion.div>
                    </Link>
                ))}
            </div>

            {/* Mobile: Vertical Stack (Bento Style) */}
            <div className="md:hidden grid grid-cols-1 gap-4">
                {exams.map((exam) => (
                    <Link
                        key={exam.id}
                        href={exam.isComingSoon ? '#' : exam.href}
                        onClick={(e) => exam.isComingSoon && e.preventDefault()}
                    >
                        <motion.div
                            whileTap={exam.isComingSoon ? {} : { scale: 0.98 }}
                            className={`relative h-36 rounded-[2rem] bg-gradient-to-r ${exam.isComingSoon ? 'from-gray-400 to-gray-600 grayscale-[0.3] opacity-90' : exam.color} p-6 shadow-xl border border-white/20 flex items-center justify-between overflow-hidden ${exam.isComingSoon ? 'cursor-not-allowed' : ''}`}
                        >
                            <div className="relative z-10 flex items-center gap-4 border-">
                                <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-md shadow-inner border border-white/20">
                                    <exam.icon className="text-white" size={28} />
                                </div>
                                <div>
                                    <h3 className="text-xl md:text-2xl font-black text-white">{exam.title}</h3>
                                    <p className="text-white/90 text-sm font-medium">{exam.desc}</p>
                                </div>
                            </div>

                            <div className="relative z-10 bg-white shadow-lg p-3 rounded-full flex items-center justify-center">
                                {exam.isComingSoon ? (
                                    <span className="text-yellow-600 text-[10px] font-black px-2 whitespace-nowrap tracking-wider">SOON</span>
                                ) : (
                                    <ArrowRight className="text-indigo-600" size={20} />
                                )}
                            </div>

                            {/* Background Elements */}
                            <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/5 skew-x-12" />
                        </motion.div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
