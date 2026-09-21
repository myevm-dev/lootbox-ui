import { STATIC_TOKENS } from "@/lib/config";

const order = ["USDC", "WETH", "JitoSOL", "uDOGE", "uNEAR", "UNI", "TET"];

export function PriceStrip() {
  const prices = Object.values(STATIC_TOKENS).sort((a, b) => order.indexOf(a.symbol) - order.indexOf(b.symbol));
  return (
    <section className="price-strip" aria-label="Static reference prices">
      <div className="ticker-track">
        {[...prices, ...prices].map((token, index) => (
          <div className="ticker-item" key={`${token.symbol}-${index}`}>
            <span className={`token-dot token-${token.symbol.toLowerCase()}`}>{token.symbol.slice(0, 1)}</span>
            <span>{token.symbol}</span>
            <strong>${token.price.toLocaleString()}</strong>
          </div>
        ))}
      </div>
      <span className="static-label">STATIC PRICES</span>
    </section>
  );
}
