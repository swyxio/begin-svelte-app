import type { Metadata } from 'next';
import './globals.css';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { NoprocrastGate } from '@/components/NoprocrastGate';

export const metadata: Metadata = {
  title: 'Hacker News',
  description: 'Hacker News Clone',
};

export const dynamic = 'force-dynamic';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <center>
          <table className="main-table">
            <tbody>
              <tr className="header-row">
                <td>
                  <Header />
                </td>
              </tr>
              <tr className="spacer-row">
                <td></td>
              </tr>
              <tr>
                <td className="content-cell">
                  <NoprocrastGate>
                    {children}
                  </NoprocrastGate>
                </td>
              </tr>
              <tr className="footer-row">
                <td>
                  <Footer />
                </td>
              </tr>
            </tbody>
          </table>
        </center>
      </body>
    </html>
  );
}
