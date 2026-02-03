'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Phone, ArrowRight, Loader2, CheckCircle, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
    const [phoneNumber, setPhoneNumber] = useState('');
    const [otp, setOtp] = useState('');
    const [step, setStep] = useState('PHONE'); // PHONE | OTP
    const [confirmationResult, setConfirmationResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();
    const recaptchaContainerRef = useRef(null);

    useEffect(() => {
        // Initialize Recaptcha
        if (!window.recaptchaVerifier) {
            window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
                'size': 'invisible',
                'callback': (response) => {
                    // reCAPTCHA solved, allow signInWithPhoneNumber.
                },
                'expired-callback': () => {
                    setError('Recaptcha expired. Please refresh.');
                }
            });
        }
    }, []);

    const handleSendOtp = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        if (!phoneNumber || phoneNumber.length < 10) {
            setError('Please enter a valid phone number with country code (e.g. +91...)');
            setLoading(false);
            return;
        }

        try {
            const appVerifier = window.recaptchaVerifier;
            const confirmation = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
            setConfirmationResult(confirmation);
            setStep('OTP');
        } catch (err) {
            console.error("OTP Send Error:", err);
            setError(err.message || 'Failed to send OTP.');
            if (window.recaptchaVerifier) window.recaptchaVerifier.clear();
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        if (!otp || otp.length < 6) {
            setError('Please enter the 6-digit valid OTP.');
            setLoading(false);
            return;
        }

        try {
            const result = await confirmationResult.confirm(otp);
            const user = result.user;

            // Check if user exists in Firestore
            const userDoc = await getDoc(doc(db, 'users', user.uid));

            if (userDoc.exists()) {
                // User exists -> Dashboard
                router.push('/dashboard');
            } else {
                // User does not exist -> Signup Details
                router.push('/signup-details');
            }

        } catch (err) {
            console.error("OTP Verify Error:", err);
            setError('Invalid OTP. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-white relative overflow-hidden">
            {/* Background Decoration */}
            <div className="absolute -top-20 -right-20 w-96 h-96 bg-indigo-50 rounded-full blur-3xl opacity-60 pointer-events-none"></div>
            <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-blue-50 rounded-full blur-3xl opacity-60 pointer-events-none"></div>

            <div className="max-w-md w-full bg-white p-8 md:p-10 rounded-3xl shadow-2xl border border-gray-100 relative z-10 mx-4">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-100 text-indigo-600 mb-4 shadow-sm">
                        <ShieldCheck size={32} />
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">
                        {step === 'PHONE' ? 'Welcome Back' : 'Verify OTP'}
                    </h2>
                    <p className="text-gray-500">
                        {step === 'PHONE'
                            ? 'Enter your phone number to access your account'
                            : `Enter the code sent to ${phoneNumber}`
                        }
                    </p>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm mb-6 flex items-center text-center justify-center">
                        {error}
                    </div>
                )}

                {step === 'PHONE' ? (
                    <form onSubmit={handleSendOtp} className="space-y-6">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Phone Number</label>
                            <div className="relative group">
                                <Phone className="absolute left-4 top-3.5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
                                <input
                                    type="tel"
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.target.value)}
                                    className="block w-full pl-12 pr-4 py-3.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all outline-none font-medium text-gray-800 placeholder-gray-400"
                                    placeholder="+91 99999 99999"
                                    required
                                />
                            </div>
                            <p className="text-xs text-gray-400 mt-2 px-1">Include country code (e.g. +91)</p>
                        </div>

                        <div id="recaptcha-container"></div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex justify-center items-center py-4 px-6 border border-transparent rounded-xl shadow-lg shadow-indigo-200 text-base font-bold text-white bg-indigo-600 hover:bg-indigo-700 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all transform hover:-translate-y-0.5"
                        >
                            {loading ? <Loader2 className="animate-spin" size={20} /> : (
                                <>
                                    Get OTP <ArrowRight size={18} className="ml-2" />
                                </>
                            )}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleVerifyOtp} className="space-y-6">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">One-Time Password</label>
                            <div className="relative group">
                                <CheckCircle className="absolute left-4 top-3.5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
                                <input
                                    type="text"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value)}
                                    className="block w-full pl-12 pr-4 py-3.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all outline-none font-medium text-gray-800 placeholder-gray-400 tracking-widest text-lg"
                                    placeholder="123456"
                                    maxLength={6}
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex justify-center items-center py-4 px-6 border border-transparent rounded-xl shadow-lg shadow-indigo-200 text-base font-bold text-white bg-indigo-600 hover:bg-indigo-700 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all transform hover:-translate-y-0.5"
                        >
                            {loading ? <Loader2 className="animate-spin" size={20} /> : 'Verify & Proceed'}
                        </button>

                        <button
                            type="button"
                            onClick={() => setStep('PHONE')}
                            className="w-full text-center text-sm font-medium text-gray-500 hover:text-indigo-600 transition-colors"
                        >
                            Change Phone Number
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
