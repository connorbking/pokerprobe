import type { Metadata } from "next";
import { LegalLayout } from "@/components/LegalLayout";

export const metadata: Metadata = {
  title: "Acceptable Use Policy",
};

export default function AcceptableUsePage() {
  return (
    <LegalLayout title="Acceptable Use Policy" updated="June 25, 2025">
      <section>
        <h2>Permitted Use</h2>
        <p>
          PokerProbe servers are intended exclusively for poker simulation,
          study, and analysis using licensed software you own. Examples include
          running solvers, building decision trees, and equity calculations.
        </p>
      </section>
      <section>
        <h2>Prohibited Use</h2>
        <ul>
          <li>Real-money online poker or gambling operations</li>
          <li>Botting, collusion tools, or cheating software for live play</li>
          <li>Cryptocurrency mining or unrelated compute workloads</li>
          <li>Hosting malware, spam, or illegal content</li>
          <li>Attempting to breach other customers&apos; servers or our network</li>
          <li>Reselling server access without written authorization</li>
        </ul>
      </section>
      <section>
        <h2>Software Licensing</h2>
        <p>
          You are responsible for ensuring you have valid licenses for all poker
          software installed on your server. PokerProbe does not provide or
          distribute third-party software.
        </p>
      </section>
      <section>
        <h2>Enforcement</h2>
        <p>
          Violations may result in immediate suspension. Repeated or severe
          violations result in permanent termination without refund.
        </p>
      </section>
    </LegalLayout>
  );
}
