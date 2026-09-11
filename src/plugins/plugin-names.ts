/**
 * External plugin packages are named `surge-<name>` and are installed into a
 * directory named after the repository they were cloned from.
 */
export const PLUGIN_NAME_PREFIXES = ["surge-"] as const;

/** True for a name that belongs to a Surge plugin package. */
export function isPluginPackageName(name: string): boolean {
  return PLUGIN_NAME_PREFIXES.some((prefix) => name.startsWith(prefix));
}

/**
 * The directory names a plugin could be installed under, the given name first.
 * Kept as a list so callers can keep probing candidates if a second prefix is
 * ever introduced again.
 */
export function pluginDirectoryNames(name: string): string[] {
  return [name];
}
