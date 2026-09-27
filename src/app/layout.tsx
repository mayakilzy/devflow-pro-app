import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'DevFlow Pro - Developer Productivity Platform',
  description: 'A comprehensive developer productivity platform with code snippet management, bug tracking, sprint planning, team mood tracking, documentation finder, CI/CD monitoring, and knowledge base.',
  keywords: ['developer', 'productivity', 'code snippets', 'bug tracking', 'sprint planning', 'team mood', 'documentation', 'CI/CD', 'knowledge base'],
  authors: [{ name: 'DevFlow Team' }],
  creator: 'DevFlow Pro',
  openGraph: {
    title: 'DevFlow Pro - Developer Productivity Platform',
    description: 'A comprehensive developer productivity platform with all the tools you need.',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DevFlow Pro - Developer Productivity Platform',
    description: 'A comprehensive developer productivity platform with all the tools you need.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} h-full`}>
        <div className="flex h-full">
          {children}
        </div>
      </body>
    </html>
  );
}