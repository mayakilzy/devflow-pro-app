import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'DevFlow Pro - Developer Productivity Platform',
  description: 'A comprehensive developer productivity platform with code snippet management, bug tracking, sprint planning, team mood tracking, documentation finder, CI/CD monitoring, and knowledge base.',
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