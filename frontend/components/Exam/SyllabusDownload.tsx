'use client';
import { useState, useEffect } from 'react';
import { API_BASE_URL } from '@/lib/config';
import { Download, FileText } from 'lucide-react';

export default function SyllabusDownload({ category }: { category: string }) {
    const [link, setLink] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSyllabus = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/admin/syllabus`);
                if (res.ok) {
                    const data = await res.json();
                    if (data[category]) {
                        setLink(data[category]);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch syllabus link", error);
            } finally {
                setLoading(false);
            }
        };
        fetchSyllabus();
    }, [category]);

    if (loading) return <div className="animate-pulse h-10 w-40 bg-gray-200 rounded"></div>;

    if (!link) return null;

    return (
        <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition shadow-md"
        >
            <FileText size={20} />
            Download {category} Syllabus PDF
        </a>
    );
}
