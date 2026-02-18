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
        href: '/board-exam',
        stat: '90%+ Score',
        glow: 'shadow-orange-500/20'
    },
    {
        id: 'cat',
        title: 'CAT',
        desc: 'MBA Entrance',
        icon: Sparkles,
        color: 'from-purple-600 to-violet-700',
        href: '/cat',
        stat: '99%ile Club',
        glow: 'shadow-purple-500/20'
    }
];

export default function ExamGateway() {
    const [hovered, setHovered] = useState<string | null>(null);

    return (
        <div className="w-full max-w-7xl mx-auto px-4 perspective-1000 mb-20">
            <h3 className="text-2xl font-bold text-center mb-8 text-slate-800 flex items-center justify-center gap-2">
                <span className="w-8 h-1 bg-indigo-600 rounded-full"></span>
                Select Your Exam Goal
                <span className="w-8 h-1 bg-indigo-600 rounded-full"></span>
            </h3>

            {/* Desktop: Horizontal Focus Grid */}
            <div className="hidden md:flex gap-4 h-[400px] items-stretch">
                {exams.map((exam) => (
                    <Link
                        key={exam.id}
                        href={exam.href}
                        className={`relative flex-1 rounded-3xl overflow-hidden cursor-pointer transition-all duration-500 ease-out group ${hovered === exam.id ? 'flex-[2]' : 'flex-1'} hover:flex-[2]`}
                        onMouseEnter={() => setHovered(exam.id)}
                        onMouseLeave={() => setHovered(null)}
                    >
                        <motion.div
                            layoutId={`card-${exam.id}`}
                            className={`h-full w-full bg-gradient-to-br ${exam.color} relative p-6 flex flex-col justify-between shadow-xl ${exam.glow}`}
                        >
                            {/* Background Pattern */}
                            <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay" />
                            <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors duration-300" />

                            {/* Top Section */}
                            <div className="relative z-10 flex justify-between items-start">
                                <div className="bg-white/20 backdrop-blur-md p-3 rounded-2xl border border-white/20 shadow-inner">
                                    <exam.icon className="text-white" size={28} />
                                </div>
                                <span className="text-white/80 text-xs font-bold uppercase tracking-wider bg-black/20 px-2 py-1 rounded-md backdrop-blur-sm">
                                    {exam.stat}
                                </span>
                            </div>

                            {/* Bottom Section */}
                            <div className="relative z-10">
                                <h2 className="text-2xl font-black text-white mb-1 leading-tight group-hover:text-3xl transition-all duration-300">
                                    {exam.title}
                                </h2>
                                <p className="text-white/80 font-medium text-sm group-hover:text-white transition-colors duration-300">
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
                                    <div className="mt-4 flex items-center gap-2 text-white font-bold text-sm bg-white/20 w-fit px-4 py-2 rounded-full backdrop-blur-sm hover:bg-white hover:text-indigo-600 transition-all">
                                        Start Preparation <ArrowRight size={16} />
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
                    <Link key={exam.id} href={exam.href}>
                        <motion.div
                            whileTap={{ scale: 0.98 }}
                            className={`relative h-32 rounded-2xl bg-gradient-to-r ${exam.color} p-5 shadow-lg flex items-center justify-between overflow-hidden`}
                        >
                            <div className="relative z-10 flex items-center gap-4">
                                <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
                                    <exam.icon className="text-white" size={24} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white">{exam.title}</h3>
                                    <p className="text-white/90 text-xs">{exam.desc}</p>
                                </div>
                            </div>

                            <div className="relative z-10 bg-white/20 p-2 rounded-full">
                                <ArrowRight className="text-white" size={20} />
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
