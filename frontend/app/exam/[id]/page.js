'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import ExamInterface from '@/components/Exam/ExamInterface';

export default function ExamPage() {
    const { id } = useParams();
    const { user } = useAuth();
    const router = useRouter();
    const [test, setTest] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [showWarning, setShowWarning] = useState(false);
    const [warningMessage, setWarningMessage] = useState('');

    useEffect(() => {
        if (!user) return; // Wait for auth

        const fetchTest = async () => {
            try {
                const res = await fetch(`http://localhost:5001/api/tests/${id}`);
                if (!res.ok) throw new Error('Test not found');
                const data = await res.json();
                setTest(data);
                // Attempt fullscreen on load (might be blocked by browser policy without user interaction)
                // We will force it on the first click
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchTest();
    }, [id, user]);

    // Security Measures
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden) {
                alert('Warning: You switched tabs! The test will be auto-submitted if you do this again.');
                // In strict mode, we might auto-submit here
                // handleSubmitTest({}); // For now just warn
            }
        };

        const handleFullscreenChange = () => {
            if (!document.fullscreenElement) {
                // User exited fullscreen
                setShowWarning(true);
                setWarningMessage('You must be in Fullscreen mode to continue correctly.');
            } else {
                setShowWarning(false);
            }
        };

        // Prevent Right Click
        const handleContextMenu = (e) => e.preventDefault();

        document.addEventListener('visibilitychange', handleVisibilityChange);
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('contextmenu', handleContextMenu);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
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
            const res = await fetch(`http://localhost:5001/api/tests/${id}/submit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user._id || user.uid, // Ideally use the mongo ID from context
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

    if (showWarning && !loading) {
        return (
            <div className="fixed inset-0 bg-red-100 flex flex-col items-center justify-center z-50 p-4">
                <div className="bg-white p-8 rounded-lg shadow-xl text-center max-w-md">
                    <h2 className="text-2xl font-bold text-red-600 mb-4">Security Violation</h2>
                    <p className="text-gray-700 mb-6">{warningMessage || "Please return to fullscreen mode."}</p>
                    <button
                        onClick={enterFullscreen}
                        className="bg-red-600 text-white px-6 py-3 rounded font-bold hover:bg-red-700 w-full"
                    >
                        Return to Fullscreen
                    </button>
                </div>
            </div>
        );
    }

    // Force user interaction to start/enter fullscreen
    return (
        <div className="min-h-screen bg-gray-100">
            {!document.fullscreenElement ? (
                <div className="fixed inset-0 bg-white flex flex-col items-center justify-center z-50">
                    <h1 className="text-2xl font-bold mb-4">Exam Security Check</h1>
                    <p className="mb-6 text-gray-600">This test requires Fullscreen mode. Switching tabs is prohibited.</p>
                    <button
                        onClick={enterFullscreen}
                        className="bg-blue-600 text-white px-8 py-3 rounded-lg font-bold shadow-lg hover:bg-blue-700 transition"
                    >
                        Start Exam in Fullscreen
                    </button>
                </div>
            ) : (
                <ExamInterface test={test} onSubmit={handleSubmitTest} />
            )}
        </div>
    );
}
