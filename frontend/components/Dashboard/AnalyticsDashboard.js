'use client';
import React, { useMemo } from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
    BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { TrendingUp, AlertCircle, Award, Target } from 'lucide-react';

const AnalyticsDashboard = ({ results }) => {
    // Process data for charts
    const performanceTrend = useMemo(() => {
        return results.map((r, i) => ({
            name: `Test ${i + 1}`,
            score: r.score,
            accuracy: r.accuracy,
            date: new Date(r.submittedAt).toLocaleDateString()
        })).reverse(); // Show oldest to newest
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

                const key = `${subject}||${topic}`; // Composite key

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
        return <div className="p-6 text-center text-gray-500">No test data available yet. Take a test to see analytics!</div>;
    }

    const latestResult = results[0];
    const avgAccuracy = Math.round(results.reduce((acc, r) => acc + r.accuracy, 0) / results.length);

    return (
        <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Total Tests</p>
                            <h3 className="text-2xl font-bold text-gray-800">{results.length}</h3>
                        </div>
                        <Award className="text-blue-500" size={24} />
                    </div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Avg Accuracy</p>
                            <h3 className="text-2xl font-bold text-gray-800">{avgAccuracy}%</h3>
                        </div>
                        <Target className="text-green-500" size={24} />
                    </div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow border-l-4 border-purple-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Last Score</p>
                            <h3 className="text-2xl font-bold text-gray-800">{latestResult.score}</h3>
                        </div>
                        <TrendingUp className="text-purple-500" size={24} />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Score Trend */}
                <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Performance Trend</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={performanceTrend}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <RechartsTooltip />
                                <Legend />
                                <Line type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={2} />
                                <Line type="monotone" dataKey="accuracy" stroke="#10b981" strokeWidth={2} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Subject Strength */}
                <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Subject Wise Accuracy</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={subjectAnalysis} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" domain={[0, 100]} />
                                <YAxis dataKey="subject" type="category" width={80} />
                                <RechartsTooltip />
                                <Legend />
                                <Bar dataKey="accuracy" fill="#8884d8" name="Accuracy %" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Weak Areas by Subject */}
            {weakAreas.length > 0 && (
                <div className="bg-red-50 p-6 rounded-lg border border-red-200">
                    <h3 className="text-lg font-bold text-red-800 mb-4 flex items-center">
                        <AlertCircle className="mr-2" /> Areas for Improvement (Subject-wise)
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {['Physics', 'Chemistry', 'Maths'].map(subject => {
                            const subjectWeakness = weakAreas.filter(w => w.subject === subject);
                            if (subjectWeakness.length === 0) return null;

                            return (
                                <div key={subject} className="bg-white p-4 rounded shadow-sm">
                                    <h4 className="font-bold text-gray-800 border-b pb-2 mb-3">{subject}</h4>
                                    <div className="space-y-3">
                                        {subjectWeakness.map((w, i) => (
                                            <div key={i}>
                                                <div className="flex justify-between text-xs mb-1">
                                                    <span className="font-medium text-gray-700">{w.topic}</span>
                                                    <span className="text-red-500 font-bold">{w.accuracy}%</span>
                                                </div>
                                                <div className="w-full bg-gray-200 rounded-full h-1.5">
                                                    <div
                                                        className="bg-red-500 h-1.5 rounded-full"
                                                        style={{ width: `${w.accuracy}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    {weakAreas.filter(w => !['Physics', 'Chemistry', 'Maths'].includes(w.subject)).length > 0 && (
                        <div className="mt-4">
                            <h4 className="font-bold text-gray-800 border-b pb-2 mb-3">Other Topics</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {weakAreas.filter(w => !['Physics', 'Chemistry', 'Maths'].includes(w.subject)).map((w, i) => (
                                    <div key={i} className="bg-white p-3 rounded shadow-sm">
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="font-medium text-gray-700">{w.topic}</span>
                                            <span className="text-red-500 font-bold">{w.accuracy}%</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                                            <div className="bg-red-500 h-1.5 rounded-full" style={{ width: `${w.accuracy}%` }}></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default AnalyticsDashboard;
