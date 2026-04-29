'use client';
import { useState, useEffect } from 'react';
import { Plus, Trash, Layers, BookOpen, ChevronLeft, Search, CheckCircle, XCircle } from 'lucide-react';
import { API_BASE_URL } from '@/lib/config';
import { useAuth } from '@/context/AuthContext';

export default function InstitutesManager() {
    const { user } = useAuth();
    const [institutes, setInstitutes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({ name: '', instituteCode: '' });

    // Content Management State
    const [selectedInstitute, setSelectedInstitute] = useState(null);
    const [activeTab, setActiveTab] = useState('tests'); // tests, series, notes
    const [globalContent, setGlobalContent] = useState({ tests: [], series: [], notes: [] });
    const [searchQuery, setSearchQuery] = useState('');
    const [processingId, setProcessingId] = useState(null);

    useEffect(() => {
        if (user) {
            fetchInstitutes();
            fetchAllGlobalContent();
        }
    }, [user]);

    const fetchInstitutes = async () => {
        try {
            const token = await user?.getIdToken();
            const res = await fetch(`${API_BASE_URL}/api/admin/institutes`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setInstitutes(data);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const fetchAllGlobalContent = async () => {
        try {
            const token = await user?.getIdToken();
            const headers = { Authorization: `Bearer ${token}` };

            const [testsRes, seriesRes, notesRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/tests`, { headers }),
                fetch(`${API_BASE_URL}/api/tests/series`, { headers }),
                fetch(`${API_BASE_URL}/api/notes/sections`, { headers })
            ]);

            const tests = testsRes.ok ? await testsRes.json() : [];
            const series = seriesRes.ok ? await seriesRes.json() : [];
            const notes = notesRes.ok ? await notesRes.json() : [];

            setGlobalContent({ tests, series, notes });
        } catch (e) {
            console.error("Failed to fetch global content:", e);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const token = await user?.getIdToken();
            const res = await fetch(`${API_BASE_URL}/api/admin/institutes`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });
            if (res.ok) {
                alert('Institute Created');
                setShowForm(false);
                setFormData({ name: '', instituteCode: '' });
                fetchInstitutes();
            } else {
                const err = await res.json();
                alert(err.error || 'Failed to create');
            }
        } catch (e) {
            console.error(e);
            alert('Error creating institute');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this institute? Tests and Students under this code will remain but lose their explicit association context.')) return;
        try {
            const token = await user?.getIdToken();
            const res = await fetch(`${API_BASE_URL}/api/admin/institutes/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                setInstitutes(prev => prev.filter(i => i.id !== id));
            } else {
                alert('Failed to delete');
            }
        } catch (e) {
            console.error(e);
            alert('Error deleting institute');
        }
    };

    const handleAssignContent = async (item, type, isAssigning) => {
        const itemId = item.id || item._id;
        setProcessingId(itemId);
        try {
            const token = await user?.getIdToken();
            const endpoint = isAssigning ? 'assign' : 'unassign';
            const reqType = type === 'notes' ? 'notesSections' : type === 'series' ? 'testSeries' : 'tests';

            const res = await fetch(`${API_BASE_URL}/api/admin/institutes/${selectedInstitute.instituteCode}/${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ type: reqType, id: itemId })
            });

            if (res.ok) {
                // Optimistically update global content state to reflect new instituteCode
                setGlobalContent(prev => {
                    const updated = { ...prev };
                    updated[type] = updated[type].map(content => {
                        const contentId = content.id || content._id;
                        if (contentId === itemId) {
                            return { ...content, instituteCode: isAssigning ? selectedInstitute.instituteCode : '' };
                        }
                        return content;
                    });
                    return updated;
                });
            } else {
                alert('Failed to update assignment');
            }
        } catch (e) {
            console.error(e);
            alert('Error updating assignment');
        } finally {
            setProcessingId(null);
        }
    };

    const renderContentManager = () => {
        const items = globalContent[activeTab] || [];
        const filteredItems = items.filter(item => 
            (item.title || item.name || '').toLowerCase().includes(searchQuery.toLowerCase())
        );

        const assignedItems = filteredItems.filter(item => item.instituteCode === selectedInstitute.instituteCode);
        const unassignedItems = filteredItems.filter(item => !item.instituteCode || item.instituteCode !== selectedInstitute.instituteCode);

        return (
            <div className="space-y-6 animate-in slide-in-from-right-8 duration-500">
                <button 
                    onClick={() => setSelectedInstitute(null)}
                    className="flex items-center gap-2 text-indigo-600 font-bold hover:text-indigo-800 transition-colors"
                >
                    <ChevronLeft size={20} /> Back to Institutes
                </button>

                <div className="bg-white/60 backdrop-blur-xl border border-slate-200/60 p-6 rounded-3xl shadow-sm">
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                        {selectedInstitute.name} <span className="text-indigo-500">({selectedInstitute.instituteCode})</span>
                    </h2>
                    <p className="text-sm font-medium text-slate-500 mt-1">Assign private content specifically for this institute.</p>
                </div>

                {/* Tabs */}
                <div className="flex space-x-2 border-b border-gray-200 pb-px">
                    {['tests', 'series', 'notes'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-6 py-3 font-bold text-sm rounded-t-xl transition-all ${
                                activeTab === tab 
                                ? 'bg-white text-indigo-600 border border-b-0 border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]' 
                                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                            }`}
                        >
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                    ))}
                </div>

                <div className="bg-white rounded-b-2xl rounded-tr-2xl shadow-xl p-6 border border-gray-100">
                    <div className="relative mb-6">
                        <Search className="absolute left-4 top-3.5 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder={`Search ${activeTab}...`}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-12 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    <div className="space-y-8">
                        {/* Assigned Section */}
                        <div>
                            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <CheckCircle className="text-green-500" size={18} /> 
                                Assigned {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} ({assignedItems.length})
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {assignedItems.map(item => (
                                    <div key={item.id || item._id} className="flex items-center justify-between p-4 rounded-xl border border-green-100 bg-green-50/50">
                                        <div>
                                            <p className="font-bold text-slate-900">{item.title || item.name}</p>
                                            <p className="text-xs font-medium text-slate-500">{item.field || item.category || 'General'}</p>
                                        </div>
                                        <button
                                            onClick={() => handleAssignContent(item, activeTab, false)}
                                            disabled={processingId === (item.id || item._id)}
                                            className="px-3 py-1.5 bg-white border border-red-200 text-red-600 text-xs font-bold rounded-lg hover:bg-red-50 disabled:opacity-50"
                                        >
                                            {processingId === (item.id || item._id) ? '...' : 'Remove'}
                                        </button>
                                    </div>
                                ))}
                                {assignedItems.length === 0 && <p className="text-sm text-gray-500 col-span-2 py-2">No items assigned yet.</p>}
                            </div>
                        </div>

                        {/* Unassigned Section */}
                        <div>
                            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <Layers className="text-gray-400" size={18} /> 
                                Available {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} ({unassignedItems.length})
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {unassignedItems.map(item => (
                                    <div key={item.id || item._id} className="flex items-center justify-between p-4 rounded-xl border border-gray-200 bg-white hover:border-indigo-200 transition-colors">
                                        <div>
                                            <p className="font-bold text-slate-900 line-clamp-1">{item.title || item.name}</p>
                                            <p className="text-xs font-medium text-slate-500">
                                                {item.field || item.category || 'General'} 
                                                {item.instituteCode ? ` • (Currently: ${item.instituteCode})` : ''}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => handleAssignContent(item, activeTab, true)}
                                            disabled={processingId === (item.id || item._id)}
                                            className="px-3 py-1.5 bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold rounded-lg hover:bg-indigo-100 disabled:opacity-50 ml-2 whitespace-nowrap"
                                        >
                                            {processingId === (item.id || item._id) ? '...' : 'Assign'}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    if (selectedInstitute) {
        return renderContentManager();
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500 max-w-5xl mx-auto pb-24">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/60 backdrop-blur-xl border border-slate-200/60 p-6 rounded-3xl shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                        <BookOpen size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Institutes Management</h1>
                        <p className="text-sm font-medium text-slate-500 mt-0.5">Manage partner coaching institutes and their codes.</p>
                    </div>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-md transition-all flex items-center gap-2"
                >
                    <Plus size={18} /> Add Institute
                </button>
            </div>

            {showForm && (
                <div className="bg-white rounded-2xl shadow-xl p-6 border border-indigo-100 mb-8">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><Layers size={18} className="text-indigo-600" /> New Institute Details</h3>
                    <form onSubmit={handleCreate} className="space-y-4 max-w-xl">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Institute Full Name</label>
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                className="block w-full border border-gray-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-indigo-500"
                                placeholder="e.g. Apex Mock Coaching Center"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Unique Institute Code</label>
                            <input
                                type="text"
                                required
                                value={formData.instituteCode}
                                onChange={e => setFormData({ ...formData, instituteCode: e.target.value })}
                                className="block w-full border border-gray-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-indigo-500"
                                placeholder="e.g. APEX2026"
                            />
                            <p className="text-xs text-gray-500 mt-1">Students will use this code to join. Must be exact.</p>
                        </div>
                        <div className="pt-2">
                            <button type="submit" disabled={loading} className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 disabled:opacity-50">
                                {loading ? 'Saving...' : 'Save Institute'}
                            </button>
                            <button type="button" onClick={() => setShowForm(false)} className="ml-3 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-bold hover:bg-gray-200">
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Institute Code</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Created</th>
                            <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {institutes.length === 0 ? (
                            <tr>
                                <td colSpan="4" className="px-6 py-8 text-center text-gray-500 font-medium">No institutes created yet.</td>
                            </tr>
                        ) : institutes.map((inst) => (
                            <tr key={inst.id} className="hover:bg-gray-50 group cursor-pointer" onClick={() => setSelectedInstitute(inst)}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="px-3 py-1 bg-indigo-50 text-indigo-700 font-bold text-xs rounded-full border border-indigo-100">
                                        {inst.instituteCode}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
                                    {inst.name}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {new Date(inst.createdAt).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDelete(inst.id);
                                        }} 
                                        className="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 p-2 rounded-lg transition-colors"
                                    >
                                        <Trash size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
