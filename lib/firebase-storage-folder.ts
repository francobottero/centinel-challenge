export function buildFirebaseStorageFolder(
  userEmail: string | null | undefined,
  fallbackUserId: string,
) {
  const normalizedEmail = normalizeFirebaseStorageFolderEmail(userEmail);

  if (normalizedEmail) {
    return normalizedEmail;
  }

  return `user-${fallbackUserId}`;
}

export function normalizeFirebaseStorageFolderEmail(
  userEmail: string | null | undefined,
) {
  const normalized = (userEmail ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9@._-]/g, "-");

  return normalized.length > 0 ? normalized : null;
}
