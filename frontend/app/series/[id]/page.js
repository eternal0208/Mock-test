'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { API_BASE_URL } from '@/lib/config';
import { ArrowLeft, BookOpen, Clock, BarChart, Lock, Unlock, PlayCircle, ChevronDown, ChevronUp, ShieldCheck, CreditCard, Loader2 } from 'lucide-react';
import LoadingScreen from '@/components/ui/LoadingScreen';
import { checkUserAccess, enrollFreeTest, createRazorpayOrder, openRazorpayCheckout } from '@/lib/enrollment';

export default function SeriesDetails() {
    const { id } = useParams();
    const { user } = useAuth();
    const router = useRouter();

    const [series, setSeries] = useState(null);
    const [tests, setTests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isEnrolled, setIsEnrolled] = useState(false);
    const [descExpanded, setDescExpanded] = useState(false);
    const [paymentLoading, setPaymentLoading] = useState(false);
    const [paymentMessage, setPaymentMessage] = useState(null); // { type: 'success' | 'error', text: string }

    // Check access and fetch series data
    useEffect(() => {
        const fetchSeriesDetails = async () => {
            if (!user) return;
            try {
                const token = await user.getIdToken();
                const headers = { 'Authorization': `Bearer ${token}` };

                // 1. Fetch series + tests in one call
                const res = await fetch(`${API_BASE_URL}/api/tests/series/${id}`, { headers });

                if (!res.ok) {
                    alert("Series not found");
                    router.push('/dashboard');
                    return;
                }

                const data = await res.json();
                setSeries(data.series);
                setTests(data.tests || []);

                // 2. Check if user already has access (permanent check)
                const accessResult = await checkUserAccess(id, user.uid);
                if (accessResult.hasAccess) {
                    setIsEnrolled(true);
                } else if (accessResult.isFree) {
                    // Free series - not yet enrolled but can enroll instantly
                    setIsEnrolled(false);
                }
            } catch (err) {
                console.error("Failed to load series", err);
            } finally {
                setLoading(false);
            }
        };
        fetchSeriesDetails();
    }, [id, user, router]);

    // Handle FREE enrollment
    const handleFreeEnroll = useCallback(async () => {
        if (!user || !series) return;
        setPaymentLoading(true);
        setPaymentMessage(null);

        try {
            const result = await enrollFreeTest(id, user.uid);
            if (result.success) {
                setIsEnrolled(true);
                setPaymentMessage({ type: 'success', text: '🎉 Successfully enrolled! You now have full access.' });
            } else {
                setPaymentMessage({ type: 'error', text: result.error || 'Enrollment failed. Please try again.' });
            }
        } catch (err) {
            setPaymentMessage({ type: 'error', text: 'Something went wrong. Please try again.' });
        } finally {
            setPaymentLoading(false);
        }
    }, [user, series, id]);

    // Handle PAID purchase via Razorpay
    const handlePurchase = useCallback(async () => {
        if (!user || !series) return;
        setPaymentLoading(true);
        setPaymentMessage(null);

        try {
            // 1. Create order on backend (backend validates price)
            const orderResult = await createRazorpayOrder(id, user.uid);

            if (!orderResult.success) {
                // Check if backend says it's actually free
                if (orderResult.error?.includes('free')) {
                    await handleFreeEnroll();
                    return;
                }
                setPaymentMessage({ type: 'error', text: orderResult.error || 'Failed to create order.' });
                setPaymentLoading(false);
                return;
            }

            // 2. Open Razorpay checkout
            openRazorpayCheckout(
                orderResult.order,
                user,
                id,
                // onSuccess
                (result) => {
                    setIsEnrolled(true);
                    setPaymentLoading(false);
                    setPaymentMessage({ type: 'success', text: '🎉 Payment successful! You now have permanent access to this series.' });
                },
                // onFailure
                (error) => {
                    setPaymentLoading(false);
                    if (error.message === 'Payment cancelled by user') {
                        setPaymentMessage({ type: 'error', text: 'Payment was cancelled. You can try again anytime.' });
                    } else {
                        setPaymentMessage({ type: 'error', text: error.message || 'Payment failed. Please try again.' });
                    }
                }
            );
        } catch (err) {
            setPaymentLoading(false);
            setPaymentMessage({ type: 'error', text: 'Something went wrong. Please try again.' });
        }
    }, [user, series, id, handleFreeEnroll]);

    // Main action handler
    const handleUnlock = () => {
        if (!series) return;
        if (series.price === 0 || series.isPaid === false) {
            handleFreeEnroll();
        } else {
            handlePurchase();
        }
    };

    if (loading) return <LoadingScreen fullScreen={true} text="Loading Series..." />;
    if (!series) return null;

    const descriptionText = series.description || 'Comprehensive test series designed to boost your preparation.';
    const isLongDesc = descriptionText.length > 150;
    const isFree = series.price === 0 || series.isPaid === false;

    return (
        <div className="min-h-screen bg-gray-50 p-4 sm:p-6 md:p-12">
            <button onClick={() => router.push('/dashboard')} className="flex items-center text-gray-500 mb-6 hover:text-indigo-600 font-bold transition-all group">
                <ArrowLeft size={20} className="mr-2 group-hover:-translate-x-1 transition-transform" /> Back
            </button>

            {/* Payment Status Message */}
            {paymentMessage && (
                <div className={`mb-6 p-4 rounded-2xl font-bold text-sm flex items-center gap-3 shadow-sm ${paymentMessage.type === 'success'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                    {paymentMessage.type === 'success' ? <ShieldCheck size={20} /> : <Lock size={20} />}
                    {paymentMessage.text}
                </div>
            )}

            {/* Header */}
            <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-5 sm:p-6 md:p-10 mb-8 relative overflow-hidden group">
                {/* Decorative Background Blobs */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full translate-x-1/3 -translate-y-1/3 blur-3xl group-hover:scale-110 transition-transform duration-1000"></div>
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-50 rounded-full -translate-x-1/4 translate-y-1/4 blur-2xl opacity-60"></div>

                <div className="relative z-10">
                    {/* Stack vertically on mobile, row on md+ */}
                    <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                        {/* Left: Title + Description */}
                        <div className="flex-1 min-w-0 w-full">
                            <span className="bg-indigo-600 text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest mb-4 inline-block shadow-lg shadow-indigo-100 italic">
                                {series.category} Series
                            </span>
                            <h1 className="text-2xl sm:text-3xl md:text-5xl font-black text-gray-900 mb-3 leading-tight tracking-tighter break-words">
                                {series.title}
                            </h1>

                            {/* Collapsible Description */}
                            <div className="relative">
                                <p className={`text-gray-500 text-sm md:text-base font-medium leading-relaxed break-words ${!descExpanded && isLongDesc ? 'line-clamp-3' : ''}`}>
                                    {descriptionText}
                                </p>
                                {isLongDesc && (
                                    <button
                                        onClick={() => setDescExpanded(!descExpanded)}
                                        className="mt-2 text-indigo-600 hover:text-indigo-700 font-bold text-sm flex items-center gap-1 transition-colors"
                                    >
                                        {descExpanded ? (
                                            <>Show Less <ChevronUp size={16} /></>
                                        ) : (
                                            <>Show More <ChevronDown size={16} /></>
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Right: Price + Action — full width on mobile */}
                        <div className="w-full md:w-auto shrink-0 bg-gray-50 md:bg-white p-4 md:p-0 rounded-2xl md:rounded-none border md:border-none border-gray-100 shadow-sm md:shadow-none flex flex-row md:flex-col justify-between items-center md:items-end gap-3">
                            <div className="flex flex-col md:items-end">
                                <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest leading-none mb-1">Price</span>
                                <div className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tighter">
                                    {isFree ? (
                                        <span className="text-emerald-500">FREE</span>
                                    ) : (
                                        <>₹{series.price}</>
                                    )}
                                </div>
                            </div>

                            {!isEnrolled && (
                                <button
                                    onClick={handleUnlock}
                                    disabled={paymentLoading}
                                    className={`px-6 sm:px-8 py-3 rounded-2xl font-black shadow-xl transition-all flex items-center gap-2 active:scale-95 text-sm whitespace-nowrap disabled:opacity-60 disabled:cursor-not-allowed ${isFree
                                        ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-200'
                                        : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200'
                                        }`}
                                >
                                    {paymentLoading ? (
                                        <><Loader2 size={16} className="animate-spin" /> Processing...</>
                                    ) : isFree ? (
                                        <><Unlock size={16} /> Enroll Free</>
                                    ) : (
                                        <><CreditCard size={16} /> Buy Now ₹{series.price}</>
                                    )}
                                </button>
                            )}
                            {isEnrolled && (
                                <div className="bg-emerald-50 text-emerald-600 px-6 py-2 rounded-xl font-black flex items-center gap-2 border border-emerald-100 text-sm italic whitespace-nowrap">
                                    <ShieldCheck size={16} /> Enrolled
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
                        <div key={test._id} className={`bg-white p-4 sm:p-5 rounded-xl border transition-all ${isEnrolled ? 'hover:shadow-md border-gray-200' : 'opacity-75 border-gray-100'}`}>
                            <div className="flex justify-between items-center gap-3">
                                <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                                    <div className="h-10 w-10 sm:h-12 sm:w-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 font-black border border-indigo-100 shadow-sm shrink-0">
                                        {idx + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-black text-gray-900 text-base sm:text-lg transition-colors truncate">
                                            {test.title}
                                        </h3>
                                        <div className="flex flex-wrap items-center gap-x-3 sm:gap-x-4 gap-y-1 text-[10px] md:text-xs text-gray-400 mt-1 font-bold uppercase tracking-wider">
                                            <span className="flex items-center"><Clock size={12} className="mr-1 text-indigo-400" /> {test.duration_minutes}m</span>
                                            <span className="flex items-center"><BarChart size={12} className="mr-1 text-indigo-400" /> {test.total_marks}pts</span>
                                            <span className="text-indigo-300 font-serif italic lowercase">{test.subject}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="ml-2 sm:ml-4 shrink-0">
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
