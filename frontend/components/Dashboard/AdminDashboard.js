'use client';
import { useState, useEffect } from 'react';
import { Plus, Trash, Save, BookOpen, Clock, AlertCircle, User, List, LogOut, Users, Calendar, Image as ImageIcon, BarChart2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const AnalyticsModal = ({ testId, onClose }) => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                const res = await fetch(`http://localhost:5001/api/tests/${testId}/analytics`);
                const data = await res.json();
                setStats(data);
            } catch (err) {
                console.error("Analytics Error", err);
            } finally {
                setLoading(false);
            }
        };
        fetchAnalytics();
    }, [testId]);

    if (loading) return <div className="fixed inset-0 bg-black/50 flex items-center justify-center text-white z-50">Loading Analytics...</div>;

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
                            <p className="text-4xl font-bold text-blue-700 mt-2">{stats.totalAttempts}</p>
                        </div>
                        <div className="bg-green-50 p-6 rounded-lg text-center border border-green-100">
                            <h4 className="text-gray-500 font-medium">Average Score</h4>
                            <p className="text-4xl font-bold text-green-700 mt-2">{stats.avgScore?.toFixed(2)}</p>
                        </div>
                        <div className="bg-purple-50 p-6 rounded-lg text-center border border-purple-100">
                            <h4 className="text-gray-500 font-medium">Top Score</h4>
                            <p className="text-4xl font-bold text-purple-700 mt-2">{stats.rankList[0]?.score || 0}</p>
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
                                    {stats.rankList.map((entry, idx) => (
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
                                                        <div className="h-full bg-green-500" style={{ width: `${entry.accuracy}%` }}></div>
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
                                    {stats.rankList.length === 0 && <tr><td colSpan="7" className="text-center py-8 text-gray-400 font-medium">No students have attempted this test yet.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Feedback */}
                    <div>
                        <h4 className="text-lg font-bold text-gray-800 mb-4 border-l-4 border-orange-600 pl-2">Student Feedback</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {stats.feedbacks && stats.feedbacks.map((fb, idx) => (
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

            const res = await fetch('http://localhost:5001/api/admin/series', {
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
            <button type="submit" disabled={loading} className="px-4 py-2 bg-indigo-600 text-white font-bold rounded hover:bg-indigo-700 disabled:opacity-50">
                {loading ? 'Creating...' : 'Create Series'}
            </button>
        </form>
    );
};

export default function AdminDashboard() {
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
            const res = await fetch('http://localhost:5001/api/tests');
            const data = await res.json();
            setTests(data);
        } catch (error) {
            console.error("Error fetching tests:", error);
        }
    };

    const fetchStudents = async () => {
        try {
            const res = await fetch('http://localhost:5001/api/admin/students');
            const data = await res.json();
            setUsersList(data);
        } catch (error) {
            console.error("Error fetching students:", error);
        }
    };

    const fetchSeries = async () => {
        try {
            const res = await fetch('http://localhost:5001/api/admin/series');
            const data = await res.json();
            setSeriesList(data);
        } catch (error) {
            console.error("Error fetching series:", error);
        }
    };

    const fetchRevenue = async () => {
        try {
            const res = await fetch('http://localhost:5001/api/admin/revenue');
            const data = await res.json();
            setRevenueStats(data);
        } catch (error) {
            console.error("Error fetching revenue:", error);
        }
    };

    const handleDeleteTest = async (testId) => {
        if (!confirm('Are you sure you want to delete this test? This cannot be undone.')) return;

        try {
            const res = await fetch(`http://localhost:5001/api/tests/${testId}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                alert('Test deleted successfully');
                fetchTests();
            } else {
                alert('Failed to delete test');
            }
        } catch (error) {
            console.error("Delete error:", error);
            alert('Error deleting test');
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
        // New Fields
        accessType: 'free',
        format: 'full-mock',
        chapters: '', // Comma separated string for input
        instructions: '' // New Field
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

            const res = await fetch('http://localhost:5001/api/tests', {
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
                difficulty: 'medium', totalMarks: 0, isLive: false, startTime: '', endTime: '', instructions: ''
            });
        } catch (error) {
            console.error(error);
            alert('Error creating test');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 relative">
            {showAnalytics && <AnalyticsModal testId={showAnalytics} onClose={() => setShowAnalytics(null)} />}

            <div className="flex items-center justify-between pb-4 border-b border-gray-200">
                <h2 className="text-3xl font-bold text-gray-800">Admin Controls</h2>
                <div className="flex space-x-2">
                    <button onClick={() => setActiveTab('profile')} className={`px-4 py-2 rounded-md ${activeTab === 'profile' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600'}`}>Profile</button>
                    <button onClick={() => setActiveTab('manage')} className={`px-4 py-2 rounded-md ${activeTab === 'manage' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600'}`}>Tests</button>
                    <button onClick={() => setActiveTab('series')} className={`px-4 py-2 rounded-md ${activeTab === 'series' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600'}`}>Series</button>
                    <button onClick={() => setActiveTab('users')} className={`px-4 py-2 rounded-md ${activeTab === 'users' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600'}`}>Students</button>
                    <button onClick={() => setActiveTab('revenue')} className={`px-4 py-2 rounded-md ${activeTab === 'revenue' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600'}`}>Revenue</button>
                    <button onClick={() => setActiveTab('create')} className={`px-4 py-2 rounded-md ${activeTab === 'create' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600'}`}>+ Create Test</button>
                    <button onClick={() => window.location.href = '/login'} className="px-4 py-2 rounded-md bg-red-100 text-red-700 hover:bg-red-200 font-bold flex items-center gap-1"><LogOut size={16} /> Logout</button>
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
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="p-6 border-b border-gray-200"><h3 className="text-xl font-bold text-gray-800">All Tests</h3></div>
                    {tests.length === 0 ? (
                        <div className="p-10 text-center text-gray-500">No tests found.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Series</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Live Status</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Analytics</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {tests.map((test) => (
                                        <tr key={test._id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm font-medium text-gray-900">{test.title}</div></td>
                                            <td className="px-6 py-4 whitespace-nowrap"><span className="px-2 inline-flex text-xs font-semibold rounded-full bg-blue-100 text-blue-800">{test.category}</span></td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {test.startTime ? (
                                                    <div className="text-xs">
                                                        <span className="text-green-600 font-bold">SCHEDULED</span><br />
                                                        {new Date(test.startTime).toLocaleDateString()}
                                                    </div>
                                                ) : <span className="text-gray-400 text-xs">-</span>}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <button onClick={() => setShowAnalytics(test._id)} className="text-indigo-600 hover:text-indigo-900 flex items-center gap-1 font-medium">
                                                    <BarChart2 size={16} /> View
                                                </button>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <button onClick={() => handleDeleteTest(test._id)} className="text-red-500 hover:text-red-700 transition"><Trash size={18} /></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Series Tab */}
            {activeTab === 'series' && (
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-lg shadow">
                        <h3 className="text-xl font-bold text-gray-800 mb-4">Create New Test Series</h3>
                        <CreateSeriesForm onSuccess={fetchSeries} />
                    </div>

                    <div className="bg-white rounded-lg shadow overflow-hidden">
                        <div className="p-6 border-b border-gray-200"><h3 className="text-xl font-bold text-gray-800">Existing Series</h3></div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {seriesList.map((series) => (
                                        <tr key={series.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{series.title}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-500">{series.category}</td>
                                            <td className="px-6 py-4 whitespace-nowrap font-bold text-green-600">₹{series.price}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 inline-flex text-xs font-semibold rounded-full ${series.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                    {series.isActive ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                <button className="text-indigo-600 hover:text-indigo-900">Edit</button>
                                            </td>
                                        </tr>
                                    ))}
                                    {seriesList.length === 0 && <tr><td colSpan="5" className="text-center py-4 text-gray-400">No series created yet.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Students Tab */}
            {activeTab === 'users' && (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="p-6 border-b border-gray-200"><h3 className="text-xl font-bold text-gray-800">Registered Students</h3></div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Class</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Performance</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {usersList.map((student) => (
                                    <tr key={student.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{student.name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-gray-500">{student.email}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-gray-500">{student.class}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-gray-400 text-xs">{new Date(student.createdAt).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {/* Would typically open a modal */}
                                            <button className="text-blue-600 hover:underline text-sm">View Report</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Revenue Tab */}
            {activeTab === 'revenue' && revenueStats && (
                <div className="space-y-6">
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
                                    <label className="block text-sm font-medium text-gray-700">Access Type</label>
                                    <select name="accessType" value={testDetails.accessType} onChange={handleTestChange} className="mt-1 block w-full border border-gray-300 rounded p-2 bg-white">
                                        <option value="free">Free</option>
                                        <option value="paid">Paid</option>
                                    </select>
                                </div>
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
