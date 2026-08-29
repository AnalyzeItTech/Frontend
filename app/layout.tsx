import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "./Components/ui/ThemeProvider";
import { SmoothScrollProvider } from "./Components/ui/SmoothScrollProvider";

export const metadata: Metadata = {
  title: "AnalyzeIt — See what your data already knows",
  description:
    "A quiet, intelligent analytics workspace that monitors your metrics in real-time 3D, writes clear narrative summaries, and lets anyone ask questions in plain words.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className="h-full antialiased selection:bg-[#D4826A]/30 selection:text-[#4A4238] dark:selection:bg-[#D4826A]/30 dark:selection:text-white"
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..700;1,9..144,300..700&family=Inter:wght@300;400;500;600;700&family=Outfit:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,600;1,400;1,600&family=Space+Mono:ital,wght@0,400;0,700;1,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col bg-[#F3EDE4] dark:bg-[#161311] text-[#4A4238] dark:text-[#EDE6DC] font-sans antialiased overflow-x-hidden transition-colors duration-300">
        <ThemeProvider>
          <SmoothScrollProvider>
            {/* Accessibility skip link */}
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[999999] focus:px-4 focus:py-2 focus:bg-[#D4826A] focus:text-white focus:rounded-full focus:shadow-lg focus:outline-none text-xs font-mono uppercase"
            >
              Skip to main content
            </a>
            {children}
          </SmoothScrollProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
