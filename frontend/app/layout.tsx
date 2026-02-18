import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Apex Mock Test | NEET, JEE Mains, JEE Advanced & CAT Test Series",
  description: "Join Apex Mock Test to practice robust test series for NEET, JEE Mains, JEE Advanced, and CAT. Enhance your preparation with our AI-driven analytics and real exam simulation.",
  verification: {
    google: "4ziAMDT4sEhielU-84GDTS2OfpO8EZ9N1_YuqSoiwZ8",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script src="/js/three.r134.min.js" />
        <script src="/js/vanta.halo.min.js" />
        <script src="https://checkout.razorpay.com/v1/checkout.js" />
      </head>
      <body className={inter.className}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
