import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "./Components/ui/ThemeProvider";
import { SmoothScrollProvider } from "./Components/ui/SmoothScrollProvider";
import { SkipToContent } from "./Components/ui/SkipToContent";

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
      className="h-full antialiased selection:bg-[#E3836C]/30 selection:text-[#4A4238] dark:selection:bg-[#E3836C]/30 dark:selection:text-[#F4EDE5]"
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..700;1,9..144,300..700&family=Inter:wght@300;400;500;600;700&family=Outfit:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,600;1,400;1,600&family=Space+Mono:ital,wght@0,400;0,700;1,400&display=swap"
          rel="stylesheet"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem('analyzeit_token')){document.cookie='analyzeit_auth=1; Path=/; SameSite=Lax; Max-Age=2592000'}else{document.cookie='analyzeit_auth=; Path=/; SameSite=Lax; Max-Age=0'}var t=localStorage.getItem('analyzeit-theme');if(t==='dark'||(t!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark');document.documentElement.setAttribute('data-theme','dark')}else{document.documentElement.setAttribute('data-theme','light')}}catch(e){}`,
          }}
        />
      </head>
      <body
        suppressHydrationWarning
        className="min-h-full flex flex-col bg-[var(--bg)] text-[var(--text-primary)] font-sans antialiased overflow-x-hidden transition-colors duration-300"
      >
        <ThemeProvider>
          <SmoothScrollProvider>
            <SkipToContent />
            {children}
          </SmoothScrollProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
