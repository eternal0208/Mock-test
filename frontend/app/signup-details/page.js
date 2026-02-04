'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { API_BASE_URL } from '@/lib/config';
import { User, BookOpen, Heart, Phone, Loader2, CheckCircle, Mail, MapPin } from 'lucide-react';

export default function SignupDetailsPage() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [studentClass, setStudentClass] = useState('');
    const [interest, setInterest] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [state, setState] = useState('');
    const [city, setCity] = useState('');
    const [loading, setLoading] = useState(false);
    const [pageLoading, setPageLoading] = useState(true);
    const [error, setError] = useState('');
    const router = useRouter();

    useEffect(() => {
        const checkUserState = async () => {
            const user = auth.currentUser;

            // Guard 1: User must be authenticated
            if (!user) {
                console.log('No user authenticated, redirecting to home');
                router.push('/');
                return;
            }

            // Pre-fill email and name from Google account
            if (user.email) {
                setEmail(user.email);
            }
            if (user.displayName) {
                setName(user.displayName);
            }

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
            router.push('/');
            return;
        }

        // Validate all required fields
        if (!name.trim() || !email.trim() || !studentClass.trim() || !interest.trim() || !state || !city) {
            setError('Please fill in all required fields');
            setLoading(false);
            return;
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setError('Please enter a valid email address');
            setLoading(false);
            return;
        }

        try {
            const res = await fetch(`${API_BASE_URL}/api/auth/sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name.trim(),
                    email: email.trim().toLowerCase(),
                    class: studentClass.trim(),
                    interest: interest.trim(),
                    phone: phoneNumber.trim() || null,
                    state: state,
                    city: city,
                    firebaseUid: user.uid,
                    authProvider: 'google',
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

                    {/* Email */}
                    <div>
                        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">Email Address *</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-3 text-gray-400" size={18} />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="block w-full pl-10 pr-3 py-2.5 rounded-xl border-2 border-gray-200 bg-gray-50 focus:bg-white focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none font-medium text-gray-800"
                                placeholder="john@example.com"
                                required
                            />
                        </div>
                    </div>

                    {/* Class */}
                    <div>
                        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">Class / Grade *</label>
                        <div className="relative">
                            <BookOpen className="absolute left-3 top-3 text-gray-400" size={18} />
                            <select
                                value={studentClass}
                                onChange={(e) => setStudentClass(e.target.value)}
                                className="block w-full pl-10 pr-3 py-2.5 rounded-xl border-2 border-gray-200 bg-gray-50 focus:bg-white focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none font-medium text-gray-800 appearance-none cursor-pointer"
                                required
                            >
                                <option value="">Select Class</option>
                                <option value="8th">8th</option>
                                <option value="9th">9th</option>
                                <option value="10th">10th</option>
                                <option value="11th">11th</option>
                                <option value="12th">12th</option>
                                <option value="Dropper">Dropper</option>
                                <option value="College">College</option>
                                <option value="Graduate">Graduate</option>
                            </select>
                        </div>
                    </div>

                    {/* Interest */}
                    <div>
                        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">Interested Field / Exam *</label>
                        <div className="relative">
                            <Heart className="absolute left-3 top-3 text-gray-400" size={18} />
                            <select
                                value={interest}
                                onChange={(e) => setInterest(e.target.value)}
                                className="block w-full pl-10 pr-3 py-2.5 rounded-xl border-2 border-gray-200 bg-gray-50 focus:bg-white focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none font-medium text-gray-800 appearance-none cursor-pointer"
                                required
                            >
                                <option value="">Select Exam</option>
                                <option value="JEE Main">JEE Main</option>
                                <option value="JEE Advanced">JEE Advanced</option>
                                <option value="NEET">NEET</option>
                                <option value="CAT">CAT</option>
                                <option value="Board Exam">Board Exam</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                    </div>

                    {/* State */}
                    <div>
                        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">State *</label>
                        <div className="relative">
                            <MapPin className="absolute left-3 top-3 text-gray-400" size={18} />
                            <input
                                type="text"
                                value={state}
                                onChange={(e) => setState(e.target.value)}
                                className="block w-full pl-10 pr-3 py-2.5 rounded-xl border-2 border-gray-200 bg-gray-50 focus:bg-white focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none font-medium text-gray-800"
                                placeholder="e.g. Maharashtra, Delhi"
                                required
                            />
                        </div>
                    </div>

                    {/* City */}
                    <div>
                        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">City *</label>
                        <div className="relative">
                            <MapPin className="absolute left-3 top-3 text-gray-400" size={18} />
                            <input
                                type="text"
                                value={city}
                                onChange={(e) => setCity(e.target.value)}
                                className="block w-full pl-10 pr-3 py-2.5 rounded-xl border-2 border-gray-200 bg-gray-50 focus:bg-white focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none font-medium text-gray-800"
                                placeholder="e.g. Mumbai, Pune"
                                required
                            />
                        </div>
                    </div>

                    {/* Phone Number (Optional) */}
                    <div>
                        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">Phone Number <span className="text-gray-400">(Optional)</span></label>
                        <div className="relative">
                            <Phone className="absolute left-3 top-3 text-gray-400" size={18} />
                            <input
                                type="tel"
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                                className="block w-full pl-10 pr-3 py-2.5 rounded-xl border-2 border-gray-200 bg-gray-50 focus:bg-white focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none font-medium text-gray-800"
                                placeholder="9999999999"
                                maxLength={10}
                            />
                        </div>
                        <p className="text-xs text-gray-500 mt-1 px-1">10-digit mobile number</p>
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
