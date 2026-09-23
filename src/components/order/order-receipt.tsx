// 📖 Block 5 — the printed receipt. HTML + CSS, never an image, so the type
// stays sharp at any scene scale and the order number comes from props.

import Image from "next/image";

import { OrderBarcode } from "./order-barcode";
import { RECEIPT } from "./receipt-spec";

export { RECEIPT };

export interface OrderReceiptProps {
  /** True once the feed has pushed the code clear of the printer's slot. */
  fed: boolean;
  brand: string;
  cup: { src: string; alt: string; width: number; height: number };
  tagline: string[];
  order: { id: string; date: string; time: string };
  thanks: string[];
  promo: { headline: string[]; blurb: string[]; cta: string };
  domain: string;
}

/** A dotted rule, drawn with a gradient so it stays crisp when the scene scales. */
const Rule = () => (
  <div
    aria-hidden="true"
    style={{
      height: RECEIPT.dash.height,
      backgroundImage: `repeating-linear-gradient(90deg, ${RECEIPT.ink} 0 ${RECEIPT.dash.on}px, transparent ${RECEIPT.dash.on}px ${RECEIPT.dash.on + RECEIPT.dash.off}px)`,
    }}
  />
);

/** Torn edge: fills the paper down to a run of downward teeth. */
const tornEdgePath = (width: number) => {
  const { pitch, depth } = RECEIPT.teeth;
  const d = [`M 0 0`, `L ${width} 0`];
  for (let x = width; x > 0; x -= pitch) {
    d.push(`L ${Math.max(0, x - pitch / 2)} ${depth}`);
    d.push(`L ${Math.max(0, x - pitch)} 0`);
  }
  d.push("Z");
  return d.join(" ");
};

export const OrderReceipt = ({
  brand,
  cup,
  tagline,
  order,
  thanks,
  promo,
  domain,
  fed,
}: OrderReceiptProps) => {
  return (
    <div style={{ width: RECEIPT.width, color: RECEIPT.ink }}>
      <div
        style={{
          background: RECEIPT.paper,
          padding: `${RECEIPT.padTop}px ${RECEIPT.paddingX}px ${RECEIPT.padBottom}px`,
          display: "flex",
          flexDirection: "column",
          gap: RECEIPT.gap,
          fontFamily: "var(--font-mono)",
        }}
      >
        <p
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.16em",
            textAlign: "center",
          }}
        >
          {brand}
        </p>

        <Rule />

        <Image
          src={cup.src}
          alt={cup.alt}
          width={cup.width}
          height={cup.height}
          style={{
            width: RECEIPT.cupWidth,
            height: "auto",
            margin: "0 auto",
            display: "block",
          }}
        />

        <Rule />

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            fontSize: 8,
            letterSpacing: "0.07em",
            lineHeight: 1.85,
          }}
        >
          <div>
            {tagline.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
          <div style={{ textAlign: "right" }}>
            <p>{order.id}</p>
            <p>{order.date}</p>
            <p>{order.time}</p>
          </div>
        </div>

        <div style={{ fontSize: 8, letterSpacing: "0.07em", lineHeight: 1.85 }}>
          {thanks.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>

        <Rule />

        <div style={{ display: "flex", gap: 12 }}>
          <p
            style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.25, flex: 1 }}
          >
            {promo.headline.map((line) => (
              <span key={line} style={{ display: "block" }}>
                {line}
              </span>
            ))}
          </p>
          <div
            style={{
              width: 132,
              paddingLeft: 12,
              borderLeft: `1px solid ${RECEIPT.rule}`,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <p
              style={{
                fontSize: 7,
                letterSpacing: "0.07em",
                lineHeight: 1.6,
                color: RECEIPT.inkMuted,
              }}
            >
              {promo.blurb.map((line) => (
                <span key={line} style={{ display: "block" }}>
                  {line}
                </span>
              ))}
            </p>
            <span
              style={{
                background: RECEIPT.ink,
                color: RECEIPT.paper,
                fontSize: 8,
                fontWeight: 700,
                letterSpacing: "0.09em",
                padding: "6px 9px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 8,
              }}
            >
              {promo.cta}
              <span aria-hidden="true">→</span>
            </span>
          </div>
        </div>

        <OrderBarcode fed={fed} />

        <p
          style={{
            fontSize: 7,
            letterSpacing: "0.16em",
            textAlign: "center",
          }}
        >
          {domain}
        </p>
      </div>

      <svg
        aria-hidden="true"
        width={RECEIPT.width}
        height={RECEIPT.teeth.depth}
        viewBox={`0 0 ${RECEIPT.width} ${RECEIPT.teeth.depth}`}
        preserveAspectRatio="none"
        style={{ display: "block" }}
      >
        <path d={tornEdgePath(RECEIPT.width)} fill={RECEIPT.paper} />
      </svg>
    </div>
  );
};
