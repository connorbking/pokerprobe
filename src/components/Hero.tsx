"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

const suits = ["♠", "♥", "♦", "♣"];

export function Hero() {
  const { user } = useAuth();
  return (
    <section className="relative overflow-hidden felt-texture suit-pattern">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-felt-950/50 to-felt-950" />

      <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28 lg:py-32">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-gold-400/20 bg-gold-400/5 px-4 py-1.5 text-sm text-gold-400">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
            </span>
            99.9% uptime &mdash; servers never sleep
          </div>

          <h1 className="font-display text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
            Run Your Solvers{" "}
            <span className="gold-gradient-text">24/7</span>
            <br />
            While You Grind Live
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-gray-300">
            Shared & dedicated servers with a sleek web interface optimized for HRC, Flopzilla, ICMIZER,
            Power Equilab, and other poker simulation tools. Queue overnight
            solves, monitor progress remotely, and never waste study time
            waiting on your laptop.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/#pricing"
              className="w-full rounded-xl bg-gold-500 px-8 py-3.5 text-center text-sm font-semibold text-felt-950 transition hover:bg-gold-400 sm:w-auto"
            >
              View Plans &amp; Pricing
            </Link>
            <Link
              href={user ? "/dashboard" : "/signin"}
              className="w-full rounded-xl border border-white/15 px-8 py-3.5 text-center text-sm font-medium text-white transition hover:border-white/30 hover:bg-white/5 sm:w-auto"
            >
              {user ? "View Dashboard" : "Sign in to Dashboard"}
            </Link>
          </div>

          <div className="mt-14 flex items-center justify-center gap-6 text-2xl opacity-20">
            {suits.map((suit) => (
              <span
                key={suit}
                className={
                  suit === "♥" || suit === "♦" ? "text-red-400" : "text-white"
                }
              >
                {suit}
              </span>
            ))}
          </div>
        </div>

        <div className="mx-auto mt-16 grid max-w-4xl grid-cols-3 gap-4 sm:gap-6">
          {[
            { value: "24/7", label: "Always-on dedicated hardware" },
            { value: "24 hrs", label: "Manual setup after subscribe" },
            { value: "100%", label: "Windows-native solver support" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="card-glow rounded-xl bg-felt-800/60 p-4 text-center sm:p-6"
            >
              <div className="text-xl font-bold text-gold-400 sm:text-2xl">
                {stat.value}
              </div>
              <div className="mt-1 text-xs text-gray-400 sm:text-sm">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
