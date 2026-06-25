export const siteConfig = {
  name: "PokerProbe",
  domain: "www.pokerprobe.com",
  url: "https://www.pokerprobe.com",
  tagline: "24/7 Dedicated Servers for Poker Simulations",
  description:
    "Dedicated Windows servers sized for Flopzilla, ICMIZER, HRC, PioSolver, and GTO+ — from overnight postflop solves to 512 GB preflop farms.",
  supportEmail: "support@pokerprobe.com",
  provisioningNote:
    "Servers are set up manually by our team within 24 hours of subscription.",
  provisioningHours: "24 hours",
};

export const navLinks = [
  { href: "/#features", label: "Features" },
  { href: "/#platforms", label: "Platforms" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/#faq", label: "FAQ" },
];

export const partners = [
  {
    name: "Holdem Resources Calculator",
    url: "https://www.holdemresources.net/",
    logo: "/partners/hrc.png",
    width: 180,
    height: 48,
  },
  {
    name: "Flopzilla",
    url: "https://www.flopzilla.com/",
    logo: "/partners/flopzilla.png",
    width: 200,
    height: 48,
  },
  {
    name: "ICMIZER",
    url: "https://www.icmizer.com/",
    logo: "/partners/icmizer.png",
    width: 180,
    height: 48,
  },
  {
    name: "PioSolver",
    url: "https://piosolver.com/",
    logo: "/partners/piosolver.png",
    width: 160,
    height: 48,
  },
  {
    name: "GTO+",
    url: "https://gtoplus.com/",
    logo: "/partners/gtoplus.png",
    width: 180,
    height: 48,
  },
];

export const pricingPlans = [
  {
    id: "starter",
    name: "Study",
    price: 329,
    description: "Flopzilla, ICMIZER & light review — always-on equity work",
    idealFor: "Flopzilla · ICMIZER · hand review",
    features: [
      "8 dedicated vCPUs / 32 GB RAM",
      "1 concurrent solver job",
      "Windows Server 2022 + RDP",
      "240 GB NVMe storage",
      "Ideal for Flopzilla & ICMIZER (minimal local RAM)",
      "Queue small GTO+ / HRC view-only sessions",
      "Basic monitoring & email support",
    ],
    stripePriceEnv: "STRIPE_PRICE_STARTER",
    highlighted: false,
  },
  {
    id: "pro",
    name: "Solver",
    price: 549,
    description: "PioSolver & GTO+ postflop — the sweet spot for most regs",
    idealFor: "PioSolver · GTO+ · HRC overnight",
    features: [
      "16 dedicated vCPUs / 64 GB RAM",
      "2 concurrent solver jobs",
      "Windows Server 2022 + RDP",
      "360 GB NVMe storage",
      "Comfortable PioSolver / GTO+ postflop trees",
      "Overnight HRC MTT & SNG trees (medium complexity)",
      "Auto-restart, file sync & priority support",
    ],
    stripePriceEnv: "STRIPE_PRICE_PRO",
    highlighted: true,
  },
  {
    id: "elite",
    name: "Farm",
    price: 999,
    description: "Preflop solves & large HRC trees for stables and coaches",
    idealFor: "HRC Pro · PioSolver preflop · multi-job",
    features: [
      "32 dedicated vCPUs / 128 GB RAM",
      "4 concurrent solver jobs",
      "Windows Server 2022 + RDP",
      "600 GB NVMe storage",
      "PioSolver preflop (64 GB+ trees per vendor guidance)",
      "Large HRC Pro abstractions & deep postflop spots",
      "Dedicated IP option & 24/7 priority support",
    ],
    stripePriceEnv: "STRIPE_PRICE_ELITE",
    highlighted: false,
  },
];

export function getPlanById(planId: string) {
  return pricingPlans.find((plan) => plan.id === planId) ?? null;
}

export const planComparisonRows = [
  {
    label: "Monthly price",
    starter: "$329",
    pro: "$549",
    elite: "$999",
    enterprise: "From $1,249",
  },
  {
    label: "Dedicated vCPU / RAM",
    starter: "8 vCPU / 32 GB",
    pro: "16 vCPU / 64 GB",
    elite: "32 vCPU / 128 GB",
    enterprise: "Up to 44 cores / 512 GB",
  },
  {
    label: "Best for",
    starter: "Flopzilla, ICMIZER",
    pro: "PioSolver & GTO+ postflop",
    elite: "HRC Pro, PioSolver preflop",
    enterprise: "Solver farms & max tree builds",
  },
  {
    label: "Concurrent solver jobs",
    starter: "1",
    pro: "2",
    elite: "4",
    enterprise: "Full machine",
  },
  {
    label: "NVMe storage",
    starter: "240 GB",
    pro: "360 GB",
    elite: "600 GB",
    enterprise: "2 TB+",
  },
  {
    label: "PioSolver postflop (8–16 GB trees)",
    starter: false,
    pro: true,
    elite: true,
    enterprise: true,
  },
  {
    label: "PioSolver preflop (64 GB+ RAM)",
    starter: false,
    pro: false,
    elite: true,
    enterprise: true,
  },
  {
    label: "HRC large MTT / deep postflop trees",
    starter: "View & small",
    pro: "Medium overnight",
    elite: "Large / Pro tier",
    enterprise: "Maximum (512 GB class)",
  },
  {
    label: "Operating system",
    starter: "Windows Server 2022",
    pro: "Windows Server 2022",
    elite: "Windows Server 2022",
    enterprise: "Windows Server 2022",
  },
  { label: "RDP access", starter: true, pro: true, elite: true, enterprise: true },
  {
    label: "Remote monitoring",
    starter: "Basic",
    pro: "Advanced",
    elite: "Advanced",
    enterprise: "Enterprise",
  },
  { label: "File sync", starter: false, pro: true, elite: true, enterprise: true },
  {
    label: "Auto-restart on failure",
    starter: false,
    pro: true,
    elite: true,
    enterprise: true,
  },
  {
    label: "Support",
    starter: "Email",
    pro: "Priority email",
    elite: "24/7 priority",
    enterprise: "Dedicated account manager",
  },
  {
    label: "Setup time",
    starter: "24 hours",
    pro: "24 hours",
    elite: "24 hours",
    enterprise: "White-glove onboarding",
  },
];

export const enterprisePlan = {
  id: "enterprise",
  name: "Enterprise",
  subtitle: "Custom builds",
  referenceSpec: "44 cores / 512 GB RAM",
  startingPrice: 1249,
  contactEmail: "support@pokerprobe.com",
  contactSubject: "Enterprise plan inquiry (512GB+)",
};

export const footerLinks = {
  product: [
    { href: "/#features", label: "Features" },
    { href: "/#pricing", label: "Pricing" },
    { href: "/dashboard", label: "Dashboard" },
  ],
  legal: [
    { href: "/terms", label: "Terms of Service" },
    { href: "/privacy", label: "Privacy Policy" },
    { href: "/acceptable-use", label: "Acceptable Use" },
    { href: "/sla", label: "Service Level Agreement" },
    { href: "/refund", label: "Refund Policy" },
  ],
  company: [
    { href: "mailto:support@pokerprobe.com", label: "Contact" },
    { href: "/#faq", label: "FAQ" },
  ],
};
