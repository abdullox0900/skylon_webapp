import React from "react";
import Lottie from "lottie-react";
import animationData from "@/../public/lottie/chip.json";
import animationDataLogo from "@/../public/lottie/logo.json";

interface LoadingProps {
  className?: string;
  style?: React.CSSProperties;
  size?: number | string;
  backgroundColor?: string;
  logoScale?: number;
}

const clamp = (value: number, min = 0, max = 1) => Math.min(Math.max(value, min), max);

const toCssSize = (value: number | string) =>
  typeof value === "number" ? `${value}px` : value;

export default function Loading({
  className,
  style,
  size = 120,
  backgroundColor = "#090D14",
  logoScale = 0.3,
}: LoadingProps) {
  const resolvedSize = toCssSize(size);
  const resolvedLogoSize = `${clamp(logoScale) * 100}%`;

  return (
    <div
      className={className}
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor,
        width: resolvedSize,
        height: resolvedSize,
        overflow: "hidden",
        borderRadius: "12px",
        ...style,
      }}
    >
      <div style={{ position: "relative", width: "100%", height: "100%" }}>
        <Lottie animationData={animationData} loop autoplay style={{ width: "100%", height: "100%" }} />
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          <Lottie animationData={animationDataLogo} loop autoplay style={{ width: resolvedLogoSize, height: resolvedLogoSize }} />
        </div>
      </div>
    </div>
  );
}


