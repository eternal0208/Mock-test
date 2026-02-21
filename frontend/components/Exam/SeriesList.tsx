'use client';
import React, { useEffect, useState } from 'react';
import { API_BASE_URL } from '@/lib/config';
import SeriesCard from '@/components/ui/SeriesCard';
import LoadingScreen from '@/components/ui/LoadingScreen';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

interface SeriesListProps {
    category: string;
}

const SeriesList = ({ category }: SeriesListProps) => {
    const [series, setSeries] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();
    const router = useRouter();

    useEffect(() => {
        const fetchSeries = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/tests/series`);
                const data = await res.json();

                if (Array.isArray(data)) {
                    // Filter by category and limit to 3 latest
                    const filtered = data
                        .filter(s => s.category?.toLowerCase() === category.toLowerCase())
                        .slice(0, 3);
                    setSeries(filtered);
                }
            } catch (error) {
                console.error("Failed to fetch series", error);
            } finally {
                setLoading(false);
            }
        };

        fetchSeries();
    }, [category]);

    const handleAction = async (s: any) => {
        if (!user) {
            router.push('/?login=true');
            return;
        }
        // Navigate to series detail page for purchase/enrollment flow
        router.push(`/series/${s.id}`);
    };

    if (loading) return <LoadingScreen fullScreen={false} text={`Searching for ${category} Series...`} />;

    if (series.length === 0) {
        return (
            <div className="text-center py-16 bg-white/50 backdrop-blur-sm rounded-[2rem] border border-dashed border-gray-200">
                <p className="text-gray-500 font-bold">No premium series available for {category} yet.</p>
                <p className="text-gray-400 text-sm">Our team is working on top-notch content for you.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {series.map(s => (
                // @ts-ignore
                <SeriesCard
                    key={s.id}
                    series={s}
                    onAction={() => handleAction(s)}
                    actionLabel={s.price > 0 ? 'Explore' : 'Enroll Free'}
                />
            ))}
        </div>
    );
};

export default SeriesList;
