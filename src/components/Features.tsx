const features = [
  {
    icon: "🖥️",
    title: "Dedicated Hardware",
    description:
      "No noisy neighbors. Your vCPUs and RAM are reserved exclusively for your solver workloads — not shared VPS oversubscription.",
  },
  {
    icon: "⚡",
    title: "Solver-Optimized",
    description:
      "Pre-configured Windows Server images with RDP, .NET runtimes, and common poker tool dependencies already installed.",
  },
  {
    icon: "📊",
    title: "Remote Monitoring",
    description:
      "Track solver progress, CPU usage, and queue status from any device. Get notified when long-running sims complete.",
  },
  {
    icon: "🔄",
    title: "Auto-Restart & Recovery",
    description:
      "Unexpected reboot? Our watchdog restarts your solver sessions automatically so you don't lose hours of compute.",
  },
  {
    icon: "🔒",
    title: "Isolated & Secure",
    description:
      "Each server runs in an isolated environment. Solver cache lives on local SSD; long-term data stays in your encrypted cloud vault.",
  },
  {
    icon: "📁",
    title: "Dual-Zone Storage",
    description:
      "Fast local NVMe on each dedicated server for active solver work, plus a separate permanent cloud vault for archives. Upgrade vault capacity without changing compute tier.",
  },
];

export function Features() {
  return (
    <section id="features" className="py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold text-white sm:text-4xl">
            Built for Solver Workloads
          </h2>
          <p className="mt-4 text-gray-400">
            Generic cloud VMs weren&apos;t designed for multi-hour HRC tree
            builds or Flopzilla batch runs. We were.
          </p>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="card-glow group rounded-xl border border-white/5 bg-felt-800/40 p-6 transition hover:border-gold-400/20 hover:bg-felt-800/60"
            >
              <div className="text-2xl">{feature.icon}</div>
              <h3 className="mt-4 text-lg font-semibold text-white">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-400">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
