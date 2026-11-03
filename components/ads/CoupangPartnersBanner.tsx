"use client";

import { useEffect, useRef, useState } from "react";
import {
  COUPANG_PARTNERS_DISCLAIMER,
  getCoupangPartnersBannerConfig,
  type CoupangPartnersPlacement,
} from "@/lib/coupangPartners";

function FitAspectIframe({
  src,
  width,
  height,
  title,
}: {
  src: string;
  width: number;
  height: number;
  title: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = () => {
      const available = el.clientWidth;
      if (available <= 0 || width <= 0) {
        setScale(1);
        return;
      }
      setScale(available / width);
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [width]);

  return (
    <div
      ref={containerRef}
      className="w-full overflow-hidden"
      style={{ height: Math.max(1, height * scale) }}
    >
      <div
        style={{
          width,
          height,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        <iframe
          src={src}
          width={width}
          height={height}
          title={title}
          loading="lazy"
          referrerPolicy="unsafe-url"
          scrolling="no"
          className="block border-0"
        />
      </div>
    </div>
  );
}

export default function CoupangPartnersBanner({
  placement,
  className = "",
}: {
  placement: CoupangPartnersPlacement;
  className?: string;
}) {
  const config = getCoupangPartnersBannerConfig(placement);
  if (!config) return null;

  const isMissionBottom = placement === "mission_bottom";

  return (
    <aside
      className={
        isMissionBottom
          ? `overflow-hidden rounded-2xl border border-gray-100 bg-white ${className}`
          : `overflow-hidden rounded-2xl border border-gray-100 bg-white px-2.5 py-3 ${className}`
      }
      aria-label="쿠팡파트너스 광고"
    >
      <div className={isMissionBottom ? "px-0 pt-0" : ""}>
        <FitAspectIframe
          src={config.src}
          width={config.width}
          height={config.height}
          title={
            isMissionBottom
              ? "쿠팡파트너스 미션 하단 광고"
              : "쿠팡파트너스 보상 팝업 광고"
          }
        />
      </div>
      <p
        className={`text-center text-[11px] leading-relaxed text-gray-400 ${
          isMissionBottom ? "px-3 py-2" : "mt-2"
        }`}
      >
        {COUPANG_PARTNERS_DISCLAIMER}
      </p>
    </aside>
  );
}
