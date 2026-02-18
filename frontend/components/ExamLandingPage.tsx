'use client';
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, CheckCircle, LogOut } from 'lucide-react';
import Link from 'next/link';

import { useAuth } from '@/context/AuthContext';

interface ExamLandingProps {
    title: string;
    description: string;
    stats: {
        users: string;
        tests: string;
        avgScore: string;
    };
    features: string[];
    themeColor: 'indigo' | 'blue' | 'teal' | 'rose' | 'purple'; // Restricted types for safety
    children?: React.ReactNode;
}

// Color Mapping to avoid Tailwind dynamic class purging issues
const COLOR_MAPS = {
    indigo: {
        bg: 'from-indigo-50 to-white',
        text: 'text-indigo-600',
        bgBtn: 'bg-indigo-600 hover:bg-indigo-700',
        bgLight: 'bg-indigo-100',
        textDark: 'text-indigo-700',
        card: 'bg-indigo-600'
    },
    blue: {
        bg: 'from-blue-50 to-white',
        text: 'text-blue-600',
        bgBtn: 'bg-blue-600 hover:bg-blue-700',
        bgLight: 'bg-blue-100',
        textDark: 'text-blue-700',
        card: 'bg-blue-600'
    },
    teal: {
        bg: 'from-teal-50 to-white',
        text: 'text-teal-600',
        bgBtn: 'bg-teal-600 hover:bg-teal-700',
        bgLight: 'bg-teal-100',
        textDark: 'text-teal-700',
        card: 'bg-teal-600'
    },
    rose: {
        bg: 'from-rose-50 to-white',
        text: 'text-rose-600',
        bgBtn: 'bg-rose-600 hover:bg-rose-700',
        bgLight: 'bg-rose-100',
        textDark: 'text-rose-700',
        card: 'bg-rose-600'
    },
    purple: {
        bg: 'from-purple-50 to-white',
        text: 'text-purple-600',
        bgBtn: 'bg-purple-600 hover:bg-purple-700',
        bgLight: 'bg-purple-100',
        textDark: 'text-purple-700',
        card: 'bg-purple-600'
    }
};

import { useRouter, useSearchParams, usePathname } from 'next/navigation';

