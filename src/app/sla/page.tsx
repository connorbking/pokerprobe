import type { Metadata } from "next";
import { LegalLayout } from "@/components/LegalLayout";

export const metadata: Metadata = {
  title: "Service Level Agreement",
};

export default function SLAPage() {
  return (
    <LegalLayout title="Service Level Agreement" updated="June 25, 2025">
      <section>
        <h2>Uptime Commitment</h2>
        <p>
          PokerProbe guarantees 99.9% monthly uptime for dedicated server
          infrastructure, excluding scheduled maintenance (announced 48 hours
          in advance).
        </p>
      </section>
      <section>
        <h2>Scheduled Maintenance</h2>
        <p>
          Maintenance windows occur during low-traffic hours (UTC 06:00–08:00
          Sundays). Emergency patches may occur with shorter notice for
          security-critical updates.
        </p>
      </section>
      <section>
        <h2>Service Credits</h2>
        <p>
          If monthly uptime falls below 99.9%, eligible Pro and Elite
          subscribers may request a service credit equal to 10% of their
          monthly fee per 0.1% below the SLA threshold, up to 100% of one
          month&apos;s fee.
        </p>
      </section>
      <section>
        <h2>Exclusions</h2>
        <p>
          SLA credits do not apply to outages caused by customer actions,
          third-party software crashes, force majeure, or issues with your
          internet connection to the server.
        </p>
      </section>
      <section>
        <h2>Support Response Times</h2>
        <ul>
          <li>Starter: Email support, 24-hour response</li>
          <li>Pro: Priority email, 8-hour response</li>
          <li>Elite: 24/7 priority support, 2-hour response</li>
        </ul>
      </section>
    </LegalLayout>
  );
}
