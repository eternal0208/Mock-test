import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { API_BASE_URL } from '@/lib/config';
import dynamic from 'next/dynamic';
import {
    BookOpen, ChevronDown, ChevronRight, FileText, Lock, Unlock,
    Loader2, Search, Download, Eye, Crown, FolderOpen, GraduationCap
} from 'lucide-react';
import PremiumNoteModal from '@/components/ui/PremiumNoteModal';

// Lazy-load the PDF viewer
const NoteViewer = dynamic(() => import('@/components/ui/NoteViewer'), { ssr: false });

interface Note {
    id: string;
    title: string;
    sectionId: string;
    type: 'free' | 'paid';
    price?: number;
    fileName: string;
    fileSize: number;
    isDownloadable: boolean;
    createdAt: string;
    isPurchased?: boolean;
    instituteCode?: string;
}

interface Section {
    id: string;
    title: string;
    field: string;
    type: 'free' | 'paid';
    price?: number;
    icon: string;
    description: string;
    parentId: string | null;
    subsections: Section[];
    notes: Note[];
    isPurchased?: boolean;
    instituteCode?: string;
}

interface ViewingNote {
    fileUrl: string;
    title: string;
    isDownloadable: boolean;
}

export default function NotesSection() {
    const { user, loading: authLoading } = useAuth() as any;
    const [sections, setSections] = useState<Section[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
    const [searchQuery, setSearchQuery] = useState('');
    const [viewingNote, setViewingNote] = useState<ViewingNote | null>(null);
    const [loadingNote, setLoadingNote] = useState<string | null>(null);
    const [premiumLockedNote, setPremiumLockedNote] = useState<string | null>(null);
    const [premiumInfo, setPremiumInfo] = useState<any>(null);
    const [initialMode, setInitialMode] = useState<'note' | 'section' | undefined>(undefined);

    const userField = user?.category || user?.selectedField || '';

    useEffect(() => {
        if (user && userField) {
            fetchNotes();
        }
    }, [user, userField]);

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
                const errData = await res.json();
                if (errData.isPremium) {
                    setInitialMode('note');
                    setPremiumInfo(errData);
                } else {
                    setPremiumLockedNote(noteId);
                }
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

    // Accurate recursive counting
    const getStats = (items: Section[], parentType: 'free' | 'paid' = 'free') => {
        let stats = { sections: 0, notes: 0, free: 0 };
        
        items.forEach(s => {
            stats.sections += 1; // Count this section
            const currentSectionType = (s.type === 'paid' || parentType === 'paid') ? 'paid' : 'free';
            
            // Count notes in this section
            s.notes.forEach(n => {
                stats.notes += 1;
                // A note is truly free only if IT and ITS SECTION (and ancestors) are free
                if (n.type === 'free' && currentSectionType === 'free') {
                    stats.free += 1;
                }
            });
            
            // Count recursively into subsections
            if (s.subsections && s.subsections.length > 0) {
                const subStats = getStats(s.subsections, currentSectionType);
                stats.sections += subStats.sections;
                stats.notes += subStats.notes;
                stats.free += subStats.free;
            }
        });
        
        return stats;
    };

    const stats = getStats(sections);
    const totalNotes = stats.notes;
    const freeNotes = stats.free;
    const totalSectionsCount = stats.sections;

    if (authLoading || loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center animate-pulse shadow-lg shadow-indigo-500/30 mb-4">
                    <BookOpen className="text-white" size={32} />
                </div>
                <p className="text-slate-600 font-semibold">Loading your notes...</p>
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

    // Show purchased note after payment success
    const handlePremiumSuccess = (noteId: string) => {
        setPremiumInfo(null);
        openNote(noteId);
    };

    return (
        <div className="w-full animate-in fade-in duration-500">
            {/* Premium Purchase Modal */}
            {premiumInfo && (
                <PremiumNoteModal
                    info={premiumInfo}
                    initialMode={initialMode}
                    onClose={() => {
                        setPremiumInfo(null);
                        setInitialMode(undefined);
                    }}
                    onSuccess={handlePremiumSuccess}
                />
            )}
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-2">
                    📚 Study Notes
                </h1>
                <p className="text-sm text-slate-500 font-medium">
                    {userField} module • {totalNotes} resources available
                </p>
            </div>

            {/* Stats Strip */}
            <div className="grid grid-cols-3 gap-3 sm:gap-5 mb-8 sm:mb-10">
                <div className="relative overflow-hidden rounded-[2rem] p-5 sm:p-6 border border-white/40 bg-white/60 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all hover:-translate-y-1 duration-300">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
                    <div className="relative z-10 flex items-center gap-2 mb-3">
                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                            <FolderOpen size={18} />
                        </div>
                        <span className="text-[10px] sm:text-xs font-extrabold uppercase tracking-widest text-slate-500">Sections</span>
                    </div>
                    <p className="relative z-10 text-3xl sm:text-4xl font-black text-slate-800 tracking-tight">{totalSectionsCount}</p>
                </div>
                <div className="relative overflow-hidden rounded-[2rem] p-5 sm:p-6 border border-white/40 bg-white/60 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all hover:-translate-y-1 duration-300">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
                    <div className="relative z-10 flex items-center gap-2 mb-3">
                        <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                            <Unlock size={18} />
                        </div>
                        <span className="text-[10px] sm:text-xs font-extrabold uppercase tracking-widest text-slate-500">Free</span>
                    </div>
                    <p className="relative z-10 text-3xl sm:text-4xl font-black text-emerald-600 tracking-tight">{freeNotes}</p>
                </div>
                <div className="relative overflow-hidden rounded-[2rem] p-5 sm:p-6 border border-white/40 bg-white/60 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all hover:-translate-y-1 duration-300">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
                    <div className="relative z-10 flex items-center gap-2 mb-3">
                        <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                            <Crown size={18} />
                        </div>
                        <span className="text-[10px] sm:text-xs font-extrabold uppercase tracking-widest text-slate-500">Premium</span>
                    </div>
                    <p className="relative z-10 text-3xl sm:text-4xl font-black text-amber-600 tracking-tight">{totalNotes - freeNotes}</p>
                </div>
            </div>

            {/* Search */}
            <div className="relative mb-8 sm:mb-10 group">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={20} />
                <input
                    type="text"
                    placeholder="Search notes by title..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-6 py-4 sm:py-5 rounded-[2rem] border-2 border-white/60 bg-white/40 hover:bg-white/60 focus:bg-white backdrop-blur-md focus:border-indigo-400 outline-none text-slate-800 font-bold text-sm sm:text-base placeholder:text-slate-400 placeholder:font-medium transition-all shadow-[0_4px_20px_rgb(0,0,0,0.03)] focus:shadow-[0_8px_30px_rgba(99,102,241,0.12)]"
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
                <div className="py-20 text-center bg-white border border-slate-100 rounded-[2rem] shadow-sm">
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
            <div className="space-y-5">
                {filteredSections.map(section => (
                    <div key={section.id} className="rounded-[2rem] overflow-hidden border border-white/40 bg-white/60 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] transition-all duration-500 group/section">
                        {/* Section Header */}
                        <div
                            role="button"
                            tabIndex={0}
                            onClick={() => toggleSection(section.id)}
                            onKeyDown={(e) => e.key === 'Enter' && toggleSection(section.id)}
                            className="w-full flex items-center justify-between px-6 sm:px-8 py-5 sm:py-6 text-left hover:bg-white/60 transition-colors cursor-pointer"
                        >
                            <div className="flex items-center gap-4 sm:gap-6">
                                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-[1.3rem] flex items-center justify-center text-2xl sm:text-3xl shrink-0 shadow-lg"
                                    style={{ background: section.type === 'paid' ? 'linear-gradient(135deg, #fbbf24, #f59e0b)' : 'linear-gradient(135deg, #34d399, #10b981)', color: '#fff', boxShadow: section.type === 'paid' ? '0 10px 25px -5px rgba(245, 158, 11, 0.4)' : '0 10px 25px -5px rgba(16, 185, 129, 0.4)' }}>
                                    {section.icon || '📄'}
                                </div>
                                <div>
                                    <h3 className="text-lg sm:text-xl font-black text-slate-800 group-hover/section:text-indigo-700 transition-colors tracking-tight">
                                        {section.title}
                                    </h3>
                                    <div className="flex items-center gap-2 mt-1 sm:mt-1.5 flex-wrap">
                                        <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${section.type === 'paid'
                                            ? (section.isPurchased ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800')
                                            : 'bg-emerald-100 text-emerald-800'}`}>
                                            {section.type === 'paid' ? (section.isPurchased ? '✅ Unlocked' : `👑 Premium • ₹${section.price || 499}`) : '✅ Free'}
                                        </span>
                                        {section.instituteCode && (
                                            <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-200">
                                                ✨ {user?.instituteName ? `${user.instituteName.toUpperCase()} EXCLUSIVE` : 'INSTITUTE EXCLUSIVE'}
                                            </span>
                                        )}
                                        <span className="text-xs text-slate-500 font-bold bg-slate-100/80 px-2.5 py-1 rounded-full">
                                            {section.notes.length + section.subsections.reduce((s, ss) => s + ss.notes.length, 0)} notes
                                        </span>
                                    </div>
                                    {section.description && (
                                        <p className="text-sm font-medium text-slate-500 mt-2 hidden sm:block leading-relaxed max-w-2xl">{section.description}</p>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                {section.type === 'paid' && !section.isPurchased && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setInitialMode('section');
                                            setPremiumInfo({
                                                noteId: section.notes?.[0]?.id || section.id,
                                                noteTitle: 'Full Section Access',
                                                sectionId: section.id,
                                                sectionTitle: section.title,
                                                notePrice: section.notes?.[0]?.price || 99,
                                                sectionPrice: section.price || 499,
                                                field: userField
                                            });
                                        }}
                                        className="hidden sm:flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-[11px] font-black uppercase tracking-tight rounded-xl transition-all hover:scale-105 active:scale-95 shadow-[0_8px_20px_rgba(245,158,11,0.3)]"
                                    >
                                        <Crown size={14} /> Buy Section
                                    </button>
                                )}
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 shrink-0 ${expandedSections.has(section.id) ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 rotate-180' : 'bg-slate-100 text-slate-400 group-hover/section:bg-indigo-100 group-hover/section:text-indigo-600'}`}>
                                    <ChevronDown size={20} />
                                </div>
                            </div>
                        </div>

                        {/* Expanded Content */}
                        {expandedSections.has(section.id) && (
                            <div className="px-5 sm:px-8 pb-6 sm:pb-8 border-t border-slate-100/50 bg-slate-50/30">
                                {/* Direct notes in this section */}
                                {section.notes.length > 0 && (
                                    <div className="pt-4 space-y-3">
                                        {section.notes.map(note => (
                                            <NoteCard 
                                                key={note.id} 
                                                note={note} 
                                                sectionType={section.type}
                                                sectionPrice={section.price}
                                                onOpen={openNote} 
                                                loadingId={loadingNote} 
                                                formatSize={formatFileSize}
                                                user={user} 
                                            />
                                        ))}
                                    </div>
                                )}

                                {/* Subsections */}
                                {section.subsections.map(sub => (
                                    <div key={sub.id} className="mt-6">
                                        <div
                                            role="button"
                                            tabIndex={0}
                                            onClick={() => toggleSection(sub.id)}
                                            onKeyDown={(e) => e.key === 'Enter' && toggleSection(sub.id)}
                                            className="w-full flex items-center gap-3 px-4 py-3 rounded-[1.2rem] hover:bg-white bg-slate-100/50 border border-transparent hover:border-slate-200 cursor-pointer hover:shadow-sm transition-all group/sub"
                                        >
                                            <div className="w-8 h-8 rounded-[0.8rem] flex items-center justify-center text-base"
                                                style={{ background: sub.type === 'paid' ? '#fef3c7' : '#d1fae5', color: sub.type === 'paid' ? '#d97706' : '#059669' }}>
                                                {sub.icon || '📁'}
                                            </div>
                                            <span className="text-base font-bold text-slate-800">{sub.title}</span>
                                            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${sub.type === 'paid'
                                                ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                {sub.type} {sub.type === 'paid' && `• ₹${sub.price || 499}`}
                                            </span>
                                            {sub.instituteCode && (
                                                <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-sm">
                                                    ✨ {user?.instituteName ? `${user.instituteName.toUpperCase()} EXCLUSIVE` : 'INSTITUTE EXCLUSIVE'}
                                                </span>
                                            )}
                                            <span className="text-xs font-bold text-slate-400 bg-slate-200/50 px-2 py-0.5 rounded-full">({sub.notes.length})</span>
                                            <div className={`ml-auto w-8 h-8 rounded-full flex items-center justify-center transition-all text-slate-400 group-hover/sub:bg-indigo-50 group-hover/sub:text-indigo-600 ${expandedSections.has(sub.id) ? 'rotate-180 bg-indigo-50 text-indigo-600' : ''}`}>
                                                <ChevronDown size={16} />
                                            </div>
                                        </div>

                                        {expandedSections.has(sub.id) && sub.notes.length > 0 && (
                                            <div className="ml-4 sm:ml-8 mt-3 space-y-3 relative before:absolute before:left-0 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 before:rounded-full">
                                                {sub.notes.map(note => (
                                                    <div className="relative pl-6" key={note.id}>
                                                        <div className="absolute left-0 top-6 w-4 h-0.5 bg-slate-200 rounded-r-full"></div>
                                                        <NoteCard 
                                                            note={note} 
                                                            sectionType={sub.type}
                                                            sectionPrice={sub.price}
                                                            onOpen={openNote} 
                                                            loadingId={loadingNote} 
                                                            formatSize={formatFileSize} 
                                                            user={user}
                                                        />
                                                    </div>
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

            {/* Premium Locked Modal */}
            {premiumLockedNote && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl p-8 sm:p-10 max-w-md text-center shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Crown className="text-amber-600" size={40} />
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 mb-2">Premium Note</h3>
                        <p className="text-slate-600 mb-8 font-medium leading-relaxed">
                            This resource is exclusive to our premium members. Unlock full access by enrolling in a paid test series.
                        </p>
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={() => window.location.href = '/dashboard?tab=series'}
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
function NoteCard({ note, sectionType, sectionPrice, onOpen, loadingId, formatSize, user }: { 
    note: NoteItem, 
    sectionType?: 'free' | 'paid';
    sectionPrice?: number;
    onOpen: (id: string) => void; 
    loadingId: string | null; 
    formatSize: (bytes: number) => string,
    user?: any
}) {
    const isLoading = loadingId === note.id;
    // A note is considered paid if it's explicitly marked paid OR it's in a paid section
    const isActuallyPaid = note.type === 'paid' || sectionType === 'paid';
    const displayPrice = note.type === 'paid' ? (note.price || 99) : (sectionPrice || 499);
    const isUnlocked = note.isPurchased || !isActuallyPaid;

    return (
        <button
            onClick={() => onOpen(note.id)}
            disabled={isLoading}
            className="w-full flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-4 rounded-2xl border border-white bg-white hover:border-indigo-200 hover:bg-indigo-50/30 hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-all duration-300 group text-left relative overflow-hidden active:scale-[0.99] hover:-translate-y-0.5"
        >
            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 shadow-md ${isUnlocked ? 'bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-indigo-500/30' : 'bg-gradient-to-br from-amber-400 to-amber-500 shadow-amber-500/30'}`}>
                {isLoading ? (
                    <Loader2 className="text-white animate-spin" size={20} />
                ) : (
                    isUnlocked ? <FileText className="text-white" size={20} /> : <Lock className="text-white/90" size={20} />
                )}
            </div>
            <div className="flex-1 min-w-0 pr-4">
                <h4 className="text-base font-black text-slate-800 group-hover:text-indigo-700 truncate transition-colors">{note.title}</h4>
                <div className="flex items-center gap-2 mt-1 sm:mt-1.5 flex-wrap">
                    <span className="text-[11px] text-slate-500 font-bold bg-slate-100 px-2 py-0.5 rounded-md">{formatSize(note.fileSize)}</span>
                    {note.isDownloadable && (
                        <span className="flex items-center gap-1 text-[11px] text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-200/50">
                            <Download size={12} /> PDF
                        </span>
                    )}
                    <span className={`text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-md ${isUnlocked ? 'bg-emerald-100 text-emerald-700 border border-emerald-200/50' : 'bg-amber-100 text-amber-700 border border-amber-200/50'}`}>
                        {!isActuallyPaid ? 'Free' : (note.isPurchased ? '✅ Unlocked' : `Premium • ₹${displayPrice}`)}
                    </span>
                    {note.instituteCode && (
                        <span className="text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-md bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-sm">
                            ✨ {user?.instituteName ? `${user.instituteName.toUpperCase()} EXCLUSIVE` : 'INSTITUTE EXCLUSIVE'}
                        </span>
                    )}
                </div>
            </div>
            <div className="shrink-0 flex items-center gap-3">
                {!isUnlocked && (
                    <span className="hidden sm:inline-block px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white text-[10px] font-black uppercase tracking-wider rounded-lg shadow-sm group-hover:shadow-md transition-all">
                        Unlock Now
                    </span>
                )}
                <div className={`w-10 h-10 rounded-[0.9rem] flex items-center justify-center transition-all duration-300 ${isUnlocked ? 'bg-slate-100 text-slate-400 group-hover:bg-indigo-600 group-hover:text-white group-hover:shadow-lg group-hover:shadow-indigo-600/30' : 'bg-amber-100 text-amber-600 group-hover:bg-amber-500 group-hover:text-white group-hover:shadow-lg group-hover:shadow-amber-500/30'}`}>
                    {isUnlocked ? <Eye size={18} /> : <Crown size={18} />}
                </div>
            </div>
        </button>
    );
}
