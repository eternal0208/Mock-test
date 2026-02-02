'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Mail, Lock, User, CheckCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { signInWithCustomToken } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { API_BASE_URL } from '@/lib/config';

export default function AuthModal({ isOpen, onClose, defaultTab = 'login' }: { isOpen: boolean; onClose: () => void; defaultTab?: 'login' | 'signup' }) {
    const [mode, setMode] = useState<'login' | 'signup'>(defaultTab);
    const [step, setStep] = useState(1); // 1: Input details, 2: OTP
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    // Form State
    const [form, setForm] = useState({
        name: '',
        class: '',
        targetExam: '',
        email: '',
        otp: ''
    });

    useEffect(() => {
        if (!isOpen) return;
        setMode(defaultTab);
        setStep(1);
        setForm({ name: '', class: '', targetExam: '', email: '', otp: '' });
    }, [isOpen, defaultTab]);

    if (!isOpen) return null;

    const handleSendOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch(`${API_BASE_URL}/api/auth/send-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: form.email })
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.message || 'Failed to send OTP');

            alert(`OTP Sent to ${form.email} (Check Server Console)`);
            setStep(2);
        } catch (error: any) {
            console.error("Send OTP Error:", error);
            alert(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // 1. Verify OTP on Backend
            const res = await fetch('http://localhost:5001/api/auth/verify-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: form.email, otp: form.otp })
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.message || 'Invalid OTP');

            // 2. Sign in with Custom Token
            await signInWithCustomToken(auth, data.token);

            // 3. If Signup, sync extra details (Name, Class, etc.)
            if (mode === 'signup') {
                await fetch('http://localhost:5001/api/auth/sync', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        firebaseUid: data.user.firebaseUid || data.user._id,
                        email: form.email,
                        name: form.name,
                        class: form.class,
                        targetExam: form.targetExam
                    })
                });
            }

            // Success
            onSuccess();
        } catch (error: any) {
            console.error("Verify OTP Error:", error);
            alert(error.message);
        } finally {
            setLoading(false);
        }
    };

    const onSuccess = () => {
        alert(mode === 'login' ? "Welcome Back!" : "Registration Successful!");
        onClose();
        router.push('/dashboard');
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
                {/* Header */}
                <div className="flex justify-between items-center p-5 border-b bg-gray-50">
                    <h2 className="text-xl font-bold text-gray-800">
                        {mode === 'login' ? 'Login via Email' : 'Join Apex Mock'}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition"><X size={20} /></button>
                </div>

                <div className="p-6 overflow-y-auto">
                    <AnimatePresence mode="wait">
                        {step === 1 ? (
                            <motion.form
                                key="step1"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 10 }}
                                onSubmit={handleSendOtp}
                                className="space-y-4"
                            >
                                {mode === 'signup' && (
                                    <>
                                        <div>
                                            <label className="text-xs font-bold text-gray-500">Full Name</label>
                                            <input required type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full p-3 rounded border focus:ring-2 focus:ring-indigo-500 outline-none transition" placeholder="Your Name" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-xs font-bold text-gray-500">Class</label>
                                                <select required value={form.class} onChange={e => setForm({ ...form, class: e.target.value })} className="w-full p-3 rounded border bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition">
                                                    <option value="">Select</option>
                                                    <option value="11">Class 11</option>
                                                    <option value="12">Class 12</option>
                                                    <option value="Dropper">Dropper</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-gray-500">Target Exam</label>
                                                <select required value={form.targetExam} onChange={e => setForm({ ...form, targetExam: e.target.value })} className="w-full p-3 rounded border bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition">
                                                    <option value="">Select</option>
                                                    <option value="JEE Main">JEE Main</option>
                                                    <option value="JEE Advanced">JEE Advanced</option>
                                                    <option value="NEET">NEET</option>
                                                </select>
                                            </div>
                                        </div>
                                    </>
                                )}

                                <div>
                                    <label className="text-xs font-bold text-gray-500">Email Address</label>
                                    <input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full p-3 rounded border focus:ring-2 focus:ring-indigo-500 outline-none transition" placeholder="you@example.com" />
                                </div>

                                <button type="submit" disabled={loading} className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 flex justify-center items-center gap-2 transition-all transform hover:scale-[1.02] active:scale-[0.98]">
                                    {loading ? <Loader2 className="animate-spin" /> :
                                        <><Mail size={20} /> Get Login OTP</>
                                    }
                                </button>
                            </motion.form>
                        ) : (
                            <motion.form
                                key="step2"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                onSubmit={handleVerifyOtp}
                                className="space-y-6 text-center"
                            >
                                <div>
                                    <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Mail size={32} />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900">Verify Your Email</h3>
                                    <p className="text-sm text-gray-500 mt-1">We sent a 6-digit code to <span className="font-bold text-gray-800">{form.email}</span></p>
                                    <p className="text-xs text-indigo-500 mt-1 font-semibold">(Check the server console for the code)</p>
                                </div>

                                <div className="flex justify-center">
                                    <input
                                        required
                                        type="text"
                                        maxLength={6}
                                        className="w-48 text-center text-4xl font-black tracking-widest py-3 border-b-4 border-indigo-200 focus:border-indigo-600 outline-none bg-transparent transition-colors"
                                        placeholder="000000"
                                        value={form.otp}
                                        onChange={(e) => setForm({ ...form, otp: e.target.value.replace(/\D/g, '') })}
                                    />
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <button type="button" onClick={() => setStep(1)} className="flex-1 py-3 text-gray-600 font-bold bg-gray-100 rounded-xl hover:bg-gray-200 transition">Change Email</button>
                                    <button type="submit" disabled={loading} className="flex-[2] py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 flex justify-center items-center shadow-lg shadow-indigo-200 transition-all transform hover:scale-[1.02]">
                                        {loading ? <Loader2 className="animate-spin" /> : "Verify & Login"}
                                    </button>
                                </div>
                            </motion.form>
                        )}
                    </AnimatePresence>
                </div>

                <div className="p-4 bg-gray-50 border-t text-center text-sm">
                    {mode === 'login' ? "New to Apex Mock?" : "Already have an account?"}
                    <button onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setStep(1); }} className="ml-2 font-bold text-indigo-600 hover:underline">
                        {mode === 'login' ? 'Create Account' : 'Login'}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
