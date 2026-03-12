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
      if (typeof window !== 'undefined' && window.VANTA && window.THREE && vantaRef.current && !vantaEffect) {
        try {
          // @ts-ignore
          effect = window.VANTA.HALO({
            el: vantaRef.current,
            THREE: (window as any).THREE,
            mouseControls: true,
            touchControls: true,
            gyroControls: false,
            minHeight: 200.00,
            minWidth: 200.00,
            backgroundColor: 0xafb5d9,  // Soft blue-purple background
            baseColor: 0x6366f1,        // Light indigo for subtle effect
            amplitudeFactor: 0.8,       // Reduced for subtlety
            xOffset: 0.1,
            yOffset: 0.1,
            size: 1.0
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
          // Refresh the page or navigate to dashboard
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
            // Success callback
            alert('✅ Payment successful! You are now enrolled.');
            router.push('/dashboard');
          },
          (error) => {
            // Failure callback
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

      {/* Login Modal */}
      <GoogleLoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />


      <div ref={vantaRef} className="min-h-screen w-full relative overflow-hidden" style={{ backgroundColor: '#afb5d9' }}>
        {/* Glass Overlay for Content readability if needed, but Vanta isbg */}
        <div className="relative z-10 min-h-screen flex flex-col">

          {/* Navbar */}
          <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-white/70 border-b border-white/40 shadow-[0_4px_30px_rgba(0,0,0,0.05)]">
            <div className="max-w-7xl mx-auto px-6 py-0 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <img src="/logo.png" alt="Apex Mock Test" className="h-20 w-auto" />
              </div>
              <div className="flex gap-2 md:gap-4">
                {user ? (
                  <Link href="/dashboard">
                    <button className="px-5 py-2 md:px-7 md:py-2.5 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold hover:from-indigo-700 hover:to-violet-700 transition-all duration-300 shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_30px_rgba(79,70,229,0.5)] transform hover:-translate-y-0.5 text-sm md:text-base">
                      Dashboard
                    </button>
                  </Link>
                ) : (
                  <>
                    <button onClick={openLogin} className="px-5 py-2 md:px-7 md:py-2.5 rounded-full bg-white/80 text-slate-800 border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-indigo-700 transition-all duration-300 backdrop-blur-md font-bold text-sm md:text-base shadow-sm">
                      Login
                    </button>
                    <button onClick={openSignup} className="px-5 py-2 md:px-7 md:py-2.5 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold hover:from-indigo-700 hover:to-violet-700 transition-all duration-300 shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_30px_rgba(79,70,229,0.5)] transform hover:-translate-y-0.5 text-sm md:text-base">
                      Sign Up
                    </button>
                  </>
                )}
              </div>
            </div>
          </nav>

          {/* Main Content */}
          <main className="flex-grow flex flex-col justify-center items-center px-4 pt-24 pb-12">

            {/* Hero Text */}
            <div className="text-center max-w-5xl mx-auto mb-16 space-y-8">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-emerald-50/80 border border-emerald-200/50 text-emerald-800 backdrop-blur-xl mb-4 shadow-[0_0_20px_rgba(16,185,129,0.15)] hover:shadow-[0_0_25px_rgba(16,185,129,0.25)] transition-shadow duration-300"
              >
                <div className="relative flex h-3 w-3 mr-1">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </div>
                <Users size={16} className="text-emerald-600 hidden sm:block" />
                <span className="font-bold tracking-wide text-sm sm:text-base">Trusted by 10,000+ Students</span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.15, ease: [0.23, 1, 0.32, 1] }}
                className="text-5xl md:text-7xl lg:text-[5.5rem] font-black drop-shadow-sm leading-[1.1] md:leading-tight tracking-tight px-2"
              >
                <span className="text-transparent bg-clip-text bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-800">Apex Mock Test</span>
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600">Don't Just Compete, Dominate.</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.7, delay: 0.3, ease: [0.23, 1, 0.32, 1] }}
                className="text-lg md:text-2xl text-slate-600 font-medium max-w-3xl mx-auto px-4 leading-relaxed"
              >
                An innovative mock test platform proudly built by me to support aspirants across India in cracking JEE, NEET, and CAT.
                Train with real exam-like tests and data-backed performance analysis.
              </motion.p>
            </div>

            {/* Exam Gateway (New Interactive Section) */}
            <ExamGateway />

            {/* Premium Test Series Section */}
            {testSeries.length > 0 && (
              <div className="w-full max-w-7xl mx-auto mb-20 z-10 relative">
                <h3 className="text-4xl md:text-5xl font-black text-slate-900 mb-14 text-center tracking-tight">Premium <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">Test Series</span></h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {testSeries.map((series: any, idx) => (
                    // @ts-ignore
                    <SeriesCard
                      key={series.id}
                      series={series}
                      onAction={handleEnrollment}
                    />
                  ))}
                </div>
              </div>
            )}

          </main>

          {/* Footer with Scalability Flex */}
          <footer className="w-full bg-slate-900 border-t border-slate-800 text-slate-300 backdrop-blur-lg">
            <div className="max-w-7xl mx-auto px-6 py-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-6">
                {/* Brand Section */}
                <div>
                  <h3 className="mb-3 flex items-center gap-2">
                    <img src="/logo.png" alt="Apex Mock Test" className="h-20 w-auto" />
                  </h3>
                  <p className="text-sm text-slate-400 mb-2">
                    An initiative of SR Club
                  </p>
                  <p className="text-sm text-slate-400">
                    India's most advanced testing platform for competitive exam aspirants.
                  </p>
                </div>

                {/* Quick Links */}
                <div>
                  <h4 className="text-white font-semibold mb-3">Quick Links</h4>
                  <ul className="space-y-2 text-sm">
                    <li>
                      <Link href="/about" className="text-slate-400 hover:text-white transition">
                        About Us
                      </Link>
                    </li>
                    <li>
                      <Link href="/terms" className="text-slate-400 hover:text-white transition">
                        Terms & Conditions
                      </Link>
                    </li>
                    <li>
                      <Link href="/privacy" className="text-slate-400 hover:text-white transition">
                        Privacy Policy
                      </Link>
                    </li>
                  </ul>
                </div>

                {/* Contact */}
                <div>
                  <h4 className="text-white font-semibold mb-3">Contact Us</h4>
                  <p className="text-sm text-slate-400 mb-4">
                    📧 <a href="mailto:officialsrcounselling@gmail.com" className="hover:text-white transition">
                      officialsrcounselling@gmail.com
                    </a>
                  </p>
                  <p className="text-sm text-slate-400 mb-4">
                    <a href="https://www.instagram.com/apexmock_official?igsh=MWkzODVxeWdyeXAyaA==" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-pink-500 transition-colors">
                      <Instagram size={18} />
                      Follow us on Instagram
                    </a>
                  </p>
                  <p className="text-sm text-slate-400 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    System Operational
                  </p>
                </div>
              </div>

              {/* Bottom Bar */}
              <div className="pt-6 border-t border-slate-800 text-center text-sm text-slate-400">
                <p>© 2025 Apex Mock - An initiative of SR Club. All rights reserved.</p>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </>
  );
}
