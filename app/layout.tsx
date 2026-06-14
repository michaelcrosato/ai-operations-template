import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
// @ts-ignore
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from 'sonner';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  weight: ['400', '500', '700'],
});

export const metadata: Metadata = {
  title: 'ForgeOps — AI Agent Operations Platform',
  description: 'Visually build, orchestrate, monitor, and export Grok-powered agent swarms and workflows. Premium operations for AI teams.',
  icons: {
    icon: '/favicon.ico',
  },
  // OG / social image suggestion (text placeholder until real asset):
  // Recommended: 1200x630 dark premium hero crop with logo "F", bold headline slice, subtle "built with its own AI ops engine" tag.
  // Generate via your favorite tool or the xAI Imagine endpoint with prompt matching the hero visual language.
  // For now the meta description + in-app visuals carry the story.
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster position="top-center" richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
