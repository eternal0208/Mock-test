import React, { useState, useEffect } from 'react';
import { Save, Plus, Trash, Settings, Copy, CheckCircle } from 'lucide-react';

import { API_BASE_URL } from '@/lib/config';

const PercentileConfig = ({ user }) => {
    const [config, setConfig] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // UI states
    const [activeTab, setActiveTab] = useState('overall');
    const [saveSuccess, setSaveSuccess] = useState(false);

    useEffect(() => {
        fetchConfig();
    }, [user]);

    const fetchConfig = async () => {
        try {
            const token = await user?.getIdToken();
            const res = await fetch(`${API_BASE_URL}/api/admin/percentile-data`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (res.ok) {
                const data = await res.json();
                // Ensure arrays exist even if backend returns empty document initially
                setConfig({
                    overallMappings: data.overallMappings || [],
                    shiftwiseMappings: data.shiftwiseMappings || []
                });
            }
        } catch (error) {
            console.error("Failed to fetch config", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!config) return;
        setSaving(true);
        try {
            const token = await user?.getIdToken();
            const res = await fetch(`${API_BASE_URL}/api/admin/percentile-data`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(config)
            });

            if (res.ok) {
                setSaveSuccess(true);
                setTimeout(() => setSaveSuccess(false), 3000);
            } else {
                alert("Failed to save configuration.");
            }
        } catch (error) {
            console.error("Save error", error);
            alert("Error saving configuration");
        } finally {
            setSaving(false);
        }
    };

    // Overall Mappings Handlers
    const addOverallRow = () => {
        setConfig(prev => ({
            ...prev,
            overallMappings: [...prev.overallMappings, { percentileRange: "", expectedRankRange: "", marksRequired: "" }]
        }));
    };

    const updateOverallRow = (idx, field, value) => {
        const newMappings = [...config.overallMappings];
        newMappings[idx][field] = value;
        setConfig({ ...config, overallMappings: newMappings });
    };

    const removeOverallRow = (idx) => {
        const newMappings = [...config.overallMappings];
        newMappings.splice(idx, 1);
        setConfig({ ...config, overallMappings: newMappings });
    };

    // Shift Handlers
    const addShiftRow = () => {
        setConfig(prev => ({
            ...prev,
            shiftwiseMappings: [...prev.shiftwiseMappings, {
                percentile: "",
                "21 S1": "", "21 S2": "", "22 S1": "", "22 S2": "", "23 S1": "", "23 S2": "", "24 S1": "", "24 S2": "", "28 S1": "", "28 S2": ""
            }]
        }));
    };

    const updateShiftRow = (idx, field, value) => {
        const newMappings = [...config.shiftwiseMappings];
        newMappings[idx][field] = value;
        setConfig({ ...config, shiftwiseMappings: newMappings });
    };

    const removeShiftRow = (idx) => {
        const newMappings = [...config.shiftwiseMappings];
        newMappings.splice(idx, 1);
        setConfig({ ...config, shiftwiseMappings: newMappings });
    };


    if (loading) return <div className="p-8 text-center text-gray-500 animate-pulse">Loading Configuration...</div>;
    if (!config) return <div className="p-8 text-center text-red-500">Failed to load configuration.</div>;

    const availableShifts = ["21 S1", "21 S2", "22 S1", "22 S2", "23 S1", "23 S2", "24 S1", "24 S2", "28 S1", "28 S2"];

    return (
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <Settings className="text-indigo-600" /> Percentile Prediction Config
                </h3>

                <button
                    onClick={handleSave}
                    disabled={saving}
                    className={`px-6 py-2 rounded-md font-bold text-white shadow-sm transition-all flex items-center gap-2 ${saveSuccess ? 'bg-green-500' : 'bg-indigo-600 hover:bg-indigo-700'
                        } disabled:opacity-50`}
                >
                    {saving ? 'Saving...' : saveSuccess ? <><CheckCircle size={18} /> Saved!</> : <><Save size={18} /> Save Settings</>}
                </button>
            </div>

            <p className="text-sm text-gray-500 mb-6 max-w-3xl">
                Configure the NTA Marks vs Percentile data. This data is used by the student dashboard and result pages to estimate a student's final JEE percentile and AIR rank based on their mock test scores.
            </p>

            <div className="flex border-b border-gray-200 mb-6">
                <button
                    className={`px-6 py-3 font-semibold text-sm ${activeTab === 'overall' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                    onClick={() => setActiveTab('overall')}
                >
                    Overall Mappings (Expected vs Marks)
                </button>
                <button
                    className={`px-6 py-3 font-semibold text-sm ${activeTab === 'shift' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                    onClick={() => setActiveTab('shift')}
                >
                    Advanced Shift-wise Mappings
                </button>
            </div>

            {/* Overall Tab */}
            {activeTab === 'overall' && (
                <div className="space-y-4">
                    <div className="bg-blue-50 border border-blue-200 p-4 rounded-md text-sm text-blue-800 mb-4">
                        Define broad mark ranges for percentile estimates. Format values exactly as you want them displayed (e.g., "99.0 - 99.5 %ile" or "180 - 210").
                    </div>

                    <div className="overflow-x-auto border rounded-xl shadow-sm">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 border-b">
                                    <th className="p-3 text-sm font-bold text-gray-600">Percentile Range</th>
                                    <th className="p-3 text-sm font-bold text-gray-600">Expected Rank (AIR)</th>
                                    <th className="p-3 text-sm font-bold text-gray-600">Marks Required (/300)</th>
                                    <th className="p-3 w-16 text-center"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {(config?.overallMappings || []).map((row, idx) => (
                                    <tr key={idx} className="border-b last:border-0 hover:bg-gray-50">
                                        <td className="p-2">
                                            <input
                                                className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                                                value={row.percentileRange}
                                                onChange={e => updateOverallRow(idx, 'percentileRange', e.target.value)}
                                                placeholder="99.0 - 99.5 %ile"
                                            />
                                        </td>
                                        <td className="p-2">
                                            <input
                                                className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                                                value={row.expectedRankRange}
                                                onChange={e => updateOverallRow(idx, 'expectedRankRange', e.target.value)}
                                                placeholder="6,000 - 12,000"
                                            />
                                        </td>
                                        <td className="p-2">
                                            <input
                                                className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none font-medium"
                                                value={row.marksRequired}
                                                onChange={e => updateOverallRow(idx, 'marksRequired', e.target.value)}
                                                placeholder="180 - 210"
                                            />
                                        </td>
                                        <td className="p-2 text-center">
                                            <button onClick={() => removeOverallRow(idx)} className="text-red-400 hover:text-red-600 p-1 rounded-full hover:bg-red-50">
                                                <Trash size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <button onClick={addOverallRow} className="mt-2 flex items-center gap-1 text-sm font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-4 py-2 rounded-lg transition-colors border border-indigo-100">
                        <Plus size={16} /> Add Range
                    </button>
                </div>
            )}

            {/* Shiftwise Tab */}
            {activeTab === 'shift' && (
                <div className="space-y-4">
                    <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-md text-sm text-yellow-800 mb-4 flex items-start gap-3">
                        <span className="text-2xl mt-[-2px]">⚠️</span>
                        <div>
                            <strong>Shift Normalization Data</strong><br />
                            Enter actual NTA-normalized data. The predictive model will automatically interpolate missing values if a student scores between two defined marks. Do not change the shift header names without developer assistance.
                        </div>
                    </div>

                    <div className="overflow-x-auto border rounded-xl shadow-sm">
                        <table className="w-full text-left border-collapse whitespace-nowrap">
                            <thead>
                                <tr className="bg-slate-800 text-white border-b">
                                    <th className="p-3 text-sm font-bold sticky left-0 bg-slate-900 border-r border-slate-700 z-10">%ile</th>
                                    {availableShifts.map(s => (
                                        <th key={s} className="p-3 text-xs font-bold text-slate-300 text-center">{s}</th>
                                    ))}
                                    <th className="p-3 w-12 text-center bg-slate-800"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {(config?.shiftwiseMappings || []).map((row, idx) => (
                                    <tr key={idx} className="border-b last:border-0 hover:bg-gray-50 group">
                                        <td className="p-2 sticky left-0 bg-white group-hover:bg-gray-50 border-r border-gray-200 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                            <input
                                                className="w-20 border border-gray-300 rounded p-1.5 text-sm font-bold text-center focus:ring-1 focus:ring-indigo-500 outline-none bg-indigo-50 text-indigo-900"
                                                value={row.percentile}
                                                onChange={e => updateShiftRow(idx, 'percentile', e.target.value)}
                                                placeholder="99"
                                            />
                                        </td>
                                        {availableShifts.map(s => (
                                            <td key={s} className="p-1 min-w-[60px]">
                                                <input
                                                    className="w-full border-0 rounded p-1.5 text-sm text-center focus:outline-none focus:ring-1 focus:ring-indigo-400 focus:bg-indigo-50 hover:bg-gray-100 transition-colors bg-transparent"
                                                    value={row[s] || ''}
                                                    onChange={e => updateShiftRow(idx, s, e.target.value)}
                                                    placeholder="-"
                                                />
                                            </td>
                                        ))}
                                        <td className="p-2 text-center">
                                            <button onClick={() => removeShiftRow(idx)} className="text-red-400 hover:text-red-600 p-1 opacity-50 hover:opacity-100 flex items-center justify-center">
                                                <Trash size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                        <button onClick={addShiftRow} className="flex items-center gap-1 text-sm font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-4 py-2 rounded-lg transition-colors border border-indigo-100">
                            <Plus size={16} /> Add Percentile Row
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PercentileConfig;
