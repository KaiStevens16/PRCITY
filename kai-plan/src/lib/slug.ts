export function exerciseSlug(name: string): string {
  return encodeURIComponent(name.trim());
}

export function exerciseFromSlug(slug: string): string {
  return decodeURIComponent(slug);
}
