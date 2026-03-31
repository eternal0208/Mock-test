'use client';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { API_BASE_URL } from '@/lib/config';
import {
    Plus, Trash2, Save, BookOpen, FolderPlus, Upload, X, Search,
    ChevronDown, ChevronRight, Edit2, Eye, FileText, Download,
    ToggleLeft, ToggleRight, Loader2, AlertCircle, Crown, Unlock,
    FolderOpen, MoreVertical, RefreshCw, ExternalLink
} from 'lucide-react';

const FIELDS = ['JEE Main', 'JEE Advanced', 'NEET', 'CAT', 'Board Exam', 'Others'];
const EMOJIS = ['📄', '📝', '📚', '🧪', '🔬', '📐', '🧮', '🧠', '🎯', '📊', '🌡️', '⚛️', '🧬', '🔢', '✏️', '📖', '💡', '🎓'];

export default function NotesManager() {
    const { user } = useAuth();
    const [sections, setSections] = useState([]);
    const [notes, setNotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeField, setActiveField] = useState('JEE Main');
    const [activeSubTab, setActiveSubTab] = useState('sections'); // sections | upload | library | preview

    // Section form
    const [showSectionForm, setShowSectionForm] = useState(false);
    const [editingSection, setEditingSection] = useState(null);
    const [sectionForm, setSectionForm] = useState({ title: '', field: 'JEE Main', parentId: '', type: 'free', icon: '📄', description: '', order: 0, price: 499 });

    // Upload
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState([]);
    const [uploadSectionId, setUploadSectionId] = useState('');
    const [uploadType, setUploadType] = useState('free');
    const [uploadDownloadable, setUploadDownloadable] = useState(false);
    const fileInputRef = useRef(null);
    // Two-step upload: staged files waiting for confirmation
    const [stagedUploads, setStagedUploads] = useState([]); // [{...stageData, editTitle, editType, editDownloadable}]

    // Library
    const [searchQuery, setSearchQuery] = useState('');
    const [editingNote, setEditingNote] = useState(null);

    useEffect(() => {
        fetchData();
    }, [user]);

    const getToken = async () => {
        if (!user) return null;
        return await user.getIdToken();
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            const token = await getToken();
            if (!token) return;

            const [sectionsRes, notesRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/notes/sections`, { headers: { Authorization: `Bearer ${token}` } }),
                fetch(`${API_BASE_URL}/api/notes/admin/all`, { headers: { Authorization: `Bearer ${token}` } })
            ]);

            if (sectionsRes.ok) setSections(await sectionsRes.json());
            if (notesRes.ok) setNotes(await notesRes.json());
        } catch (err) {
            console.error('Fetch Error:', err);
        } finally {
            setLoading(false);
        }
    };

    // ===== SECTION CRUD =====
    const openSectionForm = (section = null) => {
        if (section) {
            setEditingSection(section);
            setSectionForm({
                title: section.title, field: section.field, parentId: section.parentId || '',
                type: section.type, icon: section.icon || '📄', description: section.description || '', order: section.order || 0,
                price: section.price || 499
            });
        } else {
            setEditingSection(null);
            setSectionForm({ title: '', field: activeField, parentId: '', type: 'free', icon: '📄', description: '', order: 0, price: 499 });
        }
        setShowSectionForm(true);
    };

    const saveSection = async () => {
        const token = await getToken();
        if (!token) return;
        if (!sectionForm.title.trim()) return alert('Title is required');

        try {
            const url = editingSection
                ? `${API_BASE_URL}/api/notes/sections/${editingSection.id}`
                : `${API_BASE_URL}/api/notes/sections`;

            const res = await fetch(url, {
                method: editingSection ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ ...sectionForm, parentId: sectionForm.parentId || null })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed');
            }

            setShowSectionForm(false);
            fetchData();
        } catch (err) {
            alert('Error: ' + err.message);
        }
    };

    const deleteSection = async (id) => {
        if (!confirm('Delete this section? This cannot be undone.')) return;
        const token = await getToken();
        try {
            const res = await fetch(`${API_BASE_URL}/api/notes/sections/${id}`, {
                method: 'DELETE', headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error);
            }
            fetchData();
        } catch (err) {
            alert('Error: ' + err.message);
        }
    };

    // ===== TWO-STEP PDF UPLOAD =====
    const handleFileUpload = async (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;
        if (!uploadSectionId) return alert('Please select a section first');

        const token = await getToken();
        if (!token) return;

        setUploading(true);
        const progress = files.map((f, i) => ({ name: f.name, status: 'pending', index: i }));
        setUploadProgress([...progress]);

        for (let i = 0; i < files.length; i++) {
            progress[i].status = 'uploading';
            setUploadProgress([...progress]);

            try {
                const formData = new FormData();
                formData.append('pdf', files[i]);
                formData.append('sectionId', uploadSectionId);
                formData.append('field', activeField);

                const res = await fetch(`${API_BASE_URL}/api/notes/upload-stage`, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token}` },
                    body: formData
                });

                if (!res.ok) throw new Error('Stage upload failed');
                const stageData = await res.json();

                // Add to staged list with editable defaults
                setStagedUploads(prev => [...prev, {
                    ...stageData,
                    editTitle: stageData.suggestedTitle,
                    editType: uploadType,
                    editDownloadable: uploadDownloadable,
                    editPrice: uploadType === 'paid' ? 99 : 0
                }]);

                progress[i].status = 'staged';
            } catch (err) {
                progress[i].status = 'error';
                console.error(`Stage error for ${files[i].name}:`, err);
            }
            setUploadProgress([...progress]);
        }

        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const confirmUpload = async (staged) => {
        const token = await getToken();
        if (!token) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/notes/confirm-upload`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    storagePath: staged.storagePath,
                    fileUrl: staged.fileUrl,
                    fileName: staged.fileName,
                    fileSize: staged.fileSize,
                    sectionId: staged.sectionId,
                    field: staged.field,
                    title: staged.editTitle,
                    type: staged.editType,
                    price: staged.editPrice,
                    isDownloadable: staged.editDownloadable
                })
            });
            if (!res.ok) throw new Error('Confirm failed');
            setStagedUploads(prev => prev.filter(s => s.storagePath !== staged.storagePath));
            setUploadProgress(prev => prev.map(p => p.name === staged.fileName ? { ...p, status: 'done' } : p));
            fetchData();
        } catch (err) {
            alert('Error confirming upload: ' + err.message);
        }
    };

    const discardUpload = async (staged) => {
        const token = await getToken();
        if (!token) return;
        try {
            await fetch(`${API_BASE_URL}/api/notes/discard-upload`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ storagePath: staged.storagePath })
            });
        } catch (err) {
            console.error('Discard error:', err);
        }
        setStagedUploads(prev => prev.filter(s => s.storagePath !== staged.storagePath));
        setUploadProgress(prev => prev.map(p => p.name === staged.fileName ? { ...p, status: 'discarded' } : p));
    };

    // ===== NOTE CRUD =====
    const updateNote = async (noteId, updates) => {
        const token = await getToken();
        try {
            const res = await fetch(`${API_BASE_URL}/api/notes/${noteId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(updates)
            });
            if (!res.ok) throw new Error('Update failed');
            fetchData();
            setEditingNote(null);
        } catch (err) {
            alert('Error: ' + err.message);
        }
    };

    const deleteNote = async (noteId) => {
        if (!confirm('Delete this note and its PDF file? This cannot be undone.')) return;
        const token = await getToken();
        try {
            const res = await fetch(`${API_BASE_URL}/api/notes/${noteId}`, {
                method: 'DELETE', headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Delete failed');
            fetchData();
        } catch (err) {
            alert('Error: ' + err.message);
        }
    };

    // ===== HELPERS =====
    const fieldSections = sections.filter(s => s.field === activeField);
    const parentSections = fieldSections.filter(s => !s.parentId);
    const fieldNotes = notes.filter(n => n.field === activeField);
    const filteredNotes = searchQuery
        ? fieldNotes.filter(n => n.title.toLowerCase().includes(searchQuery.toLowerCase()))
        : fieldNotes;

    const formatSize = (bytes) => {
        if (!bytes) return '?';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    const getSectionName = (sectionId) => {
        const s = sections.find(sec => sec.id === sectionId);
        return s ? s.title : 'Unknown';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="text-indigo-600 animate-spin" size={40} />
                    <p className="text-gray-500 font-medium">Loading Notes Manager...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-extrabold text-gray-800 flex items-center gap-2">
                        📚 Notes Manager
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">Upload, organize and manage study notes for students</p>
                </div>
                <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-sm transition">
                    <RefreshCw size={16} /> Refresh
                </button>
            </div>

            {/* Field Selector */}
            <div className="flex flex-wrap gap-2">
                {FIELDS.map(field => (
                    <button
                        key={field}
                        onClick={() => setActiveField(field)}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition ${activeField === field
                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                            : 'bg-white text-gray-600 border border-gray-200 hover:border-indigo-300 hover:text-indigo-600'
                            }`}
                    >
                        {field}
                    </button>
                ))}
            </div>

            {/* Sub-tabs */}
            <div className="flex gap-2 border-b border-gray-200 pb-1">
                {[
                    { key: 'sections', label: '📁 Sections', icon: FolderOpen },
                    { key: 'upload', label: '📤 Upload PDFs', icon: Upload },
                    { key: 'library', label: '📖 Library', icon: BookOpen },
                    { key: 'preview', label: '👁️ Student Preview', icon: Eye },
                ].map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveSubTab(tab.key)}
                        className={`px-3 sm:px-4 py-2 rounded-t-lg text-xs sm:text-sm font-bold transition whitespace-nowrap ${activeSubTab === tab.key
                            ? 'bg-white text-indigo-700 border border-b-white border-gray-200 -mb-px'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ============ SECTIONS TAB ============ */}
            {activeSubTab === 'sections' && (
                <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-gray-800">Sections for {activeField}</h3>
                        <button onClick={() => openSectionForm()} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition shadow-md shadow-indigo-200">
                            <FolderPlus size={16} /> New Section
                        </button>
                    </div>

                    {parentSections.length === 0 ? (
                        <div className="text-center py-16 text-gray-400">
                            <FolderOpen size={48} className="mx-auto mb-3 text-gray-300" />
                            <p className="font-bold">No sections for {activeField}</p>
                            <p className="text-sm">Create your first section to start organizing notes</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {parentSections.map(section => {
                                const subs = fieldSections.filter(s => s.parentId === section.id);
                                const noteCount = fieldNotes.filter(n => n.sectionId === section.id).length +
                                    subs.reduce((sum, sub) => sum + fieldNotes.filter(n => n.sectionId === sub.id).length, 0);

                                return (
                                    <div key={section.id} className="border border-gray-100 rounded-xl overflow-hidden">
                                        <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 hover:bg-gray-100 transition">
                                            <span className="text-xl">{section.icon}</span>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-bold text-gray-800 truncate">{section.title}</h4>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded-full ${section.type === 'paid'
                                                        ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                        {section.type} {section.type === 'paid' && `• ₹${section.price || 499}`}
                                                    </span>
                                                    <span className="text-[10px] text-gray-400">{noteCount} notes • {subs.length} subsections</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1 shrink-0">
                                                <button onClick={() => openSectionForm(section)} className="p-2 text-gray-400 hover:text-indigo-600 transition" title="Edit">
                                                    <Edit2 size={14} />
                                                </button>
                                                <button onClick={() => { setSectionForm({ ...sectionForm, field: activeField, parentId: section.id }); setShowSectionForm(true); }}
                                                    className="p-2 text-gray-400 hover:text-emerald-600 transition" title="Add Subsection">
                                                    <Plus size={14} />
                                                </button>
                                                <button onClick={() => deleteSection(section.id)} className="p-2 text-gray-400 hover:text-red-600 transition" title="Delete">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Subsections */}
                                        {subs.length > 0 && (
                                            <div className="ml-6 sm:ml-8 border-l-2 border-gray-100">
                                                {subs.map(sub => (
                                                    <div key={sub.id} className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition">
                                                        <span className="text-base">{sub.icon}</span>
                                                        <div className="flex-1 min-w-0">
                                                            <span className="text-sm font-bold text-gray-700 truncate block">{sub.title}</span>
                                                            <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full ${sub.type === 'paid'
                                                                ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                                                {sub.type} {sub.type === 'paid' && `• ₹${sub.price || 499}`}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-1 shrink-0">
                                                            <button onClick={() => openSectionForm(sub)} className="p-1.5 text-gray-400 hover:text-indigo-600 transition"><Edit2 size={12} /></button>
                                                            <button onClick={() => deleteSection(sub.id)} className="p-1.5 text-gray-400 hover:text-red-600 transition"><Trash2 size={12} /></button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* ============ UPLOAD TAB ============ */}
            {activeSubTab === 'upload' && (
                <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-6">Upload PDFs to {activeField}</h3>

                    {/* Config */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Target Section *</label>
                            <select
                                value={uploadSectionId}
                                onChange={e => setUploadSectionId(e.target.value)}
                                className="w-full px-3 py-2.5 rounded-xl border-2 border-gray-200 bg-gray-50 focus:bg-white focus:border-indigo-300 outline-none font-medium text-sm"
                            >
                                <option value="">Select Section...</option>
                                {fieldSections.map(s => (
                                    <option key={s.id} value={s.id}>
                                        {s.parentId ? '   ↳ ' : ''}{s.title} ({s.type})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Access Type</label>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setUploadType('free')}
                                    className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition ${uploadType === 'free' ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-300' : 'bg-gray-50 text-gray-500 border-2 border-gray-200'}`}
                                >
                                    ✅ Free
                                </button>
                                <button
                                    onClick={() => setUploadType('paid')}
                                    className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition ${uploadType === 'paid' ? 'bg-amber-100 text-amber-700 border-2 border-amber-300' : 'bg-gray-50 text-gray-500 border-2 border-gray-200'}`}
                                >
                                    👑 Paid
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Allow Download?</label>
                            <button
                                onClick={() => setUploadDownloadable(!uploadDownloadable)}
                                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm transition ${uploadDownloadable ? 'bg-indigo-100 text-indigo-700 border-2 border-indigo-300' : 'bg-gray-50 text-gray-500 border-2 border-gray-200'}`}
                            >
                                {uploadDownloadable ? <><ToggleRight size={18} /> Yes</> : <><ToggleLeft size={18} /> No</>}
                            </button>
                        </div>
                    </div>

                    {/* Drop Zone */}
                    <div className="border-2 border-dashed border-gray-300 rounded-2xl p-8 sm:p-12 text-center hover:border-indigo-300 hover:bg-indigo-50/30 transition group"
                        onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('border-indigo-400', 'bg-indigo-50'); }}
                        onDragLeave={e => { e.currentTarget.classList.remove('border-indigo-400', 'bg-indigo-50'); }}
                        onDrop={e => { e.preventDefault(); e.currentTarget.classList.remove('border-indigo-400', 'bg-indigo-50'); const dt = e.dataTransfer; if (dt.files.length) handleFileUpload({ target: { files: dt.files } }); }}
                    >
                        <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-100 flex items-center justify-center mb-4 group-hover:scale-110 transition">
                            <Upload size={32} className="text-indigo-600" />
                        </div>
                        <p className="font-bold text-gray-700 mb-1">Drag & Drop PDFs here</p>
                        <p className="text-sm text-gray-400 mb-4">or click to browse • Max 50MB per file</p>
                        <label className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm cursor-pointer hover:bg-indigo-700 transition shadow-md shadow-indigo-200">
                            <Upload size={16} /> Select PDF Files
                            <input ref={fileInputRef} type="file" accept=".pdf" multiple onChange={handleFileUpload} className="hidden" />
                        </label>
                    </div>

                    {/* Upload Progress */}
                    {uploadProgress.length > 0 && (
                        <div className="mt-6 space-y-2">
                            {uploadProgress.map((item, i) => (
                                <div key={i} className="flex items-center gap-3 px-4 py-2 bg-gray-50 rounded-xl">
                                    <FileText size={16} className={
                                        item.status === 'error' ? 'text-red-500' :
                                        item.status === 'staged' ? 'text-indigo-500' :
                                        item.status === 'done' ? 'text-emerald-500' :
                                        item.status === 'discarded' ? 'text-gray-400' :
                                        'text-gray-400'
                                    } />
                                    <span className="text-sm font-medium text-gray-700 flex-1 truncate">{item.name}</span>
                                    {item.status === 'uploading' && <Loader2 size={16} className="text-indigo-600 animate-spin" />}
                                    {item.status === 'staged' && <span className="text-[10px] font-black text-indigo-600 uppercase bg-indigo-50 px-2 py-0.5 rounded-full">⏳ Awaiting Confirmation</span>}
                                    {item.status === 'done' && <span className="text-[10px] font-black text-emerald-600 uppercase bg-emerald-50 px-2 py-0.5 rounded-full">✓ Saved</span>}
                                    {item.status === 'discarded' && <span className="text-[10px] font-black text-gray-500 uppercase bg-gray-100 px-2 py-0.5 rounded-full">✕ Discarded</span>}
                                    {item.status === 'error' && <span className="text-[10px] font-black text-red-600 uppercase bg-red-50 px-2 py-0.5 rounded-full">✗ Error</span>}
                                    {item.status === 'pending' && <span className="text-[10px] text-gray-400">Waiting...</span>}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ============ LIBRARY TAB ============ */}
            {activeSubTab === 'library' && (
                <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                        <h3 className="text-lg font-bold text-gray-800">
                            {activeField} Library <span className="text-gray-400 font-normal text-sm">({filteredNotes.length} notes)</span>
                        </h3>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input
                                type="text"
                                placeholder="Search notes..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="pl-9 pr-3 py-2 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-indigo-300 outline-none text-sm font-medium w-full sm:w-64"
                            />
                        </div>
                    </div>

                    {filteredNotes.length === 0 ? (
                        <div className="text-center py-16 text-gray-400">
                            <FileText size={48} className="mx-auto mb-3 text-gray-300" />
                            <p className="font-bold">{searchQuery ? 'No matching notes' : 'No notes uploaded yet'}</p>
                            <p className="text-sm">
                                {searchQuery ? 'Try different keywords' : 'Go to the Upload tab to add PDFs'}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {filteredNotes.map(note => (
                                <div key={note.id} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50/50 transition group">
                                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-400 to-red-500 flex items-center justify-center shrink-0 shadow-sm">
                                        <FileText className="text-white" size={18} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        {editingNote === note.id ? (
                                            <div className="flex flex-col gap-2 w-full">
                                                <input
                                                    type="text"
                                                    defaultValue={note.title}
                                                    onBlur={e => updateNote(note.id, { title: e.target.value })}
                                                    onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); }}
                                                    autoFocus
                                                    className="w-full px-2 py-1 border rounded text-sm font-bold"
                                                />
                                                {note.type === 'paid' && (
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-bold text-gray-500 uppercase">Price: ₹</span>
                                                        <input
                                                            type="number"
                                                            defaultValue={note.price || 99}
                                                            onBlur={e => updateNote(note.id, { price: parseInt(e.target.value) || 0 })}
                                                            onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); }}
                                                            className="w-20 px-2 py-0.5 border rounded text-xs"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <h4 className="text-sm font-bold text-gray-700 truncate">{note.title}</h4>
                                        )}
                                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                            <span className="text-[10px] text-gray-400">{getSectionName(note.sectionId)}</span>
                                            <span className="text-[10px] text-gray-400">•</span>
                                            <span className="text-[10px] text-gray-400">{formatSize(note.fileSize)}</span>
                                            <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full ${note.type === 'paid' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                                {note.type} {note.type === 'paid' && `• ₹${note.price || 99}`}
                                            </span>
                                            {note.isDownloadable && <span className="text-[9px] font-bold text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded-full">📥 DL</span>}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition">
                                        <button onClick={() => setEditingNote(note.id)} className="p-2 text-gray-400 hover:text-indigo-600 transition" title="Edit Title">
                                            <Edit2 size={14} />
                                        </button>
                                        <button onClick={() => updateNote(note.id, { isDownloadable: !note.isDownloadable })}
                                            className={`p-2 transition ${note.isDownloadable ? 'text-indigo-500' : 'text-gray-400'} hover:text-indigo-600`} title="Toggle Download">
                                            <Download size={14} />
                                        </button>
                                        <button onClick={() => {
                                            if (note.type === 'free') {
                                                const p = prompt("Enter Unlock Price (₹):", note.price || 99);
                                                if (p !== null) updateNote(note.id, { type: 'paid', price: parseInt(p) || 99 });
                                            } else {
                                                updateNote(note.id, { type: 'free' });
                                            }
                                        }}
                                            className="p-2 text-gray-400 hover:text-amber-600 transition" title="Toggle Free/Paid">
                                            {note.type === 'paid' ? <Crown size={14} className="text-amber-500" /> : <Unlock size={14} />}
                                        </button>
                                        <a href={note.fileUrl} target="_blank" rel="noopener noreferrer"
                                            className="p-2 text-gray-400 hover:text-emerald-600 transition" title="Open PDF">
                                            <ExternalLink size={14} />
                                        </a>
                                        <button onClick={() => deleteNote(note.id)} className="p-2 text-gray-400 hover:text-red-600 transition" title="Delete">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ============ PREVIEW TAB ============ */}
            {activeSubTab === 'preview' && (
                <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6">
                    <div className="flex items-center gap-2 mb-4 bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3">
                        <Eye size={18} className="text-indigo-600" />
                        <p className="text-sm font-bold text-indigo-700">
                            Student Preview — This is how students with <span className="bg-indigo-200 px-1.5 py-0.5 rounded">{activeField}</span> field will see the notes
                        </p>
                    </div>

                    <div className="border-2 border-dashed border-gray-200 rounded-xl p-4">
                        {parentSections.length === 0 ? (
                            <div className="text-center py-12 text-gray-400">
                                <BookOpen size={40} className="mx-auto mb-2 text-gray-300" />
                                <p className="font-bold">No sections to preview</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {parentSections.map(section => {
                                    const subs = fieldSections.filter(s => s.parentId === section.id);
                                    const sectionNotes = fieldNotes.filter(n => n.sectionId === section.id);

                                    return (
                                        <div key={section.id} className="rounded-xl border border-gray-100 overflow-hidden">
                                            <div className="flex items-center gap-3 px-4 py-3 bg-gray-50">
                                                <span className="text-xl">{section.icon}</span>
                                                <div className="flex-1">
                                                    <h4 className="font-bold text-gray-800">{section.title}</h4>
                                                    <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full ${section.type === 'paid' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{section.type === 'paid' ? '👑 Premium' : '✅ Free'}</span>
                                                </div>
                                            </div>
                                            <div className="px-4 py-2 space-y-1">
                                                {sectionNotes.map(n => (
                                                    <div key={n.id} className="flex items-center gap-2 py-1.5 text-sm text-gray-600">
                                                        <FileText size={14} className="text-red-400" />
                                                        <span className="truncate">{n.title}</span>
                                                        <span className="text-[10px] text-gray-400 ml-auto">{formatSize(n.fileSize)}</span>
                                                    </div>
                                                ))}
                                                {subs.map(sub => (
                                                    <div key={sub.id} className="ml-4 py-1">
                                                        <div className="flex items-center gap-2 text-sm font-bold text-gray-600 mb-1">
                                                            <span>{sub.icon}</span> {sub.title}
                                                            <span className={`text-[8px] font-black uppercase px-1 py-0.5 rounded ${sub.type === 'paid' ? 'bg-amber-50 text-amber-500' : 'bg-emerald-50 text-emerald-500'}`}>{sub.type}</span>
                                                        </div>
                                                        {fieldNotes.filter(n => n.sectionId === sub.id).map(n => (
                                                            <div key={n.id} className="flex items-center gap-2 py-1 ml-4 text-sm text-gray-500">
                                                                <FileText size={12} className="text-red-300" /> {n.title}
                                                            </div>
                                                        ))}
                                                    </div>
                                                ))}
                                                {sectionNotes.length === 0 && subs.length === 0 && (
                                                    <p className="text-xs text-gray-400 italic py-2">No notes yet</p>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ============ STAGED UPLOAD CONFIRMATION MODAL ============ */}
            {stagedUploads.length > 0 && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
                        {/* Header */}
                        <div className="flex items-center gap-3 px-6 py-5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white">
                            <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center">
                                <Save size={20} />
                            </div>
                            <div>
                                <h3 className="text-lg font-extrabold">Confirm Upload{stagedUploads.length > 1 ? `s (${stagedUploads.length})` : ''}</h3>
                                <p className="text-indigo-200 text-xs font-medium">PDF uploaded — review details before saving permanently</p>
                            </div>
                        </div>

                        {/* Files list */}
                        <div className="overflow-y-auto flex-1 divide-y divide-gray-100">
                            {stagedUploads.map((staged, idx) => (
                                <div key={staged.storagePath} className="p-5 sm:p-6">
                                    {/* File info row */}
                                    <div className="flex items-start gap-3 mb-4">
                                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-400 to-red-500 flex items-center justify-center shrink-0">
                                            <FileText className="text-white" size={18} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs text-gray-400 font-medium truncate">{staged.fileName}</p>
                                            <p className="text-[10px] text-gray-400">{staged.fileSize ? (staged.fileSize / (1024 * 1024)).toFixed(2) + ' MB' : ''}</p>
                                        </div>
                                        <a href={staged.fileUrl} target="_blank" rel="noopener noreferrer"
                                            className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-1.5 rounded-lg transition">
                                            <ExternalLink size={12} /> Preview PDF
                                        </a>
                                    </div>

                                    {/* Editable title */}
                                    <div className="mb-3">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Note Title *</label>
                                        <input
                                            type="text"
                                            value={staged.editTitle}
                                            onChange={e => setStagedUploads(prev => prev.map((s, i) => i === idx ? { ...s, editTitle: e.target.value } : s))}
                                            className="w-full px-3 py-2.5 rounded-xl border-2 border-gray-200 focus:border-indigo-400 outline-none font-semibold text-sm"
                                            placeholder="Enter a clear title for this note..."
                                        />
                                    </div>

                                    {/* Type + Downloadable */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Access Type</label>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => setStagedUploads(prev => prev.map((s, i) => i === idx ? { ...s, editType: 'free' } : s))}
                                                    className={`flex-1 py-2 rounded-xl font-bold text-sm transition border-2 ${staged.editType === 'free' ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'bg-gray-50 text-gray-400 border-gray-200'}`}
                                                >
                                                    ✅ Free
                                                </button>
                                                <button
                                                    onClick={() => setStagedUploads(prev => prev.map((s, i) => i === idx ? { ...s, editType: 'paid' } : s))}
                                                    className={`flex-1 py-2 rounded-xl font-bold text-sm transition border-2 ${staged.editType === 'paid' ? 'bg-amber-50 text-amber-700 border-amber-300' : 'bg-gray-50 text-gray-400 border-gray-200'}`}
                                                >
                                                    👑 Paid
                                                </button>
                                            </div>
                                        </div>
                                        {staged.editType === 'paid' && (
                                            <div className="col-span-2 mt-3 p-4 bg-amber-50 rounded-2xl border-2 border-amber-200 animate-in slide-in-from-top-2 duration-300">
                                                <label className="text-xs font-bold text-amber-700 uppercase tracking-wider block mb-2">Individual Unlock Price (₹) *</label>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-amber-200 flex items-center justify-center text-amber-700 font-bold shrink-0">₹</div>
                                                    <input
                                                        type="number"
                                                        value={staged.editPrice || 99}
                                                        onChange={e => setStagedUploads(prev => prev.map((s, i) => i === idx ? { ...s, editPrice: parseInt(e.target.value) || 0 } : s))}
                                                        className="flex-1 bg-white px-4 py-2.5 rounded-xl border-2 border-amber-300 outline-none font-bold text-amber-900 focus:ring-2 ring-amber-400/20"
                                                        placeholder="e.g. 99"
                                                    />
                                                </div>
                                                <p className="text-[10px] text-amber-600 font-medium mt-2">
                                                    ⚠️ Students will pay this amount to unlock just this PDF.
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Custom Price (Only show if Paid) */}
                                    {staged.editType === 'paid' && (
                                        <div className="mt-3 p-3 bg-amber-50 rounded-xl border border-amber-200">
                                            <label className="text-xs font-bold text-amber-700 uppercase tracking-wider block mb-1.5">Unlock Price (₹)</label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-600 font-bold">₹</span>
                                                <input
                                                    type="number"
                                                    value={staged.editPrice}
                                                    onChange={e => setStagedUploads(prev => prev.map((s, i) => i === idx ? { ...s, editPrice: parseInt(e.target.value) || 0 } : s))}
                                                    className="w-full pl-8 pr-3 py-2.5 rounded-xl border-2 border-amber-200 focus:border-amber-400 outline-none font-extrabold text-amber-800 bg-white shadow-inner"
                                                    placeholder="99"
                                                />
                                            </div>
                                            <p className="text-[10px] text-amber-600 mt-1 font-medium">This is the one-time payment required to unlock this individual note.</p>
                                        </div>
                                    )}

                                    {/* Action buttons */}
                                    <div className="flex gap-3 mt-4">
                                        <button
                                            onClick={() => confirmUpload(staged)}
                                            disabled={!staged.editTitle.trim()}
                                            className="flex-1 flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white rounded-xl font-extrabold text-sm hover:bg-indigo-700 transition shadow-md shadow-indigo-200 active:scale-95 disabled:opacity-40"
                                        >
                                            <Save size={16} /> Save to Library
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (confirm('Discard this upload? The PDF will be deleted from storage permanently.')) {
                                                    discardUpload(staged);
                                                }
                                            }}
                                            className="flex items-center justify-center gap-2 px-5 py-3 bg-red-50 text-red-600 rounded-xl font-bold text-sm hover:bg-red-100 border-2 border-red-200 transition active:scale-95"
                                        >
                                            <Trash2 size={16} /> Discard
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ============ SECTION FORM MODAL ============ */}
            {showSectionForm && (
                <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
                        <div className="p-6 border-b bg-gray-50 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-gray-800">
                                {editingSection ? 'Edit Section' : (sectionForm.parentId ? 'New Subsection' : 'New Section')}
                            </h3>
                            <button onClick={() => setShowSectionForm(false)} className="p-2 text-gray-400 hover:text-gray-600"><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            {/* Emoji selector */}
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Icon</label>
                                <div className="flex flex-wrap gap-2">
                                    {EMOJIS.map(emoji => (
                                        <button key={emoji} onClick={() => setSectionForm({ ...sectionForm, icon: emoji })}
                                            className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center transition ${sectionForm.icon === emoji ? 'bg-indigo-100 ring-2 ring-indigo-400' : 'bg-gray-100 hover:bg-gray-200'}`}>
                                            {emoji}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Title *</label>
                                <input
                                    type="text" value={sectionForm.title}
                                    onChange={e => setSectionForm({ ...sectionForm, title: e.target.value })}
                                    placeholder="e.g. Organic Chemistry" className="w-full px-3 py-2.5 rounded-xl border-2 border-gray-200 focus:border-indigo-300 outline-none font-medium"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Description</label>
                                <textarea
                                    value={sectionForm.description}
                                    onChange={e => setSectionForm({ ...sectionForm, description: e.target.value })}
                                    placeholder="Optional description..." rows={2}
                                    className="w-full px-3 py-2.5 rounded-xl border-2 border-gray-200 focus:border-indigo-300 outline-none font-medium text-sm resize-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Type</label>
                                    <div className="flex gap-2">
                                        <button onClick={() => setSectionForm({ ...sectionForm, type: 'free' })}
                                            className={`flex-1 py-2 rounded-xl text-sm font-bold transition ${sectionForm.type === 'free' ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-300' : 'bg-gray-50 text-gray-500 border-2 border-gray-200'}`}>
                                            Free
                                        </button>
                                        <button onClick={() => setSectionForm({ ...sectionForm, type: 'paid' })}
                                            className={`flex-1 py-2 rounded-xl text-sm font-bold transition ${sectionForm.type === 'paid' ? 'bg-amber-100 text-amber-700 border-2 border-amber-300' : 'bg-gray-50 text-gray-500 border-2 border-gray-200'}`}>
                                            Paid
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Sort Order</label>
                                    <input type="number" value={sectionForm.order}
                                        onChange={e => setSectionForm({ ...sectionForm, order: parseInt(e.target.value) || 0 })}
                                        className="w-full px-3 py-2 rounded-xl border-2 border-gray-200 focus:border-indigo-300 outline-none font-medium text-sm"
                                    />
                                </div>
                            </div>

                            {sectionForm.type === 'paid' && (
                                <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                                    <label className="text-xs font-bold text-amber-700 uppercase tracking-wider block mb-1.5">Section Unlock Price (₹)</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-600 font-bold">₹</span>
                                        <input
                                            type="number"
                                            value={sectionForm.price}
                                            onChange={e => setSectionForm({ ...sectionForm, price: parseInt(e.target.value) || 0 })}
                                            className="w-full pl-8 pr-3 py-2.5 rounded-xl border-2 border-amber-200 focus:border-amber-400 outline-none font-extrabold text-amber-800 bg-white shadow-inner"
                                            placeholder="499"
                                        />
                                    </div>
                                    <p className="text-[10px] text-amber-600 mt-1 font-medium italic">Students can pay this amount to unlock ALL notes in this section at once.</p>
                                </div>
                            )}

                            {!editingSection && !sectionForm.parentId && (
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Parent Section (optional)</label>
                                    <select value={sectionForm.parentId || ''}
                                        onChange={e => setSectionForm({ ...sectionForm, parentId: e.target.value })}
                                        className="w-full px-3 py-2.5 rounded-xl border-2 border-gray-200 focus:border-indigo-300 outline-none font-medium text-sm">
                                        <option value="">None (Top-level section)</option>
                                        {parentSections.map(s => <option key={s.id} value={s.id}>{s.icon} {s.title}</option>)}
                                    </select>
                                </div>
                            )}
                        </div>
                        <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
                            <button onClick={() => setShowSectionForm(false)} className="px-5 py-2.5 rounded-xl text-gray-600 font-bold text-sm hover:bg-gray-200 transition">Cancel</button>
                            <button onClick={saveSection} className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition shadow-md shadow-indigo-200">
                                {editingSection ? 'Update' : 'Create'} Section
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
