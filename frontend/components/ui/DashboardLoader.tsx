'use client';
import React from 'react';

export default function DashboardLoader() {
    return (
        <div className="dashboard-loader-wrapper">
            {/* Animated Background */}
            <div className="loader-bg">
                <div className="gradient-orb orb-1"></div>
                <div className="gradient-orb orb-2"></div>
                <div className="gradient-orb orb-3"></div>
            </div>

            {/* 3D Cube */}
            <div className="cube-scene">
                <div className="cube">
                    <div className="cube-face front"><span>A</span></div>
                    <div className="cube-face back"><span>P</span></div>
                    <div className="cube-face right"><span>E</span></div>
                    <div className="cube-face left"><span>X</span></div>
                    <div className="cube-face top"><span>✦</span></div>
                    <div className="cube-face bottom"><span>✦</span></div>
                </div>
            </div>

            {/* Text + Progress */}
            <div className="loader-text-area">
                <h2 className="loader-title">APEX MOCK TEST</h2>
                <p className="loader-subtitle">Preparing your dashboard</p>
                <div className="progress-bar-container">
                    <div className="progress-bar-fill"></div>
                </div>
                <div className="loader-dots">
                    <span className="dot dot-1"></span>
                    <span className="dot dot-2"></span>
                    <span className="dot dot-3"></span>
                </div>
            </div>

            {/* Floating Particles */}
            <div className="particles">
                {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className={`particle particle-${i + 1}`}></div>
                ))}
            </div>

            <style jsx>{`
                .dashboard-loader-wrapper {
                    position: fixed;
                    inset: 0;
                    z-index: 9999;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    background: #0a0a1a;
                    overflow: hidden;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                }

                /* === ANIMATED BACKGROUND === */
                .loader-bg {
                    position: absolute;
                    inset: 0;
                    overflow: hidden;
                }
                .gradient-orb {
                    position: absolute;
                    border-radius: 50%;
                    filter: blur(80px);
                    opacity: 0.4;
                    animation: orbFloat 8s ease-in-out infinite;
                }
                .orb-1 {
                    width: 300px; height: 300px;
                    background: radial-gradient(circle, #6366f1, #4f46e5);
                    top: 10%; left: 20%;
                    animation-delay: 0s;
                }
                .orb-2 {
                    width: 250px; height: 250px;
                    background: radial-gradient(circle, #a855f7, #7c3aed);
                    bottom: 20%; right: 15%;
                    animation-delay: -3s;
                }
                .orb-3 {
                    width: 200px; height: 200px;
                    background: radial-gradient(circle, #06b6d4, #0891b2);
                    top: 50%; left: 60%;
                    animation-delay: -5s;
                }
                @keyframes orbFloat {
                    0%, 100% { transform: translate(0, 0) scale(1); }
                    33% { transform: translate(30px, -40px) scale(1.1); }
                    66% { transform: translate(-20px, 20px) scale(0.9); }
                }

                /* === 3D CUBE === */
                .cube-scene {
                    width: 100px; height: 100px;
                    perspective: 400px;
                    margin-bottom: 40px;
                    position: relative;
                    z-index: 10;
                }
                .cube {
                    width: 100%; height: 100%;
                    position: relative;
                    transform-style: preserve-3d;
                    animation: cubeRotate 4s ease-in-out infinite;
                }
                .cube-face {
                    position: absolute;
                    width: 100px; height: 100px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border: 2px solid rgba(255,255,255,0.15);
                    border-radius: 16px;
                    font-size: 32px;
                    font-weight: 900;
                    color: white;
                    letter-spacing: 2px;
                    backdrop-filter: blur(10px);
                    background: rgba(99, 102, 241, 0.15);
                    box-shadow: 
                        inset 0 0 30px rgba(99, 102, 241, 0.1),
                        0 0 20px rgba(99, 102, 241, 0.1);
                }
                .cube-face span {
                    background: linear-gradient(135deg, #a5b4fc, #818cf8, #c084fc);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                    text-shadow: none;
                }
                .front  { transform: rotateY(0deg)   translateZ(50px); }
                .back   { transform: rotateY(180deg)  translateZ(50px); }
                .right  { transform: rotateY(90deg)   translateZ(50px); }
                .left   { transform: rotateY(-90deg)  translateZ(50px); }
                .top    { transform: rotateX(90deg)   translateZ(50px); }
                .bottom { transform: rotateX(-90deg)  translateZ(50px); }

                @keyframes cubeRotate {
                    0%   { transform: rotateX(0deg)   rotateY(0deg); }
                    25%  { transform: rotateX(90deg)  rotateY(90deg); }
                    50%  { transform: rotateX(180deg) rotateY(180deg); }
                    75%  { transform: rotateX(270deg) rotateY(270deg); }
                    100% { transform: rotateX(360deg) rotateY(360deg); }
                }

                /* Glow ring around cube */
                .cube-scene::after {
                    content: '';
                    position: absolute;
                    top: 50%; left: 50%;
                    width: 140px; height: 140px;
                    transform: translate(-50%, -50%);
                    border-radius: 50%;
                    border: 2px solid rgba(129, 140, 248, 0.2);
                    animation: ringPulse 2s ease-in-out infinite;
                }
                @keyframes ringPulse {
                    0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.3; }
                    50% { transform: translate(-50%, -50%) scale(1.2); opacity: 0; }
                }

                /* === TEXT AREA === */
                .loader-text-area {
                    position: relative;
                    z-index: 10;
                    text-align: center;
                }
                .loader-title {
                    font-size: 24px;
                    font-weight: 900;
                    letter-spacing: 8px;
                    background: linear-gradient(90deg, #a5b4fc, #c084fc, #a5b4fc);
                    background-size: 200% 100%;
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                    animation: shimmer 2s ease-in-out infinite;
                    margin: 0 0 8px 0;
                }
                @keyframes shimmer {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
                .loader-subtitle {
                    color: rgba(255,255,255,0.4);
                    font-size: 13px;
                    font-weight: 500;
                    letter-spacing: 2px;
                    text-transform: uppercase;
                    margin: 0 0 20px 0;
                }

                /* === PROGRESS BAR === */
                .progress-bar-container {
                    width: 200px;
                    height: 3px;
                    background: rgba(255,255,255,0.08);
                    border-radius: 10px;
                    overflow: hidden;
                    margin: 0 auto 16px;
                }
                .progress-bar-fill {
                    height: 100%;
                    width: 40%;
                    background: linear-gradient(90deg, #6366f1, #a855f7, #06b6d4);
                    border-radius: 10px;
                    animation: progressSlide 1.5s ease-in-out infinite;
                }
                @keyframes progressSlide {
                    0%   { transform: translateX(-100%); width: 40%; }
                    50%  { width: 60%; }
                    100% { transform: translateX(350%); width: 40%; }
                }

                /* === BOUNCING DOTS === */
                .loader-dots {
                    display: flex;
                    gap: 6px;
                    justify-content: center;
                }
                .dot {
                    width: 6px; height: 6px;
                    border-radius: 50%;
                    background: #818cf8;
                    animation: dotBounce 1.2s ease-in-out infinite;
                }
                .dot-1 { animation-delay: 0s; }
                .dot-2 { animation-delay: 0.15s; }
                .dot-3 { animation-delay: 0.3s; }
                @keyframes dotBounce {
                    0%, 100% { transform: translateY(0); opacity: 0.3; }
                    50% { transform: translateY(-8px); opacity: 1; }
                }

                /* === FLOATING PARTICLES === */
                .particles {
                    position: absolute;
                    inset: 0;
                    overflow: hidden;
                    pointer-events: none;
                }
                .particle {
                    position: absolute;
                    border-radius: 50%;
                    background: rgba(165, 180, 252, 0.3);
                    animation: particleFloat linear infinite;
                }
                .particle-1  { width:4px;height:4px;left:10%;animation-duration:6s;bottom:-10px; }
                .particle-2  { width:6px;height:6px;left:25%;animation-duration:8s;bottom:-10px;animation-delay:-2s; }
                .particle-3  { width:3px;height:3px;left:40%;animation-duration:7s;bottom:-10px;animation-delay:-4s; }
                .particle-4  { width:5px;height:5px;left:55%;animation-duration:9s;bottom:-10px;animation-delay:-1s; }
                .particle-5  { width:4px;height:4px;left:70%;animation-duration:6.5s;bottom:-10px;animation-delay:-3s; }
                .particle-6  { width:7px;height:7px;left:85%;animation-duration:8.5s;bottom:-10px;animation-delay:-5s; }
                .particle-7  { width:3px;height:3px;left:15%;animation-duration:7.5s;bottom:-10px;animation-delay:-6s; }
                .particle-8  { width:5px;height:5px;left:35%;animation-duration:6s;bottom:-10px;animation-delay:-2.5s; }
                .particle-9  { width:4px;height:4px;left:50%;animation-duration:9.5s;bottom:-10px;animation-delay:-4.5s; }
                .particle-10 { width:6px;height:6px;left:65%;animation-duration:7s;bottom:-10px;animation-delay:-1.5s; }
                .particle-11 { width:3px;height:3px;left:80%;animation-duration:8s;bottom:-10px;animation-delay:-3.5s; }
                .particle-12 { width:5px;height:5px;left:92%;animation-duration:6.5s;bottom:-10px;animation-delay:-5.5s; }

                @keyframes particleFloat {
                    0%   { transform: translateY(0) rotate(0deg); opacity: 0; }
                    10%  { opacity: 0.6; }
                    90%  { opacity: 0.6; }
                    100% { transform: translateY(-100vh) rotate(720deg); opacity: 0; }
                }
            `}</style>
        </div>
    );
}
