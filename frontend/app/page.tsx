'use client';
import React, { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import Link from 'next/link';
import Script from 'next/script';
import { ArrowRight, BookOpen, Target, Award, Users, Star, CheckCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { API_BASE_URL } from '@/lib/config';
import LoginModal from '@/components/LoginModal';

// 3D Card Component
function ExamCard({ title, description, icon: Icon, color, href }: { title: string, description: string, icon: any, color: string, href: string }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [-100, 100], [10, -10]);
  const rotateY = useTransform(x, [-100, 100], [-10, 10]);

  // Detect if device supports touch (mobile)
  const isTouchDevice = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

  return (
    <motion.div
      style={{
        x: isTouchDevice ? 0 : x,
        y: isTouchDevice ? 0 : y,
        rotateX: isTouchDevice ? 0 : rotateX,
        rotateY: isTouchDevice ? 0 : rotateY,
        z: 100
      }}
      drag={!isTouchDevice} // Disable drag on touch devices
      dragElastic={0.16}
      dragConstraints={{ top: 0, left: 0, right: 0, bottom: 0 }}
      whileHover={!isTouchDevice ? { cursor: "grabbing", scale: 1.02 } : {}} // Only on desktop
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
      className={`relative w-full h-96 rounded-2xl bg-gradient-to-br ${color} p-6 text-white shadow-xl transform-style-3d overflow-hidden group`}
      style={{ touchAction: 'pan-y', WebkitOverflowScrolling: 'touch' }}
    >
      <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors duration-300" />
      <div className="relative z-10 flex flex-col h-full justify-between transform-style-3d translate-z-20">
        <div>
          <motion.div
            className="bg-white/20 w-16 h-16 rounded-full flex items-center justify-center backdrop-blur-md mb-6 shadow-lg border border-white/30"
            whileHover={{ scale: 1.1, rotate: 5 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
          >
            <Icon size={32} />
          </motion.div>
          <h3 className="text-3xl font-extrabold mb-2 translate-z-10">{title}</h3>
          <p className="text-white/90 text-sm font-medium leading-relaxed">{description}</p>
        </div>

        <Link href={href} className="w-full">
          <motion.button
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
            className="w-full py-4 bg-white text-gray-900 font-bold rounded-xl shadow-2xl hover:bg-gray-50 transition-all flex items-center justify-center gap-2 text-lg transform-style-flat"
          >
            Start {title} Check <ArrowRight size={20} />
          </motion.button>
        </Link>
      </div>

      {/* Decorative 3D elements */}
      <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
    </motion.div>
  );
}

export default function LandingPage() {
  const vantaRef = useRef(null);
  const [vantaEffect, setVantaEffect] = useState<any>(null);
  const { user } = useAuth();
  const [testSeries, setTestSeries] = useState([]);
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
          effect = window.VANTA.CLOUDS({
            el: vantaRef.current,
            THREE: (window as any).THREE,
            mouseControls: true,
            touchControls: true,
            gyroControls: false,
            minHeight: 200.00,
            minWidth: 200.00,
            skyColor: 0x68b0e3,
            cloudColor: 0xffffff,
            cloudShadowColor: 0x8cb6d9,
            sunColor: 0xffd95c,
            sunGlareColor: 0xff8c42,
            sunlightColor: 0xffffff,
            speed: 1.2
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
      .then(data => setTestSeries(data))
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
      <Script src="/js/three.min.js" strategy="beforeInteractive" />
      <Script src="/js/vanta.clouds.min.js" strategy="afterInteractive" />

      {/* Login Modal */}
      <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />


      <div ref={vantaRef} className="min-h-screen w-full relative overflow-hidden">
        {/* Glass Overlay for Content readability if needed, but Vanta isbg */}
        <div className="relative z-10 min-h-screen flex flex-col">

          {/* Navbar */}
          <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-white/30 border-b border-white/40 shadow-sm">
            <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
              <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                <Target className="text-indigo-600" /> APEX<span className="text-indigo-600">MOCK</span>
              </h1>
              <div className="flex gap-2 md:gap-4">
                {user ? (
                  <Link href="/dashboard">
                    <button className="px-4 py-2 md:px-6 md:py-2.5 rounded-full bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition shadow-lg text-sm md:text-base">
                      Dashboard
                    </button>
                  </Link>
                ) : (
                  <>
                    <button onClick={openLogin} className="px-4 py-2 md:px-6 md:py-2.5 rounded-full bg-white/80 text-slate-900 border border-slate-200 hover:bg-white transition backdrop-blur-sm font-semibold text-sm md:text-base shadow-sm">
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
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 border border-slate-200 text-slate-800 backdrop-blur-md mb-4 font-semibold shadow-sm"
              >
                <Users size={18} className="text-green-600" />
                <span className="font-semibold">Trusted by 10,000+ Students</span>
              </motion.div>

              <motion.h2
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.15, ease: [0.23, 1, 0.32, 1] }}
                className="text-4xl md:text-6xl lg:text-7xl font-black text-slate-900 drop-shadow-sm leading-tight"
              >
                Apex Mock
                <br />
                <span className="text-indigo-600">Don't Just Compete. Dominate.</span>
              </motion.h2>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.7, delay: 0.3, ease: [0.23, 1, 0.32, 1] }}
                className="text-base md:text-xl text-slate-700 font-medium max-w-2xl mx-auto px-4"
              >
                India's most advanced testing platform designed for high-performance candidates.
                Experience real exam simulation with AI-driven analytics.
              </motion.p>
            </div>

            {/* Exam Sections Grid - Include CAT */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 max-w-7xl w-full mx-auto perspective-1000 mb-20" style={{ touchAction: 'pan-y' }}>
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
              >
                <ExamCard
                  title="NEET"
                  description="Comprehensive Biology, Physics, and Chemistry simulation for medical aspirants."
                  icon={BookOpen}
                  color="from-teal-500 to-emerald-600"
                  href="/neet"
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
              >
                <ExamCard
                  title="JEE Mains"
                  description="Master PCM with NTA-aligned mock tests. Speed and accuracy analysis."
                  icon={Target}
                  color="from-blue-600 to-indigo-700"
                  href="/jee-mains"
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
              >
                <ExamCard
                  title="JEE Advanced"
                  description="The ultimate challenge. Deep concept testing and advanced problem solving."
                  icon={Award}
                  color="from-rose-500 to-pink-600"
                  href="/jee-advanced"
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7, duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
              >
                <ExamCard
                  title="CAT"
                  description="Crack the Common Admission Test. Master DILR, VARC, and QA with our mocks."
                  icon={BookOpen}
                  color="from-purple-600 to-violet-700"
                  href="/cat"
                />
              </motion.div>
            </div>

            {/* Premium Test Series Section */}
            {testSeries.length > 0 && (
              <div className="w-full max-w-7xl mx-auto mb-20">
                <h3 className="text-4xl font-black text-slate-800 mb-10 text-center">Premium <span className="text-indigo-600">Test Series</span></h3>
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
