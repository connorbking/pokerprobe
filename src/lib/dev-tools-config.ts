/** Dev tools master switch — set false when removing admin dev UI from production */
export const DEV_TOOLS_ENABLED = true;

export type DevToolToggleId =
  | "allowManageBeforeOnline"
  | "mockServerOnline"
  | "showServerDebugInfo"
  | "verboseClientLogging";

export interface DevToolToggleDefinition {
  id: DevToolToggleId;
  label: string;
  description: string;
  defaultValue: boolean;
}

export const DEV_TOOL_TOGGLES: DevToolToggleDefinition[] = [
  {
    id: "allowManageBeforeOnline",
    label: "Allow manage before Online",
    description:
      "Enable the Manage server button and page while status is pending or provisioning.",
    defaultValue: true,
  },
  {
    id: "mockServerOnline",
    label: "Mock server Online",
    description:
      "Treat non-active servers as Online for manage access and workspace UI previews.",
    defaultValue: false,
  },
  {
    id: "showServerDebugInfo",
    label: "Show server debug info",
    description: "Display internal server IDs and provisioning tags on the dashboard tile.",
    defaultValue: false,
  },
  {
    id: "verboseClientLogging",
    label: "Verbose client logging",
    description: "Log dev-tool and server API activity to the browser console.",
    defaultValue: false,
  },
];

export type DevToolToggleState = Record<DevToolToggleId, boolean>;

export const DEV_TOOLS_STORAGE_KEY = "pokerprobe-dev-tools-v1";

export function defaultDevToolToggleState(): DevToolToggleState {
  return DEV_TOOL_TOGGLES.reduce((acc, toggle) => {
    acc[toggle.id] = toggle.defaultValue;
    return acc;
  }, {} as DevToolToggleState);
}

export function parseDevToolToggleState(raw: string | null): DevToolToggleState {
  const defaults = defaultDevToolToggleState();
  if (!raw) return defaults;

  try {
    const parsed = JSON.parse(raw) as Partial<DevToolToggleState>;
    return { ...defaults, ...parsed };
  } catch {
    return defaults;
  }
}
