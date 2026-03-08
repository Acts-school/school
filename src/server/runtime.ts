export function isDesktopRuntime(): boolean {
  return process.env.EACTS_RUNTIME === "desktop";
}
