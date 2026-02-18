import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  metadataBase: new URL('https://www.apexmocktest.com'),
  title: {
    default: "Apex Mock Test | Best Free Test Series for NEET, JEE & CAT",
    template: "%s | Apex Mock Test"
  },
  description: "Practice free and premium mock tests for NEET, JEE Mains, JEE Advanced, and CAT. Get AI-driven performance analysis, NCERT-based questions, and real exam simulation at Apex Mock Test.",
  keywords: ["NEET Mock Test", "JEE Mains Mock Test", "JEE Advanced Test Series", "CAT Mock Test", "Free Mock Test Analysis", "NCERT based questions", "Apex Mock Test", "Online Test Series", "Competitive Exam Preparation"],
  authors: [{ name: "Apex Mock Test Team" }],
  creator: "Apex Mock Test",
  publisher: "Apex Mock Test",
  region: "IN",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://www.apexmocktest.com",
    title: "Apex Mock Test | Ace Your Exams with AI-Driven Analysis",
    description: "Join India's most advanced testing platform. Practice robust test series for NEET, JEE, and CAT with detailed performance insights.",
    siteName: "Apex Mock Test",
    images: [
      {
        url: "/logo.png",
        width: 800,
        height: 600,
        alt: "Apex Mock Test Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Apex Mock Test | Best Free Test Series",
    description: "Practice free and premium mock tests for NEET, JEE, and CAT. Get AI-driven analysis.",
    images: ["/logo.png"],
    creator: "@apexmocktest", // Replace if you have a handle
  },
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
  alternates: {
    canonical: "./",
  },
  verification: {
    google: "4ziAMDT4sEhielU-84GDTS2OfpO8EZ9N1_YuqSoiwZ8",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "Apex Mock Test",
    "url": "https://www.apexmocktest.com",
    "potentialAction": {
      "@type": "SearchAction",
      "target": "https://www.apexmocktest.com/search?q={search_term_string}",
      "query-input": "required name=search_term_string"
    }
  };

  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Apex Mock Test",
    "url": "https://www.apexmocktest.com",
    "logo": "https://www.apexmocktest.com/logo.png",
    "sameAs": [
      "https://www.facebook.com/apexmocktest", // Update these links
      "https://twitter.com/apexmocktest",
      "https://www.instagram.com/apexmocktest"
    ],
    "contactPoint": {
      "@type": "ContactPoint",
      "telephone": "+91-9999999999", // Update phone
      "contactType": "customer service",
      "areaServed": "IN",
      "availableLanguage": "en"
    }
  };

  return (
    <html lang="en">
      <head>
        <script src="/js/three.r134.min.js" />
        <script src="/js/vanta.halo.min.js" />
        <script src="https://checkout.razorpay.com/v1/checkout.js" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
      </head>
      <body className={inter.className}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
