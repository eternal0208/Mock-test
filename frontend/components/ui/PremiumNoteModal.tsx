'use client';
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { API_BASE_URL } from '@/lib/config';
import { Crown, Lock, BookOpen, Layers, X, CheckCircle, Loader2, Sparkles } from 'lucide-react';

interface PremiumNoteInfo {
    noteId: string;
    noteTitle: string;
    sectionId: string | null;
    sectionTitle: string;
    notePrice: number;
    sectionPrice: number;
    field: string;
}

interface PremiumNoteModalProps {
    info: PremiumNoteInfo;
    onClose: () => void;
    onSuccess: (noteId: string) => void;
    initialMode?: 'note' | 'section';
}

export default function PremiumNoteModal({ info, onClose, onSuccess, initialMode }: PremiumNoteModalProps) {
    const { user } = useAuth() as any;
    const [buying, setBuying] = useState(false);
    const [success, setSuccess] = useState(false);
    const [selectedOption, setSelectedOption] = useState<'note' | 'section'>(
        initialMode || (info.sectionId ? 'section' : 'note')
    );

    const price = selectedOption === 'section' ? info.sectionPrice : info.notePrice;
    const itemLabel = selectedOption === 'section'
        ? `📚 ${info.sectionTitle || 'Full Section'}`
        : `📄 ${info.noteTitle}`;

    const handleBuy = async () => {
        if (!user) return;
        setBuying(true);
        try {
            const token = await user.getIdToken();
            const uid = user.uid;

            // Step 1: Create Razorpay order
            const orderRes = await fetch(`${API_BASE_URL}/api/payment/create-order`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    amount: price,
                    seriesId: selectedOption === 'section' ? info.sectionId : info.noteId,
                    userId: uid,
                })
            });
            const orderData = await orderRes.json();
            if (!orderRes.ok) throw new Error(orderData.error || 'Failed to create order');

            // Step 2: Load Razorpay SDK
            if (!(window as any).Razorpay) {
                await new Promise<void>((resolve, reject) => {
                    const script = document.createElement('script');
                    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
                    script.onload = () => resolve();
                    script.onerror = () => reject(new Error('Razorpay SDK failed to load'));
                    document.body.appendChild(script);
                });
            }

            // Step 3: Open Razorpay checkout
            const rzp = new (window as any).Razorpay({
                key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_live_SKdPiD0l0HQgwS',
                amount: orderData.amount,
                currency: orderData.currency || 'INR',
                name: 'APEX MOCKs',
                description: itemLabel,
                order_id: orderData.id,
                prefill: {
                    name: user.displayName || user.name || '',
                    email: user.email || ''
                },
                theme: { color: '#6366f1' },
                handler: async (response: any) => {
                    try {
                        const verifyRes = await fetch(`${API_BASE_URL}/api/payment/verify-payment`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                            body: JSON.stringify({
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature,
                                userId: uid,
                                seriesId: selectedOption === 'section' ? info.sectionId : info.noteId,
                                itemType: selectedOption,
                                noteId: info.noteId,
                                sectionId: info.sectionId,
                            })
                        });
                        const verifyData = await verifyRes.json();
                        if (verifyRes.ok && verifyData.success) {
                            setSuccess(true);
                            setTimeout(() => onSuccess(info.noteId), 1800);
                        } else {
                            alert(verifyData.error || 'Payment verification failed. Please contact support.');
                        }
                    } catch (err: any) {
                        alert('Verification error: ' + err.message);
                    } finally {
                        setBuying(false);
                    }
                },
                modal: {
                    ondismiss: () => setBuying(false)
                }
            });
            rzp.open();
        } catch (err: any) {
            alert('Payment error: ' + err.message);
            setBuying(false);
        }
    };

    if (success) {
        return (
            <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[200] flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl p-10 max-w-sm w-full text-center shadow-2xl">
                    <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-5">
                        <CheckCircle className="text-emerald-500" size={44} />
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 mb-2">Access Unlocked! 🎉</h3>
                    <p className="text-slate-500 font-medium">Opening your note now...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[200] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="relative bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-800 p-7 text-white">
                    <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition">
                        <X size={18} />
                    </button>
                    <div className="w-14 h-14 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-4 border border-white/20">
                        <Lock size={28} className="text-white" />
                    </div>
                    <h2 className="text-2xl font-black mb-1">Premium Content</h2>
                    <p className="text-indigo-200 text-sm font-medium leading-snug">
                        Unlock access to study with the best resources
                    </p>
                </div>

                <div className="p-6">
                    {/* Locked Note Title */}
                    <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200 mb-5">
                        <BookOpen size={20} className="text-indigo-500 mt-0.5 shrink-0" />
                        <div>
                            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-0.5">Locked Note</p>
                            <p className="text-sm font-bold text-slate-800 leading-snug">{info.noteTitle}</p>
                        </div>
                    </div>

                    {/* Purchase Options */}
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Choose Access Option</p>

                    <div className="space-y-3 mb-6">
                        {/* Individual Note */}
                        <button
                            onClick={() => setSelectedOption('note')}
                            className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${selectedOption === 'note'
                                ? 'border-indigo-500 bg-indigo-50'
                                : 'border-slate-200 bg-white hover:border-indigo-300'}`}
                        >
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${selectedOption === 'note' ? 'bg-indigo-500' : 'bg-slate-100'}`}>
                                <BookOpen size={18} className={selectedOption === 'note' ? 'text-white' : 'text-slate-500'} />
                            </div>
                            <div className="flex-1">
                                <p className={`text-sm font-bold ${selectedOption === 'note' ? 'text-indigo-800' : 'text-slate-700'}`}>
                                    This Note Only
                                </p>
                                <p className="text-xs text-slate-500 truncate mt-0.5">{info.noteTitle}</p>
                            </div>
                            <span className={`text-lg font-black ${selectedOption === 'note' ? 'text-indigo-600' : 'text-slate-700'}`}>
                                ₹{info.notePrice}
                            </span>
                        </button>

                        {/* Full Section — only if section exists */}
                        {info.sectionId && (
                            <button
                                onClick={() => setSelectedOption('section')}
                                className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${selectedOption === 'section'
                                    ? 'border-purple-500 bg-purple-50'
                                    : 'border-slate-200 bg-white hover:border-purple-300'}`}
                            >
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${selectedOption === 'section' ? 'bg-purple-500' : 'bg-slate-100'}`}>
                                    <Layers size={18} className={selectedOption === 'section' ? 'text-white' : 'text-slate-500'} />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-1.5">
                                        <p className={`text-sm font-bold ${selectedOption === 'section' ? 'text-purple-800' : 'text-slate-700'}`}>
                                            Full Section Access
                                        </p>
                                        <span className="text-[9px] font-black bg-amber-400 text-amber-900 px-1.5 py-0.5 rounded-full uppercase">Best Value</span>
                                    </div>
                                    <p className="text-xs text-slate-500 truncate mt-0.5">{info.sectionTitle || 'All notes in this section'}</p>
                                </div>
                                <span className={`text-lg font-black ${selectedOption === 'section' ? 'text-purple-600' : 'text-slate-700'}`}>
                                    ₹{info.sectionPrice}
                                </span>
                            </button>
                        )}
                    </div>

                    {/* What you get */}
                    <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mb-5">
                        <Sparkles size={14} className="text-amber-400 shrink-0" />
                        {selectedOption === 'section'
                            ? 'Permanent access to all current & future notes in this section'
                            : 'Permanent access to this note on your account'}
                    </div>

                    {/* CTA Button */}
                    <button
                        onClick={handleBuy}
                        disabled={buying}
                        className="w-full py-4 rounded-2xl font-black text-white text-base flex items-center justify-center gap-2 transition active:scale-95 shadow-lg disabled:opacity-60"
                        style={{ background: selectedOption === 'section' ? 'linear-gradient(135deg, #7c3aed, #6366f1)' : 'linear-gradient(135deg, #6366f1, #4f46e5)' }}
                    >
                        {buying ? (
                            <><Loader2 size={18} className="animate-spin" /> Processing...</>
                        ) : (
                            <><Crown size={18} /> Unlock for ₹{price}</>
                        )}
                    </button>

                    <p className="text-center text-xs text-slate-400 mt-3 font-medium">
                        🔒 Secure payment via Razorpay
                    </p>
                </div>
            </div>
        </div>
    );
}
