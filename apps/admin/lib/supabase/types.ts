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
      budget_allocations: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          member_id: string
          period: string
          total_amount: number
          type: Database["public"]["Enums"]["budget_type"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          member_id: string
          period: string
          total_amount?: number
          type: Database["public"]["Enums"]["budget_type"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          member_id?: string
          period?: string
          total_amount?: number
          type?: Database["public"]["Enums"]["budget_type"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_allocations_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      divisions: {
        Row: {
          created_at: string | null
          id: string
          name: string
          organization_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          organization_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          organization_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "divisions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
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
      lunch_fixed_schedules: {
        Row: {
          created_at: string | null
          day_of_week: number
          id: string
          label: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          day_of_week: number
          id?: string
          label?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          day_of_week?: number
          id?: string
          label?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lunch_fixed_schedules_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      lunch_group_members: {
        Row: {
          assigned_at: string | null
          group_id: string
          id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          group_id: string
          id?: string
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          group_id?: string
          id?: string
          user_id?: string
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
          },
        ]
      }
      lunch_group_settings: {
        Row: {
          created_at: string | null
          id: string
          max_members_per_group: number
          total_groups: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          max_members_per_group?: number
          total_groups?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          max_members_per_group?: number
          total_groups?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      lunch_groups: {
        Row: {
          created_at: string | null
          group_number: number
          id: string
          max_slots: number | null
          updated_at: string | null
          week_start_date: string
        }
        Insert: {
          created_at?: string | null
          group_number: number
          id?: string
          max_slots?: number | null
          updated_at?: string | null
          week_start_date: string
        }
        Update: {
          created_at?: string | null
          group_number?: number
          id?: string
          max_slots?: number | null
          updated_at?: string | null
          week_start_date?: string
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
      member_statuses: {
        Row: {
          id: string
          member_id: string
          status: Database["public"]["Enums"]["member_status_type"]
          start_date: string
          end_date: string | null
          note: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          member_id: string
          status: Database["public"]["Enums"]["member_status_type"]
          start_date: string
          end_date?: string | null
          note?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          member_id?: string
          status?: Database["public"]["Enums"]["member_status_type"]
          start_date?: string
          end_date?: string | null
          note?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "member_statuses_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          created_at: string | null
          division_id: string | null
          email: string | null
          full_name: string
          id: string
          login_id: string
          member_role: Database["public"]["Enums"]["member_role"]
          note: string | null
          organization_id: string | null
          password: string
          role: string | null
          team_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          division_id?: string | null
          email?: string | null
          full_name: string
          id?: string
          login_id: string
          member_role?: Database["public"]["Enums"]["member_role"]
          note?: string | null
          organization_id?: string | null
          password: string
          role?: string | null
          team_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          division_id?: string | null
          email?: string | null
          full_name?: string
          id?: string
          login_id?: string
          member_role?: Database["public"]["Enums"]["member_role"]
          note?: string | null
          organization_id?: string | null
          password?: string
          role?: string | null
          team_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "members_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_allowances: {
        Row: {
          id: string
          user_id: string | null
          year: number
          month: number
          allowance_amount: number
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          year: number
          month: number
          allowance_amount?: number
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
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
      monthly_drink_applications: {
        Row: {
          created_at: string | null
          drink: string | null
          id: string
          memo: string | null
          month: number
          updated_at: string | null
          user_id: string
          year: number
        }
        Insert: {
          created_at?: string | null
          drink?: string | null
          id?: string
          memo?: string | null
          month: number
          updated_at?: string | null
          user_id: string
          year: number
        }
        Update: {
          created_at?: string | null
          drink?: string | null
          id?: string
          memo?: string | null
          month?: number
          updated_at?: string | null
          user_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "monthly_drink_applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_drink_settings: {
        Row: {
          id: string
          year: number
          month: number
          drink_options: Json
          pickup_persons: Json
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          year: number
          month: number
          drink_options?: Json
          pickup_persons?: Json
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          year?: number
          month?: number
          drink_options?: Json
          pickup_persons?: Json
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      organizations: {
        Row: {
          created_at: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      restaurants: {
        Row: {
          address: string | null
          business_number: string | null
          created_at: string | null
          created_by: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          business_number?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          business_number?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "restaurants_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      settlement_status: {
        Row: {
          created_at: string | null
          id: string
          is_settled: boolean | null
          month: number
          notes: string | null
          settled_at: string | null
          settled_by: string | null
          updated_at: string | null
          user_id: string
          year: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_settled?: boolean | null
          month: number
          notes?: string | null
          settled_at?: string | null
          settled_by?: string | null
          updated_at?: string | null
          user_id: string
          year: number
        }
        Update: {
          created_at?: string | null
          id?: string
          is_settled?: boolean | null
          month?: number
          notes?: string | null
          settled_at?: string | null
          settled_by?: string | null
          updated_at?: string | null
          user_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "settlement_status_settled_by_fkey"
            columns: ["settled_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlement_status_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
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
      teams: {
        Row: {
          created_at: string | null
          division_id: string | null
          id: string
          name: string
          organization_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          division_id?: string | null
          id?: string
          name: string
          organization_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          division_id?: string | null
          id?: string
          name?: string
          organization_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teams_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_record_audit_logs: {
        Row: {
          action: string
          changed_at: string | null
          changed_by: string
          id: string
          new_data: Json | null
          previous_data: Json | null
          usage_record_id: string
        }
        Insert: {
          action: string
          changed_at?: string | null
          changed_by: string
          id?: string
          new_data?: Json | null
          previous_data?: Json | null
          usage_record_id: string
        }
        Update: {
          action?: string
          changed_at?: string | null
          changed_by?: string
          id?: string
          new_data?: Json | null
          previous_data?: Json | null
          usage_record_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usage_record_audit_logs_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usage_record_audit_logs_usage_record_id_fkey"
            columns: ["usage_record_id"]
            isOneToOne: false
            referencedRelation: "usage_records"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_records: {
        Row: {
          allocation_id: string
          amount: number
          companions: string[] | null
          created_at: string | null
          description: string
          id: string
          is_reviewed: boolean | null
          last_modified_at: string | null
          last_modified_by: string | null
          member_id: string
          receipt_url: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          type: Database["public"]["Enums"]["budget_type"]
          updated_at: string | null
          used_at: string
        }
        Insert: {
          allocation_id: string
          amount: number
          companions?: string[] | null
          created_at?: string | null
          description: string
          id?: string
          is_reviewed?: boolean | null
          last_modified_at?: string | null
          last_modified_by?: string | null
          member_id: string
          receipt_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          type: Database["public"]["Enums"]["budget_type"]
          updated_at?: string | null
          used_at: string
        }
        Update: {
          allocation_id?: string
          amount?: number
          companions?: string[] | null
          created_at?: string | null
          description?: string
          id?: string
          is_reviewed?: boolean | null
          last_modified_at?: string | null
          last_modified_by?: string | null
          member_id?: string
          receipt_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          type?: Database["public"]["Enums"]["budget_type"]
          updated_at?: string | null
          used_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "usage_records_allocation_id_fkey"
            columns: ["allocation_id"]
            isOneToOne: false
            referencedRelation: "budget_allocations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usage_records_allocation_id_fkey"
            columns: ["allocation_id"]
            isOneToOne: false
            referencedRelation: "budget_summary"
            referencedColumns: ["allocation_id"]
          },
          {
            foreignKeyName: "usage_records_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usage_records_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usage_records_last_modified_by_fkey"
            columns: ["last_modified_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      member_current_status: {
        Row: {
          member_id: string | null
          full_name: string | null
          member_role: Database["public"]["Enums"]["member_role"] | null
          email: string | null
          team_id: string | null
          division_id: string | null
          team_name: string | null
          division_name: string | null
          status_id: string | null
          current_status: Database["public"]["Enums"]["member_status_type"] | null
          status_start_date: string | null
          status_end_date: string | null
          status_note: string | null
        }
        Relationships: [
          {
            foreignKeyName: "members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "members_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_summary: {
        Row: {
          allocation_id: string | null
          description: string | null
          division_name: string | null
          member_id: string | null
          member_name: string | null
          member_role: Database["public"]["Enums"]["member_role"] | null
          period: string | null
          remaining_amount: number | null
          reviewed_count: number | null
          team_name: string | null
          total_amount: number | null
          type: Database["public"]["Enums"]["budget_type"] | null
          usage_count: number | null
          used_amount: number | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_allocations_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
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
      calculate_activity_budget: {
        Args: {
          p_additional_count?: number
          p_additional_per_amount?: number
          p_base_amount?: number
          p_member_id: string
          p_per_member_amount?: number
        }
        Returns: number
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
      toggle_review_status: {
        Args: { p_reviewer_id: string; p_usage_record_id: string }
        Returns: {
          allocation_id: string
          amount: number
          companions: string[] | null
          created_at: string | null
          description: string
          id: string
          is_reviewed: boolean | null
          last_modified_at: string | null
          last_modified_by: string | null
          member_id: string
          receipt_url: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          type: Database["public"]["Enums"]["budget_type"]
          updated_at: string | null
          used_at: string
        }
      }
    }
    Enums: {
      budget_type: "복지포인트" | "활동비"
      member_role: "본부장" | "팀장" | "팀원"
      member_status_type: "육아휴직" | "병가" | "재택근무" | "파견" | "휴직" | "퇴사"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<T extends keyof Database["public"]["Tables"] | keyof Database["public"]["Views"]> =
  T extends keyof Database["public"]["Tables"]
    ? Database["public"]["Tables"][T]["Row"]
    : T extends keyof Database["public"]["Views"]
      ? Database["public"]["Views"][T]["Row"]
      : never

export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"]

export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"]

export type Views<T extends keyof Database["public"]["Views"]> =
  Database["public"]["Views"][T]["Row"]

export type Enums<T extends keyof Database["public"]["Enums"]> =
  Database["public"]["Enums"][T]

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

// New types for points management
export type Organization = Tables<"organizations">
export type OrganizationInsert = TablesInsert<"organizations">
export type Division = Tables<"divisions">
export type DivisionInsert = TablesInsert<"divisions">
export type Team = Tables<"teams">
export type TeamInsert = TablesInsert<"teams">
export type BudgetAllocation = Tables<"budget_allocations">
export type BudgetAllocationInsert = TablesInsert<"budget_allocations">
export type BudgetAllocationUpdate = TablesUpdate<"budget_allocations">
export type UsageRecord = Tables<"usage_records">
export type UsageRecordInsert = TablesInsert<"usage_records">
export type UsageRecordUpdate = TablesUpdate<"usage_records">
export type UsageRecordAuditLog = Tables<"usage_record_audit_logs">
export type BudgetSummary = Views<"budget_summary">
export type BudgetType = Enums<"budget_type">
export type MemberRole = Enums<"member_role">
export type MemberStatusType = Enums<"member_status_type">
export type MemberStatus = Tables<"member_statuses">
export type MemberStatusInsert = TablesInsert<"member_statuses">
export type MemberStatusUpdate = TablesUpdate<"member_statuses">
export type MemberCurrentStatus = Views<"member_current_status">

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
