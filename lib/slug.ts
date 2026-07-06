export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "") || "sound";
}

const CLEAN_SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const TIMESTAMP_PREFIX_RE = /^\d{10,}-/;

/** Derives a base slug from a scraped filename when it's already clean, else from the name. */
export function baseSlugFor(name: string, filename?: string): string {
  if (filename) {
    const stem = filename.replace(/\.[^.]+$/, "").toLowerCase();
    if (CLEAN_SLUG_RE.test(stem) && !TIMESTAMP_PREFIX_RE.test(stem)) {
      return stem;
    }
  }
  return slugify(name);
}

/** Appends -2, -3, ... until `taken` no longer has the candidate. Mutates `taken` with the result. */
export function uniqueSlug(base: string, taken: Set<string>): string {
  let candidate = base;
  let n = 2;
  while (taken.has(candidate)) {
    candidate = `${base}-${n++}`;
  }
  taken.add(candidate);
  return candidate;
}
