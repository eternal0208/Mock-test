'use client';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, signOut as firebaseSignOut, User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase';
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
                // Determine role (custom claim or DB sync)
                // For this MVP, we might sync with backend to get role.
                // Or just trust the token if we set custom claims.
                // Simpler: Fetch user data from our backend using UID.

                try {
                    const res = await fetch(`http://localhost:5001/api/auth/sync`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            name: firebaseUser.displayName,
                            email: firebaseUser.email,
                            firebaseUid: firebaseUser.uid
                        })
                    });
                    const dbUser = await res.json();
                    setUser({ ...firebaseUser, ...dbUser });
                } catch (err) {
                    console.error("Auth Sync Error", err);
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
        router.push('/login');
    };

    return (
        <AuthContext.Provider value={{ user, loading, logout }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
