'use client';
import React, { useMemo, useState } from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
    BarChart, Bar, AreaChart, Area, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, PieChart, Pie, Cell
} from 'recharts';
import { TrendingUp, AlertCircle, Award, Target, Calendar, Clock, ChevronRight, Zap, Filter, Activity } from 'lucide-react';
import Link from 'next/link';

const AnalyticsDashboard = ({ results }) => {
    const [activeTab, setActiveTab] = useState('overall'); // 'overall' | 'history'
    const [timeRange, setTimeRange] = useState('all'); // 'all', 'last5', 'last10'

    // COLORS for charts
    const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b'];

    // --- Data Processing ---
    const filteredResults = useMemo(() => {
        if (!results) return [];
        let data = [...results];
        if (timeRange === 'last5') data = data.slice(0, 5);
        if (timeRange === 'last10') data = data.slice(0, 10);
        return data;
    }, [results, timeRange]);

    const performanceTrend = useMemo(() => {
        const chronological = [...filteredResults].reverse();
        return chronological.map((r, i) => ({
            name: (r.testDetails?.title || r.testId?.title) ? (r.testDetails?.title || r.testId?.title).substring(0, 10) + '...' : `T${i + 1}`,
            fullName: r.testDetails?.title || r.testId?.title || `Test ${i + 1}`,
            score: r.score,
            accuracy: r.accuracy,
            date: new Date(r.submittedAt).toLocaleDateString()
        }));
    }, [filteredResults]);

    const subjectAnalysis = useMemo(() => {
        const subjects = {};
        filteredResults.forEach(r => {
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
    }, [filteredResults]);

    const questionDistribution = useMemo(() => {
        let total = 0, correct = 0, incorrect = 0, skipped = 0;
        filteredResults.forEach(r => {
            total += r.total_questions || 0;
            correct += r.correct_count || 0;
            incorrect += r.incorrect_count || 0;
            // skipped approximation if not directly available
            skipped += (r.total_questions || 0) - (r.correct_count || 0) - (r.incorrect_count || 0);
        });
        return [
            { name: 'Correct', value: correct, color: '#10b981' },
            { name: 'Incorrect', value: incorrect, color: '#ef4444' },
            { name: 'Skipped', value: skipped > 0 ? skipped : 0, color: '#9ca3af' },
        ];
    }, [filteredResults]);

    const weakAreas = useMemo(() => {
        const topics = {};
        filteredResults.forEach(r => {
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
    }, [filteredResults]);

    if (!results || results.length === 0) {
        return <div className="p-8 text-center text-gray-500 bg-gray-50 rounded-xl border border-dashed">No test data available yet. Take a test to see analytics!</div>;
    }

    const latestResult = results[0];
    const avgAccuracy = results.length > 0 ? Math.round(results.reduce((acc, r) => acc + r.accuracy, 0) / results.length) : 0;
    const avgScore = results.length > 0 ? Math.round(results.reduce((acc, r) => acc + r.score, 0) / results.length) : 0;

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
                        {/* Score Trend - Area Chart */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg transition-all duration-300">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-lg font-black text-gray-800 flex items-center gap-2">
                                    <Activity className="text-indigo-500" /> Performance Trend
                                </h3>
                                <div className="flex bg-gray-100 p-1 rounded-lg">
                                    <button onClick={() => setTimeRange('last5')} className={`px-3 py-1 text-xs font-bold rounded-md transition ${timeRange === 'last5' ? 'bg-white shadow text-indigo-600' : 'text-gray-500'}`}>Last 5</button>
                                    <button onClick={() => setTimeRange('all')} className={`px-3 py-1 text-xs font-bold rounded-md transition ${timeRange === 'all' ? 'bg-white shadow text-indigo-600' : 'text-gray-500'}`}>All Time</button>
                                </div>
                            </div>

                            <div className="h-80">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={performanceTrend}>
                                        <defs>
                                            <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="colorAcc" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                                        <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                                        <RechartsTooltip
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                                            itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                                        />
                                        <Legend wrapperStyle={{ fontSize: '12px', marginTop: '10px' }} />
                                        <Area type="monotone" dataKey="score" name="Score" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" />
                                        <Area type="monotone" dataKey="accuracy" name="Accuracy %" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorAcc)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Subject Strength - Radar Chart (More Premium) */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg transition-all duration-300">
                            <h3 className="text-lg font-black text-gray-800 mb-2 flex items-center gap-2">
                                <Target className="text-purple-500" /> Subject Mastery
                            </h3>
                            <p className="text-xs text-gray-400 mb-4">Your accuracy across different subjects.</p>
                            <div className="h-72">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={subjectAnalysis}>
                                        <PolarGrid stroke="#e5e7eb" />
                                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#6b7280', fontSize: 12, fontWeight: 'bold' }} />
                                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                        <Radar name="Accuracy" dataKey="accuracy" stroke="#8b5cf6" strokeWidth={3} fill="#8b5cf6" fillOpacity={0.5} />
                                        <RechartsTooltip />
                                    </RadarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Question Distribution - Pie Chart */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg transition-all duration-300">
                            <h3 className="text-lg font-black text-gray-800 mb-2 flex items-center gap-2">
                                <Award className="text-orange-500" /> Question Analysis
                            </h3>
                            <p className="text-xs text-gray-400 mb-4">Overall attempt distribution.</p>
                            <div className="h-72 flex justify-center">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={questionDistribution}
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {questionDistribution.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <RechartsTooltip />
                                        <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Weak Areas List */}
                    {weakAreas.length > 0 && (
                        <div className="bg-red-50/50 backdrop-blur-sm p-6 rounded-2xl border border-red-100">
                            <h3 className="text-lg font-black text-red-800 mb-4 flex items-center">
                                <AlertCircle className="mr-2 text-red-600" size={20} /> Focus Areas (Weak Topics)
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {weakAreas.map((w, i) => (
                                    <div key={i} className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-red-500 flex items-center justify-between hover:scale-[1.02] transition">
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{w.subject}</p>
                                            <p className="font-bold text-gray-800">{w.topic}</p>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-xl font-black text-red-500">{w.accuracy}%</span>
                                            <p className="text-[10px] text-gray-400 font-bold">Accuracy</p>
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
