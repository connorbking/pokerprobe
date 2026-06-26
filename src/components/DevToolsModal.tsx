"use client";

import { DEV_TOOL_TOGGLES } from "@/lib/dev-tools-config";
import { useDevTools } from "@/context/DevToolsContext";

function ToggleSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition ${
        checked ? "bg-gold-500" : "bg-white/15"
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

export function DevToolsModal() {
  const {
    modalOpen,
    closeModal,
    toggles,
    setToggle,
    resetToggles,
    isAdmin,
    devToolsActive,
  } = useDevTools();

  if (!devToolsActive || !isAdmin || !modalOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dev-tools-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        aria-label="Close dev tools"
        onClick={closeModal}
      />

      <div className="relative z-10 max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl border border-white/10 bg-felt-900 shadow-2xl">
        <div className="sticky top-0 border-b border-white/10 bg-felt-900/95 px-5 py-4 backdrop-blur">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id="dev-tools-title" className="text-lg font-semibold text-white">
                Dev Tools
              </h2>
              <p className="mt-1 text-sm text-gray-400">
                Admin-only toggles for local development and staging previews.
              </p>
            </div>
            <button
              type="button"
              onClick={closeModal}
              className="rounded-lg border border-white/10 px-2 py-1 text-sm text-gray-400 hover:text-white"
            >
              Close
            </button>
          </div>
        </div>

        <ul className="divide-y divide-white/5 px-5">
          {DEV_TOOL_TOGGLES.map((toggle) => (
            <li key={toggle.id} className="flex items-start gap-4 py-4">
              <ToggleSwitch
                checked={toggles[toggle.id]}
                onChange={(value) => setToggle(toggle.id, value)}
                label={toggle.label}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white">{toggle.label}</p>
                <p className="mt-1 text-xs text-gray-400">{toggle.description}</p>
              </div>
            </li>
          ))}
        </ul>

        <div className="flex items-center justify-between gap-3 border-t border-white/10 px-5 py-4">
          <button
            type="button"
            onClick={resetToggles}
            className="text-sm text-gray-400 hover:text-white"
          >
            Reset to defaults
          </button>
          <button
            type="button"
            onClick={closeModal}
            className="rounded-lg bg-gold-500 px-4 py-2 text-sm font-semibold text-felt-950 hover:bg-gold-400"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
