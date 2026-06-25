"use client";

import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { siteConfig, navLinks } from "@/lib/config";

export function Header() {
  const { user, loading, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-felt-800/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="group flex items-center gap-2.5">
          <Image
            src="/logo.png"
            alt={siteConfig.name}
            width={36}
            height={36}
            className="rounded-full transition group-hover:brightness-110"
            priority
          />
          <div>
            <span className="font-display text-lg font-bold tracking-tight text-white">
              {siteConfig.name}
            </span>
            <span className="hidden text-xs text-felt-400 sm:block">
              Dedicated Solver Infrastructure
            </span>
          </div>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-gray-300 transition hover:text-gold-400"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {!loading && user ? (
            <>
              <Link
                href="/dashboard"
                className="hidden text-sm text-gray-300 transition hover:text-white sm:block"
              >
                Dashboard
              </Link>
              <button
                onClick={() => signOut()}
                className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-gray-300 transition hover:border-white/20 hover:text-white"
              >
                Sign out
              </button>
            </>
          ) : (
            <Link
              href="/signin"
              className="rounded-lg border border-gold-400/40 bg-gold-400/10 px-4 py-2 text-sm font-medium text-gold-400 transition hover:bg-gold-400/20"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
