export interface PortfolioPage {
  id: string;
  label: string;
  figma_embed_url: string;
  order: number;
}

export interface PortfolioClient {
  id: string;
  slug: string;
  client_name: string;
  project_type: string;
  description: string;
  live_url: string;
  pages: PortfolioPage[];
  created_at: string;
  updated_at: string;
}

export type PortfolioClientInsert = Omit<PortfolioClient, "id" | "created_at" | "updated_at">;
