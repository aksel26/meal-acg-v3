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
      lunch_groups: {
        Row: {
          id: string
          group_number: number
          week_start_date: string
          max_slots: number
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          group_number: number
          week_start_date: string
          max_slots?: number
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          group_number?: number
          week_start_date?: string
          max_slots?: number
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      lunch_group_members: {
        Row: {
          id: string
          group_id: string
          user_id: string
          assigned_at: string | null
        }
        Insert: {
          id?: string
          group_id: string
          user_id: string
          assigned_at?: string | null
        }
        Update: {
          id?: string
          group_id?: string
          user_id?: string
          assigned_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lunch_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "lunch_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lunch_group_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          }
        ]
      }
      lunch_fixed_schedules: {
        Row: {
          id: string
          day_of_week: number
          user_id: string
          created_at: string | null
        }
        Insert: {
          id?: string
          day_of_week: number
          user_id: string
          created_at?: string | null
        }
        Update: {
          id?: string
          day_of_week?: number
          user_id?: string
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lunch_fixed_schedules_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          }
        ]
      }
      lunch_group_settings: {
        Row: {
          id: string
          max_members_per_group: number
          total_groups: number
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          max_members_per_group?: number
          total_groups?: number
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          max_members_per_group?: number
          total_groups?: number
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

// Convenience types
export type Member = Tables<"members">
export type MealLog = Tables<"meal_logs">
export type MonthlyAllowance = Tables<"monthly_allowances">
export type GlobalSettings = Tables<"global_settings">
export type LunchGroup = Tables<"lunch_groups">
export type LunchGroupInsert = InsertTables<"lunch_groups">
export type LunchGroupMember = Tables<"lunch_group_members">
export type LunchGroupMemberInsert = InsertTables<"lunch_group_members">
export type LunchFixedSchedule = Tables<"lunch_fixed_schedules">
export type LunchGroupSettings = Tables<"lunch_group_settings">

// Extended types with relations
export interface LunchGroupWithMembers extends LunchGroup {
  lunch_group_members: {
    id: string
    user_id: string
    assigned_at: string | null
    members?: Member
  }[]
}
