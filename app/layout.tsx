import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gamerfied Highlights",
  description: "Upload CS2 demos, find highlight candidates, and queue future video renders."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <main className="shell">
          <nav className="topbar">
            <div className="topbar-inner">
              <a className="brand" href="/">
                <span className="brand-mark" aria-hidden="true" />
                <span>Gamerfied Highlights</span>
              </a>
              <span className="topbar-meta">CS2 demo clips MVP</span>
            </div>
          </nav>
          {children}
        </main>
      </body>
    </html>
  );
}
