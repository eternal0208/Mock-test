'use client';
import { useState, useEffect } from 'react';
import { Plus, Trash, Layers, BookOpen, AlertCircle } from 'lucide-react';
import { API_BASE_URL } from '@/lib/config';
import { useAuth } from '@/context/AuthContext';

export default function InstitutesManager() {
    const { user } = useAuth();
    const [institutes, setInstitutes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({ name: '', instituteCode: '' });

    useEffect(() => {
        if (user) fetchInstitutes();
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
                            <tr key={inst.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="px-3 py-1 bg-indigo-50 text-indigo-700 font-bold text-xs rounded-full border border-indigo-100">
                                        {inst.instituteCode}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                                    {inst.name}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {new Date(inst.createdAt).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button onClick={() => handleDelete(inst.id)} className="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 p-2 rounded-lg transition-colors">
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
