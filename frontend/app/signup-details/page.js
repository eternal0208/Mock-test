'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { API_BASE_URL } from '@/lib/config';
import { User, BookOpen, Heart, Phone, Loader2, CheckCircle } from 'lucide-react';

export default function SignupDetailsPage() {
    const [name, setName] = useState('');
    const [studentClass, setStudentClass] = useState('');
    const [interest, setInterest] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [loading, setLoading] = useState(false);
    const [pageLoading, setPageLoading] = useState(true);
    const [error, setError] = useState('');
    const router = useRouter();

    useEffect(() => {
        const checkUserState = async () => {
            const user = auth.currentUser;

            // Guard 1: User must be authenticated
            if (!user) {
                console.log('No user authenticated, redirecting to login');
                router.push('/login');
                return;
            }

            // Set phone number from Firebase Auth
            setPhoneNumber(user.phoneNumber || '');

            // Guard 2: Check if user already has a profile
            try {
                const userDoc = await getDoc(doc(db, 'users', user.uid));

                if (userDoc.exists()) {
                    console.log('User profile already exists, redirecting to dashboard');
                    router.push('/dashboard');
                    return;
                }

                // User is authenticated but has no profile - show signup form
                setPageLoading(false);
            } catch (err) {
                console.error('Error checking user profile:', err);
                setError('Failed to load user data. Please try again.');
                setPageLoading(false);
            }
        };

        // Listen to auth state changes
        const unsubscribe = auth.onAuthStateChanged(() => {
            checkUserState();
        });

        return () => unsubscribe();
    }, [router]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const user = auth.currentUser;
        if (!user) {
            setError('Session expired. Please log in again.');
            router.push('/login');
            return;
        }

        // Validate all fields
        if (!name.trim() || !studentClass.trim() || !interest.trim()) {
            setError('Please fill in all fields');
            setLoading(false);
            return;
        }

        try {
            const res = await fetch(`${API_BASE_URL}/api/auth/sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name.trim(),
                    class: studentClass.trim(),
                    interest: interest.trim(),
                    phoneNumber: user.phoneNumber,
                    firebaseUid: user.uid,
                    role: 'student'
                })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || 'Failed to save details');
            }

            // Success - redirect to dashboard
            console.log('✅ User profile created successfully');
            window.location.href = '/dashboard';
        } catch (error) {
            console.error('Signup Error:', error);
            setError(error.message || 'Failed to save details. Please try again.');
            setLoading(false);
        }
    };

    if (pageLoading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-blue-50">
                <Loader2 className="animate-spin text-indigo-600 mb-4" size={40} />
                <p className="text-gray-600 font-medium">Loading your profile...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-blue-50 p-4">
            <div className="max-w-md w-full bg-white p-6 md:p-8 rounded-2xl shadow-2xl border border-gray-100">
                <div className="text-center mb-6 md:mb-8">
                    <div className="inline-flex items-center justify-center w-14 h-14 md:w-16 md:h-16 rounded-full bg-indigo-100 text-indigo-600 mb-4 shadow-sm">
                        <User size={28} className="md:w-8 md:h-8" />
                    </div>
                    <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Complete Your Profile</h2>
                    <p className="text-sm md:text-base text-gray-600">Tell us a bit about yourself to get started</p>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm mb-6 flex items-center justify-center border border-red-200">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Phone Number (Read-only) */}
                    <div>
                        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">Phone Number</label>
                        <div className="relative">
                            <Phone className="absolute left-3 top-3 text-gray-400" size={18} />
                            <input
                                type="tel"
                                value={phoneNumber}
                                className="block w-full pl-10 pr-3 py-2.5 rounded-xl border-2 border-gray-200 bg-gray-50 text-gray-700 font-medium cursor-not-allowed"
                                disabled
                                readOnly
                            />
                        </div>
                        <p className="text-xs text-gray-500 mt-1 px-1">This is your verified phone number</p>
                    </div>

                    {/* Full Name */}
                    <div>
                        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">Full Name *</label>
                        <div className="relative">
                            <User className="absolute left-3 top-3 text-gray-400" size={18} />
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="block w-full pl-10 pr-3 py-2.5 rounded-xl border-2 border-gray-200 bg-gray-50 focus:bg-white focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none font-medium text-gray-800"
                                placeholder="John Doe"
                                required
                            />
                        </div>
                    </div>

                    {/* Class */}
                    <div>
                        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">Class / Grade *</label>
                        <div className="relative">
                            <BookOpen className="absolute left-3 top-3 text-gray-400" size={18} />
                            <input
                                type="text"
                                value={studentClass}
                                onChange={(e) => setStudentClass(e.target.value)}
                                className="block w-full pl-10 pr-3 py-2.5 rounded-xl border-2 border-gray-200 bg-gray-50 focus:bg-white focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none font-medium text-gray-800"
                                placeholder="e.g. 11th, 12th, Dropper"
                                required
                            />
                        </div>
                    </div>

                    {/* Interest */}
                    <div>
                        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">Interested Field / Exam *</label>
                        <div className="relative">
                            <Heart className="absolute left-3 top-3 text-gray-400" size={18} />
                            <input
                                type="text"
                                value={interest}
                                onChange={(e) => setInterest(e.target.value)}
                                className="block w-full pl-10 pr-3 py-2.5 rounded-xl border-2 border-gray-200 bg-gray-50 focus:bg-white focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none font-medium text-gray-800"
                                placeholder="e.g. JEE, NEET, CAT"
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex justify-center items-center py-3.5 md:py-4 px-6 border border-transparent rounded-xl shadow-lg shadow-indigo-200 text-base font-bold text-white bg-indigo-600 hover:bg-indigo-700 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <Loader2 className="animate-spin" size={20} />
                        ) : (
                            <>
                                Save & Continue <CheckCircle size={18} className="ml-2" />
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
