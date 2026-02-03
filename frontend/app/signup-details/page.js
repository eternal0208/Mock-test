'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { API_BASE_URL } from '@/lib/config';
import { User, BookOpen, Heart, Loader2 } from 'lucide-react';

export default function SignupDetailsPage() {
    const [name, setName] = useState('');
    const [studentClass, setStudentClass] = useState('');
    const [interest, setInterest] = useState('');
    const [loading, setLoading] = useState(false);
    const [pageLoading, setPageLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            if (!user) {
                router.push('/login');
            } else {
                setPageLoading(false);
            }
        });
        return () => unsubscribe();
    }, [router]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        const user = auth.currentUser;
        if (!user) return;

        try {
            const res = await fetch(`${API_BASE_URL}/api/auth/sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    class: studentClass,
                    interest,
                    phoneNumber: user.phoneNumber,
                    firebaseUid: user.uid,
                    role: 'student'
                })
            });

            if (!res.ok) throw new Error('Failed to save details');

            // Force reload or just push to dashboard
            window.location.href = '/dashboard';
        } catch (error) {
            console.error("Signup Error:", error);
            alert("Failed to save details. Please try again.");
            setLoading(false);
        }
    };

    if (pageLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
                <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Complete Your Profile</h2>
                    <p className="text-gray-500 text-sm">Tell us a bit about yourself to get started.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">Full Name</label>
                        <div className="relative">
                            <User className="absolute left-3 top-3 text-gray-400" size={18} />
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="block w-full pl-10 pr-3 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                placeholder="John Doe"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">Class / Grade</label>
                        <div className="relative">
                            <BookOpen className="absolute left-3 top-3 text-gray-400" size={18} />
                            <input
                                type="text"
                                value={studentClass}
                                onChange={(e) => setStudentClass(e.target.value)}
                                className="block w-full pl-10 pr-3 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                placeholder="e.g. 11th, 12th"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">Interested Field / Exam</label>
                        <div className="relative">
                            <Heart className="absolute left-3 top-3 text-gray-400" size={18} />
                            <input
                                type="text"
                                value={interest}
                                onChange={(e) => setInterest(e.target.value)}
                                className="block w-full pl-10 pr-3 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                placeholder="e.g. JEE, NEET, Science"
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-lg shadow-indigo-200 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all transform hover:scale-[1.01]"
                    >
                        {loading ? <Loader2 className="animate-spin" size={20} /> : 'Save & Continue'}
                    </button>
                </form>
            </div>
        </div>
    );
}
