
import { Database } from '@/integrations/supabase/types';

export type DiscountTemplateRow = Database['public']['Tables']['discount_templates']['Row'];

export interface DiscountTemplate {
  id: string;
  name: string;
  description?: string;
  amount: number;
  type: 'fixed' | 'percentage';
  userId: string;
  companyId?: string;
  createdAt: string;
  updatedAt: string;
}

export const mapDiscountTemplateFromRow = (row: DiscountTemplateRow): DiscountTemplate => ({
  id: row.id,
  name: row.name,
  description: row.description || undefined,
  amount: Number(row.amount),
  type: row.type as 'fixed' | 'percentage',
  userId: row.user_id,
  companyId: row.company_id || undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});
