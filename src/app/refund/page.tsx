import type { Metadata } from "next";
import { LegalLayout } from "@/components/LegalLayout";

export const metadata: Metadata = {
  title: "Refund Policy",
};

export default function RefundPage() {
  return (
    <LegalLayout title="Refund Policy" updated="June 25, 2025">
      <section>
        <h2>7-Day Money-Back Guarantee</h2>
        <p>
          First-time subscribers may request a full refund within 7 days of
          their initial subscription payment if they are unsatisfied with the
          Service.
        </p>
      </section>
      <section>
        <h2>How to Request a Refund</h2>
        <p>
          Email{" "}
          <a href="mailto:support@pokerprobe.com">support@pokerprobe.com</a>{" "}
          with your account email and reason for the request. Refunds are
          processed within 5–10 business days to your original payment method.
        </p>
      </section>
      <section>
        <h2>Renewals & Mid-Cycle Cancellations</h2>
        <p>
          Subscription renewals are non-refundable. If you cancel mid-cycle, you
          retain access until the end of your current billing period. No partial
          refunds are issued for unused time on renewal charges.
        </p>
      </section>
      <section>
        <h2>Policy Violations</h2>
        <p>
          Accounts terminated for Acceptable Use Policy violations are not
          eligible for refunds.
        </p>
      </section>
    </LegalLayout>
  );
}
