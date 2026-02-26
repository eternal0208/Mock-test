'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Clock, CheckCircle, PlayCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

interface Test {
    _id: string;
    title: string;
    category: string;
    subject?: string;
    total_marks?: number;
    duration_minutes: number;
    difficulty?: string;
    questions?: any[];
    questionCount?: number;
}

interface TestListProps {
    category?: string;
}

import { API_BASE_URL } from '@/lib/config';
import LoadingScreen from '@/components/ui/LoadingScreen';

// ... (interface definitions remain same)

const TestList = ({ category }: TestListProps) => {
    const [tests, setTests] = useState<Test[]>([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();
    const router = useRouter();

    useEffect(() => {
        const fetchTests = async () => {
            try {
                const headers: any = {};
                if (user) {
                    const token = await user.getIdToken();
                    headers['Authorization'] = `Bearer ${token}`;
                }
                const res = await fetch(`${API_BASE_URL}/api/tests`, { headers });
                const data: Test[] = await res.json();

                // Filter by category if provided and limit to 3 latest (Case-Insensitive)
                const filtered = Array.isArray(data)
                    ? data.filter(t =>
                        category
                            ? t.category?.toLowerCase() === category.toLowerCase()
                            : true
                    ).slice(0, 3)
                    : [];

                setTests(filtered);
            } catch (error) {
                console.error("Failed to fetch data", error);
            } finally {
                setLoading(false);
            }
        };

        fetchTests();
    }, [category, user]);

    if (loading) return <LoadingScreen fullScreen={false} text={`Loading ${category || 'Experience'} Mock Tests...`} />;

    if (tests.length === 0) {
        return (
            <div className="text-center py-16 bg-white rounded-lg border border-dashed border-gray-300">
                <p className="text-gray-500 text-lg">No tests currently available for {category}.</p>
                <p className="text-gray-400 text-sm">Check back later for new mock exams.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tests.map(test => (
                <div key={test._id} className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow overflow-hidden flex flex-col">
                    <div className="p-6 flex-1">
                        <div className="flex justify-between items-start mb-4">
                            <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold uppercase rounded-full tracking-wide">
                                {test.category || 'Exam'}
                            </span>
                            {test.difficulty && (
                                <span className={`text-xs font-semibold px-2 py-1 rounded ${test.difficulty === 'Hard' ? 'bg-red-100 text-red-700' :
                                    test.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                                        'bg-green-100 text-green-700'
                                    }`}>
                                    {test.difficulty}
                                </span>
                            )}
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">{test.title}</h3>
                        <p className="text-gray-500 text-sm mb-4 line-clamp-2">{test.subject} • {test.total_marks} Marks</p>

                        <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                            <div className="flex items-center gap-1">
                                <Clock size={16} />
                                <span>{test.duration_minutes}m</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <CheckCircle size={16} />
                                <span>{test.questionCount || test.questions?.length || 0} Qs</span>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 bg-gray-50 border-t border-gray-100">
                        <button
                            onClick={() => {
                                if (!user) {
                                    router.push('/?login=true');
                                } else {
                                    router.push(`/test/${test._id}/instruction`);
                                }
                            }}
                            className="w-full py-2 bg-white border border-indigo-600 text-indigo-600 font-semibold rounded-lg hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2"
                        >
                            <PlayCircle size={18} /> Attempt Now
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default TestList;
