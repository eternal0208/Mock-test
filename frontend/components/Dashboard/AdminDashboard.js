'use client';
import { useState, useEffect } from 'react';
import { Plus, Trash, Save, BookOpen, Clock, AlertCircle, User, List, LogOut, Users, Calendar, Image as ImageIcon, BarChart2, Eye, EyeOff, Search, Edit2, CheckCircle, UploadCloud, X } from 'lucide-react';
import { API_BASE_URL } from '@/lib/config';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const AnalyticsModal = ({ testId, onClose }) => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/tests/${testId}/analytics`);
                if (!res.ok) throw new Error('Failed to fetch analytics');
                const data = await res.json();
                setStats(data);
            } catch (err) {
                console.error("Analytics Error", err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchAnalytics();
    }, [testId]);

    if (loading) return <div className="fixed inset-0 bg-black/50 flex items-center justify-center text-white z-50">Loading Analytics...</div>;

    // Safety check for stats to prevent runtime crash
    if (error || !stats) return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white p-6 rounded-lg text-center">
                <p className="text-red-600 mb-4">{error || 'Failed to load analytics'}</p>
                <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded">Close</button>
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[90vh] overflow-hidden flex flex-col">
                <div className="p-6 border-b flex justify-between items-center bg-gray-50">
                    <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2"><BarChart2 className="text-blue-600" /> Test Analytics</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 font-bold text-xl">&times;</button>
                </div>

                <div className="p-6 overflow-y-auto flex-1 space-y-8">
                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-blue-50 p-6 rounded-lg text-center border border-blue-100">
                            <h4 className="text-gray-500 font-medium">Total Attempts</h4>
                            <p className="text-4xl font-bold text-blue-700 mt-2">{stats.totalAttempts || 0}</p>
                        </div>
                        <div className="bg-green-50 p-6 rounded-lg text-center border border-green-100">
                            <h4 className="text-gray-500 font-medium">Average Score</h4>
                            <p className="text-4xl font-bold text-green-700 mt-2">{stats.avgScore?.toFixed(2) || '0.00'}</p>
                        </div>
                        <div className="bg-purple-50 p-6 rounded-lg text-center border border-purple-100">
                            <h4 className="text-gray-500 font-medium">Top Score</h4>
                            <p className="text-4xl font-bold text-purple-700 mt-2">{stats.rankList?.[0]?.score || 0}</p>
                        </div>
                    </div>

                    {/* Rank List */}
                    <div>
                        <h4 className="text-lg font-bold text-gray-800 mb-4 border-l-4 border-indigo-600 pl-2">Leaderboard</h4>
                        <div className="overflow-x-auto border rounded-lg shadow-sm">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Rank</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Student Name</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Score</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Accuracy</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Correct/Wrong</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Time Taken</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Date</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {stats.rankList?.map((entry, idx) => (
                                        <tr key={idx} className={idx < 3 ? 'bg-yellow-50' : ''}>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {idx === 0 && <span className="text-xl">🥇</span>}
                                                {idx === 1 && <span className="text-xl">🥈</span>}
                                                {idx === 2 && <span className="text-xl">🥉</span>}
                                                <span className={`font-bold ml-2 ${idx < 3 ? 'text-gray-900' : 'text-gray-500'}`}>#{entry.rank}</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{entry.name}</td>
                                            <td className="px-6 py-4 whitespace-nowrap font-mono text-blue-600 font-bold text-lg">{entry.score}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <span className="text-sm font-medium text-gray-700 mr-2">{entry.accuracy?.toFixed(1)}%</span>
                                                    <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                                                        <div className="h-full bg-green-500" style={{ width: `${entry.accuracy || 0}%` }}></div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <span className="text-green-600 font-bold">{entry.correctAnswers}</span> / <span className="text-red-500 font-bold">{entry.wrongAnswers}</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-500 font-mono">{(entry.timeTaken / 60).toFixed(1)}m</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-400 text-xs">
                                                {new Date(entry.submittedAt).toLocaleDateString()}
                                            </td>
                                        </tr>
                                    ))}
                                    {stats.rankList?.length === 0 && <tr><td colSpan="7" className="text-center py-8 text-gray-400 font-medium">No students have attempted this test yet.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Feedback */}
                    <div>
                        <h4 className="text-lg font-bold text-gray-800 mb-4 border-l-4 border-orange-600 pl-2">Student Feedback</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {stats.feedbacks?.map((fb, idx) => (
                                <div key={idx} className="bg-gray-50 p-4 rounded border">
                                    <div className="flex items-center mb-2">
                                        {[...Array(5)].map((_, i) => (
                                            <span key={i} className={i < fb.rating ? "text-yellow-400 text-lg" : "text-gray-300 text-lg"}>★</span>
                                        ))}
                                    </div>
                                    <p className="text-gray-600 text-sm italic">"{fb.comment || 'No comment'}"</p>
                                </div>
                            ))}
                            {(!stats.feedbacks || stats.feedbacks.length === 0) && <p className="text-gray-500 italic">No feedback received yet.</p>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const StudentReportModal = ({ student, onClose }) => {
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchResults = async () => {
            try {
                // Ensure student.id matches what backend expects (firebase UID or _id)
                // Backend resultController user getStudentResults uses req.params.userId
                // results stored with userId field.
                const res = await fetch(`${API_BASE_URL}/api/results/student/${student.id || student._id}`);
                const data = await res.json();
                setResults(data);
            } catch (error) {
                console.error("Failed to fetch student results", error);
            } finally {
                setLoading(false);
            }
        };
        if (student) fetchResults();
    }, [student]);

    return (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-4xl h-[85vh] rounded-xl shadow-2xl flex flex-col overflow-hidden">
                <div className="p-6 border-b bg-indigo-50 flex justify-between items-center">
                    <div>
                        <h3 className="text-xl font-bold text-gray-800">Performance Report: {student.name}</h3>
                        <p className="text-sm text-gray-500">{student.email}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl">&times;</button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {loading ? <div className="text-center py-10">Loading Performance Data...</div> : (
                        <>
                            {/* Summary Stats */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-blue-50 p-4 rounded text-center border border-blue-100">
                                    <div className="text-2xl font-bold text-blue-700">{results.length}</div>
                                    <div className="text-xs text-gray-500 font-bold uppercase">Tests Taken</div>
                                </div>
                                <div className="bg-green-50 p-4 rounded text-center border border-green-100">
                                    <div className="text-2xl font-bold text-green-700">
                                        {results.length > 0 ? (results.reduce((acc, r) => acc + (r.score || 0), 0) / results.length).toFixed(1) : 0}
                                    </div>
                                    <div className="text-xs text-gray-500 font-bold uppercase">Avg Score</div>
                                </div>
                                <div className="bg-purple-50 p-4 rounded text-center border border-purple-100">
                                    <div className="text-2xl font-bold text-purple-700">
                                        {results.length > 0 ? (results.reduce((acc, r) => acc + (r.accuracy || 0), 0) / results.length).toFixed(1) : 0}%
                                    </div>
                                    <div className="text-xs text-gray-500 font-bold uppercase">Avg Accuracy</div>
                                </div>
                                <div className="bg-orange-50 p-4 rounded text-center border border-orange-100">
                                    <div className="text-2xl font-bold text-orange-700">
                                        {results.length > 0 ? new Date(results[0].submittedAt).toLocaleDateString() : 'N/A'}
                                    </div>
                                    <div className="text-xs text-gray-500 font-bold uppercase">Last Active</div>
                                </div>
                            </div>

                            {/* Detailed History */}
                            <h4 className="text-lg font-bold text-gray-800 border-b pb-2">Test History</h4>
                            {results.length === 0 ? <p className="text-gray-500 italic">No test attempts found.</p> : (
                                <div className="space-y-3">
                                    {results.map((res, idx) => (
                                        <div key={idx} className="border rounded-lg p-4 hover:bg-gray-50 flex flex-col md:flex-row justify-between items-center gap-4">
                                            <div className="flex-1">
                                                <h5 className="font-bold text-indigo-900">{res.testDetails?.title || 'Unknown Test'}</h5>
                                                <div className="flex gap-3 text-xs text-gray-500 mt-1">
                                                    <span>📅 {new Date(res.submittedAt).toLocaleDateString()}</span>
                                                    <span>⏱️ {(res.time_taken / 60).toFixed(1)} min</span>
                                                </div>
                                            </div>
                                            <div className="flex gap-6 text-center">
                                                <div>
                                                    <div className="font-mono font-bold text-lg text-blue-600">{res.score}</div>
                                                    <div className="text-[10px] text-gray-400 uppercase">Score</div>
                                                </div>
                                                <div>
                                                    <div className="font-mono font-bold text-lg text-green-600">{res.accuracy?.toFixed(1)}%</div>
                                                    <div className="text-[10px] text-gray-400 uppercase">Accuracy</div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

const CreateSeriesForm = ({ onSuccess }) => {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        price: 0,
        currency: 'INR',
        category: 'JEE Main',
        features: '', // Comma separated
        image: '',
        isActive: true
    });
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = {
                ...formData,
                features: formData.features.split(',').map(f => f.trim()).filter(f => f)
            };

            const res = await fetch(`${API_BASE_URL}/api/admin/series`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                alert('Series Created Successfully');
                setFormData({ title: '', description: '', price: 0, currency: 'INR', category: 'JEE Main', features: '', image: '', isActive: true });
                onSuccess();
            } else {
                alert('Failed to create series');
            }
        } catch (error) {
            console.error(error);
            alert('Error creating series');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Series Title</label>
                    <input type="text" name="title" value={formData.title} onChange={handleChange} required className="mt-1 block w-full border border-gray-300 rounded p-2" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Price (INR)</label>
                    <input type="number" name="price" value={formData.price} onChange={handleChange} required className="mt-1 block w-full border border-gray-300 rounded p-2" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Category</label>
                    <select name="category" value={formData.category} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded p-2 bg-white">
                        <option value="JEE Main">JEE Main</option>
                        <option value="JEE Advanced">JEE Advanced</option>
                        <option value="NEET">NEET</option>
                        <option value="CAT">CAT</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Cover Image URL</label>
                    <input type="text" name="image" value={formData.image} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded p-2" placeholder="http://..." />
                </div>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea name="description" value={formData.description} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded p-2" />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">Features (Comma separated)</label>
                <input type="text" name="features" value={formData.features} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded p-2" placeholder="10 Full Mocks, Video Analysis, expert support" />
            </div>
            <div className="flex items-center">
                <input type="checkbox" name="isActive" checked={formData.isActive} onChange={handleChange} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded" />
                <label className="ml-2 block text-sm text-gray-900">Active (Visible to students)</label>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">Expiry Date (Optional)</label>
                <input type="date" name="expiryDate" value={formData.expiryDate || ''} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded p-2" />
            </div>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-indigo-600 text-white font-bold rounded hover:bg-indigo-700 disabled:opacity-50">
                {loading ? 'Creating...' : 'Create Series'}
            </button>
        </form>
    );
};

export default function AdminDashboard() {
    const { user } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname();

    // URL Derived State
    const activeTab = searchParams.get('tab') || 'manage';
    const showAnalytics = searchParams.get('analytics'); // Test ID or null

    // Navigation Helper
    const updateParams = (key, value) => {
        const current = new URLSearchParams(Array.from(searchParams.entries()));
        if (!value) {
            current.delete(key);
        } else {
            current.set(key, value);
        }
        const search = current.toString();
        const query = search ? `?${search}` : "";
        router.push(`${pathname}${query}`);
    };

    const setActiveTab = (tab) => updateParams('tab', tab);
    const setShowAnalytics = (testId) => updateParams('analytics', testId);

    // Syllabus State
    const [syllabusData, setSyllabusData] = useState({
        'JEE Main': 'Official Syllabus for JEE Main...',
        'JEE Advanced': 'Official Syllabus for JEE Advanced...',
        'NEET': 'Official Syllabus for NEET...',
        'Board Exam': 'Official Syllabus for Boards...'
    });
    const [selectedSyllabusCategory, setSelectedSyllabusCategory] = useState('JEE Main');
    const [syllabusText, setSyllabusText] = useState('');
    const [savingSyllabus, setSavingSyllabus] = useState(false);

    // Missing State Definitions
    // const [showAnalytics, setShowAnalytics] = useState(null); // REMOVED (URL Driven)
    // const [activeTab, setActiveTab] = useState('manage'); // REMOVED (URL Driven)
    const [tests, setTests] = useState([]);
    const [usersList, setUsersList] = useState([]);
    const [seriesList, setSeriesList] = useState([]);
    const [revenueStats, setRevenueStats] = useState(null);
    const [loading, setLoading] = useState(false);
    const [viewingStudent, setViewingStudent] = useState(null); // Report Modal State

    // Initial Data Fetching
    useEffect(() => {
        if (activeTab === 'manage') fetchTests();
        if (activeTab === 'users') fetchStudents();
        if (activeTab === 'series') fetchSeries();
        if (activeTab === 'revenue') fetchRevenue();
    }, [activeTab]);

    // Fetch Syllabus on mount (mocked for now, implies backend endpoint needed)
    useEffect(() => {
        // Mock fetch or real fetch if endpoint existed
        setSyllabusText(syllabusData[selectedSyllabusCategory] || '');
    }, [selectedSyllabusCategory]);

    const handleSaveSyllabus = async () => {
        setSavingSyllabus(true);
        // Simulate API call
        setTimeout(() => {
            setSyllabusData(prev => ({ ...prev, [selectedSyllabusCategory]: syllabusText }));
            alert('Syllabus Updated Successfully!');
            setSavingSyllabus(false);
        }, 1000);
    };

    const fetchTests = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/tests`);
            const data = await res.json();
            setTests(data);
        } catch (error) {
            console.error("Error fetching tests:", error);
        }
    };

    const fetchStudents = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/admin/students`);
            const data = await res.json();
            setUsersList(data);
        } catch (error) {
            console.error("Error fetching students:", error);
        }
    };

    const fetchSeries = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/admin/series`);
            const data = await res.json();
            setSeriesList(data);
        } catch (error) {
            console.error("Error fetching series:", error);
        }
    };

    const fetchRevenue = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/admin/revenue`);
            const data = await res.json();
            setRevenueStats(data);
        } catch (error) {
            console.error("Error fetching revenue:", error);
        }
    };

    const handleDeleteTest = async (testId) => {
        if (!confirm('Are you sure you want to delete this test? This cannot be undone.')) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/admin/tests/${testId}`, { method: 'DELETE' });
            if (res.ok) {
                setTests(prev => prev.filter(t => t._id !== testId));
                alert("Test deleted successfully");
                fetchTests(); // Refresh the list
            } else {
                const errorData = await res.json();
                alert(`Failed to delete test: ${errorData.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error("Delete Error:", error);
            alert("Failed to delete test");
        }
    };

    const handleUpdateRole = async (userId, newRole) => {
        if (!confirm(`Are you sure you want to promote/demote this user to ${newRole}?`)) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/admin/students/${userId}/role`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: newRole })
            });
            if (res.ok) {
                setUsersList(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
                alert(`User role updated to ${newRole}`);
            } else {
                alert("Failed to update role");
            }
        } catch (error) {
            console.error("Role Update Error:", error);
            alert("Error updating role");
        }
    };

    // Test Metadata State
    const [testDetails, setTestDetails] = useState({
        title: '',
        duration: 180,
        subject: 'Full Mock',
        category: 'JEE Main',
        difficulty: 'medium',
        totalMarks: 0,
        isLive: false,
        startTime: '',
        endTime: '',
        accessType: 'free',
        format: 'full-mock',
        chapters: '', // Comma separated string for input
        instructions: '', // New Field
        seriesId: '', // Optional linkage
        isVisible: true // Visibility Control
    });

    // ... Question State Setup ...
    const [questions, setQuestions] = useState([]);
    const [currentQuestion, setCurrentQuestion] = useState({
        text: '',
        image: '',
        type: 'mcq',
        options: ['', '', '', ''],
        optionImages: ['', '', '', ''],
        correctOption: '',
        correctOptions: [],
        integerAnswer: '',
        marks: 4,
        negativeMarks: 1,
        subject: 'Physics',
        topic: ''
    });

    const [uploadingImage, setUploadingImage] = useState(false);

    const handleTestChange = (e) => {
        const { name, value, type, checked } = e.target;
        setTestDetails({
            ...testDetails,
            [name]: type === 'checkbox' ? checked : value
        });
    };

    const handleQuestionChange = (e) => {
        setCurrentQuestion({ ...currentQuestion, [e.target.name]: e.target.value });
    };

    const handleOptionChange = (idx, val) => {
        const newOpts = [...currentQuestion.options];
        newOpts[idx] = val;
        setCurrentQuestion({ ...currentQuestion, options: newOpts });
    };

    const handleOptionImageChange = (index, url) => {
        const newOptionImages = [...currentQuestion.optionImages];
        newOptionImages[index] = url;
        setCurrentQuestion({ ...currentQuestion, optionImages: newOptionImages });
    };

    const handleMSQCheck = (option) => {
        let newCorrect = [...currentQuestion.correctOptions];
        if (newCorrect.includes(option)) {
            newCorrect = newCorrect.filter(o => o !== option);
        } else {
            newCorrect.push(option);
        }
        setCurrentQuestion({ ...currentQuestion, correctOptions: newCorrect });
    };

    const uploadImage = async (file, type, index = null) => {
        if (!file) return;
        setUploadingImage(true);
        try {
            const storageRef = ref(storage, `images/${Date.now()}_${file.name}`);
            await uploadBytes(storageRef, file);
            const url = await getDownloadURL(storageRef);

            if (type === 'question') {
                setCurrentQuestion(prev => ({ ...prev, image: url }));
            } else if (type === 'solution') {
                setCurrentQuestion(prev => ({ ...prev, solutionImage: url }));
            } else if (type === 'option' && index !== null) {
                handleOptionImageChange(index, url);
            }
        } catch (error) {
            console.error("Upload failed", error);
            alert("Image upload failed!");
        } finally {
            setUploadingImage(false);
        }
    };

    const handleUpdateStatus = async (userId, currentStatus) => {
        const newStatus = currentStatus === 'blocked' ? 'active' : 'blocked';
        const action = newStatus === 'blocked' ? 'BLOCK' : 'UNBLOCK';

        if (!confirm(`Are you sure you want to ${action} this user? Blocked users cannot login.`)) return;

        try {
            const res = await fetch(`${API_BASE_URL}/api/admin/students/${userId}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });

            if (res.ok) {
                setUsersList(prev => prev.map(u => u.id === userId ? { ...u, status: newStatus } : u));
                alert(`User ${newStatus === 'blocked' ? 'BLOCKED' : 'UNBLOCKED'} successfully`);
            } else {
                alert("Failed to update status");
            }
        } catch (error) {
            console.error("Status Update Error:", error);
            alert("Error updating status");
        }
    };

    const addQuestion = () => {
        // ... VALIDATION Logic (Keeping it same as before) ...
        if (currentQuestion.type === 'integer') {
            if (!currentQuestion.integerAnswer) return alert('Provide Answer');
        } else if (currentQuestion.type === 'msq') {
            if (currentQuestion.correctOptions.length === 0) return alert('Select correct options');
        } else {
            if (!currentQuestion.correctOption) return alert('Select correct option');
        }
        if (!currentQuestion.text && !currentQuestion.image) return alert('Provide text or image');

        setQuestions([...questions, { ...currentQuestion }]);

        setCurrentQuestion({
            ...currentQuestion,
            text: '', image: '', options: ['', '', '', ''], optionImages: ['', '', '', ''],
            correctOption: '', correctOptions: [], integerAnswer: '',
        });
    };

    const removeQuestion = (index) => {
        setQuestions(questions.filter((_, i) => i !== index));
    };

    const handleSubmitTest = async () => {
        if (!testDetails.title || questions.length === 0) {
            alert('Please provide a test title and add at least one question.');
            return;
        }
        if (testDetails.isLive && (!testDetails.startTime || !testDetails.endTime)) {
            alert('Please specify Start and End times for Live Test.');
            return;
        }

        setLoading(true);
        try {
            const calculatedTotalMarks = questions.reduce((acc, q) => acc + Number(q.marks), 0);
            const payload = {
                ...testDetails,
                chapters: testDetails.chapters.split(',').map(c => c.trim()).filter(c => c), // Process chapters
                totalMarks: calculatedTotalMarks,
                questions
            };

            const res = await fetch(`${API_BASE_URL}/api/tests`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error('Failed to create test');

            alert('Test Created Successfully!');
            setActiveTab('manage');
            setQuestions([]);
            setTestDetails({
                title: '', duration: 180, subject: 'Full Mock', category: 'JEE Main',
                difficulty: 'medium', totalMarks: 0, isLive: false, startTime: '', endTime: '', instructions: '',
                isVisible: true
            });
        } catch (error) {
            console.error(error);
            alert('Error creating test');
        } finally {
            setLoading(false);
        }
    };

    // URL Driven Series Management
    const managingSeriesId = searchParams.get('series');
    const managingSeries = managingSeriesId ? seriesList.find(s => s.id === managingSeriesId) : null;
    const setManagingSeries = (series) => updateParams('series', series?.id);

    // Filter tests for Modal (Ensure logic works even if series not loaded yet, though normally is)
    // Tests already in series
    const seriesTests = managingSeries ? tests.filter(t => managingSeries.testIds?.includes(t._id)) : [];
    // Tests available to add
    const availableTests = managingSeries ? tests.filter(t => !managingSeries.testIds?.includes(t._id) && t.category === managingSeries.category) : [];

    const handleAddTestToSeries = async (testId) => {
        if (!managingSeries) return;
        const updatedIds = [...(managingSeries.testIds || []), testId];
        try {
            await fetch(`http://localhost:5001/api/admin/series/${managingSeries.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ testIds: updatedIds })
            });
            // Update Local Series List State (to reflect instantly)
            const updatedSeries = { ...managingSeries, testIds: updatedIds };
            // setManagingSeries not needed URL update, but we need to update LIST
            setSeriesList(seriesList.map(s => s.id === updatedSeries.id ? updatedSeries : s));
        } catch (e) { alert('Failed to add test'); }
    };

    const handleRemoveTestFromSeries = async (testId) => {
        if (!managingSeries) return;
        const updatedIds = managingSeries.testIds.filter(id => id !== testId);
        try {
            await fetch(`http://localhost:5001/api/admin/series/${managingSeries.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ testIds: updatedIds })
            });
            const updatedSeries = { ...managingSeries, testIds: updatedIds };
            setSeriesList(seriesList.map(s => s.id === updatedSeries.id ? updatedSeries : s));
        } catch (e) { alert('Failed to remove test'); }
    };

    return (
        <div className="space-y-6 relative">
            {showAnalytics && <AnalyticsModal testId={showAnalytics} onClose={() => setShowAnalytics(null)} />}
            {viewingStudent && <StudentReportModal student={viewingStudent} onClose={() => setViewingStudent(null)} />}

            {/* Manage Series Modal */}
            {managingSeries && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-4xl h-[80vh] rounded-xl shadow-2xl flex flex-col">
                        <div className="p-6 border-b flex justify-between items-center bg-indigo-50">
                            <div>
                                <h3 className="text-xl font-bold text-gray-800">Manage Tests for: {managingSeries.title}</h3>
                                <p className="text-sm text-gray-500">Category: {managingSeries.category}</p>
                            </div>
                            <button onClick={() => setManagingSeries(null)} className="p-2 hover:bg-indigo-100 rounded-full"><Plus className="rotate-45" size={24} /></button>
                        </div>
                        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                            {/* Left: Available Tests */}
                            <div className="flex-1 p-4 overflow-y-auto border-r border-gray-100">
                                <h4 className="font-bold text-gray-700 mb-3 sticky top-0 bg-white py-2">Available Tests ({availableTests.length})</h4>
                                <div className="space-y-2">
                                    {availableTests.map(t => (
                                        <div key={t._id} className="p-3 border rounded hover:bg-gray-50 flex justify-between items-center group">
                                            <div>
                                                <p className="font-medium text-sm">{t.title}</p>
                                                <span className="text-xs text-gray-400">{t.questions?.length || 0} Qs</span>
                                            </div>
                                            <button onClick={() => handleAddTestToSeries(t._id)} className="px-3 py-1 bg-green-100 text-green-700 rounded text-xs font-bold hover:bg-green-200 opacity-0 group-hover:opacity-100 transition">ADD +</button>
                                        </div>
                                    ))}
                                    {availableTests.length === 0 && <p className="text-gray-400 text-sm">No more tests available in this category.</p>}
                                </div>
                            </div>
                            {/* Right: Included Tests */}
                            <div className="flex-1 p-4 overflow-y-auto bg-gray-50/50">
                                <h4 className="font-bold text-gray-700 mb-3 sticky top-0 bg-gray-50/50 py-2">Included Tests ({seriesTests.length})</h4>
                                <div className="space-y-2">
                                    {seriesTests.map(t => (
                                        <div key={t._id} className="p-3 bg-white border border-indigo-100 shadow-sm rounded flex justify-between items-center">
                                            <div>
                                                <p className="font-medium text-sm text-indigo-900">{t.title}</p>
                                                <span className="text-xs text-indigo-400">ID: {t._id.substr(0, 8)}...</span>
                                            </div>
                                            <button onClick={() => handleRemoveTestFromSeries(t._id)} className="p-1 text-red-400 hover:text-red-600 rounded bg-red-50 hover:bg-red-100"><Trash size={16} /></button>
                                        </div>
                                    ))}
                                    {seriesTests.length === 0 && <p className="text-gray-400 text-sm italic">No tests added to this series yet.</p>}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-gray-200 gap-4">
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">Admin Controls</h2>
                <div className="flex overflow-x-auto space-x-1 sm:space-x-2 pb-2 sm:pb-0">
                    <button onClick={() => setActiveTab('profile')} className={`px-3 py-2 sm:px-4 rounded-md text-sm whitespace-nowrap ${activeTab === 'profile' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600'}`}>Profile</button>
                    <button onClick={() => setActiveTab('manage')} className={`px-3 py-2 sm:px-4 rounded-md text-sm whitespace-nowrap ${activeTab === 'manage' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600'}`}>Tests</button>
                    <button onClick={() => setActiveTab('series')} className={`px-3 py-2 sm:px-4 rounded-md text-sm whitespace-nowrap ${activeTab === 'series' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600'}`}>Series</button>
                    <button onClick={() => setActiveTab('users')} className={`px-3 py-2 sm:px-4 rounded-md text-sm whitespace-nowrap ${activeTab === 'users' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600'}`}>Students</button>
                    <button onClick={() => setActiveTab('revenue')} className={`px-3 py-2 sm:px-4 rounded-md text-sm whitespace-nowrap ${activeTab === 'revenue' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600'}`}>Revenue</button>
                    <button onClick={() => setActiveTab('create')} className={`px-3 py-2 sm:px-4 rounded-md text-sm whitespace-nowrap ${activeTab === 'create' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600'}`}>+ Create</button>
                    <button onClick={() => window.location.href = '/'} className="px-3 py-2 sm:px-4 rounded-md bg-red-100 text-red-700 hover:bg-red-200 font-bold flex items-center gap-1 text-sm whitespace-nowrap"><LogOut size={16} /> Logout</button>
                </div>
            </div>

            {/* Profile Tab */}
            {activeTab === 'profile' && (
                <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl mx-auto">
                    <div className="flex items-center space-x-6">
                        <div className="w-24 h-24 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600"><User size={48} /></div>
                        <div>
                            <h3 className="text-2xl font-bold text-gray-900">{user?.name || 'Administrator'}</h3>
                            <p className="text-gray-500">{user?.email}</p>
                            <span className="inline-block mt-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold capitalize">{user?.role}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Manage Tab */}
            {activeTab === 'manage' && (
                <div className="space-y-8">
                    {/* Helper to filter and group */}
                    {(() => {
                        const now = new Date();
                        const isExpired = (date) => date && new Date(date) < now;

                        const activeTests = tests.filter(t => !isExpired(t.expiryDate));
                        const expiredTests = tests.filter(t => isExpired(t.expiryDate));

                        const renderTestTable = (testList, title) => (
                            <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
                                <div className="p-6 border-b border-gray-200 bg-gray-50"><h3 className="text-xl font-bold text-gray-800">{title} ({testList.length})</h3></div>
                                {testList.length === 0 ? (
                                    <div className="p-6 text-center text-gray-500">No tests found in this category.</div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-100">
                                                <tr>
                                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Title</th>
                                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Category</th>
                                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Expiry</th>
                                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {testList.map((test) => (
                                                    <tr key={test._id} className="hover:bg-gray-50">
                                                        <td className="px-6 py-4 font-medium text-gray-900">{test.title}</td>
                                                        <td className="px-6 py-4"><span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">{test.category}</span></td>
                                                        <td className="px-6 py-4 text-sm text-gray-500">
                                                            {test.expiryDate ? new Date(test.expiryDate).toLocaleDateString() : <span className="text-green-600">No Expiry</span>}
                                                        </td>
                                                        <td className="px-6 py-4 space-x-2">
                                                            <button
                                                                onClick={async () => {
                                                                    try {
                                                                        const newStatus = !test.isVisible;
                                                                        const res = await fetch(`http://localhost:5001/api/tests/${test._id}/visibility`, {
                                                                            method: 'PUT',
                                                                            headers: { 'Content-Type': 'application/json' },
                                                                            body: JSON.stringify({ isVisible: newStatus })
                                                                        });
                                                                        if (res.ok) {
                                                                            const updated = await res.json();
                                                                            setTests(tests.map(t => t._id === test._id ? { ...t, isVisible: newStatus } : t));
                                                                        }
                                                                    } catch (e) { console.error(e); }
                                                                }}
                                                                className={`text-sm font-bold ${test.isVisible !== false ? 'text-green-600' : 'text-gray-400'}`}
                                                                title={test.isVisible !== false ? "Visible to Students" : "Hidden from Students"}
                                                            >
                                                                {test.isVisible !== false ? <Eye size={18} /> : <EyeOff size={18} />}
                                                            </button>
                                                            <button onClick={() => setShowAnalytics(test._id)} className="text-indigo-600 hover:text-indigo-900 text-sm font-bold">Stats</button>
                                                            <button onClick={() => handleDeleteTest(test._id)} className="text-red-500 hover:text-red-700 text-sm font-bold">Delete</button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        );

                        // Group by Category helper could be added here if highly specific UI needed, 
                        // for now splitting by Active/Expired as requested is a good start. 
                        // Requirement: "test series bhi categry wise ho aur same cheez test wale section me bhi"
                        // I will render grouped by category logic if I had time to write a complex reducer, 
                        // but sticking to Active vs Expired first is cleaner. 
                        // Let's add Category Filters? Or just Group headers? Group headers is better.

                        const categories = ['JEE Main', 'JEE Advanced', 'NEET', 'Board Exam'];

                        return (
                            <div>
                                <h2 className="text-2xl font-bold text-gray-800 mb-4">Active Tests</h2>
                                {categories.map(cat => {
                                    const catTests = activeTests.filter(t => t.category === cat);
                                    if (catTests.length === 0) return null;
                                    return renderTestTable(catTests, `${cat} - Active`);
                                })}
                                {activeTests.length === 0 && <p className="text-gray-500 italic">No active tests.</p>}

                                <h2 className="text-2xl font-bold text-gray-800 mb-4 mt-8 pt-8 border-t">Expired Tests</h2>
                                {categories.map(cat => {
                                    const catTests = expiredTests.filter(t => t.category === cat);
                                    if (catTests.length === 0) return null;
                                    return renderTestTable(catTests, `${cat} - Expired`);
                                })}
                            </div>
                        );
                    })()}
                </div>
            )}

            {/* Series Tab */}
            {activeTab === 'series' && (
                <div className="space-y-8">
                    {/* Create Series Section */}
                    <div className="bg-white p-6 rounded-lg shadow border border-indigo-100">
                        <h3 className="text-xl font-bold text-gray-800 mb-4 text-indigo-700">Create New Test Series</h3>
                        <CreateSeriesForm onSuccess={fetchSeries} />
                    </div>

                    {/* Logic for Active/Expired */}
                    {(() => {
                        const now = new Date();
                        const isExpired = (date) => date && new Date(date) < now;

                        const activeSeries = seriesList.filter(s => !isExpired(s.expiryDate));
                        const expiredSeries = seriesList.filter(s => isExpired(s.expiryDate));

                        const renderSeriesTable = (list, title) => (
                            <div className="bg-white rounded-lg shadow overflow-hidden mb-8">
                                <div className="p-6 border-b border-gray-200 bg-gray-50"><h3 className="text-xl font-bold text-gray-800">{title} ({list.length})</h3></div>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-100">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Title</th>
                                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Price</th>
                                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Expiry</th>
                                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Tests</th>
                                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {list.map((series) => (
                                                <tr key={series.id} className="hover:bg-gray-50">
                                                    <td className="px-6 py-4 font-medium text-gray-900">{series.title}</td>
                                                    <td className="px-6 py-4 font-bold text-green-600">₹{series.price}</td>
                                                    <td className="px-6 py-4 text-sm text-gray-500">
                                                        {series.expiryDate ? new Date(series.expiryDate).toLocaleDateString() : 'No Expiry'}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm">
                                                        <span className="bg-gray-100 px-2 py-1 rounded text-gray-700 font-bold">{series.testIds?.length || 0} Tests</span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <button onClick={() => setManagingSeries(series)} className="text-indigo-600 hover:text-indigo-900 font-bold text-sm bg-indigo-50 px-3 py-1 rounded hover:bg-indigo-100 transition">Manage Tests</button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {list.length === 0 && <tr><td colSpan="5" className="text-center py-6 text-gray-400">No series found.</td></tr>}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        );

                        const categories = ['JEE Main', 'JEE Advanced', 'NEET', 'CAT'];

                        return (
                            <div>
                                <h2 className="text-2xl font-bold text-gray-800 mb-4">Active Series (Categorized)</h2>
                                {categories.map(cat => {
                                    const catSeries = activeSeries.filter(s => s.category === cat);
                                    if (catSeries.length === 0) return null;
                                    return renderSeriesTable(catSeries, `${cat}`);
                                })}

                                <h2 className="text-2xl font-bold text-gray-800 mb-4 mt-8 pt-8 border-t">Expired Series</h2>
                                {categories.map(cat => {
                                    const catSeries = expiredSeries.filter(s => s.category === cat);
                                    if (catSeries.length === 0) return null;
                                    return renderSeriesTable(catSeries, `${cat} - Expired`);
                                })}
                            </div>
                        );
                    })()}
                </div>
            )}

            {/* Students Tab */}
            {activeTab === 'users' && (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="p-6 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                        <h3 className="text-xl font-bold text-gray-800">Students Management ({usersList.length})</h3>
                        <div className="text-sm text-gray-500">
                            Showing all registered users
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">User</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Contact</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Academics</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Location</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {usersList.map((student) => (
                                    <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="h-10 w-10 flex-shrink-0">
                                                    {student.photoURL ? (
                                                        <img className="h-10 w-10 rounded-full object-cover border border-gray-200" src={student.photoURL} alt="" />
                                                    ) : (
                                                        <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-500 font-bold">
                                                            {student.name?.charAt(0) || 'U'}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-medium text-gray-900">{student.name}</div>
                                                    <div className="text-xs text-gray-500">{student.email}</div>
                                                    <div className="text-[10px] text-gray-400 mt-1 uppercase tracking-wide">{student.role}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">{student.phone || student.phoneNumber || 'N/A'}</div>
                                            <div className="text-xs text-blue-500">{student.authProvider === 'google' ? 'Google Auth' : 'Phone Auth'}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">{student.interest || 'N/A'}</div>
                                            <div className="text-xs text-gray-500">{student.class || 'N/A'}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">{student.city || 'N/A'}</div>
                                            <div className="text-xs text-gray-500">{student.state || 'N/A'}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {student.status === 'blocked' ? (
                                                <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                                                    Blocked
                                                </span>
                                            ) : (
                                                <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                                    Active
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <div className="flex items-center space-x-3">
                                                {/* Role Toggle */}
                                                <button
                                                    onClick={() => handleUpdateRole(student.id, student.role === 'admin' ? 'student' : 'admin')}
                                                    className={`text-xs px-2 py-1 rounded border ${student.role === 'admin' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-gray-50 text-gray-600 border-gray-200'}`}
                                                >
                                                    {student.role === 'admin' ? 'Demote' : 'Promote'}
                                                </button>

                                                {/* Status Toggle (Block/Unblock) */}
                                                <button
                                                    onClick={() => handleUpdateStatus(student.id, student.status || 'active')}
                                                    className={`text-xs px-2 py-1 rounded border font-bold ${student.status === 'blocked' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}
                                                >
                                                    {student.status === 'blocked' ? 'Unblock' : 'Block'}
                                                </button>

                                                {/* View Report */}
                                                <button
                                                    onClick={() => setViewingStudent(student)}
                                                    className="text-indigo-600 hover:text-indigo-900"
                                                    title="View Performance"
                                                >
                                                    <BarChart2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {usersList.length === 0 && (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-4 text-center text-sm text-gray-500">
                                            No students found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}    {/* Revenue Tab */}
            {activeTab === 'revenue' && revenueStats && (
                <div className="space-y-6">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-green-50 p-6 rounded-lg text-center border border-green-200">
                            <h4 className="text-gray-600 font-bold uppercase tracking-wider">Total Revenue</h4>
                            <p className="text-5xl font-extrabold text-green-700 mt-2">₹{revenueStats.totalRevenue}</p>
                        </div>
                        <div className="bg-blue-50 p-6 rounded-lg text-center border border-blue-200">
                            <h4 className="text-gray-600 font-bold uppercase tracking-wider">Total Orders</h4>
                            <p className="text-5xl font-extrabold text-blue-700 mt-2">{revenueStats.totalOrders}</p>
                        </div>
                    </div>

                    {/* Transactions Table */}
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                        <div className="p-6 border-b border-gray-200"><h3 className="text-xl font-bold text-gray-800">Recent Transactions</h3></div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ref ID</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {revenueStats.orders?.map((order) => (
                                        <tr key={order.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{order.userName}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-600">{order.itemName}</td>
                                            <td className="px-6 py-4 whitespace-nowrap font-bold text-green-600">₹{order.amount}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 py-1 text-xs font-bold rounded-full uppercase ${order.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                                    {order.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-400 font-mono">{order.paymentId || order.razorpayOrderId}</td>
                                        </tr>
                                    ))}
                                    {(!revenueStats.orders || revenueStats.orders.length === 0) && (
                                        <tr><td colSpan="6" className="text-center py-8 text-gray-500">No transactions found.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Tab */}
            {activeTab === 'create' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Form */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Test Details */}
                        <div className="bg-white p-6 rounded-lg shadow">
                            <h3 className="text-lg font-semibold mb-4 flex items-center text-gray-700">Test Details</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div><label className="block text-sm font-medium text-gray-700">Title</label><input type="text" name="title" value={testDetails.title} onChange={handleTestChange} className="mt-1 block w-full border border-gray-300 rounded p-2" /></div>
                                <div><label className="block text-sm font-medium text-gray-700">Series</label><select name="category" value={testDetails.category} onChange={handleTestChange} className="mt-1 block w-full border border-gray-300 rounded p-2 bg-white"><option value="JEE Main">JEE Main</option><option value="JEE Advanced">JEE Advanced</option><option value="NEET">NEET</option><option value="Board Exam">Board Exam</option></select></div>
                                <div><label className="block text-sm font-medium text-gray-700">Subject</label><select name="subject" value={testDetails.subject} onChange={handleTestChange} className="mt-1 block w-full border border-gray-300 rounded p-2 bg-white"><option value="Full Mock">Full Mock</option><option value="Physics">Physics</option><option value="Chemistry">Chemistry</option><option value="Maths">Maths</option></select></div>
                                <div><label className="block text-sm font-medium text-gray-700">Duration (Min)</label><input type="number" name="duration" value={testDetails.duration} onChange={handleTestChange} className="mt-1 block w-full border border-gray-300 rounded p-2" /></div>

                                {/* New Granular Fields */}
                                <div>
                                    <select name="accessType" value={testDetails.accessType} onChange={handleTestChange} className="mt-1 block w-full border border-gray-300 rounded p-2 bg-white">
                                        <option value="free">Free</option>
                                        <option value="paid">Paid</option>
                                    </select>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700">Add to Series (Optional)</label>
                                    <select name="seriesId" value={testDetails.seriesId || ''} onChange={handleTestChange} className="mt-1 block w-full border border-gray-300 rounded p-2 bg-white">
                                        <option value="">-- Select Series --</option>
                                        {seriesList.filter(s => s.category === testDetails.category).map(s => (
                                            <option key={s.id} value={s.id}>{s.title}</option>
                                        ))}
                                    </select>
                                    <p className="text-xs text-gray-500">Only showing {testDetails.category} series.</p>
                                </div>
                                <div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Format</label>
                                        <select name="format" value={testDetails.format} onChange={handleTestChange} className="mt-1 block w-full border border-gray-300 rounded p-2 bg-white">
                                            <option value="full-mock">Full Mock</option>
                                            <option value="chapter-wise">Chapter Wise</option>
                                            <option value="part-test">Part Test</option>
                                        </select>
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700">Chapters (Comma separated, for Chapter-wise/Part tests)</label>
                                        <input type="text" name="chapters" value={testDetails.chapters} onChange={handleTestChange} className="mt-1 block w-full border border-gray-300 rounded p-2" placeholder="Kinematics, Laws of Motion" />
                                    </div>
                                </div>

                                <div className="mt-4">
                                    <label className="block text-sm font-medium text-gray-700">Instructions (Markdown supported)</label>
                                    <textarea name="instructions" value={testDetails.instructions} onChange={handleTestChange} rows={4} className="mt-1 block w-full border border-gray-300 rounded p-2 font-mono text-sm" placeholder="1. All questions are compulsory..." />
                                </div>

                                {/* Live Test Toggle */}
                                <div className="mt-4 p-4 bg-yellow-50 rounded border border-yellow-200">
                                    <label className="flex items-center space-x-2">
                                        <input type="checkbox" name="isLive" checked={testDetails.isLive} onChange={handleTestChange} className="rounded text-indigo-600" />
                                        <span className="font-bold text-gray-700">Schedule as Application/Live Test?</span>
                                    </label>
                                    {testDetails.isLive && (
                                        <div className="grid grid-cols-2 gap-4 mt-3">
                                            <div><label className="block text-xs font-bold text-gray-500">Start Time</label><input type="datetime-local" name="startTime" value={testDetails.startTime} onChange={handleTestChange} className="w-full border p-1 rounded" /></div>
                                            <div><label className="block text-xs font-bold text-gray-500">End Time</label><input type="datetime-local" name="endTime" value={testDetails.endTime} onChange={handleTestChange} className="w-full border p-1 rounded" /></div>
                                        </div>

                                    )}
                                </div>

                                {/* Max Attempts Control */}
                                <div className="mt-4">
                                    <label className="block text-sm font-medium text-gray-700">Attempt Limit</label>
                                    <div className="flex items-center gap-4 mt-1">
                                        <input
                                            type="number"
                                            name="maxAttempts"
                                            value={testDetails.maxAttempts || ''}
                                            onChange={handleTestChange}
                                            placeholder="Empty = Unlimited"
                                            className="block w-40 border border-gray-300 rounded p-2"
                                        />
                                        <span className="text-sm text-gray-500">Leave empty or 0 for unlimited attempts. (1 = Single Attempt)</span>
                                    </div>
                                </div>

                                {/* Expiry Date for Standard Tests */}
                                <div className="mt-4">
                                    <label className="block text-sm font-medium text-gray-700">Validity/Expiry Date</label>
                                    <input type="date" name="expiryDate" value={testDetails.expiryDate || ''} onChange={handleTestChange} className="mt-1 block w-full border border-gray-300 rounded p-2" />
                                    <p className="text-xs text-gray-500">Test will be inactive after this date.</p>
                                </div>

                                {/* Solution PDF Link */}
                                <input type="text" name="solutionPdf" value={testDetails.solutionPdf || ''} onChange={handleTestChange} className="mt-1 block w-full border border-gray-300 rounded p-2" placeholder="https://drive.google.com/..." />
                            </div>

                            {/* Solution Visibility */}
                            <div className="mt-4 md:col-span-2 p-4 bg-blue-50 rounded border border-blue-200">
                                <label className="block text-sm font-bold text-blue-800 mb-2">Solution Visibility</label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <select name="solutionVisibility" value={testDetails.solutionVisibility || 'immediate'} onChange={handleTestChange} className="block w-full border border-gray-300 rounded p-2 bg-white">
                                            <option value="immediate">Show Immediately after Test</option>
                                            <option value="scheduled">Schedule for Later Date</option>
                                        </select>
                                    </div>
                                    {testDetails.solutionVisibility === 'scheduled' && (
                                        <div>
                                            <input type="datetime-local" name="resultDeclarationTime" value={testDetails.resultDeclarationTime || ''} onChange={handleTestChange} className="block w-full border border-gray-300 rounded p-2" />
                                            <p className="text-xs text-gray-500 mt-1">Students will see results/solutions after this time.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Add Question */}
                        <div className="bg-white p-6 rounded-lg shadow border-2 border-blue-100">
                            <h3 className="text-lg font-semibold mb-4 flex items-center text-gray-700">Add Question</h3>

                            {/* Type & Metadata */}
                            <div className="grid grid-cols-3 gap-4 mb-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500">Question Type</label>
                                    <select name="type" value={currentQuestion.type} onChange={handleQuestionChange} className="w-full border p-2 rounded bg-white">
                                        <option value="mcq">MCQ</option>
                                        <option value="msq">MSQ</option>
                                        <option value="integer">Integer</option>
                                    </select>
                                </div>
                                <div><label className="block text-xs font-bold text-gray-500">Subject</label><select name="subject" value={currentQuestion.subject} onChange={handleQuestionChange} className="w-full border p-2 rounded bg-white"><option value="Physics">Physics</option><option value="Chemistry">Chemistry</option><option value="Maths">Maths</option></select></div>
                                <div><label className="block text-xs font-bold text-gray-500">Marks</label><input type="number" name="marks" value={currentQuestion.marks} onChange={handleQuestionChange} className="w-full border p-2 rounded" /></div>
                            </div>

                            <div className="mb-4">
                                <label className="block text-xs font-bold text-gray-500">Topic (e.g., Rotational Motion)</label>
                                <input type="text" name="topic" value={currentQuestion.topic} onChange={handleQuestionChange} className="w-full border p-2 rounded" placeholder="Enter topic tag" />
                            </div>

                            {/* Question Content */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Question Text</label>
                                <textarea name="text" value={currentQuestion.text} onChange={handleQuestionChange} rows={3} className="block w-full border border-gray-300 rounded p-2" placeholder="Enter text..." />

                                <div className="mt-2">
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Upload Question Image</label>
                                    <input type="file" onChange={(e) => uploadImage(e.target.files[0], 'question')} className="text-sm text-gray-500" />
                                    {uploadingImage && <span className="text-xs text-blue-500">Uploading...</span>}
                                    {currentQuestion.image && <img src={currentQuestion.image} alt="Q Preview" className="h-20 mt-2 object-contain border" />}
                                </div>
                            </div>

                            {/* Options Area */}
                            {currentQuestion.type !== 'integer' && (
                                <div className="space-y-3 mb-4">
                                    <label className="block text-sm font-medium text-gray-700">Options</label>
                                    {currentQuestion.options.map((opt, idx) => (
                                        <div key={idx} className="flex flex-col gap-1 border-b pb-2">
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono">{String.fromCharCode(65 + idx)}</span>
                                                <input type="text" value={opt} onChange={(e) => handleOptionChange(idx, e.target.value)} className="flex-1 border p-1 rounded" placeholder={`Option Text`} />
                                                <input type="file" onChange={(e) => uploadImage(e.target.files[0], 'option', idx)} className="text-xs w-24" />
                                            </div>
                                            {currentQuestion.optionImages[idx] && <img src={currentQuestion.optionImages[idx]} alt="Opt Img" className="h-10 w-10 object-contain ml-6" />}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Answer Section */}
                            <div className="mb-6 p-4 bg-green-50 rounded">
                                <label className="block text-sm font-bold text-green-800 mb-2">Correct Answer</label>

                                {currentQuestion.type === 'mcq' && (
                                    <select name="correctOption" value={currentQuestion.correctOption} onChange={handleQuestionChange} className="block w-full border p-2 rounded bg-white">
                                        <option value="">Select Correct Option</option>
                                        {currentQuestion.options.map((opt, idx) => (
                                            <option key={idx} value={opt || `Option ${idx + 1}`}>Option {String.fromCharCode(65 + idx)}</option>
                                        ))}
                                    </select>
                                )}

                                {currentQuestion.type === 'msq' && (
                                    <div className="flex gap-4">
                                        {currentQuestion.options.map((opt, idx) => (
                                            <label key={idx} className="flex items-center space-x-1 cursor-pointer">
                                                <input type="checkbox" checked={currentQuestion.correctOptions.includes(opt || `Option ${idx + 1}`)} onChange={() => handleMSQCheck(opt || `Option ${idx + 1}`)} />
                                                <span>{String.fromCharCode(65 + idx)}</span>
                                            </label>
                                        ))}
                                    </div>
                                )}

                                {currentQuestion.type === 'integer' && (
                                    <input type="text" name="integerAnswer" value={currentQuestion.integerAnswer} onChange={handleQuestionChange} className="block w-full border p-2 rounded" placeholder="Enter Integer Answer" />
                                )}
                            </div>

                            <button onClick={addQuestion} className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 flex justify-center items-center font-bold">
                                <Plus size={18} className="mr-2" /> Add Question
                            </button>
                        </div>
                    </div>

                    {/* Preview (Right Col) */}
                    <div className="bg-white p-6 rounded-lg shadow h-full flex flex-col">
                        <h3 className="text-lg font-semibold mb-4">Queue: {questions.length}</h3>
                        <div className="flex-1 overflow-y-auto max-h-[600px] space-y-4 mb-4">
                            {questions.map((q, idx) => (
                                <div key={idx} className="border p-2 rounded bg-gray-50 relative">
                                    <div className="absolute top-1 right-1 cursor-pointer text-red-500" onClick={() => removeQuestion(idx)}><Trash size={14} /></div>
                                    <div className="text-xs font-bold text-blue-600 mb-1">{q.type.toUpperCase()} | {q.subject} {q.topic && `| ${q.topic}`}</div>
                                    <p className="text-sm truncate">{q.text}</p>
                                </div>
                            ))}
                        </div>
                        <button onClick={handleSubmitTest} disabled={loading || questions.length === 0} className="w-full bg-green-600 text-white py-3 rounded font-bold shadow hover:bg-green-700 disabled:opacity-50">
                            {loading ? 'Publishing...' : 'Publish Test'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
