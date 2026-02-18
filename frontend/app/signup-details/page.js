'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db, storage } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { API_BASE_URL } from '@/lib/config';
import { User, BookOpen, Heart, Phone, Loader2, CheckCircle, Mail, MapPin, Camera, Upload } from 'lucide-react';
import imageCompression from 'browser-image-compression';

export default function SignupDetailsPage() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [studentClass, setStudentClass] = useState('');
    const [category, setCategory] = useState(''); // Unified Field
    const [phoneNumber, setPhoneNumber] = useState('');
    const [state, setState] = useState('');
    const [city, setCity] = useState('');
    const [photoURL, setPhotoURL] = useState('');
    const [photoFile, setPhotoFile] = useState(null);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);

    const [loading, setLoading] = useState(false);
    const [pageLoading, setPageLoading] = useState(true);
    const [error, setError] = useState('');
    const fileInputRef = useRef(null);
    const router = useRouter();

    // Predefined Avatars (Using DiceBear Adventurer style for reliability)
    const AVATARS = [
        // Boys
        'https://api.dicebear.com/7.x/adventurer/svg?seed=Felix',
        'https://api.dicebear.com/7.x/adventurer/svg?seed=Brian',
        'https://api.dicebear.com/7.x/adventurer/svg?seed=Christopher',
        'https://api.dicebear.com/7.x/adventurer/svg?seed=Jack',
        'https://api.dicebear.com/7.x/adventurer/svg?seed=Mathew',
        // Girls
        'https://api.dicebear.com/7.x/adventurer/svg?seed=Aneka',
        'https://api.dicebear.com/7.x/adventurer/svg?seed=Eliza',
        'https://api.dicebear.com/7.x/adventurer/svg?seed=Maria',
        'https://api.dicebear.com/7.x/adventurer/svg?seed=Sophie',
        'https://api.dicebear.com/7.x/adventurer/svg?seed=Monica',
    ];

    const [showAvatars, setShowAvatars] = useState(false);

    useEffect(() => {
        const checkUserState = async () => {
            const user = auth.currentUser;

            // Guard 1: User must be authenticated
            if (!user) {
                console.log('No user authenticated, redirecting to home');
                router.push('/');
                return;
            }

            // Pre-fill email, name, and photo from Google account
            if (user.email) setEmail(user.email);
            if (user.displayName) setName(user.displayName);
            if (user.photoURL) setPhotoURL(user.photoURL);

            // Guard 2: Check if user already has a profile
            try {
                const userDoc = await getDoc(doc(db, 'users', user.uid));

                if (userDoc.exists()) {
                    console.log('User profile already exists, redirecting to dashboard');
                    router.push('/dashboard');
                    return;
                }

                // User is authenticated but has no profile - show signup form
                setPageLoading(false);
            } catch (err) {
                console.error('Error checking user profile:', err);
                setError('Failed to load user data. Please try again.');
                setPageLoading(false);
            }
        };

        // Listen to auth state changes
        const unsubscribe = auth.onAuthStateChanged(() => {
            checkUserState();
        });

        return () => unsubscribe();
    }, [router]);

    const handlePhotoChange = async (e) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];

            // Client-side compression
            try {
                const options = {
                    maxSizeMB: 0.3, // Compress to ~300KB for better mobile upload
                    maxWidthOrHeight: 800, // Resize to max 800px (sufficient for profile)
                    useWebWorker: true,
                    fileType: 'image/jpeg' // Convert HEIC/PNG to JPEG
                };

                // Show some loading state if needed, or just process
                const compressedFile = await imageCompression(file, options);

                setPhotoFile(compressedFile);
                setPhotoURL(URL.createObjectURL(compressedFile));
                setShowAvatars(false); // Hide avatar selection if manual upload
            } catch (error) {
                console.error("Image compression error:", error);
                setError("Failed to process image. Please try another one.");
            }
        }
    };

    const selectAvatar = (url) => {
        setPhotoURL(url);
        setPhotoFile(null); // Clear manual file upload if avatar selected
        // setShowAvatars(false); // Optional: keep open or close
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const user = auth.currentUser;
        if (!user) {
            setError('Session expired. Please log in again.');
            router.push('/');
            return;
        }

        // Validate all required fields
        if (!name.trim() || !email.trim() || !phoneNumber.trim() || !studentClass.trim() || !category.trim() || !state || !city) {
            setError('Please fill in all required fields');
            setLoading(false);
            return;
        }

        // Validate phone number (10 digits)
        if (phoneNumber.length !== 10) {
            setError('Please enter a valid 10-digit phone number');
            setLoading(false);
            return;
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setError('Please enter a valid email address');
            setLoading(false);
            return;
        }

        // Client-side compression settings for mobile optimization
        try {
            let finalPhotoURL = photoURL;

            // 1. Image Upload Logic
            if (photoFile) {
                setUploadingPhoto(true);
                console.log('Starting photo upload...');

                try {
                    const fileExtension = photoFile.name.split('.').pop();
                    const fileName = `profile_${user.uid}_${Date.now()}.${fileExtension}`;
                    const storageRef = ref(storage, `profile_photos/${user.uid}/${fileName}`);

                    await uploadBytes(storageRef, photoFile);
                    console.log('Photo uploaded to Firebase Storage');

                    finalPhotoURL = await getDownloadURL(storageRef);
                    console.log('Photo URL retrieved:', finalPhotoURL);
                } catch (uploadError) {
                    console.error('Firebase Storage Error:', uploadError);
                    throw new Error(`Image Upload Failed: ${uploadError.message}`);
                } finally {
                    setUploadingPhoto(false);
                }
            }

            // 2. Backward Compatibility: Ensure older successful uploads are used if available
            if (!finalPhotoURL && photoURL.startsWith('http')) {
                finalPhotoURL = photoURL;
            }

            console.log('Sending data to backend...', { name, email, phoneNumber, finalPhotoURL });

            // 3. Backend Sync Logic
            const token = await user.getIdToken();
            try {
                const res = await fetch(`${API_BASE_URL}/api/auth/sync`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        name: name.trim(),
                        email: email.trim().toLowerCase(),
                        phone: phoneNumber.trim(),
                        class: studentClass.trim(),
                        category: category.trim(),
                        state: state,
                        city: city,
                        photoURL: finalPhotoURL || '',
                        firebaseUid: user.uid,
                        authProvider: 'google',
                        role: 'student'
                    })
                });

                const data = await res.json();

                if (!res.ok) {
                    throw new Error(data.message || `Server Error: ${res.status}`);
                }

                console.log('✅ User profile created successfully');
                window.location.href = '/dashboard';

            } catch (apiError) {
                console.error('Backend Sync Error:', apiError);
                throw new Error(`Profile Save Failed: ${apiError.message}`);
            }

        } catch (error) {
            console.error('Signup Process Error:', error);
            setError(error.message || 'An unexpected error occurred. Please check your internet connection.');
            // Mobile debugging: show alert for visibility
            if (window.innerWidth < 768) {
                alert(`Error: ${error.message}`);
            }
            setLoading(false);
            setUploadingPhoto(false);
        }
    };

    if (pageLoading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-blue-50">
                <Loader2 className="animate-spin text-indigo-600 mb-4" size={40} />
                <p className="text-gray-600 font-medium">Loading your profile...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-blue-50 p-4">
            <div className="max-w-md w-full bg-white p-6 md:p-8 rounded-2xl shadow-2xl border border-gray-100 my-8">
                <div className="text-center mb-6 md:mb-8">
                    <h1 className="text-xl md:text-2xl font-extrabold text-indigo-600 mb-2">Apex Mock Test</h1>
                    <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Complete Your Profile</h2>
                    <p className="text-sm md:text-base text-gray-600">Tell us a bit about yourself to get started</p>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm mb-6 flex items-center justify-center border border-red-200">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Profile Photo Upload */}
                    <div className="flex flex-col items-center mb-6">
                        <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-indigo-100 shadow-md bg-gray-100 flex items-center justify-center">
                                {photoURL ? (
                                    <img src={photoURL} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <User size={40} className="text-gray-400" />
                                )}
                            </div>
                            <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Camera className="text-white" size={24} />
                            </div>
                            <div className="absolute bottom-0 right-0 bg-indigo-600 p-1.5 rounded-full shadow-lg border-2 border-white">
                                <Upload size={14} className="text-white" />
                            </div>
                        </div>

                        <div className="flex justify-center gap-4 mt-3">
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                            >
                                Upload Photo
                            </button>
                            <span className="text-gray-300">|</span>
                            <button
                                type="button"
                                onClick={() => setShowAvatars(!showAvatars)}
                                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                            >
                                {showAvatars ? 'Hide Avatars' : 'Choose Avatar'}
                            </button>
                        </div>

                        {/* Avatar Grid */}
                        {showAvatars && (
                            <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-100 w-full animate-in fade-in slide-in-from-top-2">
                                <p className="text-xs font-bold text-gray-500 mb-3 text-center uppercase tracking-wide">Select an Avatar</p>
                                <div className="grid grid-cols-5 gap-2 md:gap-3">
                                    {AVATARS.map((avatar, index) => (
                                        <button
                                            key={index}
                                            type="button"
                                            onClick={() => selectAvatar(avatar)}
                                            className={`relative rounded-full overflow-hidden border-2 transition-all hover:scale-110 ${photoURL === avatar ? 'border-indigo-600 ring-2 ring-indigo-100 scale-110' : 'border-transparent hover:border-gray-300'
                                                }`}
                                        >
                                            <img src={avatar} alt={`Avatar ${index + 1}`} className="w-full h-full object-cover" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handlePhotoChange}
                            accept="image/*"
                            className="hidden"
                        />
                    </div>

                    {/* Full Name */}
                    <div>
                        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">Full Name *</label>
                        <div className="relative">
                            <User className="absolute left-3 top-3 text-gray-400" size={18} />
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="block w-full pl-10 pr-3 py-2.5 rounded-xl border-2 border-gray-200 bg-gray-50 focus:bg-white focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none font-medium text-gray-800"
                                placeholder="John Doe"
                                required
                            />
                        </div>
                    </div>

                    {/* Email */}
                    <div>
                        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">Email Address *</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-3 text-gray-400" size={18} />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="block w-full pl-10 pr-3 py-2.5 rounded-xl border-2 border-gray-200 bg-gray-50 focus:bg-white focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none font-medium text-gray-800"
                                placeholder="john@example.com"
                                required
                            />
                        </div>
                    </div>

                    {/* Phone Number (Required) */}
                    <div>
                        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">Phone Number *</label>
                        <div className="relative">
                            <Phone className="absolute left-3 top-3 text-gray-400" size={18} />
                            <input
                                type="tel"
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                                className="block w-full pl-10 pr-3 py-2.5 rounded-xl border-2 border-gray-200 bg-gray-50 focus:bg-white focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none font-medium text-gray-800"
                                placeholder="9999999999"
                                maxLength={10}
                                required
                            />
                        </div>
                        <p className="text-xs text-gray-500 mt-1 px-1">10-digit mobile number</p>
                    </div>

                    {/* Class */}
                    <div>
                        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">Class / Grade *</label>
                        <div className="relative">
                            <BookOpen className="absolute left-3 top-3 text-gray-400" size={18} />
                            <select
                                value={studentClass}
                                onChange={(e) => setStudentClass(e.target.value)}
                                className="block w-full pl-10 pr-3 py-2.5 rounded-xl border-2 border-gray-200 bg-gray-50 focus:bg-white focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none font-medium text-gray-800 appearance-none cursor-pointer"
                                required
                            >
                                <option value="">Select Class</option>
                                <option value="8th">8th</option>
                                <option value="9th">9th</option>
                                <option value="10th">10th</option>
                                <option value="11th">11th</option>
                                <option value="12th">12th</option>
                                <option value="Dropper">Dropper</option>
                                <option value="College">College</option>
                                <option value="Graduate">Graduate</option>
                            </select>
                        </div>
                    </div>

                    {/* Selected Field (Strict Source of Truth) */}
                    <div>
                        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">Select Your Field (Strictly Enforced) *</label>
                        <div className="relative">
                            <Heart className="absolute left-3 top-3 text-gray-400" size={18} />
                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="block w-full pl-10 pr-3 py-2.5 rounded-xl border-2 border-gray-200 bg-gray-50 focus:bg-white focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none font-medium text-gray-800 appearance-none cursor-pointer"
                                required
                            >
                                <option value="">Select Field</option>
                                <option value="JEE Main">JEE Main</option>
                                <option value="JEE Advanced">JEE Advanced</option>
                                <option value="NEET">NEET</option>
                                <option value="CAT">CAT</option>
                                <option value="Board Exam">Board Exam</option>
                                <option value="Others">Others</option>
                            </select>
                            <p className="text-[10px] text-red-500 mt-1 pl-1 font-bold">
                                ⚠️ Cannot be changed later. All content will be locked to this field.
                            </p>
                        </div>
                    </div>

                    {/* State */}
                    <div>
                        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">State *</label>
                        <div className="relative">
                            <MapPin className="absolute left-3 top-3 text-gray-400" size={18} />
                            <input
                                type="text"
                                value={state}
                                onChange={(e) => setState(e.target.value)}
                                className="block w-full pl-10 pr-3 py-2.5 rounded-xl border-2 border-gray-200 bg-gray-50 focus:bg-white focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none font-medium text-gray-800"
                                placeholder="e.g. Maharashtra, Delhi"
                                required
                            />
                        </div>
                    </div>

                    {/* City */}
                    <div>
                        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">City *</label>
                        <div className="relative">
                            <MapPin className="absolute left-3 top-3 text-gray-400" size={18} />
                            <input
                                type="text"
                                value={city}
                                onChange={(e) => setCity(e.target.value)}
                                className="block w-full pl-10 pr-3 py-2.5 rounded-xl border-2 border-gray-200 bg-gray-50 focus:bg-white focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none font-medium text-gray-800"
                                placeholder="e.g. Mumbai, Pune"
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex justify-center items-center py-3.5 md:py-4 px-6 border border-transparent rounded-xl shadow-lg shadow-indigo-200 text-base font-bold text-white bg-indigo-600 hover:bg-indigo-700 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="animate-spin mr-2" size={20} />
                                {uploadingPhoto ? 'Uploading Photo...' : 'Saving...'}
                            </>
                        ) : (
                            <>
                                Save & Continue <CheckCircle size={18} className="ml-2" />
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
