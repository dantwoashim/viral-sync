import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from './providers';
import { AuthProvider } from '@/lib/auth';
import MerchantShell from '@/components/MerchantShell';

export const metadata: Metadata = {
  title: 'Viral Sync',
  description: 'Earn rewards for sharing things you love. The referral program that runs itself.',
};

// Blocking script that runs before React hydrates to prevent FOUC.
// Reads localStorage and sets data-theme on <html> immediately.
const themeInitScript = `
  (function() {
    try {
      var stored = localStorage.getItem('vs-theme');
      var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      var theme = (stored === 'light' || stored === 'dark') ? stored : (prefersDark ? 'dark' : 'light');
      document.documentElement.setAttribute('data-theme', theme);
      document.documentElement.style.colorScheme = theme;
    } catch(e) {}
  })();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <AuthProvider>
          <ThemeProvider>
            <MerchantShell>
              {children}
            </MerchantShell>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
