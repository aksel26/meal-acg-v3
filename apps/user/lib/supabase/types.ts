export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      members: {
        Row: {
          id: string
          login_id: string
          password: string
          full_name: string
          role: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          login_id: string
          password: string
          full_name: string
          role?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          login_id?: string
          password?: string
          full_name?: string
          role?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      meal_logs: {
        Row: {
          id: string
          user_id: string
          entry_date: string
          attendance: string | null
          breakfast_store: string | null
          breakfast_amount: number | null
          breakfast_payer: string | null
          lunch_store: string | null
          lunch_amount: number | null
          lunch_payer: string | null
          dinner_store: string | null
          dinner_amount: number | null
          dinner_payer: string | null
          total_amount: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          entry_date: string
          attendance?: string | null
          breakfast_store?: string | null
          breakfast_amount?: number | null
          breakfast_payer?: string | null
          lunch_store?: string | null
          lunch_amount?: number | null
          lunch_payer?: string | null
          dinner_store?: string | null
          dinner_amount?: number | null
          dinner_payer?: string | null
          // total_amount is GENERATED ALWAYS - do not insert
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          entry_date?: string
          attendance?: string | null
          breakfast_store?: string | null
          breakfast_amount?: number | null
          breakfast_payer?: string | null
          lunch_store?: string | null
          lunch_amount?: number | null
          lunch_payer?: string | null
          dinner_store?: string | null
          dinner_amount?: number | null
          dinner_payer?: string | null
          // total_amount is GENERATED ALWAYS - do not update
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meal_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          }
        ]
      }
      monthly_allowances: {
        Row: {
          id: string
          user_id: string
          year: number
          month: number
          allowance_amount: number
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          year: number
          month: number
          allowance_amount?: number
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          year?: number
          month?: number
          allowance_amount?: number
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "monthly_allowances_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          }
        ]
      }
      global_settings: {
        Row: {
          id: number
          daily_allowance: number
          monthly_allowances: Json | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: number
          daily_allowance?: number
          monthly_allowances?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: number
          daily_allowance?: number
          monthly_allowances?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Helper types for easier usage
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
