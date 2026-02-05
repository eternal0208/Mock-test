'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { API_BASE_URL } from '@/lib/config';
import { ArrowLeft, BookOpen, Clock, BarChart, Lock, Unlock, PlayCircle } from 'lucide-react';
import dynamic from 'next/dynamic';

export default function SeriesDetails({ params }) {
    // Unwrap params using React.use() if needed in future Next.js versions, but currently props params work in client components via async or hooks.
    // However, in Next 13/14+ Client components, params is passed as prop.
    const { id } = params;
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
            <button onClick={() => router.push('/dashboard')} className="flex items-center text-gray-600 mb-6 hover:text-indigo-600 font-bold transition">
                <ArrowLeft size={20} className="mr-2" /> Back to Dashboard
            </button>

            {/* Header */}
            <div className="bg-white rounded-2xl shadow-sm border p-8 mb-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full translate-x-1/3 -translate-y-1/3 blur-3xl"></div>
                <div className="relative z-10">
                    <div className="flex justify-between items-start">
                        <div>
                            <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide mb-3 inline-block">{series.category} Series</span>
                            <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-2">{series.title}</h1>
                            <p className="text-gray-500 max-w-2xl">{series.description || 'Comprehensive test series designed to boost your preparation.'}</p>
                        </div>
                        <div className="text-right">
                            <div className="text-3xl font-bold text-gray-900">{series.price > 0 ? `₹${series.price}` : 'FREE'}</div>
                            {!isEnrolled && (
                                <button onClick={handleUnlock} className="mt-4 bg-gray-900 text-white px-6 py-2 rounded-lg font-bold shadow hover:bg-black transition flex items-center gap-2">
                                    <Lock size={16} /> Unlock Series
                                </button>
                            )}
                            {isEnrolled && (
                                <div className="mt-4 bg-green-100 text-green-800 px-6 py-2 rounded-lg font-bold flex items-center gap-2 justify-end">
                                    <Unlock size={16} /> Unlocked
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
                                    <div className="h-10 w-10 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 font-bold border border-indigo-100">
                                        {idx + 1}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900 text-lg">{test.title}</h3>
                                        <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                                            <span className="flex items-center"><Clock size={12} className="mr-1" /> {test.duration_minutes} mins</span>
                                            <span className="flex items-center"><BarChart size={12} className="mr-1" /> {test.total_marks} Marks</span>
                                            <span className="uppercase font-semibold text-gray-400">{test.subject}</span>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    {isEnrolled ? (
                                        <button
                                            onClick={() => router.push(`/exam/${test._id}`)}
                                            className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2 rounded-lg font-bold shadow-sm hover:bg-indigo-700 transition"
                                        >
                                            <PlayCircle size={18} /> Start
                                        </button>
                                    ) : (
                                        <Lock className="text-gray-300" size={24} />
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
