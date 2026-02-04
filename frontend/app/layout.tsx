import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Apex Mock: Don't Just Compete. Dominate.",
  description: "Advanced JEE/NEET Mock Test Platform",
  verification: {
    google: "4ziAMDT4sEhielU-84GDTS2OfpO8EZ9N1_YuqSoiwZ8",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
