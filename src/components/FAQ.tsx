const faqs = [
  {
    q: "What poker software can I run?",
    a: "Any Windows-native study tool you license yourself — Flopzilla, ICMIZER, HRC, PioSolver, GTO+, and more. Plans are sized to match each tool's real RAM and CPU needs (ICMIZER and Flopzilla are light; PioSolver preflop and large HRC trees need 64 GB–512 GB).",
  },
  {
    q: "Which plan do I need for PioSolver?",
    a: "Postflop solves (8–16 GB trees) fit Deep Stack (b3-64, 64 GB RAM). Preflop trees need at least 64 GB RAM per PioSolver's guidance — use Omega with a custom build for the largest farms.",
  },
  {
    q: "How fast is server provisioning?",
    a: "After you subscribe, a server appears in your dashboard right away. Our team completes setup within 24 hours — you'll get a green Online status and a Connect button for browser access. No redeploy or manual JSON required.",
  },
  {
    q: "Can I upgrade or downgrade my plan?",
    a: "Yes. Changes take effect at the start of your next billing cycle. Contact support for mid-cycle upgrades if you need more RAM or cores immediately.",
  },
  {
    q: "What does Omega pricing look like?",
    a: "Omega is a custom OVH Public Cloud build — pick vCPU, RAM, and NVMe starting from $899/mo. Need something off-catalog? Contact us for a dedicated quote.",
  },
  {
    q: "Do you offer refunds?",
    a: "We offer a 7-day money-back guarantee on first-time subscriptions. See our Refund Policy for details.",
  },
];

export function FAQ() {
  return (
    <section id="faq" className="border-t border-white/5 bg-felt-900/30 py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="text-center">
          <h2 className="font-display text-3xl font-bold text-white sm:text-4xl">
            Frequently Asked Questions
          </h2>
        </div>

        <dl className="mt-12 space-y-6">
          {faqs.map((faq) => (
            <div
              key={faq.q}
              className="card-glow rounded-xl border border-white/5 bg-felt-800/30 p-6"
            >
              <dt className="font-semibold text-white">{faq.q}</dt>
              <dd className="mt-2 text-sm leading-relaxed text-gray-400">
                {faq.a}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
