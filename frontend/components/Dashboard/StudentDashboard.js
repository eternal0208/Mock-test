'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Clock, BookOpen, BarChart, User, Mail, Calendar } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

import AnalyticsDashboard from './AnalyticsDashboard';

export default function StudentDashboard() {
    const { user } = useAuth();
    const [tests, setTests] = useState([]);
    const [results, setResults] = useState([]);
    const [testRanks, setTestRanks] = useState({}); // { testId: rank }
    const [loading, setLoading] = useState(true);

    // Filters
    const [filterCategory, setFilterCategory] = useState('All');
    const [filterAccess, setFilterAccess] = useState('all'); // 'all', 'free', 'paid'
    const [filterFormat, setFilterFormat] = useState('all'); // 'all', 'full-mock', 'chapter-wise'

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch Tests
                const testsRes = await fetch('http://localhost:5001/api/tests');
                const testsData = await testsRes.json();
                setTests(testsData);

                // Fetch Results
                if (user) {
                    const resultsRes = await fetch(`http://localhost:5001/api/results/student/${user._id || user.uid}`);
                    const resultsData = await resultsRes.json();
                    setResults(resultsData);

                    // Fetch Rank for each result (This could be optimized)
                    // For now, we fetch analytics for each test the student has taken to find their rank.
                    const ranks = {};
                    await Promise.all(resultsData.map(async (res) => {
                        try {
                            const anaRes = await fetch(`http://localhost:5001/api/tests/${res.testId}/analytics`);
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
        if (user && user.targetExam) {
            setFilterCategory(user.targetExam);
        }
    }, [user]);

    if (loading) return <div>Loading dashboard...</div>;

    const handleBuy = async (test) => {
        // Dummy Payment Flow for Demonstration
        if (!confirm(`Proceed to pay for ${test.title}?`)) return;

        try {
            // 1. Create Order
            const orderRes = await fetch('http://localhost:5001/api/payments/create-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: 499, // Basic price, ideally should come from test data
                    currency: 'INR',
                    seriesId: test._id, // Using seriesId as testId for now
                    userId: user._id || user.uid
                })
            });
            const orderData = await orderRes.json();

            if (orderData.error) {
                alert('Order creation failed: ' + orderData.error);
                return;
            }

            // 2. Simulate Payment Success (Since we don't have frontend Razorpay SDK loaded fully yet)
            // In production, this would open Razorpay Modal

            // Call verify payment directly for demo
            const verifyRes = await fetch('http://localhost:5001/api/payments/verify-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    razorpay_order_id: orderData.id,
                    razorpay_payment_id: 'pay_dummy_' + Date.now(),
                    razorpay_signature: 'dummy_signature_would_fail_backend_check_if_real', // Note: backend check will fail if we don't handle this dev mode. 
                    // To make it work in dev without real razorpay, we might need a bypass or real signature generation on frontend (not secure)
                    // For now, let's assume we alert the user
                    userId: user._id || user.uid,
                    seriesId: test._id
                })
            });

            // Note: The above verify call will likely fail signature check on backend because we can't generate valid signature on client without secret.
            // For valid flow, we need the actual Razorpay Checkout.

            alert("Payment logic initiated. For actual payment, Razorpay SDK integration is required on frontend. \n\nCheck backend logs/implementation.");

        } catch (error) {
            console.error("Payment Error", error);
            alert("Payment failed");
        }
    };

    const getTestStatus = (test) => {
        // 1. Check if Paid and Not Purchased
        const isPaid = test.accessType === 'paid';
        const isPurchased = user?.purchasedTests?.includes(test._id);

        if (isPaid && !isPurchased) {
            return { status: 'locked', message: 'Buy Now', enabled: true, action: 'buy' };
        }

        if (!test.startTime || !test.endTime) return { status: 'available', message: 'Attempt Now', enabled: true, action: 'attempt' };
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
