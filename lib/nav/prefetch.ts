export function nextTabToPrefetch(pathname: string): string {
  if (pathname === "/") return "/ideas";
  if (pathname.startsWith("/ideas")) return "/plans";
  if (pathname.startsWith("/plans")) return "/memories";
  return "/";
}
