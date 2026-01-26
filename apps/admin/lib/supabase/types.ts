export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// 월별 지원금 타입: { "2026": { "1": { allowance: 220000, workdays: 22 }, ... } }
export interface MonthlyAllowanceData {
  allowance: number;
  workdays: number;
}

export type MonthlyAllowancesJson = {
  [year: string]: {
    [month: string]: MonthlyAllowanceData;
  };
}

export type Database = {
  public: {
    Tables: {
      global_settings: {
        Row: {
          created_at: string | null
          daily_allowance: number
          id: number
          updated_at: string | null
          monthly_allowances: MonthlyAllowancesJson | null
        }
        Insert: {
          created_at?: string | null
          daily_allowance?: number
          id?: number
          updated_at?: string | null
          monthly_allowances?: MonthlyAllowancesJson | null
        }
        Update: {
          created_at?: string | null
          daily_allowance?: number
          id?: number
          updated_at?: string | null
          monthly_allowances?: MonthlyAllowancesJson | null
        }
        Relationships: []
      }
      holidays: {
        Row: {
          created_at: string | null
          description: string
          holiday_date: string
        }
        Insert: {
          created_at?: string | null
          description: string
          holiday_date: string
        }
        Update: {
          created_at?: string | null
          description?: string
          holiday_date?: string
        }
        Relationships: []
      }
      meal_logs: {
        Row: {
          attendance: string | null
          breakfast_amount: number | null
          breakfast_payer: string | null
          breakfast_store: string | null
          created_at: string | null
          dinner_amount: number | null
          dinner_payer: string | null
          dinner_store: string | null
          entry_date: string
          id: string
          lunch_amount: number | null
          lunch_payer: string | null
          lunch_store: string | null
          total_amount: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          attendance?: string | null
          breakfast_amount?: number | null
          breakfast_payer?: string | null
          breakfast_store?: string | null
          created_at?: string | null
          dinner_amount?: number | null
          dinner_payer?: string | null
          dinner_store?: string | null
          entry_date: string
          id?: string
          lunch_amount?: number | null
          lunch_payer?: string | null
          lunch_store?: string | null
          total_amount?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          attendance?: string | null
          breakfast_amount?: number | null
          breakfast_payer?: string | null
          breakfast_store?: string | null
          created_at?: string | null
          dinner_amount?: number | null
          dinner_payer?: string | null
          dinner_store?: string | null
          entry_date?: string
          id?: string
          lunch_amount?: number | null
          lunch_payer?: string | null
          lunch_store?: string | null
          total_amount?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_monthly_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      members: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string
          id: string
          login_id: string
          password: string
          role: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          full_name: string
          id?: string
          login_id: string
          password: string
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          full_name?: string
          id?: string
          login_id?: string
          password?: string
          role?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      sync_queue: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: string
          operation: string
          payload: Json | null
          processed_at: string | null
          record_id: string
          retry_count: number | null
          status: string | null
          table_name: string
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          operation: string
          payload?: Json | null
          processed_at?: string | null
          record_id: string
          retry_count?: number | null
          status?: string | null
          table_name: string
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          operation?: string
          payload?: Json | null
          processed_at?: string | null
          record_id?: string
          retry_count?: number | null
          status?: string | null
          table_name?: string
        }
        Relationships: []
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
          user_id: string | null
          label: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          day_of_week: number
          user_id?: string | null
          label?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          day_of_week?: number
          user_id?: string | null
          label?: string | null
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
      monthly_drink_settings: {
        Row: {
          id: string
          year: number
          month: number
          drink_options: string[] | null
          pickup_persons: string[] | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          year: number
          month: number
          drink_options?: string[] | null
          pickup_persons?: string[] | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          year?: number
          month?: number
          drink_options?: string[] | null
          pickup_persons?: string[] | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      monthly_drink_applications: {
        Row: {
          id: string
          user_id: string
          year: number
          month: number
          drink: string | null
          memo: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          year: number
          month: number
          drink?: string | null
          memo?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          year?: number
          month?: number
          drink?: string | null
          memo?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "monthly_drink_applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      user_monthly_stats: {
        Row: {
          actual_work_days: number | null
          balance: number | null
          daily_allowance: number | null
          full_name: string | null
          holiday_count: number | null
          login_id: string | null
          month: number | null
          total_allowance: number | null
          total_days: number | null
          total_used: number | null
          user_id: string | null
          weekend_days: number | null
          work_days: number | null
          year: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      authenticate_user: {
        Args: { p_login_id: string; p_password: string }
        Returns: {
          full_name: string
          role: string
          user_id: string
        }[]
      }
      get_user_monthly_stats: {
        Args: { p_month: number; p_user_id?: string; p_year: number }
        Returns: {
          actual_work_days: number
          balance: number
          daily_allowance: number
          full_name: string
          login_id: string
          total_allowance: number
          total_used: number
          user_id: string
          work_days: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"]

export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"]

export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"]

export type Views<T extends keyof Database["public"]["Views"]> =
  Database["public"]["Views"][T]["Row"]

// Convenience types
export type Member = Tables<"members">
export type MemberInsert = TablesInsert<"members">
export type MealLog = Tables<"meal_logs">
export type MealLogInsert = TablesInsert<"meal_logs">
export type MealLogUpdate = TablesUpdate<"meal_logs">
export type Holiday = Tables<"holidays">
export type HolidayInsert = TablesInsert<"holidays">
export type GlobalSettings = Tables<"global_settings">
export type SyncQueue = Tables<"sync_queue">
export type MonthlyAllowance = Tables<"monthly_allowances">
export type MonthlyAllowanceInsert = TablesInsert<"monthly_allowances">
export type UserMonthlyStats = Views<"user_monthly_stats">
export type LunchGroup = Tables<"lunch_groups">
export type LunchGroupInsert = TablesInsert<"lunch_groups">
export type LunchGroupMember = Tables<"lunch_group_members">
export type LunchGroupMemberInsert = TablesInsert<"lunch_group_members">
export type LunchFixedSchedule = Tables<"lunch_fixed_schedules">
export type LunchGroupSettings = Tables<"lunch_group_settings">
export type MonthlyDrinkSettings = Tables<"monthly_drink_settings">
export type MonthlyDrinkApplication = Tables<"monthly_drink_applications">

// Extended types with relations
export interface LunchGroupWithMembers extends LunchGroup {
  members: { user_id: string; member?: Member }[]
}

export interface LunchFixedScheduleWithMember extends LunchFixedSchedule {
  member?: Member
}

// Auth session type
export interface AuthSession {
  userId: string
  fullName: string
  role: "user" | "admin"
}
