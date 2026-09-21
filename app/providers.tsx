"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { base } from "viem/chains";

export function Providers({ children }: { children: React.ReactNode }) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

  if (!appId) return <>{children}</>;

  return (
    <PrivyProvider
      appId={appId}
      config={{
        defaultChain: base,
        supportedChains: [base],
        embeddedWallets: { ethereum: { createOnLogin: "users-without-wallets" } },
        appearance: { theme: "dark", accentColor: "#f6c945", logo: undefined },
        loginMethods: ["email", "wallet", "google"],
      }}
    >
      {children}
    </PrivyProvider>
  );
}
