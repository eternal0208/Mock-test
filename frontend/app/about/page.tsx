'use client';
import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowLeft, Target, Users, Award, Mail, Globe, BookOpen, TrendingUp } from 'lucide-react';

export default function AboutPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
            {/* Navbar */}
            <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-white/80 border-b border-gray-200 shadow-sm">
                <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
                    <Link href="/" className="flex items-center gap-2 text-2xl font-black text-slate-800 hover:text-indigo-600 transition">
                        <ArrowLeft size={24} />
                        <Target className="text-indigo-600" /> APEX<span className="text-indigo-600">MOCK</span>
                    </Link>
                </div>
            </nav>

            {/* Main Content */}
            <main className="pt-24 pb-16 px-4">
                <div className="max-w-5xl mx-auto">

                    {/* Hero Section */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="text-center mb-16"
                    >
                        <h1 className="text-5xl md:text-6xl font-black text-slate-900 mb-4">
                            About <span className="text-indigo-600">Apex Mock</span>
                        </h1>
                        <p className="text-xl text-slate-600 font-medium">
                            An initiative of SR Club - Empowering students to achieve their dreams
                        </p>
                    </motion.div>

                    {/* Mission Section */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="bg-white rounded-2xl shadow-xl p-8 md:p-12 mb-8 border border-gray-100"
                    >
                        <div className="flex items-center gap-3 mb-6">
                            <div className="bg-indigo-100 p-3 rounded-full">
                                <Target className="text-indigo-600" size={28} />
                            </div>
                            <h2 className="text-3xl font-bold text-slate-900">Our Mission</h2>
                        </div>
                        <p className="text-lg text-slate-700 leading-relaxed mb-4">
                            Apex Mock is India's most advanced testing platform designed for high-performance candidates.
                            We provide comprehensive online mock tests and educational content for NEET, JEE Mains,
                            JEE Advanced, and CAT aspirants.
                        </p>
                        <p className="text-lg text-slate-700 leading-relaxed">
                            Our platform offers real exam simulation with AI-driven analytics, helping students practice,
                            assess, and excel in their competitive examinations. We believe in empowering students with
                            the tools they need to not just compete, but dominate.
                        </p>
                    </motion.div>

                    {/* Features Grid */}
                    <div className="grid md:grid-cols-2 gap-6 mb-8">
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.6, delay: 0.3 }}
                            className="bg-white rounded-xl shadow-lg p-6 border border-gray-100"
                        >
                            <div className="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                                <BookOpen className="text-blue-600" size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">Comprehensive Tests</h3>
                            <p className="text-slate-600">
                                NTA-aligned mock tests with detailed solutions and explanations for every question.
                            </p>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.6, delay: 0.4 }}
                            className="bg-white rounded-xl shadow-lg p-6 border border-gray-100"
                        >
                            <div className="bg-green-100 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                                <TrendingUp className="text-green-600" size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">Performance Analytics</h3>
                            <p className="text-slate-600">
                                Advanced AI-driven analytics to track your progress, identify weak areas, and improve performance.
                            </p>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.6, delay: 0.5 }}
                            className="bg-white rounded-xl shadow-lg p-6 border border-gray-100"
                        >
                            <div className="bg-purple-100 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                                <Users className="text-purple-600" size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">Trusted Community</h3>
                            <p className="text-slate-600">
                                Join 10,000+ students who trust Apex Mock for their exam preparation journey.
                            </p>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.6, delay: 0.6 }}
                            className="bg-white rounded-xl shadow-lg p-6 border border-gray-100"
                        >
                            <div className="bg-yellow-100 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                                <Award className="text-yellow-600" size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">Premium Quality</h3>
                            <p className="text-slate-600">
                                Expertly curated questions and tests that mirror actual exam patterns and difficulty levels.
                            </p>
                        </motion.div>
                    </div>

                    {/* SR Club Section */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.7 }}
                        className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl shadow-xl p-8 md:p-12 mb-8 text-white"
                    >
                        <h2 className="text-3xl font-bold mb-4">About SR Club</h2>
                        <p className="text-lg leading-relaxed mb-4 text-indigo-50">
                            Apex Mock is a proud initiative of SR Club, dedicated to providing quality educational resources
                            and guidance to students across India. SR Club is committed to making competitive exam preparation
                            accessible, affordable, and effective for every aspirant.
                        </p>
                        <p className="text-lg leading-relaxed text-indigo-50">
                            Our team of experienced educators and technology experts work tirelessly to create a platform
                            that truly makes a difference in students' lives.
                        </p>
                    </motion.div>

                    {/* Contact Section */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.8 }}
                        className="bg-white rounded-2xl shadow-xl p-8 md:p-12 border border-gray-100"
                    >
                        <h2 className="text-3xl font-bold text-slate-900 mb-6">Get in Touch</h2>
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 text-slate-700">
                                <div className="bg-red-100 p-2 rounded-full">
                                    <Mail className="text-red-600" size={20} />
                                </div>
                                <a href="mailto:officialsrcounselling@gmail.com" className="text-lg hover:text-indigo-600 transition font-medium">
                                    officialsrcounselling@gmail.com
                                </a>
                            </div>
                            <div className="flex items-center gap-3 text-slate-700">
                                <div className="bg-blue-100 p-2 rounded-full">
                                    <Globe className="text-blue-600" size={20} />
                                </div>
                                <span className="text-lg font-medium">Apex Mock – An initiative of SR Club</span>
                            </div>
                        </div>
                    </motion.div>

                </div>
            </main>

            {/* Footer */}
            <footer className="bg-slate-900 text-slate-300 py-8">
                <div className="max-w-7xl mx-auto px-6 text-center">
                    <p className="mb-2">© 2025 Apex Mock - An initiative of SR Club. All rights reserved.</p>
                    <div className="flex justify-center gap-6 text-sm">
                        <Link href="/about" className="hover:text-white transition">About</Link>
                        <Link href="/terms" className="hover:text-white transition">Terms & Conditions</Link>
                        <Link href="/privacy" className="hover:text-white transition">Privacy Policy</Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}
