import { Hero } from "@/components/Hero";
import { Features } from "@/components/Features";
import { Partners } from "@/components/Partners";
import { Pricing } from "@/components/Pricing";
import { FAQ } from "@/components/FAQ";

export default function HomePage() {
  return (
    <>
      <Hero />
      <Features />
      <Partners />
      <Pricing />
      <FAQ />
    </>
  );
}
