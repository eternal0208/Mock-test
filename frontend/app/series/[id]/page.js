'use client';

import { useState, useEffect } from 'react';

import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { API_BASE_URL } from '@/lib/config';
import { ArrowLeft, BookOpen, Clock, BarChart, Lock, Unlock, PlayCircle } from 'lucide-react';
import dynamic from 'next/dynamic';

export default function SeriesDetails() {
    // Unwrap params using React.use() if needed in future Next.js versions, but currently props params work in client components via async or hooks.
    // However, in Next 13/14+ Client components, params is passed as prop.
    const { id } = useParams();
    const { user } = useAuth();
    const router = useRouter();

    const [series, setSeries] = useState(null);
    const [tests, setTests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isEnrolled, setIsEnrolled] = useState(false); // Simplistic for now (demo)

    useEffect(() => {
        const fetchSeriesDetails = async () => {
            if (!user) return;
            try {
                const token = await user.getIdToken();
                const headers = { 'Authorization': `Bearer ${token}` };

                // 1. Fetch Series Meta
                // We need an endpoint for single series. Assuming GET /api/tests/series/:id or we filter front.
                // Since user previous dashboard fetched all series from /api/tests/series, we can reuse or simpler:
                // Let's assume we need to fetch specifically.
                // Wait, do we have GET /api/tests/series/:id? 
                // Currently testController has getAllSeries. I need to check if getSeriesById exists.
                // If not, I will add it or fetch all and find. 
                // Fetching all is wasteful but safe fallback.

                const seriesRes = await fetch(`${API_BASE_URL}/api/tests/series`, { headers });
                const seriesList = await seriesRes.json();
                const foundSeries = seriesList.find(s => s.id === id || s._id === id);

                if (foundSeries) {
                    setSeries(foundSeries);

                    // 2. Fetch Tests for this series
                    // The series object contains `testIds` array.
                    // We need to fetch details for these tests.
                    // We can reuse GET /api/tests and filter, or use a specific endpoint?
                    // Let's use GET /api/tests and filter by ID match.
                    const allTestsRes = await fetch(`${API_BASE_URL}/api/tests`, { headers });
                    const allTests = await allTestsRes.json();

                    const seriesTests = allTests.filter(t => (foundSeries.testIds || []).includes(t._id));
                    setTests(seriesTests);

                    // Check enrollment (Demo Logic: Free always enrolled, Paid needs check)
                    if (foundSeries.price === 0) setIsEnrolled(true);
                    // For paid, we'd check userInfo.purchasedSeries. 
                } else {
                    alert("Series not found");
                    router.push('/dashboard');
                }

            } catch (err) {
                console.error("Failed to load series", err);
            } finally {
                setLoading(false);
            }
        };
        fetchSeriesDetails();
    }, [id, user, router]);

    const handleUnlock = () => {
        if (!series) return;
        const confirmUnlock = confirm(series.price > 0 ? `Purchase for ₹${series.price}?` : "Enroll for FREE?");
        if (confirmUnlock) {
            alert("Enrolled Successfully! (Demo)");
            setIsEnrolled(true);
            window.location.reload();
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center font-bold text-gray-500">Loading Series Content...</div>;
    if (!series) return null;

    return (
        <div className="min-h-screen bg-gray-50 p-6 md:p-12">
            <button onClick={() => router.push('/dashboard')} className="flex items-center text-gray-500 mb-6 hover:text-indigo-600 font-bold transition-all group">
                <ArrowLeft size={20} className="mr-2 group-hover:-translate-x-1 transition-transform" /> Back
            </button>

            {/* Header */}
            <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6 md:p-10 mb-8 relative overflow-hidden group">
                {/* Decorative Background Blobs */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full translate-x-1/3 -translate-y-1/3 blur-3xl group-hover:scale-110 transition-transform duration-1000"></div>
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-50 rounded-full -translate-x-1/4 translate-y-1/4 blur-2xl opacity-60"></div>

                <div className="relative z-10">
                    <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                        <div className="flex-1">
                            <span className="bg-indigo-600 text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest mb-4 inline-block shadow-lg shadow-indigo-100 italic">
                                {series.category} Series
                            </span>
                            <h1 className="text-3xl md:text-5xl font-black text-gray-900 mb-3 leading-tight tracking-tighter">
                                {series.title}
                            </h1>
                            <p className="text-gray-500 max-w-2xl text-sm md:text-base font-medium leading-relaxed">
                                {series.description || 'Comprehensive test series designed to boost your preparation.'}
                            </p>
                        </div>

                        <div className="w-full md:w-auto bg-gray-50 md:bg-white p-4 md:p-0 rounded-2xl md:rounded-none border md:border-none border-gray-100 shadow-sm md:shadow-none flex flex-row md:flex-col justify-between items-center md:items-end gap-2">
                            <div className="flex flex-col md:items-end">
                                <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest leading-none mb-1">Price</span>
                                <div className="text-3xl font-black text-gray-900 tracking-tighter">
                                    {series.price > 0 ? `₹${series.price}` : 'FREE'}
                                </div>
                            </div>

                            {!isEnrolled && (
                                <button
                                    onClick={handleUnlock}
                                    className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center gap-2 active:scale-95 text-sm"
                                >
                                    <Lock size={16} /> Unlock
                                </button>
                            )}
                            {isEnrolled && (
                                <div className="bg-emerald-50 text-emerald-600 px-6 py-2 rounded-xl font-black flex items-center gap-2 border border-emerald-100 text-sm italic">
                                    <Unlock size={16} /> Active
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Test List */}
            <div className="max-w-4xl mx-auto">
                <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                    <BookOpen className="text-indigo-600" />
                    Series Content ({tests.length} Tests)
                </h2>

                <div className="space-y-4">
                    {tests.map((test, idx) => (
                        <div key={test._id} className={`bg-white p-5 rounded-xl border transition-all ${isEnrolled ? 'hover:shadow-md border-gray-200' : 'opacity-75 border-gray-100'}`}>
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-4">
                                    <div className="h-12 w-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 font-black border border-indigo-100 shadow-sm group-hover:scale-110 group-hover:rotate-3 transition-transform">
                                        {idx + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-black text-gray-900 text-lg group-hover:text-indigo-600 transition-colors truncate">
                                            {test.title}
                                        </h3>
                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] md:text-xs text-gray-400 mt-1 font-bold uppercase tracking-wider">
                                            <span className="flex items-center"><Clock size={12} className="mr-1 text-indigo-400" /> {test.duration_minutes}m</span>
                                            <span className="flex items-center"><BarChart size={12} className="mr-1 text-indigo-400" /> {test.total_marks}pts</span>
                                            <span className="text-indigo-300 font-serif italic lowercase">{test.subject}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="ml-4">
                                    {isEnrolled ? (
                                        <button
                                            onClick={() => router.push(`/exam/${test._id}`)}
                                            className="flex items-center justify-center h-10 w-10 md:w-auto md:px-5 md:py-2 bg-indigo-600 text-white rounded-xl font-black shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-90"
                                            title="Start Test"
                                        >
                                            <PlayCircle size={20} className="md:mr-2" />
                                            <span className="hidden md:inline">Start</span>
                                        </button>
                                    ) : (
                                        <div className="h-10 w-10 flex items-center justify-center bg-gray-50 rounded-xl border border-gray-100 text-gray-300">
                                            <Lock size={18} />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                    {tests.length === 0 && (
                        <div className="text-center py-10 bg-white rounded-xl border border-dashed text-gray-400">
                            No tests added to this series yet.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
