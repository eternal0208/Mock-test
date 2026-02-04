'use client';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, signOut as firebaseSignOut, User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { API_BASE_URL } from '@/lib/config';
import { useRouter } from 'next/navigation';

interface User extends FirebaseUser {
    name?: string;
    role?: string;
    // Add other dbUser properties here if needed
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    logout: async () => { },
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                try {
                    // Fetch user data from Firestore directly
                    // This avoids auto-creation via API, allowing 'signup-details' flow to work.
                    const { doc, getDoc } = await import("firebase/firestore");
                    const { db } = await import("@/lib/firebase");

                    const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));

                    if (userDoc.exists()) {
                        setUser({ ...firebaseUser, ...userDoc.data() });
                    } else {
                        setUser(firebaseUser as User);
                    }
                } catch (err) {
                    console.error("Auth Fetch Error", err);
                    setUser(firebaseUser as User); // Fallback
                }
            } else {
                setUser(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const logout = async () => {
        await firebaseSignOut(auth);
        router.push('/');
    };

    return (
        <AuthContext.Provider value={{ user, loading, logout }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
