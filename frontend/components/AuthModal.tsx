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
                // DEBUG: Show URL to identify config issues
                alert(`Login Failed: ${error.message}\nTrying to connect to: ${API_BASE_URL}`);
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
            const res = await fetch(`${API_BASE_URL}/api/auth/verify-otp`, {
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
                await fetch(`${API_BASE_URL}/api/auth/sync`, {
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

                <div className="p-8 text-center">
                    <div className="mb-8">
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to Apex Mock</h2>
                        <p className="text-gray-500">Sign in to access your exams and dashboard</p>
                    </div>

                    <button
                        onClick={handleGoogleLogin}
                        type="button"
                        className="w-full py-4 bg-white text-gray-700 font-bold rounded-xl border border-gray-300 hover:bg-gray-50 flex justify-center items-center gap-3 transition-all shadow-sm hover:shadow-md transform hover:scale-[1.01]"
                    >
                        <svg className="w-6 h-6" viewBox="0 0 24 24">
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
                        <span className="text-lg">Continue with Google</span>
                    </button>

                    <p className="mt-6 text-xs text-gray-400">
                        By continuing, you agree to our Terms of Service and Privacy Policy.
                    </p>
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
