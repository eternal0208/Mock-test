'use client';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import StudentDashboard from '@/components/Dashboard/StudentDashboard';
import AdminDashboard from '@/components/Dashboard/AdminDashboard';

export default function Dashboard() {
    const { user, loading, logout } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.push('/');
        }
        // If user is authenticated but hasn't completed signup (missing required fields)
        if (!loading && user && (!user.name || !user.email || !user.class || !user.interest || !user.state || !user.city)) {
            console.log('User profile incomplete, redirecting to signup-details');
            router.push('/signup-details');
        }
    }, [user, loading, router]);

    if (loading) return <div className="p-8 text-center text-black">Loading...</div>;
    if (!user) return null;

    return (
        <div className="min-h-screen bg-gray-50">
            <nav className="bg-white shadow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center">
                            <span className="text-xl font-bold text-gray-900 cursor-pointer" onClick={() => router.push('/')}>Apex Mock</span>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-4">
                            <span className="hidden sm:inline text-gray-700 text-sm sm:text-base">Welcome, {user.name}</span>
                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 uppercase">
                                {user.role}
                            </span>
                            <button
                                onClick={logout}
                                className="bg-red-500 hover:bg-red-600 text-white px-3 py-2 sm:px-4 rounded text-xs sm:text-sm transition-colors"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto py-4 px-4 sm:py-6 sm:px-6 lg:px-8 text-black">
                {user.role === 'admin' ? <AdminDashboard /> : <StudentDashboard />}
            </main>
        </div>
    );
}
