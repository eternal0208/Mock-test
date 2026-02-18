'use client';
import React, { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import Link from 'next/link';
import Script from 'next/script';
import { ArrowRight, BookOpen, Target, Award, Users, Star, CheckCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { API_BASE_URL } from '@/lib/config';
import GoogleLoginModal from '@/components/GoogleLoginModal';
import ExamGateway from '@/components/ExamGateway';

// 3D Card Component


export default function LandingPage() {
  const vantaRef = useRef(null);
  const [vantaEffect, setVantaEffect] = useState<any>(null);
  const { user } = useAuth();
  const [testSeries, setTestSeries] = useState<any[]>([]);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const router = useRouter();

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
      const isFree = series.price === 0 || series.isPaid === false;

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
          <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-white/80 border-b border-gray-200 shadow-sm">
            <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
              <div className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <Target className="text-indigo-600" /> APEX<span className="text-indigo-600">MOCK</span>
              </div>
              <div className="flex gap-2 md:gap-4">
                {user ? (
                  <Link href="/dashboard">
                    <button className="px-4 py-2 md:px-6 md:py-2.5 rounded-full bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition shadow-lg text-sm md:text-base">
                      Dashboard
                    </button>
                  </Link>
                ) : (
                  <>
                    <button onClick={openLogin} className="px-4 py-2 md:px-6 md:py-2.5 rounded-full bg-white text-slate-900 border border-gray-300 hover:bg-gray-50 transition backdrop-blur-sm font-semibold text-sm md:text-base shadow-sm">
                      Login
                    </button>
                    <button onClick={openSignup} className="px-4 py-2 md:px-6 md:py-2.5 rounded-full bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition shadow-lg shadow-indigo-600/30 text-sm md:text-base">
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
            <div className="text-center max-w-4xl mx-auto mb-16 space-y-6">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-50 border border-green-200 text-green-800 backdrop-blur-md mb-4 font-semibold shadow-sm"
              >
                <Users size={18} className="text-green-600" />
                <span className="font-semibold">Trusted by 10,000+ Students</span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.15, ease: [0.23, 1, 0.32, 1] }}
                className="text-4xl md:text-6xl lg:text-7xl font-black text-slate-900 drop-shadow-sm leading-tight"
              >
                Apex Mock Test
                <br />
                <span className="text-indigo-600">Don't Just Compete, Dominate.</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.7, delay: 0.3, ease: [0.23, 1, 0.32, 1] }}
                className="text-base md:text-xl text-slate-700 font-medium max-w-2xl mx-auto px-4"
              >
                An innovative mock test platform proudly built by me to support aspirants across India in cracking JEE, NEET, and CAT.
                Train with real exam-like tests and data-backed performance analysis.
              </motion.p>
            </div>

            {/* Exam Gateway (New Interactive Section) */}
            <ExamGateway />

            {/* Premium Test Series Section */}
            {testSeries.length > 0 && (
              <div className="w-full max-w-7xl mx-auto mb-20">
                <h3 className="text-4xl font-black text-slate-900 mb-10 text-center">Premium <span className="text-indigo-600">Test Series</span></h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {/* @ts-ignore */}
                  {testSeries.map((series: any, idx) => (
                    <motion.div
                      key={series.id}
                      initial={{ opacity: 0, y: 30 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: idx * 0.1 }}
                      className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 flex flex-col hover:shadow-2xl transition-shadow"
                    >
                      <div className="h-48 bg-gray-200 relative">
                        {series.image ? (
                          <img src={series.image} alt={series.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-indigo-100 text-indigo-500">
                            <Award size={64} />
                          </div>
                        )}
                        <div className="absolute top-4 right-4 bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full text-xs font-bold uppercase flex items-center gap-1 shadow-sm">
                          <Star size={12} fill="currentColor" /> Premium
                        </div>
                      </div>
                      <div className="p-6 flex-1 flex flex-col">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="text-xl font-bold text-gray-900">{series.title}</h4>
                          <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-semibold">{series.category}</span>
                        </div>
                        <p className="text-gray-600 text-sm mb-4 line-clamp-3">{series.description}</p>

                        <ul className="mb-6 space-y-2">
                          {series.features && series.features.map((feat: string, i: number) => (
                            <li key={i} className="flex items-center text-sm text-gray-500">
                              <CheckCircle size={14} className="text-green-500 mr-2 flex-shrink-0" />
                              {feat}
                            </li>
                          ))}
                        </ul>

                        <div className="mt-auto flex items-center justify-between">
                          <div>
                            <span className="text-3xl font-bold text-gray-900">₹{series.price}</span>
                          </div>
                          <button
                            onClick={() => handleEnrollment(series)}
                            className={`px-6 py-2 font-bold rounded-lg transition shadow-lg ${series.price === 0 || series.isPaid === false
                              ? 'bg-green-600 text-white hover:bg-green-700 shadow-green-200'
                              : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200'
                              }`}
                          >
                            {series.price === 0 || series.isPaid === false ? 'Enroll Now' : `Buy for ₹${series.price}`}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

          </main>

          {/* Footer with Scalability Flex */}
          <footer className="w-full bg-slate-900 text-slate-300 backdrop-blur-lg">
            <div className="max-w-7xl mx-auto px-6 py-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-6">
                {/* Brand Section */}
                <div>
                  <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                    <Target className="text-indigo-400" size={24} />
                    APEX<span className="text-indigo-400">MOCK</span>
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
                  <p className="text-sm text-slate-400 mb-2">
                    📧 <a href="mailto:officialsrcounselling@gmail.com" className="hover:text-white transition">
                      officialsrcounselling@gmail.com
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
