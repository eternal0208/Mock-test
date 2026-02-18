'use client';
import { useEffect, useState } from 'react';
import { AlertTriangle, Clock, Save, CheckCircle, XCircle } from 'lucide-react';
import { API_BASE_URL } from '@/lib/config';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import ExamInterface from '@/components/Exam/ExamInterface';

export default function ExamPage() {
    const { id } = useParams();
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [test, setTest] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [showWarning, setShowWarning] = useState(false);
    const [warningMessage, setWarningMessage] = useState('');

    const [isFullscreen, setIsFullscreen] = useState(false);

    useEffect(() => {
        if (authLoading) return;

        if (!user) {
            setLoading(false);
            return;
        }

        const fetchTest = async () => {
            try {
                const token = await user.getIdToken();
                const res = await fetch(`${API_BASE_URL}/api/tests/${id}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!res.ok) {
                    const errData = await res.json();
                    throw new Error(errData.message || 'Test not found');
                }
                const data = await res.json();
                setTest(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchTest();
    }, [id, user, authLoading]);

    // Security Measures
    useEffect(() => {
        const handleVisibilityChange = () => {
            // Optional: Keep tab switch warning if desired, or remove.
            // Leaving it as a soft warning for now.
            if (document.hidden) {
                // alert('Warning: You switched tabs!');
            }
        };

        // Prevent Right Click
        const handleContextMenu = (e) => e.preventDefault();

        document.addEventListener('visibilitychange', handleVisibilityChange);
        document.addEventListener('contextmenu', handleContextMenu);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            document.removeEventListener('contextmenu', handleContextMenu);
        };
    }, []);

    const enterFullscreen = () => {
        document.documentElement.requestFullscreen().catch((e) => {
            console.error("Fullscreen blocked", e);
            alert("Please allow fullscreen to take the test.");
        });
    };

    const handleSubmitTest = async (resultData) => {
        try {
            const token = await user.getIdToken();
            const res = await fetch(`${API_BASE_URL}/api/tests/${id}/submit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    userId: user._id || user.uid,
                    ...resultData
                })
            });
            const data = await res.json();
            // Exit fullscreen before redirect
            if (document.fullscreenElement) document.exitFullscreen();

            // Redirect to Result Page
            router.push(`/result/${data._id}`);
        } catch (err) {
            alert('Error submitting test');
        }
    };

    if (loading) return <div className="p-8 text-center text-black">Loading Exam...</div>;
    if (error) return <div className="p-8 text-center text-red-500">{error}</div>;
    if (!test) return null;



    // Force user interaction to start/enter fullscreen
    return (
        <div className="min-h-screen bg-gray-100">
            <ExamInterface test={test} onSubmit={handleSubmitTest} />
        </div>
    );
}
