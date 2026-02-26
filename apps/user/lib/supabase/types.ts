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
          division_id: string | null
          email: string | null
          full_name: string
          id: string
          login_id: string
          member_role: Database["public"]["Enums"]["member_role"]
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
      push_subscriptions: {
        Row: {
          id: string
          member_id: string
          endpoint: string
          p256dh: string
          auth: string
          user_agent: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          member_id: string
          endpoint: string
          p256dh: string
          auth: string
          user_agent?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          member_id?: string
          endpoint?: string
          p256dh?: string
          auth?: string
          user_agent?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          }
        ]
      }
      lunch_group_excluded_members: {
        Row: {
          id: string
          member_id: string
          week_start_date: string
          excluded_at: string | null
        }
        Insert: {
          id?: string
          member_id: string
          week_start_date: string
          excluded_at?: string | null
        }
        Update: {
          id?: string
          member_id?: string
          week_start_date?: string
          excluded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lunch_group_excluded_members_member_id_fkey"
            columns: ["member_id"]
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
          id: string
          name: string
          business_number: string | null
          address: string | null
          created_by: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          business_number?: string | null
          address?: string | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          business_number?: string | null
          address?: string | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "restaurants_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          }
        ]
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
      usage_records: {
        Row: {
          allocation_id: string
          amount: number
          companions: string[] | null
          created_at: string | null
          delay_reason: string | null
          description: string
          id: string
          is_reviewed: boolean | null
          review_status: number
          last_modified_at: string | null
          last_modified_by: string | null
          member_id: string
          no: number | null
          receipt_url: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          first_reviewed_by: string | null
          first_reviewed_at: string | null
          second_reviewed_by: string | null
          second_reviewed_at: string | null
          notes: string | null
          type: Database["public"]["Enums"]["budget_type"]
          updated_at: string | null
          used_at: string
        }
        Insert: {
          allocation_id: string
          amount: number
          companions?: string[] | null
          created_at?: string | null
          delay_reason?: string | null
          description: string
          id?: string
          is_reviewed?: boolean | null
          review_status?: number
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
          delay_reason?: string | null
          description?: string
          id?: string
          is_reviewed?: boolean | null
          review_status?: number
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
            foreignKeyName: "usage_records_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
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
    }
    Views: {
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
        Relationships: []
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
export type MonthlyAllowance = Tables<"monthly_allowances">
export type MonthlyAllowanceInsert = TablesInsert<"monthly_allowances">
export type UserMonthlyStats = Views<"user_monthly_stats">
export type LunchGroup = Tables<"lunch_groups">
export type LunchGroupInsert = TablesInsert<"lunch_groups">
export type LunchGroupMember = Tables<"lunch_group_members">
export type LunchGroupMemberInsert = TablesInsert<"lunch_group_members">
export type LunchFixedSchedule = Tables<"lunch_fixed_schedules">
export type LunchGroupSettings = Tables<"lunch_group_settings">
export type LunchGroupExcludedMember = Tables<"lunch_group_excluded_members">
export type MonthlyDrinkSettings = Tables<"monthly_drink_settings">
export type MonthlyDrinkApplication = Tables<"monthly_drink_applications">
export type PushSubscription = Tables<"push_subscriptions">
export type PushSubscriptionInsert = TablesInsert<"push_subscriptions">

// New types for points management
export type Organization = Tables<"organizations">
export type Division = Tables<"divisions">
export type Team = Tables<"teams">
export type BudgetAllocation = Tables<"budget_allocations">
export type BudgetAllocationInsert = TablesInsert<"budget_allocations">
export type UsageRecord = Tables<"usage_records">
export type UsageRecordInsert = TablesInsert<"usage_records">
export type UsageRecordUpdate = TablesUpdate<"usage_records">
export type UsageRecordAuditLog = Tables<"usage_record_audit_logs">
export type BudgetSummary = Views<"budget_summary">
export type BudgetType = Enums<"budget_type">
export type MemberRole = Enums<"member_role">

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
