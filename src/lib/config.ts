/**
 * Site marketing config — plan catalog re-exported from `@/lib/plans`.
 */
export {
  pricingPlans,
  planComparisonRows,
  enterprisePlan,
  getPlanById,
} from "@/lib/plans";

export const siteConfig = {
  name: "PokerProbe",
  domain: "www.pokerprobe.com",
  /** Base domain for per-server subdomains shown in the dashboard */
  serverDomain: "pokerprobe.com",
  url: "https://www.pokerprobe.com",
  tagline: "24/7 Dedicated Servers for Poker Simulations",
  description:
    "Dedicated Windows servers sized for Flopzilla, ICMIZER, HRC, PioSolver, and GTO+ — from overnight postflop solves to 512 GB preflop farms.",
  supportEmail: "support@pokerprobe.com",
  provisioningNote:
    "Servers are activated in Firestore within 24 hours of subscription.",
  provisioningHours: "24 hours",
  /** Shown on pricing — local SSD cache vs permanent vault add-ons */
  dualZoneStorageNote:
    "Every plan includes fast local NVMe for active solves plus a permanent cloud vault (250 GB–1 TB depending on tier). Vault capacity is upgradeable beyond your included allowance.",
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
