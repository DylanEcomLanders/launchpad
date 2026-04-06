export interface PortfolioSlice {
  url: string;          // Public Supabase storage URL (AVIF)
  width: number;
  height: number;
  blur?: string;        // Tiny base64 placeholder
}

export interface PortfolioProject {
  id: string;
  slug: string;
  name: string;
  client?: string;
  tags: string[];
  figma_file_key: string;
  figma_desktop_node_id?: string;
  figma_mobile_node_id?: string;
  desktop_slices: PortfolioSlice[];
  mobile_slices: PortfolioSlice[];
  notes?: string;
  results?: string;
  created_at: string;
  updated_at: string;
}
