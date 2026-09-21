"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";

function shortAddress(value?: string) {
  return value ? `${value.slice(0, 6)}…${value.slice(-4)}` : "Account";
}

export function Header() {
  const pathname = usePathname();
  const appConfigured = Boolean(process.env.NEXT_PUBLIC_PRIVY_APP_ID);
  if (!appConfigured) return <HeaderShell pathname={pathname} />;
  return <ConnectedHeader pathname={pathname} />;
}

function ConnectedHeader({ pathname }: { pathname: string }) {
  const privy = usePrivy();
  const authenticated = privy.authenticated;

  return <HeaderShell pathname={pathname} authenticated={authenticated} address={privy.user?.wallet?.address} onLogin={() => privy.login()} onLogout={() => privy.logout()} />;
}

function HeaderShell({ pathname, authenticated, address, onLogin, onLogout }: { pathname: string; authenticated?: boolean; address?: string; onLogin?: () => void; onLogout?: () => void }) {
  const appConfigured = Boolean(process.env.NEXT_PUBLIC_PRIVY_APP_ID);

  return (
    <header className="site-header">
      <Link className="brand" href="/">
        <span className="brand-mark">S</span>
        <span>STRATIVA</span>
      </Link>
      <nav aria-label="Main navigation">
        <Link className={pathname === "/" ? "active" : ""} href="/">Open box</Link>
        <Link className={pathname === "/prizes" ? "active" : ""} href="/prizes">View prizes</Link>
        <Link
          className={pathname === "/claims" ? "active" : ""}
          href="/claims"
        >
          My claims
        </Link>
      </nav>
      {!appConfigured ? (
        <span className="config-pill">Add Privy env</span>
      ) : authenticated ? (
        <button className="wallet-button" onClick={onLogout}>
          {shortAddress(address)}
        </button>
      ) : (
        <button className="wallet-button" onClick={onLogin}>Log in</button>
      )}
    </header>
  );
}
