'use client';
import React, { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import Link from 'next/link';
import Script from 'next/script';
import { ArrowRight, BookOpen, Target, Award, Users, Star, CheckCircle, Instagram } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { API_BASE_URL } from '@/lib/config';
import GoogleLoginModal from '@/components/GoogleLoginModal';
import ExamGateway from '@/components/ExamGateway';
import SeriesCard from '@/components/ui/SeriesCard';

// 3D Card Component


export default function LandingPage() {
  const vantaRef = useRef(null);
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
      if (typeof window !== 'undefined' && window.VANTA && window.VANTA.CLOUDS && window.THREE && vantaRef.current && !vantaEffect) {
        try {
          // @ts-ignore
          effect = window.VANTA.CLOUDS({
            el: vantaRef.current,
            mouseControls: true,
            touchControls: true,
            gyroControls: false,
            minHeight: 200.00,
            minWidth: 200.00,
            skyColor: 0xEEF2FF,
            cloudColor: 0x4F46E5,
            cloudShadowColor: 0x702AE1,
            sunColor: 0xffffff,
            sunGlareColor: 0xffffff
          });
          setVantaEffect(effect);
          clearInterval(interval);
        } catch (e) {
          console.error("Vanta initialization failed:", e);
        }
      }
    };
    interval = setInterval(initVanta, 100);

    // Fetch Test Series
    fetch(`${API_BASE_URL}/api/tests/series`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setTestSeries(data);
        } else {
          console.error("Invalid series data:", data);
          setTestSeries([]);
        }
      })
      .catch(err => console.error(err));

    return () => {
      if (effect) effect.destroy();
      if (interval) clearInterval(interval);
      if (vantaEffect) vantaEffect.destroy();
    };
  }, []);

  const openLogin = () => { setIsLoginModalOpen(true); };
  const openSignup = () => { setIsLoginModalOpen(true); };

  const handleEnrollment = async (series: any) => {
    if (!user) {
      alert('Please login to enroll.');
      openLogin();
      return;
    }

    try {
      // Determine if test is free or paid
      const isFree = Number(series.price) === 0 || series.isPaid === false;

      if (isFree) {
        // FREE TEST: Instant Enrollment
        const { enrollFreeTest } = await import('@/lib/enrollment');
        const result = await enrollFreeTest(series.id, user.uid);

        if (result.success) {
          alert('✅ Successfully enrolled in free test series!');
          router.push('/dashboard');
        } else {
          alert(`❌ Enrollment failed: ${result.error}`);
        }
      } else {
        // PAID TEST: Razorpay Payment Flow
        const { createRazorpayOrder, openRazorpayCheckout } = await import('@/lib/enrollment');

        const orderResult = await createRazorpayOrder(series.id, user.uid);

        if (!orderResult.success) {
          throw new Error(orderResult.error || 'Failed to create order');
        }

        openRazorpayCheckout(
          orderResult.order,
          user,
          series.id,
          (response) => {
            alert('✅ Payment successful! You are now enrolled.');
            router.push('/dashboard');
          },
          (error) => {
            console.error('Payment Error:', error);
            alert(`❌ Payment failed: ${error.message}`);
          }
        );
      }
    } catch (error: any) {
      console.error('Enrollment Error:', error);
      alert(`Something went wrong: ${error.message}`);
    }
  };

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      <GoogleLoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />

      <div ref={vantaRef} className="min-h-[100dvh] w-full relative bg-background font-body text-on-background antialiased flex flex-col">
        
        {/* Top Navigation from Stitch Design */}
        <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl shadow-[0_20px_40px_rgba(74,64,224,0.08)]">
          <div className="flex justify-between items-center px-6 py-4 max-w-7xl mx-auto">
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="Apex Mock Test" className="h-14 md:h-20 w-auto object-contain" />
            </div>
            <div className="flex items-center gap-4">
              {user ? (
                <Link href="/dashboard">
                  <button className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary to-secondary text-white font-bold hover:shadow-[0_10px_30px_rgba(74,64,224,0.3)] transition-all active:scale-95 text-sm md:text-base">
                    Dashboard
                  </button>
                </Link>
              ) : (
                <>
                  <button onClick={openLogin} className="text-on-surface-variant font-medium hover:bg-surface-container-low px-4 py-2 rounded-xl transition-all duration-300 active:scale-90 text-sm md:text-base">
                    Login
                  </button>
                  <button onClick={openSignup} className="px-5 py-2 md:px-7 md:py-2.5 rounded-xl bg-gradient-to-r from-primary to-secondary text-white font-bold hover:shadow-[0_10px_30px_rgba(74,64,224,0.3)] transition-all duration-300 active:scale-95 text-sm md:text-base">
                    Sign Up
                  </button>
                </>
              )}
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-grow pt-24 pb-12 overflow-x-hidden">
          
          {/* Hero Section */}
          <section className="px-6 py-12 text-center max-w-4xl mx-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-tertiary-container text-on-tertiary-container text-xs font-bold tracking-wider uppercase mb-8 shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tertiary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-tertiary"></span>
              </span>
              Trusted by 10,000+ Students
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.15 }}
              className="text-4xl md:text-6xl lg:text-[5rem] font-extrabold font-headline leading-[1.1] md:leading-tight tracking-tight text-on-surface mb-6">
              Apex Mock Test<br/>
              <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Don't Just Compete, Dominate.</span>
            </motion.h1>

            <motion.p 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.7, delay: 0.3 }}
              className="text-lg md:text-xl text-on-surface-variant leading-relaxed mb-10 max-w-2xl mx-auto">
              The ultimate mock test platform for JEE, NEET, and CAT. Experience precision analytics and editorial-grade question sets proudly built to support aspirants across India.
            </motion.p>

            <motion.div 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.4 }}
              className="flex flex-col gap-4 items-center">
              <button onClick={() => { if(!user) openSignup(); else router.push('/dashboard'); }} className="w-full max-w-xs py-4 px-8 bg-gradient-to-r from-primary to-secondary text-white font-bold rounded-xl shadow-[0_10px_30px_rgba(74,64,224,0.3)] hover:shadow-[0_15px_40px_rgba(74,64,224,0.4)] transition-all active:scale-95 text-lg">
                Start Free Test
              </button>
              <p className="text-sm text-outline font-medium">No credit card required • Instant access</p>
            </motion.div>
          </section>

          {/* Exam Gateway */}
          <section className="px-6 py-16 bg-surface-container-low mt-8">
            <div className="max-w-7xl mx-auto">
              <h2 className="text-2xl font-bold font-headline mb-10 text-center tracking-tight text-on-surface">Choose Your Path</h2>
              <ExamGateway />
            </div>
          </section>

          {/* Premium Test Series Section */}
          {testSeries.length > 0 && (
            <section className="px-6 py-20 bg-background">
              <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
                  <div className="text-center md:text-left">
                    <span className="text-primary font-bold tracking-widest text-xs uppercase mb-2 block">Exclusive Access</span>
                    <h2 className="text-3xl font-bold font-headline tracking-tight text-on-surface">Premium Test Series</h2>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {testSeries.map((series: any) => (
                    <SeriesCard
                      key={series.id}
                      series={series}
                      onAction={handleEnrollment}
                    />
                  ))}
                </div>
              </div>
            </section>
          )}

        </main>

        {/* Footer */}
        <footer className="bg-slate-900 w-full pt-16 pb-8">
          <div className="max-w-7xl mx-auto px-8 grid grid-cols-1 md:grid-cols-4 gap-12">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                 <img src="/logo.png" alt="Apex Mock Test" className="h-16 w-auto object-contain" />
              </div>
              <p className="font-body text-sm leading-relaxed text-slate-400 max-w-sm mb-6">
                An initiative of SR Club. Dedicated to providing premium educational assessments and analytics to empower students worldwide.
              </p>
              <div className="flex items-center gap-2 text-tertiary-fixed text-xs font-bold uppercase tracking-widest">
                <span className="w-2 h-2 rounded-full bg-tertiary-fixed animate-pulse"></span>
                System Operational.
              </div>
            </div>
            <div>
              <h5 className="text-white font-bold mb-6 text-sm uppercase tracking-widest">Resources</h5>
              <ul className="space-y-4">
                <li><Link href="/about" className="text-slate-400 hover:text-white transition-colors font-body text-sm">About Us</Link></li>
                <li><Link href="/terms" className="text-slate-400 hover:text-white transition-colors font-body text-sm">Terms & Conditions</Link></li>
                <li><Link href="/privacy" className="text-slate-400 hover:text-white transition-colors font-body text-sm">Privacy Policy</Link></li>
              </ul>
            </div>
            <div>
              <h5 className="text-white font-bold mb-6 text-sm uppercase tracking-widest">Contact Us</h5>
              <ul className="space-y-4">
                <li><a href="mailto:officialsrcounselling@gmail.com" className="text-slate-400 hover:text-white transition-colors font-body text-sm flex items-center gap-2">officialsrcounselling@gmail.com</a></li>
                <li><a href="https://www.instagram.com/apexmock_official?igsh=MWkzODVxeWdyeXAyaA==" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-pink-500 transition-colors font-body text-sm flex items-center gap-2"><Instagram size={16} /> Instagram</a></li>
              </ul>
            </div>
          </div>
          <div className="max-w-7xl mx-auto px-8 mt-16 pt-8 border-t border-slate-800/50">
            <p className="font-body text-sm leading-relaxed text-slate-500 text-center">
              © 2025 Apex Mock Test. An initiative of SR Club. All rights reserved.
            </p>
          </div>
        </footer>
      </div>
    </>
  );
}
