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

              <div className="sidebar-section-label">Content</div>
              <a href="/images" className="nav-link">🖼️ Images</a>
              <a href="/captions" className="nav-link">💬 Captions</a>
              <a href="/caption-requests" className="nav-link">📥 Caption Requests</a>
              <a href="/caption-examples" className="nav-link">📚 Caption Examples</a>

              <div className="sidebar-section-label">Humor System</div>
              <a href="/humor-flavors" className="nav-link">🌶️ Humor Flavors</a>
              <a href="/humor-flavor-steps" className="nav-link">🧩 Flavor Steps</a>
              <a href="/humor-mix" className="nav-link">🎛️ Humor Mix</a>
              <a href="/terms" className="nav-link">📖 Terms</a>

              <div className="sidebar-section-label">LLM</div>
              <a href="/llm-providers" className="nav-link">🏢 LLM Providers</a>
              <a href="/llm-models" className="nav-link">🤖 LLM Models</a>
              <a href="/llm-prompt-chains" className="nav-link">⛓️ Prompt Chains</a>
              <a href="/llm-responses" className="nav-link">🧾 LLM Responses</a>

              <div className="sidebar-section-label">Access Control</div>
              <a href="/allowed-signup-domains" className="nav-link">🌐 Allowed Domains</a>
              <a href="/whitelisted-emails" className="nav-link">✅ Whitelisted E-mails</a>
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
