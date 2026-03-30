export type Id = string;

export type BaseRow = {
  id: Id;
  created_at?: string;
  updated_at?: string;
};

export type Site = BaseRow & {
  name: string;
  address: string | null;
  is_active: boolean;
};

export type MasterItemType = "work" | "waste" | "safety" | "worker" | "machine" | "vehicle" | "partner";

export type MasterItem = BaseRow & {
  name: string;
  sort_order: number;
  is_active: boolean;
};

export type DailyReport = BaseRow & {
  site_id: Id;
  report_date: string;
  worker_count: number;
  tomorrow_plan: string | null;
  note: string | null;
  created_by: Id;
};

export type ReportPhoto = {
  id: Id;
  report_id: Id;
  image_path: string;
  caption: string | null;
  created_at: string;
};

export type DailyReportDetail = DailyReport & {
  site: Site | null;
  work_items: MasterItem[];
  waste_items: MasterItem[];
  safety_items: MasterItem[];
  workers: MasterItem[];
  machines: MasterItem[];
  vehicles: MasterItem[];
  partner_companies: MasterItem[];
  photos: ReportPhoto[];
};

export type ReportFormValues = {
  report_date: string;
  site_id: string;
  worker_count: number;
  work_item_ids: string[];
  waste_item_ids: string[];
  safety_item_ids: string[];
  worker_ids: string[];
  machine_ids: string[];
  vehicle_ids: string[];
  partner_company_ids: string[];
  tomorrow_plan: string;
  note: string;
};

export type ReportListFilters = {
  from?: string;
  to?: string;
  siteId?: string;
};
