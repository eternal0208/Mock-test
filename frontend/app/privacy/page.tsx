'use client';
import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowLeft, Target, Shield } from 'lucide-react';

export default function PrivacyPage() {
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
                <div className="max-w-4xl mx-auto">

                    {/* Header */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="text-center mb-12"
                    >
                        <div className="flex justify-center mb-4">
                            <div className="bg-green-100 p-4 rounded-full">
                                <Shield className="text-green-600" size={40} />
                            </div>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-2">
                            Privacy Policy
                        </h1>
                        <p className="text-slate-600 text-lg">
                            Apex Mock – An initiative of SR Club
                        </p>
                        <p className="text-slate-500 mt-2">
                            Last updated: 01-02-2025
                        </p>
                    </motion.div>

                    {/* Privacy Content */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="bg-white rounded-2xl shadow-xl p-8 md:p-12 border border-gray-100"
                    >
                        <p className="text-slate-700 mb-8 text-lg leading-relaxed">
                            At Apex Mock, we are committed to protecting your privacy. This Privacy Policy explains how we collect,
                            use, and safeguard your personal information.
                        </p>

                        <div className="space-y-8">
                            {/* Information We Collect */}
                            <section>
                                <h2 className="text-2xl font-bold text-slate-900 mb-3">Information We Collect</h2>
                                <p className="text-slate-700 leading-relaxed mb-3">
                                    We collect the following types of information to provide and improve our services:
                                </p>
                                <ul className="list-disc list-inside text-slate-700 space-y-2 ml-4">
                                    <li>Personal information (name, email address, phone number) provided during registration</li>
                                    <li>Educational information (exam preferences, test scores, performance data)</li>
                                    <li>Technical information (IP address, browser type, device information)</li>
                                    <li>Usage data (pages visited, features used, time spent on platform)</li>
                                </ul>
                            </section>

                            {/* How We Use Your Information */}
                            <section>
                                <h2 className="text-2xl font-bold text-slate-900 mb-3">How We Use Your Information</h2>
                                <p className="text-slate-700 leading-relaxed mb-3">
                                    We use the collected information for the following purposes:
                                </p>
                                <ul className="list-disc list-inside text-slate-700 space-y-2 ml-4">
                                    <li>To provide access to mock tests and educational content</li>
                                    <li>To track your progress and generate performance analytics</li>
                                    <li>To communicate with you about your account and services</li>
                                    <li>To improve our platform and develop new features</li>
                                    <li>To detect and prevent fraud or unauthorized access</li>
                                </ul>
                            </section>

                            {/* Data Protection */}
                            <section>
                                <h2 className="text-2xl font-bold text-slate-900 mb-3">Data Protection & Security</h2>
                                <p className="text-slate-700 leading-relaxed">
                                    We implement reasonable technical and organizational measures to protect your personal data from
                                    unauthorized access, loss, or misuse. However, please note that no method of transmission over the
                                    internet or electronic storage is 100% secure, and we cannot guarantee absolute security.
                                </p>
                            </section>

                            {/* Data Sharing */}
                            <section>
                                <h2 className="text-2xl font-bold text-slate-900 mb-3">Data Sharing & Disclosure</h2>
                                <p className="text-slate-700 leading-relaxed mb-3">
                                    We do not sell or rent your personal data to third parties. We may share your information only in
                                    the following circumstances:
                                </p>
                                <ul className="list-disc list-inside text-slate-700 space-y-2 ml-4">
                                    <li>With service providers who help us operate the platform (e.g., payment processors, hosting services)</li>
                                    <li>When required by law or to comply with legal obligations</li>
                                    <li>To protect the rights, property, or safety of SR Club, our users, or others</li>
                                    <li>With your explicit consent</li>
                                </ul>
                            </section>

                            {/* Cookies Policy */}
                            <section>
                                <h2 className="text-2xl font-bold text-slate-900 mb-3">Cookies & Tracking Technologies</h2>
                                <p className="text-slate-700 leading-relaxed">
                                    We use cookies and similar tracking technologies to enhance your experience on our platform.
                                    Cookies help us remember your preferences, analyze site traffic, and personalize content.
                                    You can control or disable cookies through your browser settings, though this may affect some
                                    features of the platform.
                                </p>
                            </section>

                            {/* Third-Party Services */}
                            <section>
                                <h2 className="text-2xl font-bold text-slate-900 mb-3">Third-Party Links & Services</h2>
                                <p className="text-slate-700 leading-relaxed">
                                    Our platform may contain links to third-party websites or services. We are not responsible for
                                    the privacy practices or content of these third parties. We encourage you to review their privacy
                                    policies before providing any personal information.
                                </p>
                            </section>

                            {/* Your Rights */}
                            <section>
                                <h2 className="text-2xl font-bold text-slate-900 mb-3">Your Rights</h2>
                                <p className="text-slate-700 leading-relaxed mb-3">
                                    You have the following rights regarding your personal data:
                                </p>
                                <ul className="list-disc list-inside text-slate-700 space-y-2 ml-4">
                                    <li>Access: You can request a copy of the personal data we hold about you</li>
                                    <li>Correction: You can update or correct inaccurate information</li>
                                    <li>Deletion: You can request deletion of your account and associated data</li>
                                    <li>Objection: You can object to certain processing of your data</li>
                                </ul>
                                <p className="text-slate-700 leading-relaxed mt-3">
                                    To exercise these rights, please contact us at{' '}
                                    <a href="mailto:officialsrcounselling@gmail.com" className="text-indigo-600 hover:underline font-semibold">
                                        officialsrcounselling@gmail.com
                                    </a>.
                                </p>
                            </section>

                            {/* Children's Privacy */}
                            <section>
                                <h2 className="text-2xl font-bold text-slate-900 mb-3">Children's Privacy</h2>
                                <p className="text-slate-700 leading-relaxed">
                                    Users must be at least 13 years old to use Apex Mock. Users under 18 require parental or guardian
                                    consent. We do not knowingly collect personal information from children under 13 without appropriate
                                    consent.
                                </p>
                            </section>

                            {/* Data Retention */}
                            <section>
                                <h2 className="text-2xl font-bold text-slate-900 mb-3">Data Retention</h2>
                                <p className="text-slate-700 leading-relaxed">
                                    We retain your personal data for as long as necessary to provide our services and comply with legal
                                    obligations. When you delete your account, we will remove your personal data, except where retention
                                    is required by law.
                                </p>
                            </section>

                            {/* Changes to Privacy Policy */}
                            <section>
                                <h2 className="text-2xl font-bold text-slate-900 mb-3">Changes to This Privacy Policy</h2>
                                <p className="text-slate-700 leading-relaxed">
                                    SR Club may update this Privacy Policy from time to time. We will notify you of any significant
                                    changes by posting the new policy on this page with an updated "Last updated" date. Continued use
                                    of the platform after changes implies acceptance of the updated policy.
                                </p>
                            </section>

                            {/* Contact */}
                            <section>
                                <h2 className="text-2xl font-bold text-slate-900 mb-3">Contact Us</h2>
                                <p className="text-slate-700 leading-relaxed mb-3">
                                    If you have any questions or concerns about this Privacy Policy or our data practices, please contact us:
                                </p>
                                <div className="text-slate-700 leading-relaxed space-y-2">
                                    <p className="flex items-center gap-2">
                                        📧 <a href="mailto:officialsrcounselling@gmail.com" className="text-indigo-600 hover:underline font-semibold">
                                            officialsrcounselling@gmail.com
                                        </a>
                                    </p>
                                    <p className="flex items-center gap-2">
                                        🌐 Apex Mock – An initiative of SR Club
                                    </p>
                                </div>
                            </section>
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
