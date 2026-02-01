'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Mail, Phone, Lock, User, BookOpen, Target, CheckCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import {
    RecaptchaVerifier,
    signInWithPhoneNumber,
    ConfirmationResult,
    signInWithEmailAndPassword,
    EmailAuthProvider,
    linkWithCredential,
    User as FirebaseUser
} from 'firebase/auth';
import { auth } from '@/lib/firebase';

export default function AuthModal({ isOpen, onClose, defaultTab = 'login' }: { isOpen: boolean; onClose: () => void; defaultTab?: 'login' | 'signup' }) {
    const [mode, setMode] = useState<'login' | 'signup'>(defaultTab);
    const [loginMethod, setLoginMethod] = useState<'email' | 'phone'>('email');
    const [step, setStep] = useState(1); // 1: Input details, 2: OTP
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

    // Form State
    const [form, setForm] = useState({
        name: '',
        class: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
        targetExam: '',
        otp: ''
    });

    useEffect(() => {
        if (!isOpen) return;
        setMode(defaultTab);
        setStep(1);
    }, [isOpen, defaultTab]);

    const recaptchaContainerRef = React.useRef<HTMLDivElement>(null);
    const verifierRef = React.useRef<RecaptchaVerifier | null>(null);

    // Initialize Recaptcha
    useEffect(() => {
        if (!isOpen || !auth) return;

        const initRecaptcha = async () => {
            if (verifierRef.current) {
                // Already initialized
                return;
            }

            if (recaptchaContainerRef.current) {
                try {
                    const verifier = new RecaptchaVerifier(auth, recaptchaContainerRef.current, {
                        'size': 'invisible',
                        'callback': () => { console.log("Recaptcha solved"); },
                        'expired-callback': () => { console.log("Recaptcha expired"); }
                    });
                    verifierRef.current = verifier;
                    await verifier.render();
                } catch (err) {
                    console.error("Recaptcha init failed", err);
                }
            }
        };

        // Small delay to ensure DOM is ready and ref is populated
        const timer = setTimeout(initRecaptcha, 100);

        return () => {
            clearTimeout(timer);
            // We do NOT clear the verifier here because accessing a removed DOM element might crash it.
            // Instead, we let it be garbage collected or manually clear if the element is still valid.
            if (verifierRef.current) {
                try {
                    // Check if element is still in DOM (it won't be if unmounting)
                    // verifierRef.current.clear(); 
                    // Actually, simply destroying the ref is safer if we re-create it next time.
                    verifierRef.current = null;
                } catch (e) {
                    console.warn(e);
                }
            }
        };
    }, [isOpen]);

    // Pass the verifier directly
    const getVerifier = () => {
        return verifierRef.current;
    };

    if (!isOpen) return null;

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();

        if (form.password !== form.confirmPassword) {
            alert("Passwords do not match!");
            return;
        }

        setLoading(true);

        try {
            // Initiate Phone Auth for Signup Verification
            const appVerifier = (window as any).recaptchaVerifier;
            const phoneNumber = form.phone.startsWith('+') ? form.phone : `+91${form.phone}`;

            const confirmation = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
            setConfirmationResult(confirmation);
            setLoading(false);
            setStep(2); // Move to OTP
        } catch (error: any) {
            console.error("Signup Error:", error);
            setLoading(false);
            if (error.code === 'auth/billing-not-enabled') {
                alert("Use Test Number: +91 9999999999 | OTP: 123456");
            } else {
                alert(error.message);
            }
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (loginMethod === 'email') {
                const userCredential = await signInWithEmailAndPassword(auth, form.email, form.password);
                console.log("Logged in with Email:", userCredential.user);
                await syncUserWithBackend(userCredential.user);
                setLoading(false);
                onSuccess();
            } else {
                // Phone Login
                const appVerifier = getVerifier();
                if (!appVerifier) throw new Error("Recaptcha failed to initialize. Please reload.");

                const phoneNumber = form.phone.startsWith('+') ? form.phone : `+91${form.phone}`;
                const confirmation = await signInWithPhoneNumber(auth, phoneNumber, appVerifier as any);
                setConfirmationResult(confirmation);
                setLoading(false);
                setStep(2);
            }
        } catch (error: any) {
            console.error("Login Error:", error);
            setLoading(false);
            alert(error.message);
        }
    };

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        if (!confirmationResult) return;

        try {
            const result = await confirmationResult.confirm(form.otp);
            const user = result.user;

            if (mode === 'signup') {
                // Link Email/Password credential to this Phone-authenticated user
                const credential = EmailAuthProvider.credential(form.email, form.password);
                try {
                    await linkWithCredential(user, credential);
                    console.log("Email/Password linked successfully");
                } catch (linkError: any) {
                    console.error("Link Error:", linkError);
                    if (linkError.code === 'auth/email-already-in-use') {
                        alert("Note: This email is already associated with an account. You are logged in via Phone, but email linking failed.");
                    } else {
                        // Ignore or warn. 
                    }
                }
            }

            await syncUserWithBackend(user);
            setLoading(false);
            onSuccess();
        } catch (error: any) {
            console.error("OTP Error:", error);
            setLoading(false);
            alert("Invalid OTP");
        }
    };

    const syncUserWithBackend = async (user: FirebaseUser) => {
        try {
            const payload: any = {
                firebaseUid: user.uid,
                email: user.email || form.email || `${user.phoneNumber}@placeholder.com`,
                phoneNumber: user.phoneNumber || form.phone,
            };

            // Only add extra fields if in signup mode or if provided
            if (mode === 'signup') {
                payload.name = form.name;
                payload.class = form.class;
                payload.targetExam = form.targetExam;
            }

            await fetch(`http://localhost:5001/api/auth/sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } catch (err) {
            console.error("Sync failed", err);
        }
    };

    const onSuccess = () => {
        alert(mode === 'login' ? "Welcome Back!" : "Registration Successful!");
        onClose();
        router.push('/dashboard');
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div ref={recaptchaContainerRef}></div>

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
                {/* Header */}
                <div className="flex justify-between items-center p-5 border-b bg-gray-50">
                    <h2 className="text-xl font-bold text-gray-800">
                        {mode === 'login' ? 'Login to Continue' : 'Create New Account'}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition"><X size={20} /></button>
                </div>

                <div className="p-6 overflow-y-auto">
                    {/* Login Mode Toggle */}
                    {mode === 'login' && step === 1 && (
                        <div className="flex bg-gray-100 p-1 rounded-lg mb-6">
                            <button
                                onClick={() => setLoginMethod('email')}
                                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md font-medium text-sm transition ${loginMethod === 'email' ? 'bg-white shadow text-indigo-600' : 'text-gray-500'}`}
                            >
                                <Mail size={16} /> Email
                            </button>
                            <button
                                onClick={() => setLoginMethod('phone')}
                                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md font-medium text-sm transition ${loginMethod === 'phone' ? 'bg-white shadow text-indigo-600' : 'text-gray-500'}`}
                            >
                                <Phone size={16} /> Phone
                            </button>
                        </div>
                    )}

                    <AnimatePresence mode="wait">
                        {step === 1 ? (
                            <motion.form
                                key="step1"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 10 }}
                                onSubmit={mode === 'signup' ? handleSignup : handleLogin}
                                className="space-y-4"
                            >
                                {mode === 'signup' && (
                                    <>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-xs font-bold text-gray-500">Full Name</label>
                                                <input required type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full p-3 rounded border" placeholder="Your Name" />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-gray-500">Phone (+91)</label>
                                                <input required type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="w-full p-3 rounded border" placeholder="9876543210" />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-xs font-bold text-gray-500">Class</label>
                                                <select required value={form.class} onChange={e => setForm({ ...form, class: e.target.value })} className="w-full p-3 rounded border bg-white">
                                                    <option value="">Select</option>
                                                    <option value="11">Class 11</option>
                                                    <option value="12">Class 12</option>
                                                    <option value="Dropper">Dropper</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-gray-500">Target Exam</label>
                                                <select required value={form.targetExam} onChange={e => setForm({ ...form, targetExam: e.target.value })} className="w-full p-3 rounded border bg-white">
                                                    <option value="">Select</option>
                                                    <option value="JEE Main">JEE Main</option>
                                                    <option value="JEE Advanced">JEE Advanced</option>
                                                    <option value="NEET">NEET</option>
                                                </select>
                                            </div>
                                        </div>
                                    </>
                                )}

                                {/* Login Logic or Shared Email/Pass */}
                                {(mode === 'signup' || (mode === 'login' && loginMethod === 'email')) && (
                                    <>
                                        <div>
                                            <label className="text-xs font-bold text-gray-500">Email Address</label>
                                            <input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full p-3 rounded border" placeholder="you@example.com" />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-gray-500">Password</label>
                                            <input required type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="w-full p-3 rounded border" placeholder="••••••••" />
                                        </div>
                                    </>
                                )}

                                {mode === 'signup' && (
                                    <div>
                                        <label className="text-xs font-bold text-gray-500">Confirm Password</label>
                                        <input required type="password" value={form.confirmPassword} onChange={e => setForm({ ...form, confirmPassword: e.target.value })} className="w-full p-3 rounded border" placeholder="••••••••" />
                                    </div>
                                )}

                                {(mode === 'login' && loginMethod === 'phone') && (
                                    <div>
                                        <label className="text-xs font-bold text-gray-500">Phone Number (+91)</label>
                                        <input required type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="w-full p-3 rounded border" placeholder="Enter phone number" />
                                    </div>
                                )}

                                <button type="submit" disabled={loading} className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 flex justify-center items-center">
                                    {loading ? <Loader2 className="animate-spin" /> : (mode === 'signup' ? "Verify Phone & Register" : (loginMethod === 'phone' ? "Get OTP" : "Login"))}
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
                                    <h3 className="text-lg font-bold text-gray-900">Enter OTP</h3>
                                    <p className="text-sm text-gray-500">Sent to {form.phone}</p>
                                </div>
                                <input
                                    required
                                    type="text"
                                    maxLength={6}
                                    className="w-full text-center text-3xl font-bold tracking-widest py-4 border-2 border-indigo-100 rounded-xl focus:border-indigo-500 outline-none text-indigo-600"
                                    placeholder="000000"
                                    value={form.otp}
                                    onChange={(e) => setForm({ ...form, otp: e.target.value })}
                                />
                                <div className="flex gap-4">
                                    <button type="button" onClick={() => setStep(1)} className="flex-1 py-3 text-gray-600 font-bold bg-gray-100 rounded-xl hover:bg-gray-200">Back</button>
                                    <button type="submit" disabled={loading} className="flex-[2] py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 flex justify-center items-center">
                                        {loading ? <Loader2 className="animate-spin" /> : "Verify & Complete"}
                                    </button>
                                </div>
                            </motion.form>
                        )}
                    </AnimatePresence>
                </div>

                <div className="p-4 bg-gray-50 border-t text-center text-sm">
                    {mode === 'login' ? "Don't have an account?" : "Already have an account?"}
                    <button onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setStep(1); }} className="ml-2 font-bold text-indigo-600 hover:underline">
                        {mode === 'login' ? 'Sign Up' : 'Login'}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
