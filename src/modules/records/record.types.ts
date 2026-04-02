export const RECORD_TYPES = ["income", "expense"] as const;

export type RecordType = (typeof RECORD_TYPES)[number];

export const isRecordType = (value: string): value is RecordType => {
  return RECORD_TYPES.includes(value as RecordType);
};

export interface FinancialRecord {
  id: number;
  amount: number;
  type: RecordType;
  category: string;
  date: string;
  notes: string | null;
  createdByUserId: number;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginationInfo {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}
