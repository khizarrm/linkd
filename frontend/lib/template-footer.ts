export interface FooterLink {
  label: string;
  url: string;
}

export interface FooterData {
  text: string;
  links: FooterLink[];
}

export function parseFooter(raw: string | null | undefined): FooterData {
  if (!raw) return { text: "", links: [] };
  try {
    const parsed = JSON.parse(raw);
    return {
      text: parsed.text ?? "",
      links: Array.isArray(parsed.links) ? parsed.links : [],
    };
  } catch {
    return { text: "", links: [] };
  }
}

export function serializeFooter(footer: FooterData): string | null {
  const hasContent =
    footer.text.trim() || footer.links.some((link) => link.label.trim() && link.url.trim());
  if (!hasContent) return null;
  return JSON.stringify({
    text: footer.text,
    links: footer.links.filter((link) => link.label.trim() && link.url.trim()),
  });
}
