import Link from "next/link";

export function LegalLayout({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <Link
        href="/"
        className="text-sm text-gold-400 transition hover:underline"
      >
        &larr; Back to home
      </Link>
      <h1 className="mt-6 font-display text-3xl font-bold text-white">
        {title}
      </h1>
      <p className="mt-2 text-sm text-gray-500">Last updated: {updated}</p>
      <div className="legal-content mt-10 space-y-8 text-gray-300 [&_a]:text-gold-400 [&_a]:hover:underline [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-white [&_li]:ml-5 [&_li]:list-disc [&_p]:leading-relaxed [&_ul]:mt-2 [&_ul]:space-y-1">
        {children}
      </div>
    </div>
  );
}
