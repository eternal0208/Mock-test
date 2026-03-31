import { DotLottieReact } from '@lottiefiles/dotlottie-react';

export default function DashboardLoader() {
    return (
        <div className="dashboard-loader-wrapper">
            {/* Background elements */}
            <div className="loader-bg">
                <div className="loader-circle circle-1"></div>
                <div className="loader-circle circle-2"></div>
                <div className="loader-mesh"></div>
            </div>

            {/* Main content */}
            <div className="loader-content">
                <div className="loader-video-container mb-6">
                    <DotLottieReact
                        src="https://lottie.host/585eaa49-82ac-4ffe-8958-524df205393d/GCwqhgbTtp.lottie"
                        loop
                        autoplay
                        className="w-48 h-48 md:w-64 md:h-64 mx-auto"
                    />
                </div>

                <div className="loader-text-area">
                    <h2 className="loader-title">APEX MOCK</h2>
                    <p className="loader-subtitle">Preparing your dashboard</p>
                </div>
            </div>

            <style jsx>{`
                .dashboard-loader-wrapper {
                    position: fixed;
                    inset: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background-color: #f8fafc;
                    z-index: 9999;
                    overflow: hidden;
                }

                /* Background Styles */
                .loader-bg {
                    position: absolute;
                    inset: 0;
                    overflow: hidden;
                    pointer-events: none;
                }

                .loader-circle {
                    position: absolute;
                    border-radius: 50%;
                    filter: blur(80px);
                    opacity: 0.5;
                    animation: float 20s infinite ease-in-out;
                }

                .circle-1 {
                    width: 600px;
                    height: 600px;
                    background: radial-gradient(circle, rgba(99, 102, 241, 0.2) 0%, rgba(99, 102, 241, 0) 70%);
                    top: -100px;
                    right: -100px;
                    animation-delay: 0s;
                }

                .circle-2 {
                    width: 500px;
                    height: 500px;
                    background: radial-gradient(circle, rgba(168, 85, 247, 0.2) 0%, rgba(168, 85, 247, 0) 70%);
                    bottom: -100px;
                    left: -100px;
                    animation-delay: -10s;
                }

                .loader-mesh {
                    position: absolute;
                    inset: 0;
                    background-image: 
                        linear-gradient(rgba(99, 102, 241, 0.05) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(99, 102, 241, 0.05) 1px, transparent 1px);
                    background-size: 30px 30px;
                    opacity: 0.5;
                    transform: perspective(500px) rotateX(60deg) translateY(-100px) translateZ(-200px);
                    animation: meshMove 20s linear infinite;
                }

                /* Layout */
                .loader-content {
                    position: relative;
                    z-index: 10;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    width: 100%;
                    max-width: 400px;
                }

                /* Text */
                .loader-text-area {
                    text-align: center;
                    margin-top: 1rem;
                }

                .loader-title {
                    font-size: 1.5rem;
                    font-weight: 800;
                    color: #1e293b;
                    letter-spacing: 0.1em;
                    margin: 0;
                    background: linear-gradient(135deg, #4f46e5, #9333ea);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    animation: textPulse 2s ease-in-out infinite alternate;
                }

                .loader-subtitle {
                    font-size: 0.875rem;
                    font-weight: 500;
                    color: #64748b;
                    margin-top: 0.5rem;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }

                /* Keyframes */
                @keyframes float {
                    0%, 100% { transform: translate(0, 0) scale(1); }
                    33% { transform: translate(30px, -50px) scale(1.1); }
                    66% { transform: translate(-20px, 20px) scale(0.9); }
                }

                @keyframes meshMove {
                    0% { background-position: 0 0; }
                    100% { background-position: 0 60px; }
                }

                @keyframes textPulse {
                    0% { opacity: 0.8; filter: drop-shadow(0 0 10px rgba(79, 70, 229, 0.3)); }
                    100% { opacity: 1; filter: drop-shadow(0 0 20px rgba(147, 51, 234, 0.5)); }
                }

                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                /* Responsive */
                @media (max-width: 640px) {
                    .loader-circle { filter: blur(60px); }
                    .circle-1 { width: 400px; height: 400px; }
                    .circle-2 { width: 300px; height: 300px; }
                    .loader-title { font-size: 1.25rem; }
                }
            `}</style>
        </div>
    );
}
