import { createClient } from '@supabase/supabase-js';
import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// 클라이언트 사이드용 Supabase 클라이언트
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Next.js App Router용 브라우저 클라이언트 (SSR 지원)
export const createSupabaseBrowserClient = () => {
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
};

// 실제 데이터베이스 타입 정의 (Supabase MCP로 생성)
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      payment_methods: {
        Row: {
          card_brand: string | null;
          card_holder_name: string | null;
          card_last_four: string | null;
          created_at: string | null;
          customer_key: string;
          id: string;
          is_default: boolean | null;
          payment_method_type: string;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          card_brand?: string | null;
          card_holder_name?: string | null;
          card_last_four?: string | null;
          created_at?: string | null;
          customer_key: string;
          id?: string;
          is_default?: boolean | null;
          payment_method_type: string;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          card_brand?: string | null;
          card_holder_name?: string | null;
          card_last_four?: string | null;
          created_at?: string | null;
          customer_key?: string;
          id?: string;
          is_default?: boolean | null;
          payment_method_type?: string;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'payment_methods_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      payments: {
        Row: {
          amount: number;
          approved_at: string | null;
          created_at: string | null;
          currency: string;
          customer_email: string | null;
          customer_mobile_phone: string | null;
          customer_name: string | null;
          failure_code: string | null;
          failure_message: string | null;
          id: string;
          order_id: string;
          order_name: string;
          payment_key: string;
          payment_method: string;
          receipt_url: string | null;
          status: string;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          amount: number;
          approved_at?: string | null;
          created_at?: string | null;
          currency?: string;
          customer_email?: string | null;
          customer_mobile_phone?: string | null;
          customer_name?: string | null;
          failure_code?: string | null;
          failure_message?: string | null;
          id?: string;
          order_id: string;
          order_name: string;
          payment_key: string;
          payment_method: string;
          receipt_url?: string | null;
          status?: string;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          amount?: number;
          approved_at?: string | null;
          created_at?: string | null;
          currency?: string;
          customer_email?: string | null;
          customer_mobile_phone?: string | null;
          customer_name?: string | null;
          failure_code?: string | null;
          failure_message?: string | null;
          id?: string;
          order_id?: string;
          order_name?: string;
          payment_key?: string;
          payment_method?: string;
          receipt_url?: string | null;
          status?: string;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'payments_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      users: {
        Row: {
          avatar_url: string | null;
          created_at: string | null;
          email: string;
          full_name: string | null;
          id: string;
          updated_at: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string | null;
          email: string;
          full_name?: string | null;
          id: string;
          updated_at?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string | null;
          email?: string;
          full_name?: string | null;
          id?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      insert_payment_from_server: {
        Args: {
          p_user_id: string;
          p_payment_key: string;
          p_order_id: string;
          p_amount: number;
          p_currency: string;
          p_status: string;
          p_payment_method: string;
          p_order_name: string;
          p_customer_email?: string;
          p_customer_name?: string;
          p_approved_at?: string;
          p_receipt_url?: string;
        };
        Returns: string;
      };
    };
    Enums: {
      [_ in never]: never;
    };
  };
};
