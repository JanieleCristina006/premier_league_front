import React from 'react';
import Banner from "../assets/banner.jpg";

export default function HeroBannerCanal() {
  return (
    <section className="sticky top-0 z-50 w-full bg-black">
      <img
        src={Banner}
        alt="Banner do canal"
        className="w-full max-h-[220px] sm:max-h-[280px] md:max-h-[360px] object-contain mx-auto"
      />
    </section>
  );
}
