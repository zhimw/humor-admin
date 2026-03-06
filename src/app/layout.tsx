import type { ReactNode } from 'react';
import './globals.css';
import SidebarAuth from './components/SidebarAuth';

export const metadata = {
  title: 'Humor Admin',
  description: 'Admin panel for the humor project',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: '100vh', backgroundColor: 'rgb(2 6 23)', color: 'rgb(241 245 249)', fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif" }}>
        <div style={{ minHeight: '100vh', display: 'flex' }}>
          <aside className="sidebar-panel">
            <div className="sidebar-brand">
              <h1>Humor Admin</h1>
              <p>Superadmin control room</p>
            </div>

            <nav className="sidebar-nav">
              <a href="/" className="nav-link">📊 Dashboard</a>
              <a href="/profiles" className="nav-link">👤 Users &amp; Profiles</a>
              <a href="/images" className="nav-link">🖼️ Images</a>
              <a href="/captions" className="nav-link">💬 Captions</a>
            </nav>

            <div className="sidebar-footer">
              <SidebarAuth />
              <p className="footer-note">
                Requires <code>profiles.is_superadmin = TRUE</code>.
              </p>
            </div>
          </aside>

          <main className="main-content">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
