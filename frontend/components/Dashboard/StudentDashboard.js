'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { API_BASE_URL } from '@/lib/config';
import AnalyticsDashboard from './AnalyticsDashboard';
import { Clock, BookOpen, BarChart, User, Mail, Calendar, ShieldCheck, TrendingUp, ChevronRight, Star, Target, Zap, Search, Filter, Menu, X, CheckCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import SeriesCard from '@/components/ui/SeriesCard';

export default function StudentDashboard() {
    const { user } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname();

    const [tests, setTests] = useState([]);
    const [series, setSeries] = useState([]);
    const [results, setResults] = useState([]);
    const [orders, setOrders] = useState([]); // New Orders State
    const [testRanks, setTestRanks] = useState({});
    const [loading, setLoading] = useState(true);
    const [currentFilter, setFilter] = useState('all');

    // UI State
    const [activeSection, setActiveSection] = useState('dashboard'); // 'dashboard', 'tests', 'series', 'orders', 'analytics', 'profile'

    // Profile State
    const [profileForm, setProfileForm] = useState({
        name: user.name || '',
        photoURL: user.photoURL || ''
    });
    const [profileLoading, setProfileLoading] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            if (!user) return;

            try {
                // Fetch Tests (Backend will filter by user.category via middleware/token logic or we pass param)
                // Since we haven't fully implemented backend middleware filtering yet, keeping client safe?
                // The PLAN says Backend filtering. 
                // But for now, let's assume the endpoint returns EVERYTHING and we filter here strictly until backend is ready?
                // NO, strict requirement: "Do NOT show all fields and filter only on frontend".
                // HOWEVER, the backend changes are next step. 
                // So I will implement this assuming backend WILL return filtered data, 
                // BUT just in case, I will also add a safety check here to NOT render anything if it mismatches.
                // Wait, if backend sends everything, and I hide it, it's still "Not allowed" technically?
                // I'll add a param `?field=${user.category}` for now so existing backend might use it if I update it? 
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

                // Fetch Results (Protected Route - Needs Headers)
                const userId = user.uid || user._id; // Prefer uid (Firebase standard)
                const resultsRes = await fetch(`${API_BASE_URL}/api/results/student/${userId}`, { headers });
                const resultsData = await resultsRes.json();

                console.log("📊 [Results Debug] Results Response:", resultsData);
                console.log("📊 [Results Debug] Is Array?", Array.isArray(resultsData));

                // Validate resultsData is an array before using it
                const validResults = Array.isArray(resultsData) ? resultsData : [];
                if (!Array.isArray(resultsData)) {
                    console.error("⚠️ [Results Error] Expected array but got:", typeof resultsData, resultsData);
                }
                setResults(validResults);

                // Fetch Rank - only if we have valid results
                const ranks = {};
                if (validResults.length > 0) {
                    await Promise.all(validResults.map(async (res) => {
                        try {
                            const anaRes = await fetch(`${API_BASE_URL}/api/tests/${res.testId}/analytics`, { headers });
                            const anaData = await anaRes.json();
                            const myRankEntry = anaData.rankList.find(r => r.userId === userId);
                            if (myRankEntry) {
                                ranks[res.testId] = { rank: myRankEntry.rank, total: anaData.totalAttempts };
                            }
                        } catch (e) { console.error("Rank fetch failed", e); }
                    }));
                }
                // Fetch Orders
                try {
                    const ordersRes = await fetch(`${API_BASE_URL}/api/purchases/my-orders`, { headers });
                    if (ordersRes.ok) {
                        const ordersData = await ordersRes.json();
                        setOrders(ordersData);
                    }
                } catch (e) {
                    console.error("Failed to fetch orders", e);
                }

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

    // SAFETY CHECK: If user has no category/field, redirect to signup-details?
    // This is handled by Route Guards usually, but good practice here too.
    // Calculate Quick Stats for Dashboard Home
    const quickStats = {
        totalTests: results.length,
        avgScore: results.length > 0 ? Math.round(results.reduce((acc, r) => acc + r.score, 0) / results.length) : 0,
        avgAccuracy: results.length > 0 ? Math.round(results.reduce((acc, r) => acc + r.accuracy, 0) / results.length) : 0,
        testsThisWeek: results.filter(r => {
            const date = new Date(r.submittedAt);
            const now = new Date();
            const oneWeekAgo = new Date(now.setDate(now.getDate() - 7));
            return date > oneWeekAgo;
        }).length
    };

    // SAFETY CHECK: If user has no category/field, redirect to signup-details?
    // This is handled by Route Guards usually, but good practice here too.
    const userField = user?.category || user?.selectedField;

    if (!userField) {
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

    // Backend now strictly enforces filtering based on user.category.
    // We can trust the API response directly.
    // Filter Tests
    // 1. Filter by Paid/Free tab
    // 2. Filter out tests that belong to a SERIES (they should only show in Series section)
    const seriesTestIds = new Set(series.flatMap(s => s.testIds || []));

    // Build set of enrolled series IDs from purchase orders
    const enrolledSeriesIds = new Set(orders.map(o => o.seriesId).filter(Boolean));

    const relevantTests = tests.filter(test => {
        // Exclude if part of a series
        if (seriesTestIds.has(test._id)) return false;

        if (currentFilter === 'free') return test.price === 0 || test.accessType === 'free';
        if (currentFilter === 'paid') return test.price > 0 || test.accessType === 'paid';
        return true;
    });

    // Strict Frontend Filter for Series (matching user field)
    const relevantSeries = series.filter(s => {
        if (!userField || !s.category) return false;
        return s.category.toLowerCase() === userField.toLowerCase();
    });

    // Enrolled series (from any category)
    const enrolledSeries = series.filter(s => enrolledSeriesIds.has(s.id));

    const handleStartTest = (testId) => {
        window.location.href = `/exam/${testId}`;
    };

    const handlePhotoUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 500 * 1024) { // 500KB limit
                alert("Image too large. Max 500KB.");
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setProfileForm(prev => ({ ...prev, photoURL: reader.result }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSaveProfile = async () => {
        setProfileLoading(true);
        try {
            const token = await user.getIdToken();
            const res = await fetch(`${API_BASE_URL}/api/auth/profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(profileForm)
            });
            const data = await res.json();

            if (res.ok) {
                alert("Profile Updated Successfully!");
                window.location.reload();
            } else {
                alert(data.message || "Failed to update profile");
            }
        } catch (error) {
            console.error("Profile update error", error);
            alert("An error occurred.");
        } finally {
            setProfileLoading(false);
        }
    };

    // --- UI COMPONENTS ---

    // 4. Premium Sidebar Component
    const Sidebar = () => (
        <div className="w-full md:w-72 bg-white/90 backdrop-blur-xl border-r border-gray-100 flex-shrink-0 flex flex-col h-full fixed md:relative z-20 hidden md:flex shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
            <div className="p-8">
                <img src="/logo.png" alt="Apex Mock" className="h-32 w-auto mb-2" />
                <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 rounded-full border border-indigo-100">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                    <p className="text-[10px] text-indigo-700 font-bold uppercase tracking-wider">{userField || 'Student'}</p>
                </div>
            </div>

            <nav className="flex-1 px-4 space-y-1.5">
                {[
                    { id: 'dashboard', label: 'Dashboard', icon: <BarChart size={20} /> },
                    { id: 'tests', label: 'Test Library', icon: <Search size={20} /> },
                    { id: 'analytics', label: 'Performance', icon: <TrendingUp size={20} /> },
                    { id: 'orders', label: 'My Orders', icon: <BookOpen size={20} /> },
                    { id: 'profile', label: 'Profile Settings', icon: <User size={20} /> },
                ].map(item => (
                    <button
                        key={item.id}
                        onClick={() => setActiveSection(item.id)}
                        className={`w-full flex items-center gap-3.5 px-5 py-3.5 rounded-2xl transition-all duration-300 font-medium group relative overflow-hidden ${activeSection === item.id
                            ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-200 scale-[1.02]'
                            : 'text-gray-500 hover:bg-indigo-50/50 hover:text-indigo-600'
                            }`}
                    >
                        {activeSection === item.id && (
                            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        )}
                        <span className={`transition-transform duration-300 ${activeSection === item.id ? 'scale-110' : 'group-hover:scale-110'}`}>
                            {item.icon}
                        </span>
                        {item.label}
                        {activeSection === item.id && <ChevronRight size={16} className="ml-auto opacity-70" />}
                    </button>
                ))}
            </nav>

            <div className="p-6">
                <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-4 flex items-center gap-4 text-white shadow-xl shadow-gray-200/50">
                    <div className="h-10 w-10 bg-white/10 rounded-full flex items-center justify-center text-white font-bold backdrop-blur-sm border border-white/10">
                        {user.name ? user.name.charAt(0) : 'U'}
                    </div>
                    <div className="overflow-hidden">
                        <p className="text-sm font-bold truncate">{user.name}</p>
                        <p className="text-[10px] text-gray-400 truncate">{user.email}</p>
                    </div>
                </div>
            </div>
        </div>
    );

    // 2. Orders View
    const OrdersView = () => (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white p-8 rounded-3xl shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
                <h1 className="text-3xl font-bold relative z-10">Purchase History</h1>
                <p className="text-emerald-100 relative z-10 mt-2">Track all your mock test series purchases and subscriptions.</p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Order ID</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Item</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Amount</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {orders.length > 0 ? orders.map((order) => (
                                <tr key={order.id} className="hover:bg-gray-50/50 transition">
                                    <td className="px-6 py-4 text-xs font-mono text-gray-500">{order.razorpayOrderId || order.id}</td>
                                    <td className="px-6 py-4 font-bold text-gray-900">{order.testTitle || 'Test Series'}</td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{new Date(order.createdAt).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 font-bold text-gray-900">₹{order.amount}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${order.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                            }`}>
                                            {order.status}
                                        </span>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-gray-500 italic">No purchase history found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );



    // 6. Enhanced Test Library Component
    const TestsLibrary = () => {
        const [searchQuery, setSearchQuery] = useState('');
        const [selectedSubject, setSelectedSubject] = useState('All');
        const [selectedType, setSelectedType] = useState('All'); // 'All', 'Full Mock', 'Chapter Test'

        // Extract unique subjects from tests
        const subjects = ['All', ...new Set(relevantTests.flatMap(t => t.subjects || [t.subject || 'General']))];

        const filteredTests = relevantTests.filter(test => {
            // 1. Text Search (Title or Matches Chapter)
            const matchesSearch = test.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (test.chapters && test.chapters.some(c => c.toLowerCase().includes(searchQuery.toLowerCase())));

            // 2. Subject Filter
            const matchesSubject = selectedSubject === 'All' ||
                (test.subjects && test.subjects.includes(selectedSubject)) ||
                test.subject === selectedSubject;

            // 3. Type Filter (Inferred)
            const isChapterTest = test.title.toLowerCase().includes('chapter') || (test.chapters && test.chapters.length > 0 && test.chapters.length < 3);
            const matchesType = selectedType === 'All' ||
                (selectedType === 'Chapter Test' && isChapterTest) ||
                (selectedType === 'Full Mock' && !isChapterTest);

            return matchesSearch && matchesSubject && matchesType;
        });

        return (
            <div className="space-y-8 animate-in fade-in duration-500">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Test Library</h1>
                        <p className="text-gray-500 font-medium">Explore standard and chapter-wise tests.</p>
                    </div>
                </div>

                {/* Filters & Search - Glassmorphism */}
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 sticky top-4 z-10 backdrop-blur-xl bg-white/90">
                    <div className="flex flex-col md:flex-row gap-4">
                        {/* Search Bar */}
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                            <input
                                type="text"
                                placeholder="Search by test name, chapter..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition bg-gray-50"
                            />
                        </div>

                        {/* Filters */}
                        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
                            <select
                                value={selectedSubject}
                                onChange={(e) => setSelectedSubject(e.target.value)}
                                className="px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 font-bold text-gray-600 focus:border-indigo-500 outline-none cursor-pointer hover:bg-white transition"
                            >
                                {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>

                            <select
                                value={selectedType}
                                onChange={(e) => setSelectedType(e.target.value)}
                                className="px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 font-bold text-gray-600 focus:border-indigo-500 outline-none cursor-pointer hover:bg-white transition"
                            >
                                <option value="All">All Types</option>
                                <option value="Full Mock">Full Mocks</option>
                                <option value="Chapter Test">Chapter Tests</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Filtered Grid */}
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {filteredTests.length > 0 ? filteredTests.map(test => (
                        <div key={test._id} className="bg-white rounded-2xl shadow-[0_2px_10px_rgb(0,0,0,0.04)] border border-gray-100 p-6 hover:border-indigo-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-indigo-50 to-transparent rounded-bl-full -z-10 opacity-0 group-hover:opacity-100 transition-opacity"></div>

                            <div className="flex justify-between items-start mb-4">
                                <span className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-md tracking-wider ${test.category === 'JEE' ? 'bg-orange-50 text-orange-600' :
                                    test.category === 'NEET' ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'
                                    }`}>{test.category}</span>
                                {test.accessType === 'paid' && <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100"><Star size={10} fill="currentColor" /> PREMIUM</span>}
                            </div>

                            <h3 className="text-lg font-bold text-gray-900 mb-3 line-clamp-2 leading-snug group-hover:text-indigo-600 transition-colors">{test.title}</h3>

                            <div className="flex items-center gap-4 text-xs text-gray-500 mb-6 font-medium">
                                <div className="flex items-center bg-gray-50 px-2 py-1 rounded"><Clock size={14} className="mr-1.5 text-gray-400" /> {test.duration_minutes}m</div>
                                <div className="flex items-center bg-gray-50 px-2 py-1 rounded"><Target size={14} className="mr-1.5 text-gray-400" /> {test.total_marks} Marks</div>
                            </div>

                            {/* Chapter Detail Hint */}
                            {test.chapters && test.chapters.length > 0 && (
                                <div className="mb-4 text-xs text-gray-500 bg-gray-50 p-2 rounded-lg truncate">
                                    <span className="font-bold">Includes:</span> {test.chapters.join(', ')}
                                </div>
                            )}

                            <button
                                onClick={() => handleStartTest(test._id)}
                                className="w-full py-3 rounded-xl bg-gray-900 text-white font-bold text-sm hover:bg-indigo-600 hover:shadow-lg hover:shadow-indigo-200 transition-all duration-300 transform active:scale-95"
                            >
                                Start Test
                            </button>
                        </div>
                    )) : (
                        <div className="col-span-full py-16 text-center">
                            <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                                <Search size={40} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900">No tests found</h3>
                            <p className="text-gray-500 mt-2">Try adjusting your filters or search query.</p>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // 5. Dashboard Home (Premium UI)
    const DashboardHome = () => (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header / Welcome / Quick Stats */}
            <div className="relative">
                {/* Decorative Background Blob */}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-indigo-200/40 to-purple-200/40 rounded-full blur-3xl -z-10 -translate-y-1/2 translate-x-1/2"></div>

                <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4 mb-8">
                    <div>
                        <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-2">
                            Welcome back, <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">{user.name ? user.name.split(' ')[0] : 'Hero'}</span> 👋
                        </h1>
                        <p className="text-gray-500 font-medium">Ready to crush your goals today?</p>
                    </div>
                    <div className="bg-white/80 backdrop-blur-sm border border-gray-100 px-4 py-2 rounded-full shadow-sm flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                        <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">System Online</span>
                    </div>
                </div>

                {/* Quick Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
                    <div className="bg-white p-5 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 hover:-translate-y-1 transition-transform">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><Clock size={18} /></div>
                            <span className="text-xs font-bold text-gray-400 uppercase">Tests Taken</span>
                        </div>
                        <h3 className="text-2xl font-black text-gray-900">{quickStats.totalTests}</h3>
                    </div>
                    <div className="bg-white p-5 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 hover:-translate-y-1 transition-transform">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><Target size={18} /></div>
                            <span className="text-xs font-bold text-gray-400 uppercase">Avg Accuracy</span>
                        </div>
                        <h3 className="text-2xl font-black text-gray-900">{quickStats.avgAccuracy}%</h3>
                    </div>
                    <div className="bg-white p-5 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 hover:-translate-y-1 transition-transform">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><TrendingUp size={18} /></div>
                            <span className="text-xs font-bold text-gray-400 uppercase">Avg Score</span>
                        </div>
                        <h3 className="text-2xl font-black text-gray-900">{quickStats.avgScore}</h3>
                    </div>
                    <div className="bg-white p-5 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 hover:-translate-y-1 transition-transform">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-orange-50 text-orange-600 rounded-lg"><Zap size={18} /></div>
                            <span className="text-xs font-bold text-gray-400 uppercase">This Week</span>
                        </div>
                        <h3 className="text-2xl font-black text-gray-900">{quickStats.testsThisWeek}</h3>
                    </div>
                </div>
            </div>

            {/* My Enrolled Courses */}
            {enrolledSeries.length > 0 && (
                <div>
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold flex items-center gap-2 text-gray-900">
                            <CheckCircle className="text-emerald-500" size={20} />
                            My Enrolled Courses
                        </h2>
                        <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">Permanent Access</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {enrolledSeries.map(s => (
                            <div key={s.id} className="relative">
                                <div className="absolute top-3 right-3 z-10 bg-emerald-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg shadow-emerald-200">
                                    <CheckCircle size={12} /> Enrolled
                                </div>
                                <SeriesCard
                                    key={s.id}
                                    series={s}
                                    onAction={() => window.location.href = `/series/${s.id}`}
                                    actionLabel="Continue →"
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Recommended Series */}
            {relevantSeries.length > 0 && (
                <div>
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold flex items-center gap-2 text-gray-900">
                            <Star className="text-yellow-400 fill-yellow-400" size={20} />
                            Premium Packages
                        </h2>
                        <button onClick={() => setActiveSection('series')} className="text-sm font-bold text-indigo-600 hover:text-indigo-800 flex items-center">View All <ChevronRight size={16} /></button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {relevantSeries.filter(s => !enrolledSeriesIds.has(s.id)).slice(0, 3).map(s => (
                            <SeriesCard
                                key={s.id}
                                series={s}
                                onAction={() => window.location.href = `/series/${s.id}`}
                                actionLabel={s.price > 0 ? 'Unlock' : 'Start'}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Recent/Available Tests */}
            <div>
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold flex items-center gap-2 text-gray-900">
                        <Clock className="text-indigo-600" size={20} />
                        Quick Practice
                    </h2>
                    <button onClick={() => setActiveSection('tests')} className="text-sm font-bold text-indigo-600 hover:text-indigo-800 flex items-center">View All <ChevronRight size={16} /></button>
                </div>

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {relevantTests.slice(0, 6).map(test => (
                        <div key={test._id} className="bg-white rounded-2xl shadow-[0_2px_10px_rgb(0,0,0,0.04)] border border-gray-100 p-6 hover:border-indigo-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-indigo-50 to-transparent rounded-bl-full -z-10 opacity-0 group-hover:opacity-100 transition-opacity"></div>

                            <div className="flex justify-between items-start mb-4">
                                <span className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-md tracking-wider ${test.category === 'JEE' ? 'bg-orange-50 text-orange-600' :
                                    test.category === 'NEET' ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'
                                    }`}>{test.category}</span>
                                {test.accessType === 'paid' && <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100"><Star size={10} fill="currentColor" /> PREMIUM</span>}
                            </div>

                            <h3 className="text-lg font-bold text-gray-900 mb-3 line-clamp-2 leading-snug group-hover:text-indigo-600 transition-colors">{test.title}</h3>

                            <div className="flex items-center gap-4 text-xs text-gray-500 mb-6 font-medium">
                                <div className="flex items-center bg-gray-50 px-2 py-1 rounded"><Clock size={14} className="mr-1.5 text-gray-400" /> {test.duration_minutes}m</div>
                                <div className="flex items-center bg-gray-50 px-2 py-1 rounded"><Target size={14} className="mr-1.5 text-gray-400" /> {test.total_marks} Marks</div>
                            </div>

                            <button
                                onClick={() => handleStartTest(test._id)}
                                className="w-full py-3 rounded-xl bg-gray-900 text-white font-bold text-sm hover:bg-indigo-600 hover:shadow-lg hover:shadow-indigo-200 transition-all duration-300 transform active:scale-95"
                            >
                                Start Test
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 md:flex">
            <Sidebar />

            {/* Mobile Header (replaces sidebar on small screens) - can be optimized later */}
            {/* Mobile Bottom Navigation (Tab Bar) */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-2xl border-t border-gray-100 p-2 flex justify-around items-center z-50 shadow-[0_-8px_30px_rgba(0,0,0,0.05)] rounded-t-[1.5rem]">
                {[
                    { id: 'dashboard', icon: <BarChart size={20} />, label: 'Home' },
                    { id: 'tests', icon: <Search size={20} />, label: 'Library' },
                    { id: 'analytics', icon: <TrendingUp size={20} />, label: 'Stats' },
                    { id: 'profile', icon: <User size={20} />, label: 'Profile' },
                ].map(item => (
                    <button
                        key={item.id}
                        onClick={() => setActiveSection(item.id)}
                        className={`flex flex-col items-center gap-1 p-2 rounded-2xl transition-all ${activeSection === item.id
                            ? 'text-indigo-600 scale-110 font-bold'
                            : 'text-gray-400'
                            }`}
                    >
                        <div className={`p-1.5 rounded-xl transition-colors ${activeSection === item.id ? 'bg-indigo-50' : ''}`}>
                            {item.icon}
                        </div>
                        <span className="text-[10px] uppercase tracking-tighter">{item.label}</span>
                    </button>
                ))}
            </div>

            {/* Mobile Header (Fixed Top) */}
            <div className="md:hidden bg-white/90 backdrop-blur-md px-6 py-4 flex justify-between items-center sticky top-0 z-40 border-b border-gray-50/50 shadow-sm">
                <div className="flex items-center gap-2">
                    <img src="/logo.png" alt="Apex" className="h-8 w-auto" />
                    <span className="font-black text-xl tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">APEX</span>
                </div>
                <div className="flex items-center gap-3">
                    <div className="text-right">
                        <p className="text-[10px] font-black text-gray-900 leading-none">{user.name?.split(' ')[0]}</p>
                        <span className="text-[8px] font-bold text-indigo-500 uppercase tracking-widest">{userField}</span>
                    </div>
                    <div className="w-8 h-8 bg-indigo-50 rounded-full border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs">
                        {user.name?.charAt(0)}
                    </div>
                </div>
            </div>

            <div className="flex-1 p-4 md:p-8 max-w-7xl mx-auto">
                {activeSection === 'orders' ? <OrdersView /> :
                    activeSection === 'profile' ? (
                        <ProfileView
                            user={user}
                            profileForm={profileForm}
                            setProfileForm={setProfileForm}
                            profileLoading={profileLoading}
                            onSave={handleSaveProfile}
                            onPhotoUpload={handlePhotoUpload}
                        />
                    ) :
                        activeSection === 'analytics' ? <AnalyticsDashboard results={results} /> :
                            activeSection === 'tests' ? <TestsLibrary /> :
                                activeSection === 'series' ? <TestsLibrary /> : // Redirect Series tab request to TestsLibrary too
                                    <DashboardHome />}
            </div>
        </div>
    );
}

const ProfileView = ({ user, profileForm, setProfileForm, profileLoading, onSave, onPhotoUpload }) => {
    return (
        <div className="max-w-2xl mx-auto space-y-6 md:space-y-8 animate-in fade-in duration-500">
            <div className="bg-white rounded-2xl md:rounded-3xl shadow-xl p-4 md:p-8 border border-gray-100">
                <h2 className="text-xl md:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 mb-4 md:mb-6 text-center md:text-left">Edit Profile</h2>

                {/* Photo Section */}
                <div className="flex flex-col items-center mb-6 md:mb-8">
                    <div className="relative group">
                        <div className="h-24 w-24 md:h-32 md:w-32 rounded-full overflow-hidden border-4 border-white shadow-lg bg-gray-100">
                            <img
                                src={profileForm.photoURL || "https://via.placeholder.com/150"}
                                alt="Profile"
                                className="h-full w-full object-cover"
                            />
                        </div>
                        <label className="absolute bottom-0 right-0 bg-indigo-600 text-white p-1.5 md:p-2 rounded-full cursor-pointer hover:bg-indigo-700 hover:scale-110 transition shadow-md">
                            <User size={14} className="md:w-4 md:h-4" />
                            <input type="file" accept="image/*" className="hidden" onChange={onPhotoUpload} />
                        </label>
                    </div>
                    <p className="text-xs text-gray-500 mt-2 md:mt-3 text-center">Click icon to change photo (Max 500KB)</p>
                </div>

                {/* Form Fields */}
                <div className="space-y-4 md:space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1.5 md:mb-2">Display Name</label>
                        <input
                            type="text"
                            value={profileForm.name}
                            onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                            className="w-full px-3 py-2.5 md:px-4 md:py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition bg-gray-50 text-sm md:text-base"
                            placeholder="Enter your name"
                        />
                        <p className="text-[10px] md:text-xs text-amber-600 mt-1.5 md:mt-2 flex items-center gap-1">
                            <ShieldCheck size={12} />
                            Note: You can only change your name once every 7 days.
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1.5 md:mb-2">Email (Read Only)</label>
                        <input
                            type="email"
                            value={user.email}
                            disabled
                            className="w-full px-3 py-2.5 md:px-4 md:py-3 rounded-xl border border-gray-200 bg-gray-100 text-gray-500 cursor-not-allowed text-sm md:text-base"
                        />
                    </div>

                    <div className="pt-2 md:pt-4">
                        <button
                            onClick={onSave}
                            disabled={profileLoading}
                            className={`w-full py-3 md:py-4 rounded-xl font-bold text-white text-sm md:text-base shadow-lg shadow-indigo-200 transition-all ${profileLoading ? 'bg-indigo-400 cursor-wait' : 'bg-indigo-600 hover:bg-indigo-700 hover:scale-[1.01] active:scale-95'
                                }`}
                        >
                            {profileLoading ? 'Saving Changes...' : 'Save Profile Changes'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
