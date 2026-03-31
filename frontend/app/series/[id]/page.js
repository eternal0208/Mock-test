'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { API_BASE_URL } from '@/lib/config';
import { ArrowLeft, BookOpen, Clock, BarChart, Lock, Unlock, PlayCircle, ChevronDown, ChevronUp, ShieldCheck, CreditCard, Loader2, X, CheckCircle, Tag } from 'lucide-react';
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
    const [paymentMessage, setPaymentMessage] = useState(null);

    // ── Coupon State ──────────────────────────────────────────────────────
    const [showCouponModal, setShowCouponModal] = useState(false);
    const [couponCode, setCouponCode] = useState('');
    const [couponResult, setCouponResult] = useState(null);
    const [couponLoading, setCouponLoading] = useState(false);
    const [couponPopup, setCouponPopup] = useState(null); // { type: 'success'|'error', message, discount }

    // Check access and fetch series data
    useEffect(() => {
        const fetchSeriesDetails = async () => {
            if (!user) return;
            try {
                const token = await user.getIdToken();
                const headers = { 'Authorization': `Bearer ${token}` };

                const res = await fetch(`${API_BASE_URL}/api/tests/series/${id}`, { headers });
                if (!res.ok) { alert("Series not found"); router.push('/dashboard'); return; }

                const data = await res.json();
                setSeries(data.series);
                const sortedTests = (data.tests || []).sort((a, b) => (a.title || '').localeCompare(b.title || '', undefined, { numeric: true, sensitivity: 'base' }));
                setTests(sortedTests);

                const accessResult = await checkUserAccess(id, user.uid);
                if (accessResult.hasAccess) setIsEnrolled(true);
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

    // Validate coupon against backend
    const handleValidateCoupon = async () => {
        if (!couponCode.trim()) { setCouponResult({ valid: false, reason: 'Please enter a coupon code' }); return; }
        setCouponLoading(true); setCouponResult(null);
        try {
            const token = await user.getIdToken();
            const res = await fetch(`${API_BASE_URL}/api/payment/validate-coupon`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ code: couponCode, userId: user.uid, seriesId: id, examType: series?.category })
            });
            const data = await res.json();
            setCouponResult(data);
        } catch (e) {
            setCouponResult({ valid: false, reason: 'Failed to validate coupon. Please try again.' });
        } finally {
            setCouponLoading(false);
        }
    };

    // Handle PAID purchase (called after coupon step)
    const handlePurchase = useCallback(async (appliedCoupon = null) => {
        if (!user || !series) return;
        setPaymentLoading(true);
        setPaymentMessage(null);
        setShowCouponModal(false);

        const originalPrice = Number(series.price) || 0;
        const finalPrice = appliedCoupon ? appliedCoupon.finalPrice : originalPrice;
        const finalCouponCode = appliedCoupon ? appliedCoupon.couponCode : null;
        const discountAmount = appliedCoupon ? appliedCoupon.discountAmount : 0;

        try {
            // If coupon makes it 100% free — do free enrollment + record coupon usage
            if (finalPrice <= 0 && appliedCoupon) {
                const result = await enrollFreeTest(id, user.uid);
                if (result.success) {
                    // Record coupon usage via verify-payment endpoint
                    const token = await user.getIdToken();
                    await fetch(`${API_BASE_URL}/api/payment/verify-payment`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                        body: JSON.stringify({ razorpay_order_id: `FREE_${id}_${Date.now()}`, razorpay_payment_id: 'FREE_COUPON', razorpay_signature: 'DEMO_SUCCESS_SIGNATURE', userId: user.uid, seriesId: id, couponCode: finalCouponCode })
                    });
                    setIsEnrolled(true);
                    setCouponPopup({ type: 'success', message: 'Congratulations! Enrolled for FREE! 🎉', discount: discountAmount });
                    setTimeout(() => setCouponPopup(null), 5000);
                } else {
                    setPaymentMessage({ type: 'error', text: result.error || 'Free enrollment failed.' });
                }
                setPaymentLoading(false);
                return;
            }

            // Create Razorpay order with coupon code
            const token = await user.getIdToken();
            const orderRes = await fetch(`${API_BASE_URL}/api/payment/create-order`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ amount: finalPrice, seriesId: id, userId: user.uid, couponCode: finalCouponCode })
            });
            const orderData = await orderRes.json();
            if (!orderRes.ok) {
                setPaymentMessage({ type: 'error', text: orderData.error || orderData.message || 'Failed to create order.' });
                setPaymentLoading(false);
                return;
            }

            // Backend returned isFree (e.g. coupon applied on server side)
            if (orderData.isFree) {
                setIsEnrolled(true);
                setCouponPopup({ type: 'success', message: 'Congratulations! Enrolled for FREE! 🎉', discount: discountAmount });
                setTimeout(() => setCouponPopup(null), 5000);
                setPaymentLoading(false);
                return;
            }

            // Load Razorpay SDK
            if (!window.Razorpay) {
                await new Promise((resolve, reject) => {
                    const script = document.createElement('script');
                    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
                    script.onload = resolve; script.onerror = reject;
                    document.body.appendChild(script);
                });
            }

            // Open Razorpay checkout
            const rzp = new window.Razorpay({
                key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_live_SKdPiD0l0HQgwS',
                amount: orderData.amount,
                currency: orderData.currency || 'INR',
                name: 'APEX MOCKs',
                description: series.title,
                order_id: orderData.id,
                prefill: { name: user.name || user.displayName || '', email: user.email || '' },
                theme: { color: '#4f46e5' },
                handler: async (response) => {
                    try {
                        const verifyRes = await fetch(`${API_BASE_URL}/api/payment/verify-payment`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                            body: JSON.stringify({
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature,
                                seriesId: id, userId: user.uid, couponCode: finalCouponCode
                            })
                        });
                        const verifyData = await verifyRes.json();
                        if (verifyRes.ok && verifyData.success) {
                            setIsEnrolled(true);
                            if (finalCouponCode) {
                                setCouponPopup({ type: 'success', message: 'Payment Successful! Coupon Applied 🎉', discount: discountAmount });
                                setTimeout(() => setCouponPopup(null), 5000);
                            } else {
                                setPaymentMessage({ type: 'success', text: '🎉 Payment successful! You now have permanent access to this series.' });
                            }
                        } else {
                            setPaymentMessage({ type: 'error', text: verifyData.message || verifyData.error || 'Payment verification failed.' });
                        }
                    } catch (err) {
                        setPaymentMessage({ type: 'error', text: 'Verification error: ' + err.message });
                    }
                    setPaymentLoading(false);
                },
                modal: { ondismiss: () => setPaymentLoading(false) }
            });
            rzp.open();
        } catch (err) {
            setPaymentLoading(false);
            setPaymentMessage({ type: 'error', text: 'Something went wrong. Please try again.' });
        }
    }, [user, series, id, handleFreeEnroll]);

    // Main action handler — show coupon modal for paid, direct enroll for free
    const handleUnlock = () => {
        if (!series) return;
        if (Number(series.price) === 0 || series.isPaid === false) {
            handleFreeEnroll();
        } else {
            // Show coupon modal first
            setCouponCode('');
            setCouponResult(null);
            setShowCouponModal(true);
        }
    };

    if (loading) return <LoadingScreen fullScreen={true} text="Loading Series..." />;
    if (!series) return null;

    const descriptionText = series.description || 'Comprehensive test series designed to boost your preparation.';
    const isLongDesc = descriptionText.length > 150;
    const isFree = Number(series.price) === 0 || series.isPaid === false;

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
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full translate-x-1/3 -translate-y-1/3 blur-3xl group-hover:scale-110 transition-transform duration-1000"></div>
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-50 rounded-full -translate-x-1/4 translate-y-1/4 blur-2xl opacity-60"></div>

                <div className="relative z-10">
                    <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                        <div className="flex-1 min-w-0 w-full">
                            <span className="bg-indigo-600 text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest mb-4 inline-block shadow-lg shadow-indigo-100 italic">
                                {series.category} Series
                            </span>
                            <h1 className="text-2xl sm:text-3xl md:text-5xl font-black text-gray-900 mb-3 leading-tight tracking-tighter break-words">
                                {series.title}
                            </h1>
                            <div className="relative">
                                <p className={`text-gray-500 text-sm md:text-base font-medium leading-relaxed break-words ${!descExpanded && isLongDesc ? 'line-clamp-3' : ''}`}>
                                    {descriptionText}
                                </p>
                                {isLongDesc && (
                                    <button onClick={() => setDescExpanded(!descExpanded)} className="mt-2 text-indigo-600 hover:text-indigo-700 font-bold text-sm flex items-center gap-1 transition-colors">
                                        {descExpanded ? (<>Show Less <ChevronUp size={16} /></>) : (<>Show More <ChevronDown size={16} /></>)}
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="w-full md:w-auto shrink-0 bg-gray-50 md:bg-white p-4 md:p-0 rounded-2xl md:rounded-none border md:border-none border-gray-100 shadow-sm md:shadow-none flex flex-row md:flex-col justify-between items-center md:items-end gap-3">
                            <div className="flex flex-col md:items-end">
                                <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest leading-none mb-1">Price</span>
                                <div className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tighter">
                                    {isFree ? (<span className="text-emerald-500">FREE</span>) : (<>₹{series.price}</>)}
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
                                        <><CreditCard size={16} /> Buy Now — ₹{series.price}</>
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
                                        <h3 className="font-black text-gray-900 text-base sm:text-lg transition-colors truncate">{test.title}</h3>
                                        <div className="flex flex-wrap items-center gap-x-3 sm:gap-x-4 gap-y-1 text-[10px] md:text-xs text-gray-400 mt-1 font-bold uppercase tracking-wider">
                                            <span className="flex items-center"><Clock size={12} className="mr-1 text-indigo-400" /> {test.duration_minutes}m</span>
                                            <span className="flex items-center"><BarChart size={12} className="mr-1 text-indigo-400" /> {test.total_marks}pts</span>
                                            <span className="text-indigo-300 font-serif italic lowercase">{test.subject}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="ml-2 sm:ml-4 shrink-0">
                                    {isEnrolled ? (
                                        <button onClick={() => router.push(`/exam/${test._id}`)} className="flex items-center justify-center h-10 w-10 md:w-auto md:px-5 md:py-2 bg-indigo-600 text-white rounded-xl font-black shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-90" title="Start Test">
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

            {/* ─── COUPON MODAL ─────────────────────────────────────────────────────── */}
            {showCouponModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl relative">
                        <button onClick={() => setShowCouponModal(false)} className="absolute -top-3 -right-3 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-red-100 hover:text-red-500 transition-colors shadow-sm">
                            <X size={16} />
                        </button>

                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl rotate-12 shadow-sm">🎟️</div>
                            <h3 className="text-2xl font-black text-gray-900">Have a Coupon?</h3>
                            <p className="text-gray-500 text-sm mt-1">Apply a discount code for <span className="font-bold text-gray-700">{series.title}</span></p>
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
                                            <p className="mt-1 text-xs opacity-80">
                                                Original ₹{series.price} → Final <strong>₹{couponResult.finalPrice}</strong> (Save ₹{couponResult.discountAmount})
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="pt-4 grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => { setShowCouponModal(false); handlePurchase(null); }}
                                    className="px-4 py-3 text-gray-500 font-bold hover:bg-gray-50 rounded-xl transition-colors text-sm border border-gray-200"
                                >
                                    Skip & Pay ₹{series.price}
                                </button>
                                <button
                                    onClick={() => handlePurchase(couponResult?.valid ? couponResult : null)}
                                    className="px-4 py-3 bg-indigo-600 text-white font-black rounded-xl hover:bg-indigo-700 shadow-lg transition-all active:scale-95"
                                >
                                    {couponResult?.valid ? `Pay ₹${couponResult.finalPrice}` : 'Proceed →'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── SUCCESS / ERROR POPUP ────────────────────────────────────────────── */}
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
