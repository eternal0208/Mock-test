'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Mail, Lock, User, CheckCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { signInWithCustomToken, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { API_BASE_URL } from '@/lib/config';

export default function AuthModal({ isOpen, onClose, defaultTab = 'login' }: { isOpen: boolean; onClose: () => void; defaultTab?: 'login' | 'signup' }) {
    const [mode, setMode] = useState<'login' | 'signup'>(defaultTab);
    const [step, setStep] = useState(1); // 1: Input details, 2: OTP
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleGoogleLogin = async () => {
        try {
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);
            const user = result.user;

            // Sync with backend
            await fetch(`${API_BASE_URL}/api/auth/sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    firebaseUid: user.uid,
                    email: user.email,
                    name: user.displayName,
                    photoURL: user.photoURL,
                    provider: 'google'
                })
            });

            onSuccess();
        } catch (error: any) {
            console.error("Google Login Error:", error);
            if (error.code === 'auth/unauthorized-domain') {
                alert("Domain Error: Please add this domain to Firebase Console -> Authentication -> Settings -> Authorized Domains");
            } else {
                alert(error.message);
            }
        }
    };

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

                    {/* Google Login Divider and Button */}
                    <div className="mt-6">
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-gray-200" />
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-white text-gray-500">Or continue with</span>
                            </div>
                        </div>

                        <button
                            onClick={handleGoogleLogin}
                            type="button"
                            className="mt-4 w-full py-3 bg-white text-gray-700 font-bold rounded-xl border border-gray-300 hover:bg-gray-50 flex justify-center items-center gap-2 transition-all shadow-sm"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path
                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                    fill="#4285F4"
                                />
                                <path
                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                    fill="#34A853"
                                />
                                <path
                                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                    fill="#FBBC05"
                                />
                                <path
                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                    fill="#EA4335"
                                />
                            </svg>
                            Google
                        </button>
                    </div>
                </div>

                <div className="p-4 bg-gray-50 border-t text-center text-sm">
                    {mode === 'login' ? "New to Apex Mock?" : "Already have an account?"}
                    <button onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setStep(1); }} className="ml-2 font-bold text-indigo-600 hover:underline">
                        {mode === 'login' ? 'Create Account' : 'Login'}
                    </button>
                </div>
            </motion.div >
        </div >
    );
}
