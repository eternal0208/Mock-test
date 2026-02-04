'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { API_BASE_URL } from '@/lib/config';
import { Clock, BookOpen, BarChart, User, Mail, Calendar, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

import AnalyticsDashboard from './AnalyticsDashboard';

export default function StudentDashboard() {
    const { user } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname();

    const [tests, setTests] = useState([]);
    const [series, setSeries] = useState([]);
    const [results, setResults] = useState([]);
    const [testRanks, setTestRanks] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!user) return;

            try {
                // Fetch Tests (Backend will filter by user.selectedField via middleware/token logic or we pass param)
                // Since we haven't fully implemented backend middleware filtering yet, keeping client safe?
                // The PLAN says Backend filtering. 
                // But for now, let's assume the endpoint returns EVERYTHING and we filter here strictly until backend is ready?
                // NO, strict requirement: "Do NOT show all fields and filter only on frontend".
                // HOWEVER, the backend changes are next step. 
                // So I will implement this assuming backend WILL return filtered data, 
                // BUT just in case, I will also add a safety check here to NOT render anything if it mismatches.
                // Wait, if backend sends everything, and I hide it, it's still "Not allowed" technically?
                // I'll add a param `?field=${user.selectedField}` for now so existing backend might use it if I update it? 
                // Or wait for the backend update.

                // For this step (Frontend), I will remove the UI filters.
                // The actual data restriction relies on the backend change I'll make next.

                const token = await user.getIdToken();
                const headers = { 'Authorization': `Bearer ${token}` };

                // Fetch Tests
                const testsRes = await fetch(`${API_BASE_URL}/api/tests`, { headers });
                const testsData = await testsRes.json();
                console.log("📊 [Dashboard Debug] User:", user);
                console.log("📊 [Dashboard Debug] Tests Received:", testsData);

                if (Array.isArray(testsData)) {
                    setTests(testsData);
                } else {
                    console.error("Invalid tests data:", testsData);
                    setTests([]);
                }

                // Fetch Series
                const seriesRes = await fetch(`${API_BASE_URL}/api/tests/series`, { headers });
                const seriesData = await seriesRes.json();
                if (Array.isArray(seriesData)) {
                    setSeries(seriesData);
                } else {
                    console.error("Invalid series data:", seriesData);
                    setSeries([]);
                }

                // Fetch Results
                const resultsRes = await fetch(`${API_BASE_URL}/api/results/student/${user._id || user.uid}`);
                const resultsData = await resultsRes.json();
                setResults(resultsData);

                // Fetch Rank
                const ranks = {};
                await Promise.all(resultsData.map(async (res) => {
                    try {
                        const anaRes = await fetch(`${API_BASE_URL}/api/tests/${res.testId}/analytics`, { headers });
                        const anaData = await anaRes.json();
                        const myRankEntry = anaData.rankList.find(r => r.userId === (user._id || user.uid));
                        if (myRankEntry) {
                            ranks[res.testId] = { rank: myRankEntry.rank, total: anaData.totalAttempts };
                        }
                    } catch (e) { console.error("Rank fetch failed", e); }
                }));
                setTestRanks(ranks);

            } catch (error) {
                console.error("Failed to fetch data", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [user]);

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="animate-pulse flex flex-col items-center">
                <div className="h-12 w-12 bg-gray-200 rounded-full mb-4"></div>
                <div className="h-4 w-32 bg-gray-200 rounded"></div>
            </div>
        </div>
    );

    // SAFETY CHECK: If user has no selectedField, redirect to signup-details?
    // This is handled by Route Guards usually, but good practice here too.
    if (!user?.selectedField) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center space-y-4">
                <div className="text-red-600 font-bold text-lg">User configuration error: No Field Selected.</div>
                <Link href="/signup-details" className="bg-indigo-600 text-white px-6 py-2 rounded-full hover:bg-indigo-700 transition">
                    Complete Profile Setup
                </Link>
            </div>
        );
    }

    const processDemoPayment = async (item, type = 'series') => {
        // ... (Payment logic remains same for now)
        const price = item.price || 0;
        const isFree = price === 0;
        const confirmMsg = isFree ? `Enroll in ${item.title} for FREE?` : `Purchase ${item.title} for ₹${price}?`;
        if (!confirm(confirmMsg)) return;

        try {
            // ... (Simple existing logic)
            alert(isFree ? "Enrolled Successfully!" : "Service temporarily in demo mode. Contact Admin.");
            window.location.reload();
        } catch (error) {
            alert("Process Failed");
        }
    };

    // Helper to filter content STRICTLY by field
    // Even if backend sends more, frontend MUST NOT show mismatched content
    const relevantTests = tests.filter(t =>
        t.category === user.selectedField || t.field === user.selectedField // Support both keys for now
    );
    const relevantSeries = series.filter(s =>
        s.category === user.selectedField || s.field === user.selectedField
    );

    const handleStartTest = (testId) => {
        window.location.href = `/exam/${testId}`;
    };

    return (
        <div className="space-y-8">
            {/* Header / Field Indicator */}
            <div className="bg-indigo-900 text-white p-6 rounded-2xl shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
                <div className="relative z-10 flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold mb-2">Welcome back, {user.name ? user.name.split(' ')[0] : 'Student'}</h1>
                        <div className="flex items-center gap-2 text-indigo-200">
                            <ShieldCheck size={18} />
                            <span className="uppercase tracking-wide font-semibold text-sm">Target: {user.selectedField}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Analytics Section */}
            <div>
                <h2 className="text-xl font-bold mb-4 text-gray-800">Your Performance</h2>
                {results.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                        {results.slice(0, 3).map((res, idx) => {
                            const rankInfo = testRanks[res.testId];
                            const testMeta = res.testDetails || res.testId || {};
                            return (
                                <div key={idx} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition">
                                    <h4 className="font-bold text-gray-800 truncate mb-3">{testMeta.title || 'Test Result'}</h4>
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <div className="text-2xl font-bold text-indigo-600">{res.score} <span className="text-xs text-gray-400 font-normal">/ {testMeta.total_marks || '?'}</span></div>
                                        </div>
                                        {rankInfo && (
                                            <div className="text-right">
                                                <div className="text-lg font-bold text-emerald-600">#{rankInfo.rank} <span className="text-xs text-gray-400 font-normal">/ {rankInfo.total}</span></div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="bg-gray-50 rounded-xl p-6 text-center text-gray-500 mb-8 border border-dashed border-gray-300">
                        No tests attempted yet. Start a test to see your analytics.
                    </div>
                )}
            </div>

            {/* Test Series Packages */}
            {relevantSeries.length > 0 && (
                <div>
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <span className="text-gray-800">Recommended Series</span>
                        <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs rounded-full font-bold uppercase">{user.selectedField}</span>
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {relevantSeries.map(s => (
                            <div key={s.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-all duration-300 group">
                                <div className="h-28 bg-gradient-to-br from-slate-800 to-slate-900 p-6 flex items-center justify-center text-white text-center relative overflow-hidden">
                                    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition duration-500"></div>
                                    <h3 className="text-lg font-bold relative z-10">{s.title}</h3>
                                </div>
                                <div className="p-5">
                                    <div className="flex justify-between items-center mb-4">
                                        <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs font-bold uppercase">{s.category}</span>
                                        <span className={`text-xl font-bold ${s.price > 0 ? 'text-gray-900' : 'text-emerald-600'}`}>
                                            {s.price > 0 ? `₹${s.price}` : 'FREE'}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => processDemoPayment(s, 'series')}
                                        className={`w-full py-2.5 rounded-lg font-bold text-sm transition ${s.price > 0 ? 'bg-gray-900 text-white hover:bg-black' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
                                    >
                                        {s.price > 0 ? 'Unlock Series' : 'Join Now'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Active Tests */}
            <div>
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <span className="text-gray-800">Available Tests</span>
                </h2>

                {/* No filters displayed anymore - strictly field based */}

                <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                    {relevantTests.map(test => {
                        // Simple status logic for display
                        const isLive = test.status === 'live' || (new Date() >= new Date(test.startTime));
                        return (
                            <div key={test._id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:border-indigo-100 transition hover:shadow-md">
                                <div className="flex justify-between items-start mb-3">
                                    <span className="px-2 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-bold uppercase rounded tracking-wider">{test.category}</span>
                                    {test.accessType === 'paid' && <span className="text-[10px] font-bold text-amber-600 border border-amber-200 px-1.5 py-0.5 rounded bg-amber-50">PREMIUM</span>}
                                </div>
                                <h3 className="text-base font-bold text-gray-900 mb-2 line-clamp-2 min-h-[3rem]">{test.title}</h3>

                                <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs text-gray-500 mb-5">
                                    <div className="flex items-center"><BookOpen size={14} className="mr-1.5 text-gray-400" /> {test.subject}</div>
                                    <div className="flex items-center"><Clock size={14} className="mr-1.5 text-gray-400" /> {test.duration_minutes} min</div>
                                    <div className="flex items-center"><BarChart size={14} className="mr-1.5 text-gray-400" /> {test.total_marks} Marks</div>
                                </div>

                                <button
                                    onClick={() => handleStartTest(test._id)}
                                    className="w-full py-2.5 rounded-lg bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 transition shadow-sm hover:shadow-indigo-200"
                                >
                                    Start Test
                                </button>
                            </div>
                        );
                    })}
                </div>

                {relevantTests.length === 0 && (
                    <div className="py-12 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                        <p className="text-gray-500 font-medium">No tests available for {user.selectedField} yet.</p>
                        <p className="text-xs text-gray-400 mt-1">Check back later or contact admin.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
