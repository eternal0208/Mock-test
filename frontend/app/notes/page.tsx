'use client';
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { API_BASE_URL } from '@/lib/config';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
    BookOpen, ChevronDown, ChevronRight, FileText, Lock, Unlock,
    ArrowLeft, Loader2, Search, Download, Eye, Crown, Sparkles,
    FolderOpen, GraduationCap
} from 'lucide-react';

// Lazy-load the PDF viewer
const NoteViewer = dynamic(() => import('@/components/ui/NoteViewer'), { ssr: false });

interface Note {
    id: string;
    title: string;
    sectionId: string;
    type: 'free' | 'paid';
    fileName: string;
    fileSize: number;
    isDownloadable: boolean;
    createdAt: string;
}

interface Section {
    id: string;
    title: string;
    field: string;
    type: 'free' | 'paid';
    icon: string;
    description: string;
    parentId: string | null;
    subsections: Section[];
    notes: Note[];
}

interface ViewingNote {
    fileUrl: string;
    title: string;
    isDownloadable: boolean;
}

export default function NotesPage() {
    const { user, loading: authLoading } = useAuth() as any;
    const router = useRouter();
    const [sections, setSections] = useState<Section[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
    const [searchQuery, setSearchQuery] = useState('');
    const [viewingNote, setViewingNote] = useState<ViewingNote | null>(null);
    const [loadingNote, setLoadingNote] = useState<string | null>(null);
    const [premiumLockedNote, setPremiumLockedNote] = useState<string | null>(null);

    const userField = user?.category || user?.selectedField || '';

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/?login=true');
            return;
        }
        if (user && userField) {
            fetchNotes();
        }
    }, [user, authLoading, userField]);

    const fetchNotes = async () => {
        try {
            setLoading(true);
            const token = await user.getIdToken();
            const res = await fetch(`${API_BASE_URL}/api/notes/browse/${encodeURIComponent(userField)}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to load notes');
            const data = await res.json();
            setSections(data.sections || []);
        } catch (err: any) {
            console.error('Fetch Notes Error:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const toggleSection = (sectionId: string) => {
        setExpandedSections(prev => {
            const next = new Set(prev);
            if (next.has(sectionId)) next.delete(sectionId);
            else next.add(sectionId);
            return next;
        });
    };

    const openNote = async (noteId: string) => {
        try {
            setLoadingNote(noteId);
            const token = await user.getIdToken();
            const res = await fetch(`${API_BASE_URL}/api/notes/${noteId}/view`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            if (res.status === 403) {
                setPremiumLockedNote(noteId);
                return;
            }

            if (!res.ok) throw new Error('Failed to load note');
            const data = await res.json();
            setViewingNote({
                fileUrl: data.fileUrl,
                title: data.title,
                isDownloadable: data.isDownloadable
            });
        } catch (err: any) {
            console.error('Open Note Error:', err);
            setError(err.message);
        } finally {
            setLoadingNote(null);
        }
    };

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    // Filter sections/notes by search query
    const filteredSections = sections.map(section => {
        if (!searchQuery) return section;
        const q = searchQuery.toLowerCase();
        const matchesSection = section.title.toLowerCase().includes(q);
        const matchedNotes = section.notes.filter(n => n.title.toLowerCase().includes(q));
        const matchedSubs = section.subsections.map(sub => ({
            ...sub,
            notes: sub.notes.filter(n => n.title.toLowerCase().includes(q) || sub.title.toLowerCase().includes(q))
        })).filter(sub => sub.notes.length > 0 || sub.title.toLowerCase().includes(q));

        if (matchesSection || matchedNotes.length > 0 || matchedSubs.length > 0) {
            return { ...section, notes: matchesSection ? section.notes : matchedNotes, subsections: matchesSection ? section.subsections : matchedSubs };
        }
        return null;
    }).filter(Boolean) as Section[];

    const totalNotes = sections.reduce((sum, s) => {
        return sum + s.notes.length + s.subsections.reduce((sub, ss) => sub + ss.notes.length, 0);
    }, 0);

    const freeNotes = sections.reduce((sum, s) => {
        const sNotes = s.type === 'free' ? s.notes.length : s.notes.filter(n => n.type === 'free').length;
        const ssNotes = s.subsections.reduce((sub, ss) => {
            return sub + (ss.type === 'free' ? ss.notes.length : ss.notes.filter(n => n.type === 'free').length);
        }, 0);
        return sum + sNotes + ssNotes;
    }, 0);

    if (authLoading || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 50%, #ddd6fe 100%)' }}>
                <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center animate-pulse shadow-lg shadow-indigo-500/30">
                        <BookOpen className="text-white" size={32} />
                    </div>
                    <p className="text-slate-600 font-semibold">Loading your notes...</p>
                </div>
            </div>
        );
    }

    if (!user) return null;

    // PDF Viewer overlay
    if (viewingNote) {
        return (
            <NoteViewer
                fileUrl={viewingNote.fileUrl}
                title={viewingNote.title}
                isDownloadable={viewingNote.isDownloadable}
                onClose={() => setViewingNote(null)}
            />
        );
    }

    return (
        <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 30%, #e0e7ff 100%)' }}>
            {/* Header */}
            <header className="sticky top-0 z-40" style={{ background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => router.push('/dashboard')} className="p-2 rounded-xl hover:bg-slate-100 transition text-slate-500 hover:text-slate-800">
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <h1 className="text-lg sm:text-xl font-extrabold text-slate-900" style={{ fontFamily: 'var(--font-headline)' }}>
                                📚 Study Notes
                            </h1>
                            <p className="text-xs text-slate-500 font-medium">{userField} • {totalNotes} Notes Available</p>
                        </div>
                    </div>
                    <Link href="/dashboard">
                        <button className="hidden sm:block px-4 py-2 rounded-xl text-sm font-bold text-indigo-700 hover:bg-indigo-50 transition">
                            Dashboard
                        </button>
                    </Link>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
                {/* Stats Strip */}
                <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
                    <div className="rounded-2xl p-4 sm:p-5 border border-white/50" style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(12px)' }}>
                        <div className="flex items-center gap-2 mb-1">
                            <FolderOpen size={16} className="text-indigo-500" />
                            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-slate-500">Sections</span>
                        </div>
                        <p className="text-2xl sm:text-3xl font-extrabold text-slate-900">{sections.length}</p>
                    </div>
                    <div className="rounded-2xl p-4 sm:p-5 border border-white/50" style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(12px)' }}>
                        <div className="flex items-center gap-2 mb-1">
                            <Unlock size={16} className="text-emerald-500" />
                            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-slate-500">Free</span>
                        </div>
                        <p className="text-2xl sm:text-3xl font-extrabold text-emerald-600">{freeNotes}</p>
                    </div>
                    <div className="rounded-2xl p-4 sm:p-5 border border-white/50" style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(12px)' }}>
                        <div className="flex items-center gap-2 mb-1">
                            <Crown size={16} className="text-amber-500" />
                            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-slate-500">Premium</span>
                        </div>
                        <p className="text-2xl sm:text-3xl font-extrabold text-amber-600">{totalNotes - freeNotes}</p>
                    </div>
                </div>

                {/* Search */}
                <div className="relative mb-6 sm:mb-8">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search notes by title..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 sm:py-3.5 rounded-2xl border-2 border-white/50 bg-white/60 backdrop-blur-sm focus:bg-white focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100 outline-none text-slate-800 font-medium text-sm sm:text-base placeholder:text-slate-400 transition"
                    />
                </div>

                {/* Error */}
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl mb-6 text-sm font-medium">
                        ⚠️ {error}
                    </div>
                )}

                {/* Empty state */}
                {filteredSections.length === 0 && !error && (
                    <div className="py-20 text-center" style={{ background: 'rgba(255,255,255,0.5)', borderRadius: '1.5rem' }}>
                        <GraduationCap size={64} className="mx-auto text-slate-300 mb-4" />
                        <h3 className="text-xl font-bold text-slate-500 mb-2">
                            {searchQuery ? 'No notes match your search' : 'No notes available yet'}
                        </h3>
                        <p className="text-slate-400 text-sm">
                            {searchQuery ? 'Try a different keyword' : `Notes for ${userField} will appear here once uploaded by the admin.`}
                        </p>
                    </div>
                )}

                {/* Sections List */}
                <div className="space-y-4">
                    {filteredSections.map(section => (
                        <div key={section.id} className="rounded-2xl overflow-hidden border border-white/50 shadow-sm" style={{ background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(12px)' }}>
                            {/* Section Header */}
                            <button
                                onClick={() => toggleSection(section.id)}
                                className="w-full flex items-center justify-between px-5 sm:px-6 py-4 sm:py-5 text-left hover:bg-white/50 transition group"
                            >
                                <div className="flex items-center gap-3 sm:gap-4">
                                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center text-xl sm:text-2xl shrink-0"
                                        style={{ background: section.type === 'paid' ? 'linear-gradient(135deg, #fbbf24, #f59e0b)' : 'linear-gradient(135deg, #34d399, #10b981)' }}>
                                        {section.icon || '📄'}
                                    </div>
                                    <div>
                                        <h3 className="text-base sm:text-lg font-bold text-slate-800 group-hover:text-indigo-700 transition">
                                            {section.title}
                                        </h3>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${section.type === 'paid'
                                                ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                {section.type === 'paid' ? '👑 Premium' : '✅ Free'}
                                            </span>
                                            <span className="text-[10px] text-slate-400 font-medium">
                                                {section.notes.length + section.subsections.reduce((s, ss) => s + ss.notes.length, 0)} notes
                                            </span>
                                        </div>
                                        {section.description && (
                                            <p className="text-xs text-slate-500 mt-1 hidden sm:block">{section.description}</p>
                                        )}
                                    </div>
                                </div>
                                <div className="text-slate-400 group-hover:text-indigo-500 transition shrink-0">
                                    {expandedSections.has(section.id) ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                                </div>
                            </button>

                            {/* Expanded Content */}
                            {expandedSections.has(section.id) && (
                                <div className="px-4 sm:px-6 pb-4 sm:pb-6 border-t border-slate-100">
                                    {/* Direct notes in this section */}
                                    {section.notes.length > 0 && (
                                        <div className="pt-3 space-y-2">
                                            {section.notes.map(note => (
                                                <NoteCard key={note.id} note={note} onOpen={openNote} loadingId={loadingNote} formatSize={formatFileSize} />
                                            ))}
                                        </div>
                                    )}

                                    {/* Subsections */}
                                    {section.subsections.map(sub => (
                                        <div key={sub.id} className="mt-4">
                                            <button
                                                onClick={() => toggleSection(sub.id)}
                                                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-50 transition"
                                            >
                                                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm"
                                                    style={{ background: sub.type === 'paid' ? '#fef3c7' : '#d1fae5' }}>
                                                    {sub.icon || '📁'}
                                                </div>
                                                <span className="text-sm font-bold text-slate-700">{sub.title}</span>
                                                <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full ${sub.type === 'paid'
                                                    ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                                    {sub.type}
                                                </span>
                                                <span className="text-[10px] text-slate-400">({sub.notes.length})</span>
                                                <div className="ml-auto text-slate-300">
                                                    {expandedSections.has(sub.id) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                                </div>
                                            </button>

                                            {expandedSections.has(sub.id) && sub.notes.length > 0 && (
                                                <div className="ml-4 sm:ml-6 mt-2 space-y-2">
                                                    {sub.notes.map(note => (
                                                        <NoteCard key={note.id} note={note} onOpen={openNote} loadingId={loadingNote} formatSize={formatFileSize} />
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}

                                    {/* Empty section */}
                                    {section.notes.length === 0 && section.subsections.length === 0 && (
                                        <div className="pt-4 text-center text-slate-400 text-sm py-8">
                                            <FileText size={32} className="mx-auto mb-2 text-slate-300" />
                                            No notes in this section yet
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </main>

            {/* Premium Locked Modal */}
            {premiumLockedNote && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl p-8 sm:p-10 max-w-md text-center shadow-2xl animate-in zoom-in duration-300">
                        <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Crown className="text-amber-600" size={40} />
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 mb-2">Premium Note</h3>
                        <p className="text-slate-600 mb-8 font-medium leading-relaxed">
                            This resource is exclusive to our premium members. Unlock full access by enrolling in a paid test series.
                        </p>
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={() => window.location.href = '/dashboard'}
                                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition shadow-lg shadow-indigo-200"
                            >
                                Get Premium Access
                            </button>
                            <button
                                onClick={() => setPremiumLockedNote(null)}
                                className="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Reusable Note Card
function NoteCard({ note, onOpen, loadingId, formatSize }: { note: Note; onOpen: (id: string) => void; loadingId: string | null; formatSize: (b: number) => string }) {
    const isLoading = loadingId === note.id;

    return (
        <button
            onClick={() => onOpen(note.id)}
            disabled={isLoading}
            className="w-full flex items-center gap-3 sm:gap-4 px-3 sm:px-4 py-3 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/50 transition group text-left"
        >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-red-400 to-red-500 flex items-center justify-center shrink-0 shadow-sm shadow-red-500/20">
                {isLoading ? (
                    <Loader2 className="text-white animate-spin" size={18} />
                ) : (
                    <FileText className="text-white" size={18} />
                )}
            </div>
            <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-slate-700 group-hover:text-indigo-700 truncate transition">{note.title}</h4>
                <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-slate-400 font-medium">{formatSize(note.fileSize)}</span>
                    {note.isDownloadable && (
                        <span className="flex items-center gap-0.5 text-[10px] text-emerald-500 font-bold">
                            <Download size={10} /> Downloadable
                        </span>
                    )}
                    <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full ${note.type === 'paid' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                        {note.type}
                    </span>
                </div>
            </div>
            <div className="shrink-0 text-slate-300 group-hover:text-indigo-400 transition">
                <Eye size={18} />
            </div>
        </button>
    );
}
