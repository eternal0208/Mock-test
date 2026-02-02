'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { API_BASE_URL } from '@/lib/config';
import { Clock, BookOpen, BarChart, User, Mail, Calendar } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

import AnalyticsDashboard from './AnalyticsDashboard';

export default function StudentDashboard() {
    const { user } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname();

    // URL Derived Filters
    const filterCategory = searchParams.get('category') || 'All';
    const filterAccess = searchParams.get('access') || 'all';
    const filterFormat = searchParams.get('format') || 'all';

    // Navigation Helper
    const updateFilter = (key, value) => {
        const current = new URLSearchParams(Array.from(searchParams.entries()));
        if (!value || value === 'All' || value === 'all') {
            current.delete(key);
        } else {
            current.set(key, value);
        }
        const search = current.toString();
        const query = search ? `?${search}` : "";
        router.push(`${pathname}${query}`, { scroll: false });
    };

    const setFilterCategory = (val) => updateFilter('category', val);
    const setFilterAccess = (val) => updateFilter('access', val);
    const setFilterFormat = (val) => updateFilter('format', val);

    const [tests, setTests] = useState([]);
    const [series, setSeries] = useState([]); // New Series State
    const [results, setResults] = useState([]);
    const [testRanks, setTestRanks] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch Tests
                const testsRes = await fetch(`${API_BASE_URL}/api/tests`);
                const testsData = await testsRes.json();
                setTests(testsData);

                // Fetch Series
                const seriesRes = await fetch(`${API_BASE_URL}/api/tests/series`);
                const seriesData = await seriesRes.json();
                setSeries(seriesData);

                // Fetch Results
                if (user) {
                    const resultsRes = await fetch(`${API_BASE_URL}/api/results/student/${user._id || user.uid}`);
                    const resultsData = await resultsRes.json();
                    setResults(resultsData);

                    // Fetch Rank for each result
                    const ranks = {};
                    await Promise.all(resultsData.map(async (res) => {
                        try {
                            const anaRes = await fetch(`${API_BASE_URL}/api/tests/${res.testId}/analytics`);
                            const anaData = await anaRes.json();
                            const myRankEntry = anaData.rankList.find(r => r.userId === (user._id || user.uid));
                            if (myRankEntry) {
                                ranks[res.testId] = { rank: myRankEntry.rank, total: anaData.totalAttempts };
                            }
                        } catch (e) { console.error("Rank fetch failed", e); }
                    }));
                    setTestRanks(ranks);
                }
            } catch (error) {
                console.error("Failed to fetch data", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [user]);

    // Set default filter based on user preference
    useEffect(() => {
        if (user && user.targetExam && !searchParams.get('category')) {
            setFilterCategory(user.targetExam);
        }
    }, [user]);

    if (loading) return <div>Loading dashboard...</div>;

    // Unified Payment Handler
    const processDemoPayment = async (item, type = 'series') => {
        const price = item.price || 0; // Default to 0 if undefined, but explicit price is better
        const isFree = price === 0;

        // Confirmation Message
        const confirmMsg = isFree
            ? `Enroll in ${item.title} for FREE?`
            : `Purchase ${item.title} for ₹${price}?`;

        if (!confirm(confirmMsg)) return;

        // If Free, we can structure this differently or just pass amount 0 and handle in backend?
        // Razorpay doesn't support 0 amount orders usually.
        // For simulation, let's just bypass order creation if free.

        try {
            let orderId = 'free_order_' + Date.now();

            if (!isFree) {
                // 1. Create Order (Only if not free)
                const orderRes = await fetch('http://localhost:5001/api/payments/create-order', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        amount: price,
                        currency: 'INR',
                        seriesId: item._id || item.id,
                        userId: user._id || user.uid
                    })
                });
                const orderData = await orderRes.json();
                if (orderData.error) { alert('Order creation failed: ' + orderData.error); return; }
                orderId = orderData.id;

                // 2. Simulate Payment Delay
                const processingMsg = document.createElement('div');
                processingMsg.className = 'fixed inset-0 bg-black/70 z-[100] flex items-center justify-center text-white text-xl font-bold';
                processingMsg.innerText = 'Processing Secure Payment...';
                document.body.appendChild(processingMsg);
                await new Promise(r => setTimeout(r, 1500));
                document.body.removeChild(processingMsg);
            }

            // 3. Verify / Grant Access
            // We reuse verify-payment endpoint even for free, or we call a new 'enroll' endpoint.
            // For now, allow verify-payment to accept DEMO signature which we treat as administrative bypass.
            // If free, we just call verify with a Free Signature? Or reuse Demo.

            const verifyRes = await fetch('http://localhost:5001/api/payments/verify-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    razorpay_order_id: orderId,
                    razorpay_payment_id: isFree ? 'free_enroll_' + Date.now() : 'pay_demo_' + Date.now(),
                    razorpay_signature: 'DEMO_SUCCESS_SIGNATURE',
                    userId: user._id || user.uid,
                    seriesId: item._id || item.id
                })
            });

            const verifyData = await verifyRes.json();

            if (verifyData.success) {
                alert(isFree ? "Enrolled Successfully!" : "Payment Successful! Access Granted.");
                window.location.reload();
            } else {
                alert("Enrollment Failed");
            }
        } catch (error) {
            console.error("Payment Error", error);
            alert("Process Failed: " + error.message);
            if (document.querySelector('.fixed.inset-0')) document.body.removeChild(document.querySelector('.fixed.inset-0'));
        }
    };


    const handleStartTest = async (testId) => {
        // Optional: Trigger a fresh fetch of user permissions before redirecting
        // For now, simpler is better: direct navigation
        window.location.href = `/exam/${testId}`;
    };

    const handleBuySeries = (s) => processDemoPayment(s, 'series');
    const handleBuy = (test) => processDemoPayment(test, 'test');

    const getTestStatus = (test) => {
        // 1. Check if Paid and Not Purchased
        const isPaid = test.accessType === 'paid';
        const isPurchased = user?.purchasedTests?.includes(test._id);

        // 2. Check Attempt Limits
        const attemptsMade = results.filter(r => r.testId === test._id || r.testDetails?._id === test._id).length;
        const limit = test.maxAttempts;
        const attemptsLeft = limit ? limit - attemptsMade : Infinity;

        if (isPaid && !isPurchased) {
            return { status: 'locked', message: 'Buy Now', enabled: true, action: 'buy' };
        }

        if (limit && attemptsLeft <= 0) {
            return { status: 'completed', message: 'Max Attempts Reached', enabled: false, attemptsInfo: `${attemptsMade}/${limit}` };
        }

        if (!test.startTime || !test.endTime) return {
            status: 'available',
            message: limit ? `Attempt (${attemptsLeft} left)` : 'Attempt Now',
            enabled: true,
            action: 'attempt',
            attemptsInfo: limit ? `${attemptsMade}/${limit} Used` : 'Unlimited'
        };

        const now = new Date();
        const start = new Date(test.startTime);
        const end = new Date(test.endTime);
        if (now < start) return { status: 'upcoming', message: `Starts: ${start.toLocaleString()}`, enabled: false };
        else if (now > end) return { status: 'ended', message: 'Test Ended', enabled: false };
        else return { status: 'live', message: 'Attempt Live', enabled: true, action: 'attempt' };
    };

    return (
        <div className="space-y-8">
            {/* Analytics Section */}
            <div>
                <h2 className="text-2xl font-bold mb-6">Your Performance</h2>
                {/* Result Cards with Rank */}
                {results.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                        {results.slice(0, 3).map((res, idx) => {
                            const rankInfo = testRanks[res.testId];
                            return (
                                <div key={idx} className="bg-white p-4 rounded shadow border-l-4 border-green-500">
                                    <h4 className="font-bold text-gray-800 truncate">{res.testId.title || 'Test Result'}</h4>
                                    <div className="flex justify-between items-end mt-2">
                                        <div>
                                            <div className="text-2xl font-bold text-green-700">{res.score} <span className="text-sm text-gray-400">/ {res.testId.total_marks}</span></div>
                                            <div className="text-xs text-gray-500">Score</div>
                                        </div>
                                        {rankInfo && (
                                            <div className="text-right">
                                                <div className="text-xl font-bold text-blue-600">#{rankInfo.rank} <span className="text-xs text-gray-400">/ {rankInfo.total}</span></div>
                                                <div className="text-xs text-gray-500">Rank</div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
                <AnalyticsDashboard results={results} />
            </div>

            {/* Test Series Packages */}
            {series.length > 0 && (
                <div>
                    <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-600">Premium Test Series</span>
                        <span className="text-sm font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded">Bundles</span>
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {series.map(s => (
                            <div key={s.id} className="bg-white rounded-xl shadow-lg border border-purple-100 overflow-hidden hover:scale-[1.02] transition-transform duration-300">
                                <div className="h-32 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-6 flex items-center justify-center text-white text-center">
                                    <h3 className="text-xl font-bold">{s.title}</h3>
                                </div>
                                <div className="p-6">
                                    <div className="flex justify-between items-center mb-4">
                                        <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-bold uppercase tracking-wide">{s.category}</span>
                                        <span className={`text-2xl font-bold ${s.price > 0 ? 'text-gray-900' : 'text-green-600'}`}>
                                            {s.price > 0 ? `₹${s.price}` : 'FREE'}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-500 mb-6 line-clamp-2">{s.description}</p>

                                    <ul className="space-y-2 mb-6">
                                        {(s.testIds?.length > 0) && <li className="flex items-center text-sm text-gray-700"><BookOpen size={16} className="mr-2 text-green-500" /> {s.testIds.length} Premium Tests</li>}
                                        {s.features?.slice(0, 2).map((f, i) => (
                                            <li key={i} className="flex items-center text-sm text-gray-700"><span className="mr-2 text-green-500">✓</span> {f}</li>
                                        ))}
                                    </ul>

                                    <button
                                        onClick={() => handleBuySeries(s)}
                                        className={`w-full py-3 rounded-lg font-bold text-white transition shadow-lg ${s.price > 0 ? 'bg-gray-900 hover:bg-gray-800' : 'bg-green-600 hover:bg-green-700'}`}
                                    >
                                        {s.price > 0 ? 'Unlock Series' : 'Join for Free'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Profile Section */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="bg-blue-600 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center"><User className="mr-2 text-white" /> <h2 className="text-xl font-bold text-white">Student Profile</h2></div>
                    <button
                        onClick={() => window.location.href = '/login'} // Ideally use signOut from auth context
                        className="bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded text-sm font-bold transition flex items-center gap-1"
                    >
                        <User size={14} /> Logout
                    </button>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 text-gray-700">
                    <div className="flex items-center"><User className="text-blue-600 mr-3" /> <div><p className="text-sm text-gray-500">Name</p><p className="font-bold">{user?.name}</p></div></div>
                    <div className="flex items-center"><Mail className="text-blue-600 mr-3" /> <div><p className="text-sm text-gray-500">Email</p><p className="font-bold">{user?.email}</p></div></div>
                    <div className="flex items-center"><User className="text-blue-600 mr-3" /> <div><p className="text-sm text-gray-500">Role</p><p className="font-bold capitalize">{user?.role}</p></div></div>
                </div>
            </div>

            {/* Test Series with Filters */}
            <div>
                <h2 className="text-2xl font-bold mb-6">Available Tests Series</h2>

                {/* Filter Controls */}
                <div className="bg-white p-4 rounded-lg shadow mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
                        {['All', 'JEE Main', 'JEE Advanced', 'NEET', 'CAT', 'Board Exam'].map(cat => (
                            <button
                                key={cat}
                                onClick={() => setFilterCategory(cat)}
                                className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition ${filterCategory === cat ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>

                    <div className="flex gap-2">
                        <select
                            value={filterAccess}
                            onChange={(e) => setFilterAccess(e.target.value)}
                            className="px-3 py-2 rounded-lg border border-gray-300 text-sm font-medium bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            <option value="all">Free & Paid</option>
                            <option value="free">Free Only</option>
                            <option value="paid">Paid Only</option>
                        </select>
                        <select
                            value={filterFormat}
                            onChange={(e) => setFilterFormat(e.target.value)}
                            className="px-3 py-2 rounded-lg border border-gray-300 text-sm font-medium bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            <option value="all">All Formats</option>
                            <option value="full-mock">Full Mock</option>
                            <option value="chapter-wise">Chapter Wise</option>
                        </select>
                    </div>
                </div>

                {/* Filtered Results */}
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {tests.filter(test => {
                        const matchCat = filterCategory === 'All' || test.category === filterCategory;
                        const matchAccess = filterAccess === 'all' || (test.accessType || 'free') === filterAccess;
                        const matchFormat = filterFormat === 'all' || (test.format || 'full-mock') === filterFormat;
                        return matchCat && matchAccess && matchFormat;
                    }).map(test => {
                        const { status, message, enabled } = getTestStatus(test);
                        return (
                            <div key={test._id} className="bg-white rounded-lg shadow hover:shadow-lg transition p-6 relative flex flex-col border border-gray-100">
                                {/* Badges */}
                                <div className="absolute top-4 right-4 flex flex-col items-end gap-1">
                                    {status === 'live' && <span className="bg-red-600 text-white text-[10px] px-2 py-1 rounded font-bold animate-pulse uppercase">LIVE</span>}
                                    {status === 'upcoming' && <span className="bg-yellow-500 text-white text-[10px] px-2 py-1 rounded font-bold uppercase">UPCOMING</span>}
                                    {(test.accessType === 'paid') && <span className="bg-purple-100 text-purple-700 text-[10px] px-2 py-1 rounded font-bold uppercase border border-purple-200">PREMIUM</span>}
                                    {(test.format === 'chapter-wise') && <span className="bg-teal-100 text-teal-700 text-[10px] px-2 py-1 rounded font-bold uppercase border border-teal-200">CHAPTER</span>}
                                    {getTestStatus(test).attemptsInfo && <span className="bg-gray-100 text-gray-600 text-[10px] px-2 py-1 rounded font-bold uppercase border border-gray-200">Attempts: {getTestStatus(test).attemptsInfo}</span>}
                                </div>

                                <span className="text-xs font-bold text-blue-600 mb-1 uppercase tracking-wider">{test.category}</span>
                                <h3 className="text-lg font-bold text-gray-900 mb-3 leading-tight">{test.title}</h3>

                                {test.chapters && test.chapters.length > 0 && (
                                    <p className="text-xs text-gray-500 mb-4 line-clamp-2 italic">
                                        Covering: {test.chapters.join(', ')}
                                    </p>
                                )}

                                <div className="space-y-2 text-sm text-gray-600 mb-6 flex-1 border-t border-gray-100 pt-3">
                                    <div className="flex items-center justify-between"><div className="flex items-center"><BookOpen size={14} className="mr-2 text-gray-400" /> {test.subject}</div> <span className="font-medium text-gray-800">{test.difficulty}</span></div>
                                    <div className="flex items-center justify-between"><div className="flex items-center"><Clock size={14} className="mr-2 text-gray-400" /> Duration</div> <span className="font-medium text-gray-800">{test.duration_minutes}m</span></div>
                                    <div className="flex items-center justify-between"><div className="flex items-center"><BarChart size={14} className="mr-2 text-gray-400" /> Marks</div> <span className="font-medium text-gray-800">{test.total_marks}</span></div>
                                </div>

                                {enabled ? (
                                    status === 'locked' ? (
                                        <button
                                            onClick={() => handleBuy(test)}
                                            className="block w-full text-center py-2.5 rounded-lg font-bold transition transform hover:-translate-y-0.5 bg-yellow-500 text-white hover:bg-yellow-600 shadow-lg shadow-yellow-200"
                                        >
                                            {message}
                                        </button>
                                    ) : (
                                        <Link href={`/exam/${test._id}`} className={`block w-full text-center py-2.5 rounded-lg font-bold transition transform hover:-translate-y-0.5 ${status === 'live' ? 'bg-red-600 text-white hover:bg-red-700 shadow-red-200' : 'bg-slate-900 text-white hover:bg-slate-800 shadow-lg shadow-slate-200'}`}>{message}</Link>
                                    )
                                ) : (
                                    <button disabled className="block w-full text-center bg-gray-100 text-gray-400 py-2.5 rounded-lg cursor-not-allowed font-bold">{message}</button>
                                )}
                            </div>
                        );
                    })}
                </div>
                {tests.filter(test => (filterCategory === 'All' || test.category === filterCategory)).length === 0 && (
                    <div className="text-center py-12 text-gray-400">
                        <p className="text-lg">No tests available in this category yet.</p>
                        <button onClick={() => setFilterCategory('All')} className="text-blue-600 font-bold hover:underline mt-2">View All Tests</button>
                    </div>
                )}
            </div>
        </div>
    );
}
