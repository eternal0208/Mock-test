'use client';
import React, { useMemo, useState } from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
    BarChart, Bar
} from 'recharts';
import { TrendingUp, AlertCircle, Award, Target, Calendar, Clock, ChevronRight } from 'lucide-react';
import Link from 'next/link';

const AnalyticsDashboard = ({ results }) => {
    const [activeTab, setActiveTab] = useState('overall'); // 'overall' | 'history'

    // --- Data Processing ---
    const performanceTrend = useMemo(() => {
        const chronological = [...results].reverse();
        return chronological.map((r, i) => ({
            name: (r.testDetails?.title || r.testId?.title) ? (r.testDetails?.title || r.testId?.title).substring(0, 15) + '...' : `Test ${i + 1}`,
            fullName: r.testDetails?.title || r.testId?.title || `Test ${i + 1}`,
            score: r.score,
            accuracy: r.accuracy,
            date: new Date(r.submittedAt).toLocaleDateString()
        }));
    }, [results]);

    const subjectAnalysis = useMemo(() => {
        const subjects = {};
        results.forEach(r => {
            r.attempt_data.forEach(a => {
                const sub = a.subject || 'General';
                if (!subjects[sub]) subjects[sub] = { total: 0, correct: 0 };
                subjects[sub].total++;
                if (a.isCorrect) subjects[sub].correct++;
            });
        });
        return Object.keys(subjects).map(sub => ({
            subject: sub,
            accuracy: Math.round((subjects[sub].correct / subjects[sub].total) * 100) || 0,
            fullMark: 100
        }));
    }, [results]);

    const weakAreas = useMemo(() => {
        const topics = {};
        results.forEach(r => {
            r.attempt_data.forEach(a => {
                const topic = a.topic;
                const subject = a.subject || 'General';
                if (!topic) return;
                const key = `${subject}||${topic}`;
                if (!topics[key]) topics[key] = { total: 0, correct: 0, subject, topic };
                topics[key].total++;
                if (a.isCorrect) topics[key].correct++;
            });
        });
        return Object.values(topics)
            .map(t => ({
                subject: t.subject,
                topic: t.topic,
                accuracy: Math.round((t.correct / t.total) * 100)
            }))
            .filter(t => t.accuracy < 60)
            .sort((a, b) => a.accuracy - b.accuracy)
            .slice(0, 5);
    }, [results]);

    if (!results || results.length === 0) {
        return <div className="p-8 text-center text-gray-500 bg-gray-50 rounded-xl border border-dashed">No test data available yet. Take a test to see analytics!</div>;
    }

    const latestResult = results[0];
    const avgAccuracy = Math.round(results.reduce((acc, r) => acc + r.accuracy, 0) / results.length);
    const avgScore = Math.round(results.reduce((acc, r) => acc + r.score, 0) / results.length);

    return (
        <div className="space-y-8">
            {/* Tabs / Header Switch */}
            <div className="flex space-x-4 border-b pb-4">
                <button
                    onClick={() => setActiveTab('overall')}
                    className={`text-lg font-bold px-4 py-2 rounded-lg transition-all ${activeTab === 'overall' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}
                >
                    Overall Performance
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    className={`text-lg font-bold px-4 py-2 rounded-lg transition-all ${activeTab === 'history' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}
                >
                    Test Wise History
                </button>
            </div>

            {/* OVERALL SECTION */}
            {activeTab === 'overall' && (
                <div className="space-y-6 animate-fadeIn">
                    {/* Key Metrics Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Tests</p>
                                <h3 className="text-3xl font-black text-gray-800 mt-1">{results.length}</h3>
                            </div>
                            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><Award size={24} /></div>
                        </div>
                        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Avg Accuracy</p>
                                <h3 className="text-3xl font-black text-gray-800 mt-1">{avgAccuracy}%</h3>
                            </div>
                            <div className="p-3 bg-green-50 text-green-600 rounded-lg"><Target size={24} /></div>
                        </div>
                        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Avg Score</p>
                                <h3 className="text-3xl font-black text-gray-800 mt-1">{avgScore}</h3>
                            </div>
                            <div className="p-3 bg-purple-50 text-purple-600 rounded-lg"><TrendingUp size={24} /></div>
                        </div>
                        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Last Score</p>
                                <h3 className="text-3xl font-black text-gray-800 mt-1">{latestResult.score}</h3>
                            </div>
                            <div className="p-3 bg-orange-50 text-orange-600 rounded-lg"><Clock size={24} /></div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Score Trend */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <h3 className="text-lg font-bold text-gray-800 mb-6">Score Progression</h3>
                            <div className="h-72">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={performanceTrend}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                        <YAxis tick={{ fontSize: 12 }} />
                                        <RechartsTooltip
                                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                        />
                                        <Legend />
                                        <Line type="monotone" dataKey="score" name="Score" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                                        <Line type="monotone" dataKey="accuracy" name="Accuracy %" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Subject Strength */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <h3 className="text-lg font-bold text-gray-800 mb-6">Subject Proficiency</h3>
                            <div className="h-72">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={subjectAnalysis} layout="vertical" margin={{ left: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                                        <XAxis type="number" domain={[0, 100]} hide />
                                        <YAxis dataKey="subject" type="category" width={80} tick={{ fontSize: 12, fontWeight: 500 }} />
                                        <RechartsTooltip cursor={{ fill: '#f9fafb' }} />
                                        <Bar dataKey="accuracy" name="Accuracy %" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={20} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Weak Areas */}
                    {weakAreas.length > 0 && (
                        <div className="bg-red-50 p-6 rounded-xl border border-red-100">
                            <h3 className="text-lg font-bold text-red-800 mb-4 flex items-center">
                                <AlertCircle className="mr-2" size={20} /> Focus Areas (Weak Topics)
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {weakAreas.map((w, i) => (
                                    <div key={i} className="bg-white p-4 rounded-lg shadow-sm border border-red-100 flex items-center justify-between">
                                        <div>
                                            <p className="text-xs font-bold text-gray-500 uppercase">{w.subject}</p>
                                            <p className="font-semibold text-gray-800">{w.topic}</p>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-2xl font-bold text-red-500">{w.accuracy}%</span>
                                            <p className="text-[10px] text-gray-400">Accuracy</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* HISTORY SECTION */}
            {activeTab === 'history' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-4 font-bold text-gray-600 text-sm uppercase tracking-wider">Test Name</th>
                                    <th className="px-6 py-4 font-bold text-gray-600 text-sm uppercase tracking-wider">Date</th>
                                    <th className="px-6 py-4 font-bold text-gray-600 text-sm uppercase tracking-wider">Score</th>
                                    <th className="px-6 py-4 font-bold text-gray-600 text-sm uppercase tracking-wider">Accuracy</th>
                                    <th className="px-6 py-4 font-bold text-gray-600 text-sm uppercase tracking-wider text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {results.map((result) => (
                                    <tr key={result._id} className="hover:bg-gray-50 transition">
                                        <td className="px-6 py-4">
                                            <p className="font-bold text-gray-900">{result.testDetails?.title || result.testId?.title || 'Unknown Test'}</p>
                                            <p className="text-xs text-gray-500">{result.testId?._id}</p>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 text-sm">
                                            <div className="flex items-center gap-2">
                                                <Calendar size={14} />
                                                {new Date(result.submittedAt).toLocaleDateString()}
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                                                <Clock size={12} />
                                                {new Date(result.submittedAt).toLocaleTimeString()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-bold text-gray-800 bg-gray-100 px-2 py-1 rounded">{result.score}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-16 bg-gray-200 rounded-full h-1.5">
                                                    <div className={`h-1.5 rounded-full ${result.accuracy >= 80 ? 'bg-green-500' : result.accuracy >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${result.accuracy}%` }}></div>
                                                </div>
                                                <span className="text-sm font-medium">{result.accuracy}%</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Link
                                                href={`/result/${result._id}`}
                                                className="inline-flex items-center text-blue-600 hover:text-blue-800 font-semibold text-sm transition"
                                            >
                                                View Solution & Analysis <ChevronRight size={16} />
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AnalyticsDashboard;
