'use client';
import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowLeft, Target, FileText } from 'lucide-react';

export default function TermsPage() {
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
                            <div className="bg-indigo-100 p-4 rounded-full">
                                <FileText className="text-indigo-600" size={40} />
                            </div>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-2">
                            Terms & Conditions
                        </h1>
                        <p className="text-slate-600 text-lg">
                            Apex Mock – An initiative of SR Club
                        </p>
                        <p className="text-slate-500 mt-2">
                            Last updated: 01-02-2025
                        </p>
                    </motion.div>

                    {/* Terms Content */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="bg-white rounded-2xl shadow-xl p-8 md:p-12 border border-gray-100"
                    >
                        <p className="text-slate-700 mb-8 text-lg leading-relaxed">
                            By accessing or using Apex Mock, you agree to the following terms and policies.
                        </p>

                        <div className="space-y-8">
                            {/* Section 1 */}
                            <section>
                                <h2 className="text-2xl font-bold text-slate-900 mb-3">1. Services</h2>
                                <p className="text-slate-700 leading-relaxed">
                                    Apex Mock provides online mock tests and educational content for practice and self-assessment only.
                                    Results or success in any exam are not guaranteed.
                                </p>
                            </section>

                            {/* Section 2 */}
                            <section>
                                <h2 className="text-2xl font-bold text-slate-900 mb-3">2. Eligibility</h2>
                                <p className="text-slate-700 leading-relaxed">
                                    Users must be 13 years or older. Users under 18 must have parental or guardian consent.
                                </p>
                            </section>

                            {/* Section 3 */}
                            <section>
                                <h2 className="text-2xl font-bold text-slate-900 mb-3">3. User Responsibility</h2>
                                <p className="text-slate-700 leading-relaxed">
                                    Users are responsible for their account activity and must not misuse the platform, share content,
                                    or attempt unauthorized access.
                                </p>
                            </section>

                            {/* Section 4 */}
                            <section>
                                <h2 className="text-2xl font-bold text-slate-900 mb-3">4. Intellectual Property</h2>
                                <p className="text-slate-700 leading-relaxed">
                                    All content on Apex Mock is the property of SR Club. Copying, sharing, or commercial use without
                                    permission is prohibited.
                                </p>
                            </section>

                            {/* Section 5 */}
                            <section>
                                <h2 className="text-2xl font-bold text-slate-900 mb-3">5. Payments (If Applicable)</h2>
                                <p className="text-slate-700 leading-relaxed">
                                    All payments are non-refundable, unless stated otherwise. Prices and features may change without notice.
                                </p>
                            </section>

                            {/* Section 6 */}
                            <section>
                                <h2 className="text-2xl font-bold text-slate-900 mb-3">6. Limitation of Liability</h2>
                                <p className="text-slate-700 leading-relaxed">
                                    SR Club is not responsible for exam outcomes, data loss, or technical issues. Services are provided "as is".
                                </p>
                            </section>

                            {/* Section 7 */}
                            <section>
                                <h2 className="text-2xl font-bold text-slate-900 mb-3">7. Privacy & Data Use</h2>
                                <p className="text-slate-700 leading-relaxed">
                                    We collect basic personal and technical information to operate and improve our services.
                                    We do not sell or rent user data. For more details, please see our{' '}
                                    <Link href="/privacy" className="text-indigo-600 hover:underline font-semibold">
                                        Privacy Policy
                                    </Link>.
                                </p>
                            </section>

                            {/* Section 8 */}
                            <section>
                                <h2 className="text-2xl font-bold text-slate-900 mb-3">8. Cookies</h2>
                                <p className="text-slate-700 leading-relaxed">
                                    Cookies may be used to enhance user experience. Users can disable cookies via browser settings.
                                </p>
                            </section>

                            {/* Section 9 */}
                            <section>
                                <h2 className="text-2xl font-bold text-slate-900 mb-3">9. Data Security</h2>
                                <p className="text-slate-700 leading-relaxed">
                                    Reasonable measures are taken to protect user data; however, complete security cannot be guaranteed.
                                </p>
                            </section>

                            {/* Section 10 */}
                            <section>
                                <h2 className="text-2xl font-bold text-slate-900 mb-3">10. Third-Party Links</h2>
                                <p className="text-slate-700 leading-relaxed">
                                    We are not responsible for third-party websites linked on Apex Mock.
                                </p>
                            </section>

                            {/* Section 11 */}
                            <section>
                                <h2 className="text-2xl font-bold text-slate-900 mb-3">11. Changes</h2>
                                <p className="text-slate-700 leading-relaxed">
                                    SR Club may update these terms at any time. Continued use implies acceptance.
                                </p>
                            </section>

                            {/* Section 12 */}
                            <section>
                                <h2 className="text-2xl font-bold text-slate-900 mb-3">12. Governing Law</h2>
                                <p className="text-slate-700 leading-relaxed">
                                    These terms are governed by the laws of India.
                                </p>
                            </section>

                            {/* Section 13 */}
                            <section>
                                <h2 className="text-2xl font-bold text-slate-900 mb-3">13. Contact</h2>
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
