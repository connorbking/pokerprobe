import type { Metadata } from "next";
import { LegalLayout } from "@/components/LegalLayout";

export const metadata: Metadata = {
  title: "Terms of Service",
};

export default function TermsPage() {
  return (
    <LegalLayout title="Terms of Service" updated="June 25, 2025">
      <section>
        <h2>1. Agreement</h2>
        <p>
          By accessing or using PokerProbe services at www.pokerprobe.com
          (&quot;Service&quot;), you agree to these Terms of Service. If you do
          not agree, do not use the Service.
        </p>
      </section>
      <section>
        <h2>2. Service Description</h2>
        <p>
          PokerProbe provides dedicated server infrastructure (&quot;IaaS&quot;)
          for hosting poker simulation and study software. We do not provide
          poker software licenses, real-money gaming, or gambling services.
        </p>
      </section>
      <section>
        <h2>3. Accounts</h2>
        <p>
          You are responsible for maintaining the confidentiality of your
          account credentials and for all activity under your account. You must
          provide accurate contact information.
        </p>
      </section>
      <section>
        <h2>4. Subscriptions & Billing</h2>
        <p>
          Subscriptions are billed monthly through Stripe. Fees are charged in
          advance. You authorize us to charge your payment method on a
          recurring basis until you cancel.
        </p>
      </section>
      <section>
        <h2>5. Acceptable Use</h2>
        <p>
          Use of the Service is subject to our Acceptable Use Policy. Violations
          may result in immediate suspension or termination without refund.
        </p>
      </section>
      <section>
        <h2>6. Limitation of Liability</h2>
        <p>
          To the maximum extent permitted by law, PokerProbe shall not be liable
          for indirect, incidental, or consequential damages arising from use of
          the Service.
        </p>
      </section>
      <section>
        <h2>7. Contact</h2>
        <p>
          Questions about these terms:{" "}
          <a href="mailto:legal@pokerprobe.com">legal@pokerprobe.com</a>
        </p>
      </section>
    </LegalLayout>
  );
}
