'use client';
import React from 'react';
import { motion } from 'framer-motion';
import { Star, Award, CheckCircle, ArrowRight } from 'lucide-react';

/**
/**
 * @param {{ series: any, onAction: Function, actionLabel?: string, user?: any }} props
 */
const SeriesCard = ({ series, onAction, actionLabel = undefined, user = null }) => {
    const isFree = series.price === 0 || series.isPaid === false;

    return (
        <div
            className="group bg-white rounded-[2rem] shadow-xl border border-gray-100 flex flex-col hover:shadow-2xl hover:shadow-indigo-200/40 hover:-translate-y-2 transition-all duration-500 overflow-hidden relative"
        >
            {/* Image Section */}
            <div className="h-44 md:h-52 bg-gray-100 relative overflow-hidden">
                {series.image ? (
                    <img
                        src={series.image}
                        alt={series.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
                        <Award size={64} className="opacity-20 group-hover:scale-125 transition-transform duration-700" />
                    </div>
                )}

                {/* Badges Container */}
                <div className="absolute top-4 right-4 flex flex-col gap-2 items-end">
                    {/* Institute Private Badge */}
                    {series.instituteCode && (
                        <div className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-3 py-1.5 rounded-full text-[10px] font-black uppercase flex items-center gap-1.5 shadow-[0_4px_15px_rgba(79,70,229,0.3)] ring-1 ring-white/50 backdrop-blur-md">
                            ✨ {user?.instituteName ? `${user.instituteName.toUpperCase()} EXCLUSIVE` : 'INSTITUTE EXCLUSIVE'}
                        </div>
                    )}
                    {/* Premium Badge */}
                    {!isFree && (
                        <div className="bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-900 px-3 py-1.5 rounded-full text-[10px] font-black uppercase flex items-center gap-1.5 shadow-[0_4px_15px_rgba(251,191,36,0.3)] ring-1 ring-white/60 backdrop-blur-md">
                            <Star size={12} fill="currentColor" /> Premium
                        </div>
                    )}
                </div>

                {/* Category Badge */}
                <div className="absolute bottom-4 left-4 z-20">
                    <span className="px-3 py-1 bg-black/40 backdrop-blur-md text-white rounded-lg text-[10px] font-black uppercase tracking-widest border border-white/20">
                        {series.category}
                    </span>
                </div>

                {/* Overly Gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity"></div>
            </div>

            {/* Content Section */}
            <div className="p-6 md:p-7 flex-1 flex flex-col relative bg-white">
                <div className="flex justify-between items-start mb-3">
                    <h4 className="text-xl md:text-2xl font-black text-slate-900 group-hover:text-indigo-600 transition-colors leading-tight">
                        {series.title}
                    </h4>
                </div>

                <p className="text-slate-500 text-sm mb-6 line-clamp-2 md:line-clamp-3 font-medium leading-relaxed">
                    {series.description || 'Hone your skills with our meticulously designed test series. Simulate real-time exam environments.'}
                </p>

                {/* Features Hint (Hidden on very small mobile if crowded) */}
                {series.features && series.features.length > 0 && (
                    <div className="mb-6 space-y-2 hidden xs:block">
                        {series.features.slice(0, 2).map((feat, i) => (
                            <div key={i} className="flex items-center text-xs text-gray-400 font-semibold uppercase tracking-tight">
                                <CheckCircle size={14} className="text-emerald-500 mr-2 flex-shrink-0" />
                                {feat}
                            </div>
                        ))}
                    </div>
                )}

                {/* Action Row */}
                <div className="mt-auto pt-6 border-t border-slate-100 flex items-center justify-between gap-4">
                    <div className="flex flex-col">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Price</span>
                        <div className="flex items-baseline gap-1.5">
                            {isFree ? (
                                <span className="text-2xl font-black text-emerald-500">FREE</span>
                            ) : (
                                <>
                                    <span className="text-2xl md:text-3xl font-black text-slate-900">₹{series.price}</span>
                                    <span className="text-xs text-slate-400 line-through">₹{Math.round(series.price * 1.5)}</span>
                                </>
                            )}
                        </div>
                    </div>

                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onAction(series);
                        }}
                        className={`px-6 py-3 rounded-2xl font-bold text-sm md:text-base transition-all duration-300 shadow-xl flex items-center gap-2 group/btn hover:-translate-y-0.5 active:scale-95 ${isFree
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-[0_4px_15px_rgba(16,185,129,0.3)] hover:shadow-[0_8px_25px_rgba(16,185,129,0.4)]'
                            : 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-[0_4px_15px_rgba(79,70,229,0.3)] hover:shadow-[0_8px_25px_rgba(79,70,229,0.4)]'
                            }`}
                    >
                        {actionLabel || (isFree ? 'Enroll Now' : `Unlock Series`)}
                        <ArrowRight size={18} className="group-hover/btn:translate-x-1 transition-transform" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SeriesCard;
