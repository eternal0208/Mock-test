'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { API_BASE_URL } from '@/lib/config';
import AnalyticsDashboard from './AnalyticsDashboard';
import { Clock, BookOpen, BarChart, User, LogOut, Bell, FileText, Activity, PlayCircle, Mail, Calendar, ShieldCheck, TrendingUp, ChevronRight, Star, Target, Zap, Search, Filter, Menu, X, CheckCircle, Award, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import SeriesCard from '@/components/ui/SeriesCard';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import NotesSection from './NotesSection';

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
    const [percentileData, setPercentileData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentFilter, setFilter] = useState('all');

    // Coupon State
    const [couponModal, setCouponModal] = useState(null); // { item, type } — shows coupon input
    const [couponCode, setCouponCode] = useState('');
    const [couponResult, setCouponResult] = useState(null); // validated coupon response
    const [couponLoading, setCouponLoading] = useState(false);
    const [couponPopup, setCouponPopup] = useState(null); // { type: 'success'|'error', message, discount }

    // UI State
    const [activeSection, setActiveSection] = useState('dashboard'); // 'dashboard', 'tests', 'series', 'orders', 'analytics', 'profile'

    // Profile State
    const [profileForm, setProfileForm] = useState({
        name: user.name || '',
        photoURL: user.photoURL || '',
        instituteCode: user.instituteCode || ''
    });
    const [profileLoading, setProfileLoading] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            if (!user || (!user.uid && !user._id)) return;
            const uid = user.uid || user._id;
            const cacheKey = `apex_student_data_${uid}`;

            // 1. Initial Load: Try caching for instant render
            try {
                const cached = localStorage.getItem(cacheKey);
                if (cached) {
                    const parsed = JSON.parse(cached);
                    if (parsed.tests) setTests(parsed.tests);
                    if (parsed.series) setSeries(parsed.series);
                    if (parsed.results) setResults(parsed.results);
                    if (parsed.orders) setOrders(parsed.orders);
                    if (parsed.percentileData) setPercentileData(parsed.percentileData);
                    setLoading(false); // Render instantly!
                }
            } catch (e) {
                console.warn('Cache read error', e);
            }

            // 2. Background Sync
            const fetchFreshData = async () => {
                try {
                    const token = await user.getIdToken();
                    const headers = { 'Authorization': `Bearer ${token}` };
                    const fetchConfig = { headers, cache: 'no-store' };

                    const [testsRes, seriesRes, resultsRes, ordersRes, percRes] = await Promise.allSettled([
                        fetch(`${API_BASE_URL}/api/tests`, fetchConfig),
                        fetch(`${API_BASE_URL}/api/tests/series`, fetchConfig),
                        fetch(`${API_BASE_URL}/api/results/student/${uid}`, fetchConfig),
                        fetch(`${API_BASE_URL}/api/purchases/my-orders`, fetchConfig),
                        fetch(`${API_BASE_URL}/api/admin/percentile-data`, fetchConfig)
                    ]);

                    const freshData = {};

                    if (testsRes.status === 'fulfilled' && testsRes.value.ok) {
                        const data = await testsRes.value.json();
                        if (Array.isArray(data)) {
                            freshData.tests = data.sort((a, b) => (a.title || '').localeCompare(b.title || '', undefined, { numeric: true, sensitivity: 'base' }));
                            setTests(freshData.tests);
                        }
                    }

                    if (seriesRes.status === 'fulfilled' && seriesRes.value.ok) {
                        const data = await seriesRes.value.json();
                        if (Array.isArray(data)) {
                            freshData.series = data.sort((a, b) => (a.title || '').localeCompare(b.title || '', undefined, { numeric: true, sensitivity: 'base' }));
                            setSeries(freshData.series);
                        }
                    }

                    if (resultsRes.status === 'fulfilled' && resultsRes.value.ok) {
                        const data = await resultsRes.value.json();
                        freshData.results = Array.isArray(data) ? data : [];
                        setResults(freshData.results);
                    }

                    if (ordersRes.status === 'fulfilled' && ordersRes.value.ok) {
                        const data = await ordersRes.value.json();
                        freshData.orders = data;
                        setOrders(freshData.orders);
                    }

                    if (percRes.status === 'fulfilled' && percRes.value.ok) {
                        const data = await percRes.value.json();
                        freshData.percentileData = data;
                        setPercentileData(freshData.percentileData);
                    }

                    // Update Cache 
                    try {
                        const existingCache = localStorage.getItem(cacheKey);
                        const mergedCache = existingCache ? { ...JSON.parse(existingCache), ...freshData } : freshData;
                        localStorage.setItem(cacheKey, JSON.stringify(mergedCache));
                    } catch (e) { console.warn('Cache write error', e) }

                } catch (error) {
                    console.error("Dashboard fetch failed", error);
                } finally {
                    setLoading(false);
                }
            };

            fetchFreshData();
        };
        fetchData();
    }, [user]);

    if (loading) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
            <DotLottieReact
                src="https://lottie.host/585eaa49-82ac-4ffe-8958-524df205393d/GCwqhgbTtp.lottie"
                loop
                autoplay
                className="w-32 h-32 md:w-48 md:h-48 mb-4"
            />
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 drop-shadow-sm">Loading Student Data...</span>
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

    // Calculate AI Expected Benchmarks (JEE Main)
    let aiPercentile = "N/A", aiRank = "N/A";
    const userField = user?.category || user?.selectedField;

    if (userField === 'JEE Main' && percentileData && results.length > 0) {
        // Find matching range based on average score mapped to max marks scaling
        // (Assuming standard full mock scale is 300 for simplification in dashboard average)
        // A more complex average could weight by total_marks per test.
        // We will just scale the average score if tests were 300 marks.
        // For accurate dashboard predicting we filter to full mocks

        const fullMocks = results.filter(r => {
            const t = tests.find(t => t._id === (r.testId?._id || r.testId));
            return t && t.total_marks === 300;
        });

        if (fullMocks.length > 0) {
            const avgFullMockScore = Math.round(fullMocks.reduce((acc, r) => acc + r.score, 0) / fullMocks.length);
            const mapping = (percentileData.overallMappings || []).find(m => {
                const rangeStr = String(m.marksRequired).replace(/\+/g, '');
                const parts = rangeStr.split('-');
                if (parts.length === 2) {
                    return avgFullMockScore >= parseInt(parts[0].trim()) && avgFullMockScore <= parseInt(parts[1].trim());
                } else if (parts.length === 1 && String(m.marksRequired).includes('+')) {
                    return avgFullMockScore >= parseInt(parts[0].trim());
                }
                return false;
            });

            if (mapping) {
                aiPercentile = mapping.percentileRange;
                aiRank = mapping.expectedRankRange;
            } else if (avgFullMockScore < 70) {
                aiPercentile = "< 80.0 %ile";
                aiRank = "> 2.5 Lakh";
            }
        }
    }

    // SAFETY CHECK: If user has no category/field, redirect to signup-details?
    // This is handled by Route Guards usually, but good practice here too.
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
        const price = Number(item.price) || 0;
        const isFree = price === 0 || item.isPaid === false;
        const uid = user.uid || user._id;

        // ── FREE ENROLLMENT ────────────────────────────────────────────────
        if (isFree) {
            if (!window.confirm(`Enroll in "${item.title}" for FREE?`)) return;
            try {
                const token = await user.getIdToken();
                const res = await fetch(`${API_BASE_URL}/api/purchases/enroll-free`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ testId: item.id || item._id, userId: uid })
                });
                const data = await res.json();
                if (res.ok && data.success) {
                    const newOrder = {
                        id: `enroll_${item.id}_${Date.now()}`,
                        seriesId: item.id || item._id,
                        testTitle: item.title,
                        amount: 0,
                        status: 'paid',
                        createdAt: new Date().toISOString()
                    };
                    setOrders(prev => [newOrder, ...prev]);
                    try {
                        const cached = JSON.parse(localStorage.getItem(`apex_cache_orders_${uid}`) || '[]');
                        localStorage.setItem(`apex_cache_orders_${uid}`, JSON.stringify([newOrder, ...cached]));
                    } catch (_) { }
                    alert(`✅ Enrolled in "${item.title}"! Check "My Enrolled Courses".`);
                } else {
                    alert(data.message || 'Enrollment failed. Please try again.');
                }
            } catch (err) {
                alert('Error: ' + err.message);
            }
            return;
        }

        // ── PAID CHECKOUT ───────────────────────────────────────────────────
        // Show coupon input modal before payment
        setCouponModal({ item, type });
    };

    // Called after coupon step (skip or apply)
    const handleValidateCoupon = async () => {
        if (!couponCode.trim()) { setCouponResult({ valid: false, reason: 'Please enter a coupon code' }); return; }
        setCouponLoading(true); setCouponResult(null);
        try {
            const token = await user.getIdToken();
            const res = await fetch(`${API_BASE_URL}/api/payment/validate-coupon`, {
                method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ code: couponCode, userId: user.uid || user._id, seriesId: couponModal.item.id || couponModal.item._id, examType: userField })
            });
            const data = await res.json();
            setCouponResult(data);
        } catch (e) { setCouponResult({ valid: false, reason: 'Failed to validate coupon' }); }
        finally { setCouponLoading(false); }
    };

    const proceedToPayment = async (item, type = 'series', appliedCoupon = null) => {
        const originalPrice = Number(item.price) || 0;
        const uid = user.uid || user._id;
        try {
            const token = await user.getIdToken();

            const finalPrice = appliedCoupon ? appliedCoupon.finalPrice : originalPrice;
            const finalCouponCode = appliedCoupon ? appliedCoupon.couponCode : null;
            const discountAmount = appliedCoupon ? appliedCoupon.discountAmount : 0;

            // If coupon makes it 100% free, bypass razorpay
            if (finalPrice <= 0 && appliedCoupon) {
                if (!window.confirm(`Enroll in "${item.title}" for FREE using coupon?`)) return;
                try {
                    const res = await fetch(`${API_BASE_URL}/api/purchases/enroll-free`, {
                        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify({ testId: item.id || item._id, userId: uid })
                    });
                    const data = await res.json();
                    if (res.ok && data.success) {
                        const newOrder = { id: `enroll_${item.id}_${Date.now()}`, seriesId: item.id || item._id, testTitle: item.title, amount: 0, status: 'paid', couponCode: finalCouponCode, discountAmount, createdAt: new Date().toISOString() };
                        setOrders(prev => [newOrder, ...prev]);
                        
                        // Tell verification endpoint to record the coupon usage explicitly
                        await fetch(`${API_BASE_URL}/api/payment/verify-payment`, {
                            method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                            body: JSON.stringify({ razorpay_order_id: newOrder.id, razorpay_payment_id: 'FREE_COUPON', razorpay_signature: 'DEMO_SUCCESS_SIGNATURE', userId: uid, seriesId: item.id || item._id, couponCode: finalCouponCode })
                        });

                        setCouponPopup({ type: 'success', message: `Congratulations!`, discount: discountAmount });
                        setTimeout(() => setCouponPopup(null), 4000);
                        setCouponModal(null);
                    } else { alert(data.message || 'Enrollment failed.'); }
                } catch (err) { alert('Error: ' + err.message); }
                return;
            }

            const orderRes = await fetch(`${API_BASE_URL}/api/payment/create-order`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ amount: finalPrice, seriesId: item.id || item._id, userId: uid, couponCode: finalCouponCode })
            });
            const orderData = await orderRes.json();
            if (!orderRes.ok) {
                alert(orderData.message || orderData.error || 'Failed to initiate payment.');
                return;
            }

            // Backend short-circuited because coupon made it free
            if (orderData.isFree) {
                // Enrollment was already recorded server-side via verify-payment DEMO path
                setCouponModal(null);
                setCouponPopup({ type: 'success', message: 'Congratulations! Enrolled for FREE!', discount: discountAmount });
                setTimeout(() => setCouponPopup(null), 4000);
                const newOrder = { id: `free_${item.id}_${Date.now()}`, seriesId: item.id || item._id, testTitle: item.title, amount: 0, status: 'paid', couponCode: finalCouponCode, discountAmount, createdAt: new Date().toISOString() };
                setOrders(prev => [newOrder, ...prev]);
                return;
            }

            // Close coupon modal as Razorpay is starting
            setCouponModal(null);

            // Step 2: Load Razorpay SDK if not already loaded
            if (!window.Razorpay) {
                await new Promise((resolve, reject) => {
                    const script = document.createElement('script');
                    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
                    script.onload = resolve;
                    script.onerror = reject;
                    document.body.appendChild(script);
                });
            }

            // Step 3: Open Razorpay checkout
            // Backend spreads order at root: orderData.id, orderData.amount, etc.
            const rzp = new window.Razorpay({
                key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_live_SKdPiD0l0HQgwS',
                amount: orderData.amount,
                currency: orderData.currency || 'INR',
                name: 'APEX MOCKs',
                description: item.title,
                order_id: orderData.id,
                prefill: {
                    name: user.name || user.displayName || '',
                    email: user.email || ''
                },
                theme: { color: '#4f46e5' },
                handler: async (response) => {
                    // Step 4: Verify payment on backend
                    try {
                        const verifyRes = await fetch(`${API_BASE_URL}/api/payment/verify-payment`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                            body: JSON.stringify({
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature,
                                testId: item.id || item._id,
                                seriesId: item.id || item._id,
                                userId: uid,
                                couponCode: finalCouponCode
                            })
                        });
                        const verifyData = await verifyRes.json();
                        if (verifyRes.ok && verifyData.success) {
                            const newOrder = {
                                id: response.razorpay_order_id,
                                seriesId: item.id || item._id,
                                testTitle: item.title,
                                amount: finalPrice,
                                status: 'paid',
                                couponCode: finalCouponCode,
                                discountAmount,
                                razorpayOrderId: response.razorpay_order_id,
                                createdAt: new Date().toISOString()
                            };
                            setOrders(prev => [newOrder, ...prev]);
                            try {
                                const cached = JSON.parse(localStorage.getItem(`apex_cache_orders_${uid}`) || '[]');
                                localStorage.setItem(`apex_cache_orders_${uid}`, JSON.stringify([newOrder, ...cached]));
                            } catch (_) { }
                            
                            if (finalCouponCode) {
                                setCouponPopup({ type: 'success', message: 'Congratulations! Coupon Applied Successfully', discount: discountAmount });
                                setTimeout(() => setCouponPopup(null), 4000);
                            } else {
                                alert(`✅ Payment successful! You are enrolled in "${item.title}".`);
                            }
                        } else {
                            alert(verifyData.message || verifyData.error || 'Payment verification failed.');
                        }
                    } catch (err) {
                        alert('Verification error: ' + err.message);
                    }
                },
                modal: {
                    ondismiss: () => console.log('Payment modal closed')
                }
            });
            rzp.open();
        } catch (err) {
            alert('Payment error: ' + err.message);
        }
    };

    // Backend now strictly enforces filtering based on user.category.
    // We can trust the API response directly.
    // Filter Tests
    // 1. Filter by Paid/Free tab
    // 2. Filter out tests that belong to a SERIES (they should only show in Series section)
    const seriesTestIds = new Set(series.flatMap(s => s.testIds || []).map(String));

    // Build set of enrolled series IDs from purchase orders
    const enrolledSeriesIds = new Set(orders.map(o => o.seriesId).filter(Boolean).map(String));

    const relevantTests = tests.filter(test => {
        // Exclude ALL tests that are part of ANY active series
        // Since they will be displayed natively inside the enrolled or explore sections of the series tab
        if (seriesTestIds.has(String(test._id))) return false;

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
        router.push(`/exam/${testId}`);
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
        <div className="w-[260px] bg-[#8b5cf6] flex-shrink-0 flex flex-col h-full z-20 hidden md:flex rounded-[2rem] overflow-hidden shadow-sm m-6 my-6 border-none relative">
            <div className="p-8 flex items-center gap-3 mt-2">
                <div className="bg-white p-1 rounded-xl shadow-inner border border-white/10 flex-shrink-0 w-10 h-10 flex items-center justify-center">
                    <img src="/logo.png" alt="Apex Logo" className="w-full h-full object-contain" />
                </div>
                <span className="text-white font-black text-2xl tracking-tighter">APEX</span>
            </div>

            <nav className="flex-1 px-4 space-y-2 mt-2 overflow-y-auto w-full custom-scrollbar">
                {[
                    { id: 'dashboard', label: 'Dashboard', icon: <BarChart size={20} className="shrink-0" /> },
                    { id: 'tests', label: 'Library', icon: <Search size={20} className="shrink-0" /> },
                    { id: 'notes', label: 'Study Notes', icon: <FileText size={20} className="shrink-0" /> },
                    { id: 'analytics', label: 'Performance', icon: <TrendingUp size={20} className="shrink-0" /> },
                    { id: 'orders', label: 'My Orders', icon: <CheckCircle size={20} className="shrink-0" /> },
                    { id: 'profile', label: 'Profile Settings', icon: <User size={20} className="shrink-0" /> },
                ].map(item => (
                    <button
                        key={item.id}
                        onClick={() => setActiveSection(item.id)}
                        className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all duration-300 font-bold group ${activeSection === item.id
                            ? 'bg-white/20 text-white shadow-sm backdrop-blur-md border border-white/10'
                            : 'text-white/60 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        <span className={`transition-transform duration-300 ${activeSection === item.id ? 'scale-110' : 'group-hover:scale-110'}`}>
                            {item.icon}
                        </span>
                        <span className="text-[14px] tracking-wide text-left">{item.label}</span>
                    </button>
                ))}
            </nav>

            <div className="p-4 mb-4">
                <button className="flex items-center gap-4 px-5 py-3.5 w-full text-white/60 hover:text-white hover:bg-white/5 rounded-2xl transition-colors font-bold group">
                    <span className="group-hover:scale-110 transition-transform shrink-0"><LogOut size={20} /></span>
                    <span className="text-[14px] tracking-wide text-left">Logout</span>
                </button>
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
        const [libTab, setLibTab] = useState('series');

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
                <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4 border-b border-gray-100 pb-4">
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Library</h1>
                        <p className="text-gray-500 font-medium">Explore premium packages and mock tests.</p>
                    </div>
                    
                    {/* Tab Switcher */}
                    <div className="flex items-center gap-2 bg-purple-50 p-1.5 rounded-2xl border border-purple-100 shadow-sm">
                        <button 
                            onClick={() => setLibTab('series')}
                            className={`px-5 py-2.5 rounded-xl font-black text-sm transition-all duration-300 ${libTab === 'series' ? 'bg-[#8b5cf6] text-white shadow-md scale-100' : 'text-[#8b5cf6] opacity-70 hover:opacity-100 hover:bg-white/50 scale-95'}`}
                        >
                            Test Series
                        </button>
                        <button 
                            onClick={() => setLibTab('tests')}
                            className={`px-5 py-2.5 rounded-xl font-black text-sm transition-all duration-300 ${libTab === 'tests' ? 'bg-[#8b5cf6] text-white shadow-md scale-100' : 'text-[#8b5cf6] opacity-70 hover:opacity-100 hover:bg-white/50 scale-95'}`}
                        >
                            Mock Tests
                        </button>
                    </div>
                </div>

                {libTab === 'series' ? (
                    <div className="animate-in fade-in zoom-in-[0.98] duration-300">
                        <div className="flex items-center gap-2 mb-6 ml-2">
                            <Star className="text-amber-500 fill-amber-500" size={24} />
                            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Premium Packages</h2>
                        </div>
                        {series.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {series.map(s => (
                                    <SeriesCard
                                        key={s._id || s.id}
                                        series={s}
                                        onAction={(series) => processDemoPayment(series, 'series')}
                                        actionLabel={enrolledSeriesIds.has(String(s._id || s.id)) ? 'View Series' : (s.price > 0 ? 'Buy Now' : 'Start Free')}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
                                <BookOpen className="mx-auto text-gray-300 mb-4" size={40} />
                                <h3 className="text-xl font-bold text-gray-900">No Test Series Found</h3>
                                <p className="text-gray-500 mt-2">Packages will appear here once available.</p>
                            </div>
                        )}
                    </div>
                ) : (
                <div className="animate-in fade-in zoom-in-[0.98] duration-300 space-y-8">
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

                <div className="flex items-center gap-2 mb-2 ml-2">
                    <Target className="text-purple-500" size={24} />
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">Available Mock Tests</h2>
                </div>

                {/* Filtered Grid */}
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
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
                )}
            </div>
        );
    };

    // 5. Dashboard Home (Premium UI matching reference)
    const DashboardHome = () => {
        const [searchTerm, setSearchTerm] = useState('');
        const globalSearchResults = (searchTerm.length >= 2) ? [
            ...tests.map(t => ({...t, type: 'Test'})),
            ...series.map(s => ({...s, type: 'Package'}))
        ].filter(item => item.title?.toLowerCase().includes(searchTerm.toLowerCase())).slice(0, 5) : [];

        return (
        <div className="max-w-[1400px] w-full animate-in fade-in duration-500 pb-16">
            
            {/* Top Bar Navigation */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-8 mt-2 px-2">
                <div className="w-full md:w-96 relative group z-50">
                    <input 
                        type="text" 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search tests or packages..." 
                        className="w-full bg-slate-50 border border-slate-100 rounded-full py-3 pl-12 pr-4 text-sm font-bold text-slate-600 focus:outline-none focus:ring-4 focus:ring-purple-500/10 focus:border-purple-200 transition-all shadow-sm" 
                    />
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#8b5cf6] transition-colors" size={18} />
                    
                    {/* Search Dropdown */}
                    {searchTerm.length >= 2 && (
                        <div className="absolute top-full mt-2 w-full bg-white rounded-2xl shadow-xl shadow-purple-500/10 border border-slate-100 p-2 overflow-hidden flex flex-col gap-1 z-50 max-h-64 overflow-y-auto custom-scrollbar">
                            {globalSearchResults.length > 0 ? globalSearchResults.map((item, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => {
                                        setSearchTerm('');
                                        if(item.type === 'Test') handleStartTest(item._id);
                                        if(item.type === 'Package') window.location.href = `/series/${item.id}`;
                                    }}
                                    className="flex items-center gap-3 w-full p-3 hover:bg-slate-50 rounded-xl transition-colors text-left"
                                >
                                    <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center shrink-0">
                                        {item.type === 'Test' ? <Target size={14} className="text-purple-600"/> : <BookOpen size={14} className="text-purple-600"/>}
                                    </div>
                                    <div className="flex-1 overflow-hidden">
                                        <p className="text-[13px] font-bold text-slate-800 truncate">{item.title}</p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.type}</p>
                                    </div>
                                </button>
                            )) : <div className="p-4 text-center text-xs text-slate-400 font-bold">No results found.</div>}
                        </div>
                    )}
                </div>
                
                <div className="flex items-center gap-6 self-end md:self-auto">
                    <div className="flex items-center gap-3">
                        <div className="hidden sm:block text-right">
                            <p className="text-sm font-black text-slate-800 leading-tight tracking-tight">{user.name || 'Student'}</p>
                            <p className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">{userField || 'Student'}</p>
                        </div>
                        <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-orange-400 to-amber-300 p-0.5 shadow-md">
                            <div className="bg-white h-full w-full rounded-full overflow-hidden">
                                <img src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}&backgroundColor=f8fafc`} alt="Avatar" className="w-full h-full object-cover" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Hero Banner */}
            <div className="bg-[#8b5cf6] rounded-[32px] p-8 md:p-12 mb-10 mx-2 relative overflow-visible flex items-center justify-between min-h-[220px]">
                {/* Background Decor */}
                <div className="absolute inset-0 z-0 overflow-hidden rounded-[32px]">
                    <div className="absolute top-10 left-20 w-4 h-4 rounded-full bg-purple-400 opacity-60 mix-blend-screen"></div>
                    <div className="absolute bottom-10 left-10 w-2 h-2 rounded-full bg-white opacity-80 mix-blend-screen"></div>
                    <div className="absolute top-1/2 left-1/2 w-3 h-3 rounded-full bg-teal-300 opacity-80 mix-blend-screen"></div>
                </div>
                
                <div className="relative z-10 w-full md:w-[60%]">
                    <p className="text-purple-200 font-medium text-[11px] tracking-widest uppercase mb-4">
                        {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                    <h1 className="text-3xl md:text-4xl font-black text-white mb-3 tracking-tight">
                        Welcome back, {user.name ? user.name.split(' ')[0] : 'Hero'}!
                    </h1>
                    <p className="text-purple-100 text-sm font-medium opacity-90 max-w-sm">
                        Always stay updated in your student portal
                    </p>
                </div>
                
                {/* Embedded Abstract Student UI */}
                <div className="absolute right-0 bottom-0 top-0 hidden md:flex items-center justify-end pointer-events-none z-20 w-[40%] text-white">
                    <div className="relative w-[340px] h-[100%] overflow-visible pr-8">
                        {/* Books / Notes Float */}
                        <div className="absolute top-[10%] left-4 bg-white/20 backdrop-blur-md p-4 rounded-2xl shadow-xl shadow-purple-900/20 animate-bounce" style={{ animationDuration: '3.5s' }}>
                            <BookOpen size={28} className="drop-shadow-lg" />
                        </div>
                        <div className="absolute bottom-[20%] left-8 bg-amber-400 backdrop-blur-md p-4 rounded-full shadow-[0_0_30px_rgba(251,191,36,0.6)] animate-pulse" style={{ animationDuration: '2.5s' }}>
                            <Target size={28} className="drop-shadow-lg" />
                        </div>
                        <div className="absolute top-[35%] right-6 bg-[#9059e5] border border-white/10 backdrop-blur-md p-3 rounded-xl shadow-xl transform rotate-12 flex flex-col items-center justify-center gap-1">
                            <Star size={20} className="drop-shadow-lg fill-amber-300 text-amber-300" />
                            <span className="text-[10px] font-black tracking-widest text-amber-100 uppercase">Pro</span>
                        </div>
                        
                        {/* Center Student Avatar */}
                        <div className="absolute top-1/2 -translate-y-[45%] right-16 bg-white/10 backdrop-blur-sm border-[6px] border-white/20 p-8 rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.2)] flex items-center justify-center -z-10">
                            <span className="text-[80px] drop-shadow-2xl leading-none" role="img" aria-label="Student">👨‍🎓</span>
                        </div>
                        
                        {/* A+ Badge floating */}
                        <div className="absolute bottom-[10%] right-20 bg-emerald-400 backdrop-blur-md px-3 py-2 rounded-xl shadow-lg border border-emerald-300 transform -rotate-12 animate-bounce" style={{ animationDuration: '4s' }}>
                            <span className="text-[16px] font-black text-emerald-50">A+</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 px-2">
                {/* Left Area (Stats & Courses) */}
                <div className="xl:col-span-2 space-y-10">
                    
                    {/* Activity Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        
                        {/* Tests Taken */}
                        <div className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-100 hover:shadow-md hover:border-purple-200 transition-all flex flex-col items-center justify-center text-center">
                            <div className="w-full flex justify-between items-start mb-4">
                                <h2 className="text-sm font-black text-slate-800 tracking-tight">Tests Taken</h2>
                                <Target className="text-purple-500" size={18} />
                            </div>
                            <div className="w-16 h-16 bg-gradient-to-tr from-purple-100 to-indigo-50 rounded-full flex items-center justify-center mb-4">
                                <Activity className="text-purple-600" size={28} />
                            </div>
                            <h3 className="text-2xl font-black text-slate-800 tracking-tight">{quickStats.totalTests}</h3>
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">Total Attempted</p>
                        </div>
                        
                        {/* Accuracy */}
                        <div className="bg-white rounded-[24px] p-6 shadow-[0_0_0_2px_rgba(139,92,246,1)] border border-transparent flex flex-col items-center justify-center text-center transform scale-[1.02] relative my-2 md:my-0">
                            <div className="w-full flex justify-between items-start mb-4">
                                <h2 className="text-sm font-black text-slate-800 tracking-tight">Accuracy</h2>
                                <Target className="text-purple-500" size={18} />
                            </div>
                            <div className="w-16 h-16 bg-gradient-to-tr from-purple-100 to-indigo-50 rounded-full flex items-center justify-center mb-4">
                                <TrendingUp className="text-purple-600" size={28} />
                            </div>
                            <h3 className="text-2xl font-black text-slate-800 tracking-tight">{quickStats.avgAccuracy}%</h3>
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">Average Maintained</p>
                        </div>

                        {/* Expected */}
                        <div className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-100 hover:shadow-md hover:border-purple-200 transition-all flex flex-col items-center justify-center text-center">
                            <div className="w-full flex justify-between items-start mb-4">
                                <h2 className="text-sm font-black text-slate-800 tracking-tight">{userField === 'JEE Main' && aiPercentile !== 'N/A' ? 'Percentile' : 'Avg Score'}</h2>
                                <Target className="text-purple-500" size={18} />
                            </div>
                            <div className="w-16 h-16 bg-gradient-to-tr from-purple-100 to-indigo-50 rounded-full flex items-center justify-center mb-4">
                                <Award className="text-purple-600" size={28} />
                            </div>
                            <h3 className="text-2xl font-black text-slate-800 tracking-tight">{userField === 'JEE Main' && aiPercentile !== 'N/A' ? aiPercentile.split(' ')[0] : quickStats.avgScore}</h3>
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">{userField === 'JEE Main' && aiPercentile !== 'N/A' ? 'Expected Range' : 'Avg Marks'}</p>
                        </div>
                    </div>

                    {/* Enrolled Test Series */}
                    <div>
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-[16px] font-black text-slate-800 tracking-tight">Enrolled Test Series</h2>
                            <button onClick={() => setActiveSection('orders')} className="text-xs font-bold text-[#8b5cf6] hover:text-purple-800 tracking-wide hover:underline">See all</button>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 z-10 relative">
                            {enrolledSeries.length > 0 ? enrolledSeries.slice(0, 2).map((s, idx) => (
                                <div key={s.id} className={`bg-gradient-to-br ${idx === 0 ? 'from-[#f1e6ff] to-[#e4d1ff]' : 'from-[#e9e3ff] to-[#d6cbff]'} rounded-[24px] p-6 border-2 border-transparent relative overflow-hidden group hover:border-[#8b5cf6]/30 transition-colors shadow-sm`}>
                                    <div className="absolute right-2 bottom-2 opacity-50 w-24 h-24">
                                        {idx === 0 ? <img src="/logo.png" className="w-full h-full object-contain grayscale opacity-30" /> : <BarChart size={90} className="text-[#8b5cf6] opacity-30" />}
                                    </div>
                                    <h3 className="text-[15px] font-black text-[#5a3da4] mb-6 max-w-[70%] leading-snug">{s.title}</h3>
                                    <button onClick={() => window.location.href = `/series/${s.id}`} className="bg-[#8b5cf6] text-white px-8 py-2.5 rounded-full font-bold text-[13px] shadow-sm hover:bg-[#784bd2] hover:shadow-md transition-all active:scale-95">
                                        View
                                    </button>
                                </div>
                            )) : (
                                <div className="col-span-2 bg-[#f4f2f9] border border-[#ebe4f7] rounded-[24px] p-8 text-center shadow-sm">
                                    <p className="text-[#8b5cf6] font-bold text-sm mb-4">You haven't enrolled in any packages yet.</p>
                                    <button onClick={() => setActiveSection('series')} className="bg-[#8b5cf6] text-white px-8 py-3 rounded-full font-bold text-[13px] shadow-sm hover:bg-[#784bd2] transition-colors">
                                        Explore Premium Library
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                    
                </div>

                {/* Right Area */}
                <div className="space-y-10">
                    
                    {/* Login Streak */}
                    <div>
                        <h2 className="text-[16px] font-black text-slate-800 mb-5 tracking-tight">Login Streak</h2>
                        <div className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-[28px] shadow-lg shadow-orange-500/20 p-6 text-white flex items-center justify-between border-2 border-orange-300/50 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl z-0 group-hover:bg-white/20 transition-all"></div>
                            <div className="relative z-10">
                                <h3 className="text-4xl font-black tracking-tight mb-1 drop-shadow-sm">{user.loginStreak || 3}</h3>
                                <p className="text-[11px] font-bold uppercase tracking-widest text-orange-100">Days Active</p>
                            </div>
                            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/20 relative z-10 shadow-inner group-hover:scale-110 transition-transform">
                                <Zap size={32} className="text-yellow-200 fill-yellow-200" />
                            </div>
                        </div>
                    </div>

                    {/* Recent Performance Details */}
                    <div>
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-[16px] font-black text-slate-800 tracking-tight">Recent Activity</h2>
                            <button onClick={() => setActiveSection('analytics')} className="text-xs font-bold text-[#8b5cf6] tracking-wide hover:underline">See all</button>
                        </div>
                        
                        <div className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-100 space-y-4">
                            {results.slice(0, 2).map((r, i) => (
                                <div key={i} className="group relative">
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-purple-200 rounded-full group-hover:bg-[#9059e5] transition-colors"></div>
                                    <div className="pl-4">
                                        <h4 className="text-[13px] font-black text-slate-800 mb-1 leading-snug line-clamp-2">{r.testId?.title || 'Mock Test Completed'}</h4>
                                        <p className="text-[11px] text-slate-500 mb-2 leading-relaxed font-bold">
                                            Score: {r.score} · Accuracy: {r.accuracy}%
                                        </p>
                                        <button onClick={() => setActiveSection('analytics')} className="text-[11px] font-bold text-[#8b5cf6] hover:underline">See Summary</button>
                                    </div>
                                    {i === 0 && <div className="h-px bg-slate-50 my-4 -mx-2"></div>}
                                </div>
                            ))}
                            {results.length === 0 && (
                                <div className="text-center py-4">
                                    <Activity className="mx-auto text-slate-300 mb-2" size={24} />
                                    <p className="text-xs text-slate-500 font-bold">No tests taken.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

            </div>
        </div>
        );
    };

    return (
        <div className="min-h-screen bg-[#f4f2f9] overflow-hidden flex items-center justify-center font-sans">
            <div className="w-full max-w-[1700px] h-screen md:h-[calc(100vh-[3rem])] md:max-h-[96vh] bg-white md:rounded-[40px] md:shadow-[0_8px_40px_rgba(139,92,246,0.08)] flex flex-col md:flex-row overflow-hidden relative mx-auto md:m-6 border md:border-slate-100/50">
                <Sidebar />

                {/* Mobile Header (Fixed Top) */}
                <div className="md:hidden bg-[#8b5cf6] text-white px-6 py-4 flex justify-between items-center sticky top-0 z-40 shadow-sm rounded-b-[2rem] mx-2 mt-2 border-none border-transparent">
                    <div className="flex items-center gap-3">
                        <div className="bg-white p-1 rounded-xl shadow-inner border border-white/10 flex-shrink-0 w-8 h-8 flex items-center justify-center">
                            <img src="/logo.png" alt="Apex Logo" className="w-full h-full object-contain" />
                        </div>
                        <span className="font-black text-xl tracking-tighter">APEX</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center font-bold text-xs backdrop-blur-sm shadow-inner">
                            {user.name?.charAt(0)}
                        </div>
                    </div>
                </div>

                {/* Scrollable Main Area */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar bg-white">
                    <div className="p-4 md:p-8 max-w-[1400px] mx-auto pb-24 md:pb-8 w-full min-h-full">
                        {activeSection === 'notes' ? <NotesSection /> :
                        activeSection === 'orders' ? <OrdersView /> :
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
                                        activeSection === 'series' ? <TestsLibrary /> :
                                            <DashboardHome />}
                    </div>
                </div>

                {/* 3D Mobile Dock (Bottom Navigation) */}
                <div className="md:hidden fixed bottom-6 left-4 right-4 z-50">
                    <div className="bg-white/80 backdrop-blur-2xl border border-white/60 shadow-[0_20px_50px_-5px_rgba(139,92,246,0.15),_inset_0_2px_10px_rgba(255,255,255,1)] flex justify-between items-center rounded-[2rem] px-2 py-2">
                        {[
                            { id: 'dashboard', icon: <BarChart size={20} />, label: 'Home' },
                            { id: 'tests', icon: <Search size={20} />, label: 'Library' },
                            { id: 'notes', icon: <BookOpen size={20} />, label: 'Notes' },
                            { id: 'analytics', icon: <TrendingUp size={20} />, label: 'Stats' },
                            { id: 'profile', icon: <User size={20} />, label: 'Profile' },
                        ].map(item => {
                            const isActive = activeSection === item.id;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => setActiveSection(item.id)}
                                    className={`relative flex flex-col items-center justify-center w-[52px] h-[52px] rounded-2xl transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${isActive ? 'text-white translate-y-[-10px]' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    {/* Active State 3D Bubble background */}
                                    {isActive && (
                                        <div className="absolute inset-0 bg-gradient-to-b from-[#9059e5] to-[#784bd2] rounded-2xl shadow-[0_12px_24px_-6px_rgba(139,92,246,0.6),_inset_0_2px_4px_rgba(255,255,255,0.4)] -z-10 animate-in zoom-in-50 duration-300"></div>
                                    )}
                                    
                                    <div className={`transition-all duration-300 ${isActive ? 'scale-110 drop-shadow-md' : 'scale-100 group-hover:scale-110'}`}>
                                        {item.icon}
                                    </div>
                                    <span className={`text-[10px] font-black tracking-wide mt-1 transition-all duration-300 absolute -bottom-5 ${isActive ? 'opacity-100 text-[#8b5cf6]' : 'opacity-0'}`}>
                                        {item.label}
                                    </span>
                                </button>
                            )
                        })}
                    </div>
                </div>
            </div>

            {/* COUPON INPUT MODAL */}
            {couponModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl relative">
                        <button onClick={() => { setCouponModal(null); setCouponCode(''); setCouponResult(null); }} className="absolute -top-3 -right-3 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-red-100 hover:text-red-500 transition-colors shadow-sm">
                            <X size={16} />
                        </button>
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-indigo-50 text-indigo-500 rounded-2xl flex items-center justify-center mx-auto mb-4 rotate-12 shadow-sm text-3xl">🎟️</div>
                            <h3 className="text-2xl font-black text-gray-900">Have a Coupon?</h3>
                            <p className="text-gray-500 text-sm mt-1">Enter a code to get a discount on <span className="font-bold text-gray-700">{couponModal.item.title}</span></p>
                        </div>
                        <div className="space-y-4">
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Enter Code (e.g. SAVE50)"
                                    value={couponCode}
                                    onChange={e => { setCouponCode(e.target.value.toUpperCase()); setCouponResult(null); }}
                                    onKeyDown={e => e.key === 'Enter' && handleValidateCoupon()}
                                    className="w-full pl-5 pr-28 py-4 rounded-xl border border-gray-200 font-mono font-bold text-gray-900 bg-gray-50 uppercase tracking-widest focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                                <button
                                    onClick={handleValidateCoupon}
                                    disabled={!couponCode || couponLoading}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-gray-900 text-white px-4 py-2 rounded-lg font-bold text-sm disabled:opacity-50 hover:bg-indigo-600 transition-colors"
                                >
                                    {couponLoading ? '...' : 'Apply'}
                                </button>
                            </div>
                            {couponResult && (
                                <div className={`p-4 rounded-xl text-sm font-bold flex items-start gap-3 ${couponResult.valid ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                                    {couponResult.valid ? <CheckCircle size={18} className="shrink-0 mt-0.5" /> : <X size={18} className="shrink-0 mt-0.5" />}
                                    <div>
                                        <p>{couponResult.message || couponResult.reason}</p>
                                        {couponResult.valid && (
                                            <p className="mt-1 text-xs opacity-80">Original ₹{couponModal.item.price} → Final <strong>₹{couponResult.finalPrice}</strong> (Save ₹{couponResult.discountAmount})</p>
                                        )}
                                    </div>
                                </div>
                            )}
                            <div className="pt-4 grid grid-cols-2 gap-3">
                                <button onClick={() => { setCouponModal(null); setCouponCode(''); setCouponResult(null); proceedToPayment(couponModal.item, couponModal.type, null); }} className="px-4 py-3 text-gray-500 font-bold hover:bg-gray-50 rounded-xl transition-colors text-sm border border-gray-200">
                                    Skip & Pay ₹{couponModal.item.price}
                                </button>
                                <button
                                    onClick={() => proceedToPayment(couponModal.item, couponModal.type, couponResult?.valid ? couponResult : null)}
                                    className="px-4 py-3 bg-indigo-600 text-white font-black rounded-xl hover:bg-indigo-700 shadow-lg transition-all active:scale-95"
                                >
                                    {couponResult?.valid ? `Pay ₹${couponResult.finalPrice}` : 'Proceed →'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* SUCCESS / ERROR POPUP */}
            {couponPopup && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setCouponPopup(null)}>
                    <div className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-2xl flex flex-col items-center text-center max-w-sm w-full" onClick={e => e.stopPropagation()}>
                        <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-5 shadow-xl ${couponPopup.type === 'success' ? 'bg-gradient-to-br from-green-400 to-emerald-600 shadow-green-200' : 'bg-red-500 shadow-red-200'}`}>
                            {couponPopup.type === 'success' ? <CheckCircle size={40} className="text-white" /> : <X size={40} className="text-white" />}
                        </div>
                        <h2 className="text-3xl font-black text-gray-900 mb-2">{couponPopup.type === 'success' ? '🎉 Woohoo!' : 'Oops!'}</h2>
                        <p className="text-gray-600 font-bold">{couponPopup.message}</p>
                        {couponPopup.type === 'success' && couponPopup.discount > 0 && (
                            <div className="mt-4 bg-green-50 text-green-700 px-6 py-2 rounded-full font-black text-xl border border-green-200">
                                You Saved ₹{couponPopup.discount}!
                            </div>
                        )}
                        <button onClick={() => setCouponPopup(null)} className="mt-6 w-full py-4 bg-gray-900 text-white font-bold rounded-2xl hover:bg-indigo-600 transition-colors">
                            Awesome!
                        </button>
                    </div>
                </div>
            )}
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
                        <label className="block text-sm font-bold text-gray-700 mb-1.5 md:mb-2">Private Institute Code (Optional)</label>
                        <input
                            type="text"
                            value={profileForm.instituteCode}
                            onChange={(e) => setProfileForm({ ...profileForm, instituteCode: e.target.value })}
                            className="w-full px-3 py-2.5 md:px-4 md:py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition bg-gray-50 text-sm md:text-base"
                            placeholder="e.g. SCALER"
                        />
                        <p className="text-[10px] md:text-xs text-indigo-600 mt-1.5 md:mt-2 flex items-center gap-1">
                            <BookOpen size={12} />
                            Provide a code to access exclusive tests and dashboards.
                        </p>
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
