export interface TimeEntry {
  id: string;
  dev_name: string;
  client_name: string;
  project_name: string;
  hours: number;
  date: string;
  description: string;
  invoiced: boolean;
  dev_rate: number;
  client_rate: number;
  created_at: string;
}

export interface TimeEntryInsert {
  dev_name: string;
  client_name: string;
  project_name: string;
  hours: number;
  date: string;
  description: string;
}

export interface DashboardMetrics {
  totalHours: number;
  internalCost: number;
  clientBillable: number;
  invoicedAmount: number;
  uninvoicedAmount: number;
  margin: number;
}

export interface Filters {
  clientName: string;
  devName: string;
  invoicedStatus: "all" | "invoiced" | "uninvoiced";
  month: string; // "YYYY-MM" format
}
