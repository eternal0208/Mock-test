'use client';
import { useState, useRef, useEffect } from 'react';
import { auth, db } from '@/lib/firebase';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { X, Phone, CheckCircle, Loader2, ArrowRight, ShieldCheck } from 'lucide-react';

export default function LoginModal({ isOpen, onClose }) {
    const [step, setStep] = useState('PHONE'); // 'PHONE' or 'OTP'
    const [countryCode, setCountryCode] = useState('+91');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [otp, setOtp] = useState('');
    const [confirmationResult, setConfirmationResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const verifierRef = useRef(null);
    const router = useRouter();

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (verifierRef.current) {
                try {
                    verifierRef.current.clear();
                } catch (e) {
                    console.warn('Cleanup error:', e);
                }
                verifierRef.current = null;
            }
        };
    }, []);

    // Reset when modal closes
    useEffect(() => {
        if (!isOpen) {
            setStep('PHONE');
            setPhoneNumber('');
            setOtp('');
            setError('');
            setLoading(false);
        }
    }, [isOpen]);

    const handleSendOtp = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        if (phoneNumber.length < 10) {
            setError('Please enter a valid 10-digit phone number');
            setLoading(false);
            return;
        }

        const fullPhoneNumber = countryCode + phoneNumber;

        try {
            // Lazy initialization of RecaptchaVerifier
            if (!verifierRef.current) {
                verifierRef.current = new RecaptchaVerifier(auth, 'recaptcha-container-modal', {
                    size: 'invisible',
                    callback: () => {
                        console.log('reCAPTCHA solved');
                    },
                    'expired-callback': () => {
                        setError('reCAPTCHA expired. Please try again.');
                    }
                });
                await verifierRef.current.render();
            }

            const confirmation = await signInWithPhoneNumber(auth, fullPhoneNumber, verifierRef.current);
            setConfirmationResult(confirmation);
            setStep('OTP');
            setLoading(false);
        } catch (err) {
            console.error('OTP Send Error:', err);
            setError(err.message || 'Failed to send OTP. Please try again.');
            if (verifierRef.current) {
                try {
                    verifierRef.current.clear();
                } catch (e) { }
                verifierRef.current = null;
            }
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        console.log('🔍 Verifying OTP:', otp);
        console.log('🔍 OTP Length:', otp.length);
        console.log('🔍 Confirmation Result exists:', !!confirmationResult);

        if (!otp || otp.length < 6) {
            setError('Please enter the 6-digit valid OTP.');
            setLoading(false);
            return;
        }

        if (!confirmationResult) {
            setError('Session expired. Please request OTP again.');
            setLoading(false);
            setStep('PHONE');
            return;
        }

        try {
            console.log('✅ Attempting to confirm OTP...');
            // Verify OTP
            const result = await confirmationResult.confirm(otp);
            const user = result.user;
            console.log('✅ OTP verified successfully, User:', user.uid);

            // Check if user profile exists
            setError('Checking your account...');
            const userDoc = await getDoc(doc(db, 'users', user.uid));

            if (userDoc.exists()) {
                console.log('✅ User profile found, redirecting to dashboard');
                onClose();
                router.push('/dashboard');
            } else {
                console.log('🆕 New user, redirecting to signup details');
                onClose();
                router.push('/signup-details');
            }
        } catch (err) {
            console.error('❌ OTP Verify Error:', err);
            console.error('❌ Error code:', err.code);
            console.error('❌ Error message:', err.message);

            if (err.code === 'auth/invalid-verification-code') {
                setError('Invalid OTP. Please check the 6-digit code sent to your phone.');
            } else if (err.code === 'auth/code-expired') {
                setError('OTP expired. Please request a new OTP.');
                setStep('PHONE');
            } else {
                setError(err.message || 'Verification failed. Please try again.');
            }
            setLoading(false);
        }
    };


    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl border border-gray-100 p-6 md:p-8 relative animate-in fade-in zoom-in duration-200">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition"
                    aria-label="Close"
                >
                    <X size={20} className="text-gray-600" />
                </button>

                {/* Header */}
                <div className="text-center mb-6">
                    <div className="inline-flex items-center justify-center w-14 h-14 md:w-16 md:h-16 rounded-full bg-indigo-100 text-indigo-600 mb-4 shadow-sm">
                        <ShieldCheck size={28} className="md:w-8 md:h-8" />
                    </div>
                    <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                        {step === 'PHONE' ? 'Welcome Back' : 'Verify OTP'}
                    </h2>
                    <p className="text-sm md:text-base text-gray-600">
                        {step === 'PHONE'
                            ? 'Enter your phone number to continue'
                            : `Enter the code sent to ${countryCode} ${phoneNumber}`
                        }
                    </p>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm mb-6 flex items-center justify-center border border-red-200">
                        {error}
                    </div>
                )}

                {/* Recaptcha Container */}
                <div id="recaptcha-container-modal"></div>

                {/* Phone Step */}
                {step === 'PHONE' && (
                    <form onSubmit={handleSendOtp} className="space-y-5">
                        <div>
                            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">Phone Number</label>
                            <div className="flex gap-2">
                                {/* Country Code Selector */}
                                <select
                                    value={countryCode}
                                    onChange={(e) => setCountryCode(e.target.value)}
                                    className="w-24 px-3 py-3.5 rounded-xl border-2 border-gray-200 bg-gray-50 focus:bg-white focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all outline-none font-medium text-gray-800"
                                >
                                    <option value="+91">🇮🇳 +91</option>
                                    <option value="+1">🇺🇸 +1</option>
                                    <option value="+44">🇬🇧 +44</option>
                                    <option value="+86">🇨🇳 +86</option>
                                    <option value="+81">🇯🇵 +81</option>
                                </select>

                                {/* Phone Number Input */}
                                <div className="relative group flex-1">
                                    <Phone className="absolute left-4 top-3.5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
                                    <input
                                        type="tel"
                                        value={phoneNumber}
                                        onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                                        className="block w-full pl-12 pr-4 py-3.5 rounded-xl border-2 border-gray-200 bg-gray-50 focus:bg-white focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all outline-none font-medium text-gray-800 placeholder-gray-400 text-base"
                                        placeholder="9999999999"
                                        maxLength={10}
                                        required
                                    />
                                </div>
                            </div>
                            <p className="text-xs text-gray-500 mt-2 px-1">Enter 10-digit mobile number</p>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex justify-center items-center py-3.5 px-6 border border-transparent rounded-xl shadow-lg shadow-indigo-200 text-base font-bold text-white bg-indigo-600 hover:bg-indigo-700 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? <Loader2 className="animate-spin" size={20} /> : (
                                <>
                                    Get OTP <ArrowRight size={18} className="ml-2" />
                                </>
                            )}
                        </button>
                    </form>
                )}

                {/* OTP Step */}
                {step === 'OTP' && (
                    <form onSubmit={handleVerifyOtp} className="space-y-5">
                        <div>
                            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">One-Time Password</label>
                            <div className="relative group">
                                <CheckCircle className="absolute left-4 top-3.5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
                                <input
                                    type="text"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                    className="block w-full pl-12 pr-4 py-3.5 rounded-xl border-2 border-gray-200 bg-gray-50 focus:bg-white focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all outline-none font-medium text-gray-800 placeholder-gray-400 tracking-widest text-lg"
                                    placeholder="123456"
                                    maxLength={6}
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex justify-center items-center py-3.5 px-6 border border-transparent rounded-xl shadow-lg shadow-indigo-200 text-base font-bold text-white bg-indigo-600 hover:bg-indigo-700 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? <Loader2 className="animate-spin" size={20} /> : 'Verify & Continue'}
                        </button>

                        <button
                            type="button"
                            onClick={() => setStep('PHONE')}
                            className="w-full text-center text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors"
                        >
                            Change Phone Number
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
