'use client';
import React from 'react';
import { motion } from 'framer-motion';
import { Star, Award, CheckCircle, ArrowRight } from 'lucide-react';

/**
 * @param {{ series: any, onAction: Function, actionLabel?: string }} props
 */
const SeriesCard = ({ series, onAction, actionLabel = undefined }) => {
    const isFree = series.price === 0 || series.isPaid === false;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            whileHover={{ y: -8 }}
            className="group bg-white rounded-[2rem] shadow-xl overflow-hidden border border-gray-100 flex flex-col hover:shadow-2xl hover:shadow-indigo-200/40 transition-all duration-500 overflow-hidden relative"
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

                {/* Premium Badge */}
                {!isFree && (
                    <div className="absolute top-4 right-4 bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full text-[10px] font-black uppercase flex items-center gap-1 shadow-lg ring-2 ring-white/50 backdrop-blur-md">
                        <Star size={10} fill="currentColor" /> Premium
                    </div>
                )}

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
                    <h4 className="text-xl md:text-2xl font-black text-gray-900 group-hover:text-indigo-600 transition-colors leading-tight">
                        {series.title}
                    </h4>
                </div>

                <p className="text-gray-500 text-sm mb-6 line-clamp-2 md:line-clamp-3 font-medium leading-relaxed">
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
                <div className="mt-auto pt-6 border-t border-gray-50 flex items-center justify-between gap-4">
                    <div className="flex flex-col">
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Price</span>
                        <div className="flex items-baseline gap-1">
                            {isFree ? (
                                <span className="text-2xl font-black text-emerald-500">FREE</span>
                            ) : (
                                <>
                                    <span className="text-2xl font-black text-gray-900">₹{series.price}</span>
                                    <span className="text-[10px] text-gray-400 line-through">₹{Math.round(series.price * 1.5)}</span>
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
                        className={`px-6 py-3 rounded-2xl font-black text-sm transition-all duration-300 shadow-xl flex items-center gap-2 group/btn active:scale-95 ${isFree
                            ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-200'
                            : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200'
                            }`}
                    >
                        {actionLabel || (isFree ? 'Enroll Now' : `Unlock Series`)}
                        <ArrowRight size={16} className="group-hover/btn:translate-x-1 transition-transform" />
                    </button>
                </div>
            </div>
        </motion.div>
    );
};

export default SeriesCard;
