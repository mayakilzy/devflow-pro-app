import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'DevFlow Pro - Developer Productivity Platform',
  description: 'A comprehensive developer productivity platform with code snippets, bug tracking, sprint planning, team mood monitoring, documentation finder, CI/CD monitoring, and knowledge base.',
  keywords: ['developer', 'productivity', 'code snippets', 'bug tracking', 'sprint planning', 'team mood', 'documentation', 'CI/CD', 'knowledge base'],
  authors: [{ name: 'DevFlow Team' }],
  openGraph: {
    title: 'DevFlow Pro - Developer Productivity Platform',
    description: 'A comprehensive developer productivity platform with code snippets, bug tracking, sprint planning, team mood monitoring, documentation finder, CI/CD monitoring, and knowledge base.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DevFlow Pro - Developer Productivity Platform',
    description: 'A comprehensive developer productivity platform with code snippets, bug tracking, sprint planning, team mood monitoring, documentation finder, CI/CD monitoring, and knowledge base.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>{children}</body>
    </html>
  );
}