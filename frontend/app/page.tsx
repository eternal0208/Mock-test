'use client';
import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Script from 'next/script';
import { Instagram } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { API_BASE_URL } from '@/lib/config';
import GoogleLoginModal from '@/components/GoogleLoginModal';
import ExamGateway from '@/components/ExamGateway';
import SeriesCard from '@/components/ui/SeriesCard';

export default function LandingPage() {
  const vantaRef = useRef<HTMLDivElement>(null);
  const [vantaEffect, setVantaEffect] = useState<any>(null);
  const { user } = useAuth();
  const [testSeries, setTestSeries] = useState<any[]>([]);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams?.get('login') === 'true') {
      setIsLoginModalOpen(true);
    }
  }, [searchParams]);

  useEffect(() => {
    let effect: any = null;
    let interval: any = null;

    const initVanta = () => {
      // @ts-ignore
      if (typeof window !== 'undefined' && window.VANTA && window.VANTA.CLOUDS && window.THREE && vantaRef.current && !effect) {
        try {
          // @ts-ignore
          effect = window.VANTA.CLOUDS({
            el: vantaRef.current,
            mouseControls: true,
            touchControls: true,
            gyroControls: false,
            minHeight: 200.00,
            minWidth: 200.00,
            skyColor: 0xdce5ff,
            cloudColor: 0xa8b4f8,
            cloudShadowColor: 0x8a6cc9,
            sunColor: 0xffffff,
            sunGlareColor: 0xffffff,
            sunlightColor: 0xfbfcff,
            speed: 0.9,
          });
          setVantaEffect(effect);
          clearInterval(interval);
        } catch (e) {
          console.error('Vanta initialization failed:', e);
        }
      }
    };
    interval = setInterval(initVanta, 100);

    fetch(`${API_BASE_URL}/api/tests/series`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setTestSeries(data);
        else setTestSeries([]);
      })
      .catch(err => console.error(err));

    return () => {
      if (effect) effect.destroy();
      if (interval) clearInterval(interval);
    };
  }, []);

  const openLogin = () => setIsLoginModalOpen(true);
  const openSignup = () => setIsLoginModalOpen(true);

  const handleEnrollment = async (series: any) => {
    if (!user) { alert('Please login to enroll.'); openLogin(); return; }
    try {
      const isFree = Number(series.price) === 0 || series.isPaid === false;
      if (isFree) {
        const { enrollFreeTest } = await import('@/lib/enrollment');
        const result = await enrollFreeTest(series.id, user.uid);
        if (result.success) { alert('✅ Successfully enrolled!'); router.push('/dashboard'); }
        else alert(`❌ Enrollment failed: ${result.error}`);
      } else {
        const { createRazorpayOrder, openRazorpayCheckout } = await import('@/lib/enrollment');
        const orderResult = await createRazorpayOrder(series.id, user.uid);
        if (!orderResult.success) throw new Error(orderResult.error || 'Failed to create order');
        openRazorpayCheckout(
          orderResult.order, user, series.id,
          () => { alert('✅ Payment successful! You are now enrolled.'); router.push('/dashboard'); },
          (error: any) => { console.error('Payment Error:', error); alert(`❌ Payment failed: ${error.message}`); }
        );
      }
    } catch (error: any) {
      alert(`Something went wrong: ${error.message}`);
    }
  };

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      <GoogleLoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />

      {/* Fixed full-screen Vanta Clouds background */}
      <div
        ref={vantaRef}
        style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0 }}
      />

      {/* Page content layered above Vanta */}
      <div className="relative min-h-screen text-on-surface antialiased flex flex-col" style={{ zIndex: 1 }}>

        {/* Sticky Navbar */}
        <nav className="fixed top-0 w-full z-50" style={{ background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', boxShadow: '0 8px 32px rgba(74,64,224,0.08)' }}>
          <div className="flex justify-between items-center px-6 md:px-10 h-16 md:h-20 max-w-screen-xl mx-auto">
            <Link href="/">
              <img src="/logo.png" alt="Apex Mock Test" className="h-12 md:h-16 w-auto object-contain" />
            </Link>
            <div className="hidden md:flex items-center gap-8">
              <Link href="/jee-mains" className="text-slate-600 font-semibold hover:text-indigo-600 transition-colors">JEE</Link>
              <Link href="/neet" className="text-slate-600 font-semibold hover:text-indigo-600 transition-colors">NEET</Link>
              <Link href="/cat" className="text-slate-600 font-semibold hover:text-indigo-600 transition-colors">CAT</Link>
              <Link href="/notes" className="text-slate-600 font-semibold hover:text-indigo-600 transition-colors">📚 Notes</Link>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              {user ? (
                <Link href="/dashboard">
                  <button className="px-4 py-2 sm:px-6 sm:py-2.5 rounded-xl text-white font-bold transition-all active:scale-95 text-xs sm:text-sm" style={{ background: 'linear-gradient(135deg, #4a40e0, #702ae1)', boxShadow: '0 4px 20px rgba(74,64,224,0.3)' }}>
                    Dashboard
                  </button>
                </Link>
              ) : (
                <>
                  <button onClick={openLogin} className="px-3 py-2 sm:px-5 sm:py-2.5 rounded-xl font-bold text-indigo-700 hover:bg-indigo-50/60 transition-all text-xs sm:text-sm">
                    Login
                  </button>
                  <button onClick={openSignup} className="px-4 py-2 sm:px-6 sm:py-2.5 rounded-xl text-white font-bold transition-all active:scale-95 text-xs sm:text-sm whitespace-nowrap" style={{ background: 'linear-gradient(135deg, #4a40e0, #702ae1)', boxShadow: '0 4px 20px rgba(74,64,224,0.3)' }}>
                    Sign Up
                  </button>
                </>
              )}
            </div>
          </div>
        </nav>

        {/* Hero Section - transparent so Vanta shows through */}
        <main className="flex-grow pt-20">
          <section className="min-h-screen px-4 sm:px-6 md:px-10 flex items-center max-w-screen-xl mx-auto py-16 md:py-24 relative overflow-hidden">
            {/* Decorative glow blobs */}
            <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full pointer-events-none" style={{ background: 'rgba(112,42,225,0.08)', filter: 'blur(120px)' }} />
            <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] rounded-full pointer-events-none" style={{ background: 'rgba(74,64,224,0.08)', filter: 'blur(100px)' }} />

            <div className="w-full flex flex-col lg:flex-row items-center gap-12 lg:gap-16 relative z-10">
              {/* Left Content */}
              <div className="w-full lg:w-[58%] flex flex-col items-start gap-6 md:gap-8">
                {/* Trust Badge */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}
                  className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full border"
                  style={{ background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', borderColor: 'rgba(255,255,255,0.5)' }}
                >
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: '#006947' }} />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ background: '#006947' }} />
                  </span>
                  <span className="text-xs font-bold tracking-widest uppercase text-slate-700">Trusted by 10,000+ Students</span>
                </motion.div>

                {/* Headlines */}
                <motion.div
                  initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }}
                  className="flex flex-col gap-1"
                >
                  <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-tight leading-none text-slate-900" style={{ fontFamily: 'var(--font-headline)' }}>
                    Apex Mock Test
                  </h1>
                  <h2 className="text-3xl sm:text-4xl md:text-6xl font-extrabold tracking-tight leading-tight" style={{ fontFamily: 'var(--font-headline)', background: 'linear-gradient(135deg, #4a40e0 0%, #702ae1 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    Don't Just Compete,<br className="hidden md:block" /> Dominate.
                  </h2>
                </motion.div>

                <motion.p
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.7, delay: 0.25 }}
                  className="max-w-xl text-lg md:text-xl text-slate-600 leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}
                >
                  Precision-engineered mock exams for JEE, NEET &amp; CAT — with real-time analytics, all-India ranking, and expert solutions.
                </motion.p>

                {/* CTA Buttons */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.35 }}
                  className="flex flex-wrap gap-4"
                >
                  <button
                    onClick={() => { if (!user) openSignup(); else router.push('/dashboard'); }}
                    className="px-10 py-4 rounded-xl text-white font-bold text-lg transition-all active:scale-95 hover:scale-105"
                    style={{ background: 'linear-gradient(135deg, #4a40e0, #702ae1)', boxShadow: '0 20px 40px rgba(74,64,224,0.25)' }}
                  >
                    Start Free Test
                  </button>
                  <button
                    onClick={() => { const el = document.getElementById('test-series'); if (el) el.scrollIntoView({ behavior: 'smooth' }); }}
                    className="px-10 py-4 rounded-xl font-bold text-indigo-700 text-lg transition-all active:scale-95 border"
                    style={{ background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', borderColor: 'rgba(255,255,255,0.5)' }}
                  >
                    View Test Series
                  </button>
                </motion.div>

                {/* Stats Row */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.45 }}
                  className="flex flex-wrap items-center justify-center sm:justify-start gap-6 sm:gap-8 md:gap-12 mt-6 py-6 px-4 sm:px-8 rounded-2xl border w-full lg:w-fit"
                  style={{ background: 'rgba(255,255,255,0.55)', backdropFilter: 'blur(16px)', borderColor: 'rgba(255,255,255,0.5)' }}
                >
                  {[
                    { value: '10K+', label: 'Students' },
                    { value: '500+', label: 'Tests' },
                    { value: '98%', label: 'Success Rate' },
                  ].map((stat, i) => (
                    <React.Fragment key={stat.label}>
                      {i > 0 && <div className="hidden sm:block h-10 w-px" style={{ background: 'rgba(168,173,185,0.3)' }} />}
                      <div className="flex flex-col gap-0.5 items-center sm:items-start w-[28%] sm:w-auto">
                        <span className="text-2xl sm:text-3xl font-extrabold text-slate-900" style={{ fontFamily: 'var(--font-headline)' }}>{stat.value}</span>
                        <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-slate-500 text-center sm:text-left">{stat.label}</span>
                      </div>
                    </React.Fragment>
                  ))}
                </motion.div>
              </div>

              {/* Right — Floating 3D Analytics Card */}
              <motion.div
                initial={{ opacity: 0, x: 40, rotate: -2 }} animate={{ opacity: 1, x: 0, rotate: -2 }} transition={{ duration: 0.8, delay: 0.3, type: 'spring', stiffness: 80 }}
                className="w-full lg:w-[42%] relative flex justify-center"
              >
                {/* Main Glass Card */}
                <div className="relative w-full max-w-md rounded-2xl p-8 border" style={{ background: 'rgba(255,255,255,0.70)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', borderColor: 'rgba(255,255,255,0.65)', boxShadow: '0 40px 80px rgba(74,64,224,0.15)' }}>
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="text-xl font-bold text-slate-900" style={{ fontFamily: 'var(--font-headline)' }}>Your Performance</h3>
                      <p className="text-sm text-slate-500 mt-0.5">Last Test: Full Mock #12</p>
                    </div>
                    <div className="p-2 rounded-lg" style={{ background: 'rgba(74,64,224,0.08)' }}>
                      <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} /></svg>
                    </div>
                  </div>
                  {/* Progress Ring */}
                  <div className="flex justify-center mb-6 relative">
                    <svg className="w-44 h-44 transform -rotate-90">
                      <circle cx="88" cy="88" r="74" fill="transparent" stroke="#e3e8f7" strokeWidth="10" />
                      <circle cx="88" cy="88" r="74" fill="transparent" stroke="url(#grad)" strokeDasharray="464.8" strokeDashoffset="60.4" strokeLinecap="round" strokeWidth="10" />
                      <defs>
                        <linearGradient id="grad" x1="0%" x2="100%" y1="0%" y2="100%">
                          <stop offset="0%" stopColor="#4a40e0" />
                          <stop offset="100%" stopColor="#702ae1" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-4xl font-extrabold text-slate-900">87%</span>
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Overall</span>
                    </div>
                  </div>
                  {/* Subject Bars */}
                  <div className="space-y-3">
                    {[
                      { name: 'Physics', score: 92, color: '#4a40e0' },
                      { name: 'Chemistry', score: 84, color: '#702ae1' },
                      { name: 'Mathematics', score: 81, color: '#8b5cf6' },
                    ].map(subj => (
                      <div key={subj.name} className="space-y-1">
                        <div className="flex justify-between text-xs font-bold uppercase tracking-tight">
                          <span className="text-slate-600">{subj.name}</span>
                          <span style={{ color: subj.color }}>{subj.score}%</span>
                        </div>
                        <div className="h-2 w-full rounded-full" style={{ background: '#e3e8f7' }}>
                          <div className="h-full rounded-full" style={{ width: `${subj.score}%`, background: subj.color }} />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Floating Rank Badge */}
                  <div className="absolute -top-4 -right-2 sm:-top-5 sm:-right-5 px-4 py-2 sm:px-5 sm:py-3 rounded-xl border flex items-center gap-2 sm:gap-3 scale-90 sm:scale-100 origin-top-right" style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', borderColor: 'rgba(255,255,255,0.8)', boxShadow: '0 8px 32px rgba(0,105,71,0.12)' }}>
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center" style={{ background: 'rgba(0,105,71,0.1)' }}>
                      🏆
                    </div>
                    <div>
                      <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-slate-500">India Rank</p>
                      <p className="text-base sm:text-lg font-extrabold text-slate-900">#142</p>
                    </div>
                  </div>
                </div>

                {/* Floating Toast Below */}
                <div className="absolute -bottom-4 left-4 sm:-bottom-5 sm:left-8 px-4 py-2 sm:px-5 sm:py-3 rounded-full border flex items-center gap-2 animate-bounce scale-90 sm:scale-100 origin-bottom-left" style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', borderColor: 'rgba(255,255,255,0.8)', boxShadow: '0 8px 32px rgba(74,64,224,0.12)' }}>
                  <span className="text-sm sm:text-base">🎯</span>
                  <span className="text-xs sm:text-sm font-bold text-slate-700 whitespace-nowrap">New Mock Test Available</span>
                </div>
              </motion.div>
            </div>

            {/* Scroll indicator */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-40">
              <span className="text-xs font-bold tracking-widest uppercase text-slate-600">Scroll</span>
              <div className="w-px h-12" style={{ background: 'linear-gradient(to bottom, #4a40e0, transparent)' }} />
            </div>
          </section>

          {/* Features Strip */}
          <section className="py-16 px-6 md:px-10" style={{ background: 'rgba(236,241,255,0.80)', backdropFilter: 'blur(12px)' }}>
            <div className="max-w-screen-xl mx-auto">
              <h2 className="text-3xl font-bold text-center text-slate-900 mb-10" style={{ fontFamily: 'var(--font-headline)' }}>Accelerate Your Prep Journey</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { icon: '🧠', title: 'AI Analysis', desc: 'Deep learning algorithms that pinpoint your weak spots after every attempt.', color: '#4a40e0' },
                  { icon: '⚡', title: 'Real Exam Simulation', desc: 'Timer-based environments that mirror the pressure of the actual exam day.', color: '#702ae1' },
                  { icon: '🏆', title: 'Peer Ranking', desc: 'Compare your percentile with top performers across India instantly.', color: '#006947' },
                ].map(f => (
                  <div key={f.title} className="p-8 rounded-2xl border text-left" style={{ background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(16px)', borderColor: 'rgba(255,255,255,0.5)' }}>
                    <div className="text-4xl mb-4">{f.icon}</div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2" style={{ fontFamily: 'var(--font-headline)' }}>{f.title}</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">{f.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Exam Gateway */}
          <section className="py-16 px-6 md:px-10" style={{ background: 'rgba(255,255,255,0.55)', backdropFilter: 'blur(12px)' }}>
            <div className="max-w-screen-xl mx-auto">
              <h2 className="text-3xl font-bold text-slate-900 mb-10 text-center" style={{ fontFamily: 'var(--font-headline)' }}>Choose Your Path</h2>
              <ExamGateway />
            </div>
          </section>

          {/* Premium Test Series */}
          {testSeries.length > 0 && (
            <section id="test-series" className="py-20 px-6 md:px-10" style={{ background: 'rgba(236,241,255,0.80)', backdropFilter: 'blur(12px)' }}>
              <div className="max-w-screen-xl mx-auto">
                <div className="mb-12">
                  <span className="text-xs font-bold uppercase tracking-widest text-indigo-600 block mb-2">Exclusive Access</span>
                  <h2 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'var(--font-headline)' }}>Premium Test Series</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {testSeries.map((series: any) => (
                    <SeriesCard key={series.id} series={series} onAction={handleEnrollment} />
                  ))}
                </div>
              </div>
            </section>
          )}
        </main>

        {/* Footer */}
        <footer className="pt-16 pb-8 px-6 md:px-10" style={{ background: '#0f172a', position: 'relative', zIndex: 1 }}>
          <div className="max-w-screen-xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div className="md:col-span-2">
              <img src="/logo.png" alt="Apex Mock Test" className="h-14 w-auto object-contain mb-4" />
              <p className="text-sm text-slate-400 leading-relaxed max-w-xs mb-4">
                An initiative of SR Club. Providing premium educational assessments for aspirants across India.
              </p>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">System Operational</span>
              </div>
            </div>
            <div>
              <h5 className="text-white font-bold mb-6 text-sm uppercase tracking-widest">Resources</h5>
              <ul className="space-y-3">
                {[{ href: '/about', label: 'About Us' }, { href: '/terms', label: 'Terms & Conditions' }, { href: '/privacy', label: 'Privacy Policy' }].map(l => (
                  <li key={l.href}><Link href={l.href} className="text-slate-400 hover:text-white text-sm transition-colors">{l.label}</Link></li>
                ))}
              </ul>
            </div>
            <div>
              <h5 className="text-white font-bold mb-6 text-sm uppercase tracking-widest">Contact Us</h5>
              <ul className="space-y-3">
                <li><a href="mailto:officialsrcounselling@gmail.com" className="text-slate-400 hover:text-white text-sm transition-colors">officialsrcounselling@gmail.com</a></li>
                <li>
                  <a href="https://www.instagram.com/apexmock_official?igsh=MWkzODVxeWdyeXAyaA==" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-pink-400 text-sm transition-colors flex items-center gap-2">
                    <Instagram size={14} /> Instagram
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="max-w-screen-xl mx-auto pt-8" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-center text-slate-500 text-sm">© 2025 Apex Mock Test. An initiative of SR Club. All rights reserved.</p>
          </div>
        </footer>
      </div>
    </>
  );
}
