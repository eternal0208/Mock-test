'use client';
import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Clock, CheckCircle, AlertTriangle, Play } from 'lucide-react';
import { API_BASE_URL } from '@/lib/config';
import { useAuth } from '@/context/AuthContext';

interface Test {
    title: string;
    duration_minutes: number;
    category: string;
    questions?: any[];
    instructions?: string;
}

export default function InstructionPage() {
    const { id } = useParams();
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const [test, setTest] = useState<Test | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (authLoading) return;

        if (!user) {
            // Optional: Redirect to login or just show unauthorized
            setLoading(false);
            return;
        }

        const fetchTest = async () => {
            try {
                const token = await user.getIdToken();
                const res = await fetch(`${API_BASE_URL}/api/tests/${id}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setTest(data);
                } else {
                    console.error("Fetch failed", res.status);
                }
            } catch (error) {
                console.error("Failed to fetch test details", error);
            } finally {
                setLoading(false);
            }
        };
        fetchTest();
    }, [id, user, authLoading]);

    if (authLoading || loading) return <div className="min-h-screen flex items-center justify-center">Loading Instructions...</div>;

    if (!user) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4">
                <p className="text-xl">Please log in to view exam instructions.</p>
                <button onClick={() => router.push('/')} className="text-indigo-600 hover:underline">Go Home</button>
            </div>
        );
    }

    if (!test) return <div className="min-h-screen flex items-center justify-center">Test Not Found</div>;
    if (!test) return <div className="min-h-screen flex items-center justify-center">Test Not Found</div>;

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
                <div className="bg-indigo-600 px-8 py-6 text-white">
                    <h1 className="text-3xl font-bold">{test.title}</h1>
                    <p className="mt-2 text-indigo-100 flex items-center gap-4">
                        <span className="flex items-center gap-1"><Clock size={16} /> {test.duration_minutes} Mins</span>
                        <span className="flex items-center gap-1"><CheckCircle size={16} /> {test.questions?.length || 0} Questions</span>
                        <span className="bg-indigo-500 px-2 py-0.5 rounded text-xs uppercase font-semibold">{test.category}</span>
                    </p>
                </div>

                <div className="p-8 space-y-8">
                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-4 border-b pb-2">Exam Instructions</h2>
                        <ul className="list-disc pl-5 space-y-2 text-gray-700">
                            <li>This is a timed test. The timer will start immediately after you click "Start Exam".</li>
                            <li>You cannot pause the test once started.</li>
                            <li>Ensure you have a stable internet connection.</li>
                            <li>Do not refresh the page during the exam.</li>
                            {test.instructions && <li>{test.instructions}</li>}
                        </ul>
                    </section>

                    <section className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
                        <div className="flex items-start">
                            <AlertTriangle className="text-yellow-600 mt-0.5 mr-3 flex-shrink-0" size={20} />
                            <div>
                                <h3 className="font-bold text-yellow-800">Important Note</h3>
                                <p className="text-yellow-700 text-sm mt-1">
                                    Malpractice of any kind will lead to immediate disqualification.
                                    Switching tabs is monitored and may auto-submit your exam.
                                </p>
                            </div>
                        </div>
                    </section>

                    <div className="flex justify-end gap-4 pt-4 border-t">
                        <button
                            onClick={() => router.back()}
                            className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50 transition"
                        >
                            Back
                        </button>
                        <button
                            onClick={() => router.push(`/exam/${id}`)}
                            className="px-8 py-3 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition flex items-center gap-2 shadow-lg shadow-indigo-200"
                        >
                            Start Exam <Play size={18} fill="currentColor" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
