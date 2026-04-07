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

export type MasterItemType = "worker" | "lease" | "disposal" | "transport";

export type MasterItem = BaseRow & {
  name: string;
  group_label?: string | null;
  sort_order: number;
  is_active: boolean;
};

export type DailyReport = BaseRow & {
  site_id: Id;
  report_date: string;
  worker_count: number;
  work_shift: "day" | "night";
  contract_type: "contract" | "regular";
  miscellaneous_costs: string | null;
  other_vehicle_entries: OtherVehicleEntry[];
  other_workers_note: string | null;
  remarks: string | null;
  progress_status: "continuing" | "completed";
  created_by: Id;
};

export type ReportLeaseEntry = {
  id?: Id;
  lease_item_id: Id;
  count: number;
  item?: MasterItem | null;
};

export type ReportDisposalEntry = {
  id?: Id;
  disposal_item_id: Id;
  ton_count: number;
  truck_count: number;
  item?: MasterItem | null;
};

export type ReportTransportEntry = {
  id?: Id;
  transport_item_id: Id;
  count: number;
  item?: MasterItem | null;
};

export type OtherVehicleEntry = {
  label: string;
  count: number;
};

export type AppUser = {
  user_id: Id;
  display_name: string | null;
  is_master: boolean;
  created_at: string;
};

export type ReportPhoto = {
  id: Id;
  report_id: Id;
  image_path: string;
  caption: string | null;
  created_at: string;
};

export type ReportEditLog = {
  id: Id;
  report_id: Id;
  edited_by: Id;
  edited_at: string;
  editor_display_name?: string | null;
};

export type DailyReportDetail = DailyReport & {
  site: Site | null;
  creator_display_name?: string | null;
  workers: MasterItem[];
  lease_entries: ReportLeaseEntry[];
  disposal_entries: ReportDisposalEntry[];
  transport_entries: ReportTransportEntry[];
  photos: ReportPhoto[];
  edit_logs: ReportEditLog[];
};

export type ReportFormValues = {
  report_date: string;
  site_id: string;
  worker_count: number;
  worker_ids: string[];
  work_shift: "day" | "night";
  contract_type: "contract" | "regular";
  miscellaneous_costs: string;
  lease_entries: ReportLeaseEntry[];
  disposal_entries: ReportDisposalEntry[];
  transport_entries: ReportTransportEntry[];
  other_vehicle_entries: OtherVehicleEntry[];
  other_workers_note: string;
  remarks: string;
  progress_status: "continuing" | "completed";
};

export type ReportListFilters = {
  from?: string;
  to?: string;
  siteId?: string;
  createdBy?: string;
};
