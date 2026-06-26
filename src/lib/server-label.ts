export const SERVER_LABEL_MAX_LENGTH = 48;

export function normalizeServerLabel(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

export function validateServerLabel(raw: string): string | null {
  const label = normalizeServerLabel(raw);
  if (!label) {
    return "Name cannot be empty.";
  }
  if (label.length > SERVER_LABEL_MAX_LENGTH) {
    return `Name must be ${SERVER_LABEL_MAX_LENGTH} characters or fewer.`;
  }
  return null;
}
