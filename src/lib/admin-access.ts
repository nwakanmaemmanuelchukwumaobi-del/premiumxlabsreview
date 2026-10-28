export function requireOwnerAccess(isOwner: boolean | null, failed = false) {
  if (failed || isOwner !== true) throw new Error("This page is only available to the owner.");
}