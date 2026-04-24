export interface SwipeEntry {
  id: string;
  url: string;
  title: string;
  tags: string[];
  notes: string;
  desktopUrl: string;
  mobileUrl: string;
  createdAt: string;
  updatedAt: string;
}

// DB row shape (snake_case) → app shape (camelCase)
export interface SwipeRow {
  id: string;
  url: string;
  title: string;
  tags: string[];
  notes: string;
  desktop_url: string;
  mobile_url: string;
  created_at: string;
  updated_at: string;
}

export function fromRow(row: SwipeRow): SwipeEntry {
  return {
    id: row.id,
    url: row.url,
    title: row.title,
    tags: row.tags || [],
    notes: row.notes || "",
    desktopUrl: row.desktop_url,
    mobileUrl: row.mobile_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Pretty-print a hostname from a URL for fallback titles
export function hostnameFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