export default function ExamLandingPage({ title, description, stats, features, themeColor = 'indigo', children }: ExamLandingProps) {
    const { user, logout } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const colors = COLOR_MAPS[themeColor] || COLOR_MAPS['indigo'];

    // URL Driven Auth Modal
    // Redirect to home page where LoginModal is embedded
    const openAuth = () => {
        if (user) {
            router.push('/dashboard');
        } else {
            router.push('/?login=true');
        }
    };

    return (
        <div className={`min-h-screen bg-gradient-to-br ${colors.bg}`}>

            {/* Navbar */}
            <nav className="p-6 flex justify-between items-center max-w-7xl mx-auto sticky top-0 z-40 backdrop-blur-sm bg-white/30 rounded-b-2xl mb-8">
                <Link href="/" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition font-medium group">
                    <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" /> Back to Home
                </Link>
                <div className="flex gap-3 md:gap-4 items-center">
                    {user ? (
                        <div className="flex items-center gap-4">
                            <span className={`font-bold ${colors.textDark} hidden md:inline`}>Hi, {user.displayName || 'Student'}</span>
                            <Link href="/dashboard">
                                <button className={`px-3 md:px-4 py-2 bg-white text-gray-700 rounded-full font-bold shadow-sm border border-gray-100 hover:bg-gray-50 transition text-sm md:text-base`}>
                                    Dashboard
                                </button>
                            </Link>
                            <button
                                onClick={logout}
                                className={`p-2 bg-white text-rose-500 rounded-full font-bold shadow-sm border border-rose-100 hover:bg-rose-50 transition`}
                                title="Logout"
                            >
                                <LogOut size={20} />
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={openAuth}
                            className={`px-6 py-2.5 ${colors.bgBtn} text-white rounded-full font-bold shadow-lg shadow-${themeColor}-200/50 transition`}
                        >
                            Login / Register
                        </button>
                    )}
                </div>
            </nav>

            {/* Hero Section */}
            <main className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-24">
                <motion.div
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8 }}
                >
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className={`inline-block px-4 py-1.5 rounded-full ${colors.bgLight} ${colors.textDark} font-bold text-sm mb-6 border border-${themeColor}-200`}
                    >
                        Official {title} Syllabus
                    </motion.div>
                    <h1 className="text-4xl md:text-5xl lg:text-7xl font-black text-slate-900 mb-6 leading-tight tracking-tight">
                        Apex Mock Test for <span className={`${colors.text}`}>{title}</span>
                    </h1>
                    <p className="text-base md:text-xl text-slate-600 mb-8 leading-relaxed font-medium">
                        {description}
                    </p>

                    <div className="flex flex-wrap gap-4">
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={openAuth}
                            className={`px-8 py-4 ${colors.bgBtn} text-white text-lg font-bold rounded-2xl shadow-xl shadow-${themeColor}-200 hover:shadow-2xl transition`}
                        >
                            Start Free Mock Test
                        </motion.button>

                    </div>

                    <div className="mt-12 grid grid-cols-3 gap-6 border-t border-slate-200 pt-8">
                        <div>
                            <div className={`text-3xl font-black ${colors.text}`}>{stats.users}</div>
                            <div className="text-sm text-slate-500 font-semibold uppercase tracking-wide">Active Students</div>
                        </div>
                        <div>
                            <div className={`text-3xl font-black ${colors.text}`}>{stats.tests}</div>
                            <div className="text-sm text-slate-500 font-semibold uppercase tracking-wide">Mock Tests</div>
                        </div>
                        <div>
                            <div className={`text-3xl font-black ${colors.text}`}>{stats.avgScore}</div>
                            <div className="text-sm text-slate-500 font-semibold uppercase tracking-wide">Avg Improvement</div>
                        </div>
                    </div>
                </motion.div>

                {/* Right Side Visual/Features */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, rotate: 2 }}
                    animate={{ opacity: 1, scale: 1, rotate: 0 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className={`relative ${colors.card} text-white rounded-[2.5rem] p-10 overflow-hidden shadow-2xl shadow-${themeColor}-500/30 min-h-[500px] flex flex-col justify-center`}
                >
                    {/* Decorative Elements */}
                    <div className="absolute top-0 right-0 w-80 h-80 bg-white/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                    <div className="absolute bottom-0 left-0 w-60 h-60 bg-black/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />

                    <div className="relative z-10">
                        <h3 className="text-3xl font-black mb-10 border-b border-white/20 pb-6">Why Choose Our {title} Series?</h3>

                        <div className="space-y-6">
                            {features.map((feature, idx) => (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.4 + (idx * 0.1) }}
                                    className="flex items-center gap-4 p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 hover:bg-white/20 transition-colors"
                                >
                                    <div className="bg-white/20 p-2 rounded-full">
                                        <CheckCircle className="text-white w-6 h-6" />
                                    </div>
                                    <p className="font-semibold text-lg text-white/95">{feature}</p>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </motion.div>
            </main>

            {/* Scroll Target for Children (Test List usually) */}
            {children && (
                <div className="max-w-7xl mx-auto px-6 py-16 border-t border-slate-200 bg-white/40 backdrop-blur-xl rounded-t-[3rem] shadow-inner">
                    <div className="mb-12 text-center">
                        <h2 className="text-3xl font-black text-slate-900 mb-4">Available Test Series</h2>
                        <p className="text-slate-600 max-w-2xl mx-auto">Explore our premium selection of mock tests designed to simulate real exam conditions.</p>
                    </div>
                    {children}
                </div>
            )}
        </div>
    );
}
