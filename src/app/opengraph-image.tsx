import { ImageResponse } from "next/og";

export const alt = "GoldenGuide · Money confidence for older adults";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "80px",
        background: "#FBF8F1",
        color: "#1C2333",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
        <div
          style={{
            width: "88px",
            height: "88px",
            borderRadius: "44px",
            background: "#182352",
            border: "6px solid #D9A441",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#F2D48A",
            fontSize: "48px",
            fontWeight: 700,
          }}
        >
          G
        </div>
        <div style={{ fontSize: "56px", fontWeight: 700 }}>GoldenGuide</div>
      </div>
      <div
        style={{
          marginTop: "48px",
          fontSize: "64px",
          fontWeight: 700,
          lineHeight: 1.15,
          maxWidth: "980px",
        }}
      >
        Helping older adults feel more confident with their money.
      </div>
      <div style={{ marginTop: "32px", fontSize: "32px", color: "#875814" }}>
        Simple lessons · Safe scam practice · Tools for caregivers
      </div>
    </div>,
    size,
  );
}
