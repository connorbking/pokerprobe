import type { Metadata } from "next";
import { LegalLayout } from "@/components/LegalLayout";

export const metadata: Metadata = {
  title: "Privacy Policy",
};

export default function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy" updated="June 25, 2025">
      <section>
        <h2>1. Information We Collect</h2>
        <p>
          We collect account information (name, email), billing data processed
          by Stripe, server usage metrics, and support communications.
        </p>
      </section>
      <section>
        <h2>2. How We Use Information</h2>
        <p>
          We use your information to provide and maintain the Service, process
          payments, send transactional emails, and improve our infrastructure.
        </p>
      </section>
      <section>
        <h2>3. Data on Your Server</h2>
        <p>
          Files and data stored on your dedicated server are yours. We do not
          access server contents except when required for support (with your
          permission) or legal compliance.
        </p>
      </section>
      <section>
        <h2>4. Third Parties</h2>
        <p>
          We use Stripe for payment processing. Stripe&apos;s privacy policy
          governs payment data they collect. We do not sell your personal
          information.
        </p>
      </section>
      <section>
        <h2>5. Security</h2>
        <p>
          We implement industry-standard security measures including encryption
          in transit, access controls, and isolated server environments.
        </p>
      </section>
      <section>
        <h2>6. Your Rights</h2>
        <p>
          You may request access, correction, or deletion of your personal data
          by contacting{" "}
          <a href="mailto:privacy@pokerprobe.com">privacy@pokerprobe.com</a>.
        </p>
      </section>
    </LegalLayout>
  );
}
