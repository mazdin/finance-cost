import type { Metadata } from "next";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "AT Finance Cost",
  description: "Monthly expense tracker with Telegram bot integration",
};

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} className="nav-link">
      {children}
    </a>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>
        <div className="container">
          <nav className="nav">
            <a href="/" className="nav-brand">
              AT Finance Cost
            </a>
            <div className="nav-links">
              <NavLink href="/">Dashboard</NavLink>
              <NavLink href="/add">+ Tambah</NavLink>
              <NavLink href="/scan">Scan Bill</NavLink>
              <NavLink href="/transactions">Riwayat</NavLink>
            </div>
          </nav>
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}
