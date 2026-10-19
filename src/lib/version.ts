/**
 * The running version, from the image's build args: "v1.2.0" for a release,
 * "main (abc1234)" for a branch build, "dev" when run from source.
 */
export function appVersion(env: Record<string, string | undefined> = process.env) {
  const version = env.APP_VERSION || "dev";
  const commit = env.APP_COMMIT?.slice(0, 7);
  if (/^\d+\.\d+\.\d+/.test(version)) return `v${version}`;
  return commit ? `${version} (${commit})` : version;
}
