export interface MonthlyAllowanceData {
  allowance: number;
  workdays: number;
}

export type MonthlyAllowancesJson = {
  [year: string]: {
    [month: string]: MonthlyAllowanceData;
  };
}

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      attendance_records: {
        Row: {
          id: string
          member_id: string
          date: string
          check_in_at: string | null
          check_out_at: string | null
          status: string
          overtime_minutes: number
          is_weekend: boolean
          note: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          member_id: string
          date: string
          check_in_at?: string | null
          check_out_at?: string | null
          status?: string
          overtime_minutes?: number
          is_weekend?: boolean
          note?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          member_id?: string
          date?: string
          check_in_at?: string | null
          check_out_at?: string | null
          status?: string
          overtime_minutes?: number
          is_weekend?: boolean
          note?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
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
            referencedRelation: "member_current_status"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "budget_allocations_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_allocations_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "user_monthly_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      dayoffs: {
        Row: {
          approved_at: string | null
          approver_id: string | null
          author_id: string
          cc_member_ids: string[] | null
          created_at: string
          id: string
          is_deleted: boolean
          last_editor_id: string | null
          late_hour: string | null
          late_minute: string | null
          leave_date: string
          leave_type_id: number
          reason: string | null
          target_id: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approver_id?: string | null
          author_id: string
          cc_member_ids?: string[] | null
          created_at?: string
          id?: string
          is_deleted?: boolean
          last_editor_id?: string | null
          late_hour?: string | null
          late_minute?: string | null
          leave_date: string
          leave_type_id: number
          reason?: string | null
          target_id: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approver_id?: string | null
          author_id?: string
          cc_member_ids?: string[] | null
          created_at?: string
          id?: string
          is_deleted?: boolean
          last_editor_id?: string | null
          late_hour?: string | null
          late_minute?: string | null
          leave_date?: string
          leave_type_id?: number
          reason?: string | null
          target_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dayoffs_approver_id_fkey"
            columns: ["approver_id"]
            isOneToOne: false
            referencedRelation: "member_current_status"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "dayoffs_approver_id_fkey"
            columns: ["approver_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dayoffs_approver_id_fkey"
            columns: ["approver_id"]
            isOneToOne: false
            referencedRelation: "user_monthly_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "dayoffs_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "member_current_status"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "dayoffs_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dayoffs_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "user_monthly_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "dayoffs_last_editor_id_fkey"
            columns: ["last_editor_id"]
            isOneToOne: false
            referencedRelation: "member_current_status"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "dayoffs_last_editor_id_fkey"
            columns: ["last_editor_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dayoffs_last_editor_id_fkey"
            columns: ["last_editor_id"]
            isOneToOne: false
            referencedRelation: "user_monthly_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "dayoffs_leave_type_id_fkey"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "leave_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dayoffs_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "member_current_status"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "dayoffs_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dayoffs_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "user_monthly_stats"
            referencedColumns: ["user_id"]
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
          monthly_allowances: Json | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          daily_allowance?: number
          id?: number
          monthly_allowances?: Json | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          daily_allowance?: number
          id?: number
          monthly_allowances?: Json | null
          updated_at?: string | null
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
      leave_adjustments: {
        Row: {
          id: string
          balance_id: string
          adjusted_by: string
          amount: number
          reason: string | null
          created_at: string
        }
        Insert: {
          id?: string
          balance_id: string
          adjusted_by: string
          amount: number
          reason?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          balance_id?: string
          adjusted_by?: string
          amount?: number
          reason?: string | null
          created_at?: string
        }
        Relationships: []
      }
      leave_balances: {
        Row: {
          id: string
          member_id: string
          year: number
          type: string
          granted: number
          used: number
          adjusted: number
          note: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          member_id: string
          year: number
          type: string
          granted?: number
          used?: number
          adjusted?: number
          note?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          member_id?: string
          year?: number
          type?: string
          granted?: number
          used?: number
          adjusted?: number
          note?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      leave_types: {
        Row: {
          category: string
          created_at: string
          deduction_amount: number
          deducts_annual: boolean
          default_quota: number
          duration_type: string
          has_separate_quota: boolean
          id: number
          include_in_stats: boolean
          is_system: boolean
          name: string
          sort_order: number
        }
        Insert: {
          category: string
          created_at?: string
          deduction_amount?: number
          deducts_annual?: boolean
          default_quota?: number
          duration_type?: string
          has_separate_quota?: boolean
          id: number
          include_in_stats?: boolean
          is_system?: boolean
          name: string
          sort_order?: number
        }
        Update: {
          category?: string
          created_at?: string
          deduction_amount?: number
          deducts_annual?: boolean
          default_quota?: number
          duration_type?: string
          has_separate_quota?: boolean
          id?: number
          include_in_stats?: boolean
          is_system?: boolean
          name?: string
          sort_order?: number
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
            referencedRelation: "member_current_status"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "lunch_fixed_schedules_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lunch_fixed_schedules_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_monthly_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      lunch_group_excluded_members: {
        Row: {
          excluded_at: string | null
          id: string
          member_id: string
          week_start_date: string
        }
        Insert: {
          excluded_at?: string | null
          id?: string
          member_id: string
          week_start_date: string
        }
        Update: {
          excluded_at?: string | null
          id?: string
          member_id?: string
          week_start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "lunch_group_excluded_members_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "member_current_status"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "lunch_group_excluded_members_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lunch_group_excluded_members_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "user_monthly_stats"
            referencedColumns: ["user_id"]
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
            referencedRelation: "member_current_status"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "lunch_group_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lunch_group_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_monthly_stats"
            referencedColumns: ["user_id"]
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
            referencedRelation: "member_current_status"
            referencedColumns: ["member_id"]
          },
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
          created_at: string | null
          end_date: string | null
          id: string
          member_id: string
          note: string | null
          start_date: string
          status: Database["public"]["Enums"]["member_status_type"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          end_date?: string | null
          id?: string
          member_id: string
          note?: string | null
          start_date: string
          status: Database["public"]["Enums"]["member_status_type"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          end_date?: string | null
          id?: string
          member_id?: string
          note?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["member_status_type"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "member_statuses_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "member_current_status"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "member_statuses_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_statuses_member_id_fkey"
            columns: ["member_id"]
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
          intern_months: number | null
          login_id: string
          member_role: Database["public"]["Enums"]["member_role"]
          note: string | null
          organization_id: string | null
          password: string
          position_id: string
          role: string | null
          team_id: string | null
          title_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          division_id?: string | null
          email?: string | null
          full_name: string
          id?: string
          intern_months?: number | null
          login_id: string
          member_role?: Database["public"]["Enums"]["member_role"]
          note?: string | null
          organization_id?: string | null
          password: string
          position_id?: string
          role?: string | null
          team_id?: string | null
          title_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          division_id?: string | null
          email?: string | null
          full_name?: string
          id?: string
          intern_months?: number | null
          login_id?: string
          member_role?: Database["public"]["Enums"]["member_role"]
          note?: string | null
          organization_id?: string | null
          password?: string
          position_id?: string
          role?: string | null
          team_id?: string | null
          title_id?: string | null
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
      positions: {
        Row: {
          id: string
          name: string
          sort_order: number
          annual_leave_days: number
          leave_accrual_rule: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          sort_order?: number
          annual_leave_days?: number
          leave_accrual_rule?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          sort_order?: number
          annual_leave_days?: number
          leave_accrual_rule?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      titles: {
        Row: {
          id: string
          name: string
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      monthly_allowances: {
        Row: {
          allowance_amount: number
          created_at: string | null
          id: string
          month: number
          updated_at: string | null
          user_id: string | null
          year: number
        }
        Insert: {
          allowance_amount?: number
          created_at?: string | null
          id?: string
          month: number
          updated_at?: string | null
          user_id?: string | null
          year: number
        }
        Update: {
          allowance_amount?: number
          created_at?: string | null
          id?: string
          month?: number
          updated_at?: string | null
          user_id?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "monthly_allowances_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "member_current_status"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "monthly_allowances_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monthly_allowances_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_monthly_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      drink_collections: {
        Row: {
          id: string
          title: string
          year: number
          month: number | null
          is_active: boolean
          is_one_time: boolean
          drink_options: Json
          pickup_persons: Json
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          title: string
          year: number
          month?: number | null
          is_active?: boolean
          is_one_time?: boolean
          drink_options?: Json
          pickup_persons?: Json
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          title?: string
          year?: number
          month?: number | null
          is_active?: boolean
          is_one_time?: boolean
          drink_options?: Json
          pickup_persons?: Json
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      monthly_drink_applications: {
        Row: {
          created_at: string | null
          collection_id: string | null
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
          collection_id?: string | null
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
          collection_id?: string | null
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
            referencedRelation: "member_current_status"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "monthly_drink_applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monthly_drink_applications_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "drink_collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monthly_drink_applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_monthly_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      monthly_drink_settings: {
        Row: {
          created_at: string | null
          drink_options: Json
          id: string
          month: number
          pickup_persons: Json
          updated_at: string | null
          year: number
        }
        Insert: {
          created_at?: string | null
          drink_options?: Json
          id?: string
          month: number
          pickup_persons?: Json
          updated_at?: string | null
          year: number
        }
        Update: {
          created_at?: string | null
          drink_options?: Json
          id?: string
          month?: number
          pickup_persons?: Json
          updated_at?: string | null
          year?: number
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
      push_notification_logs: {
        Row: {
          body: string
          cleaned_count: number | null
          created_at: string | null
          failed_count: number | null
          id: string
          results: Json | null
          send_to_all: boolean | null
          sent_by: string
          success_count: number | null
          tag: string | null
          title: string
          total_recipients: number | null
        }
        Insert: {
          body: string
          cleaned_count?: number | null
          created_at?: string | null
          failed_count?: number | null
          id?: string
          results?: Json | null
          send_to_all?: boolean | null
          sent_by: string
          success_count?: number | null
          tag?: string | null
          title: string
          total_recipients?: number | null
        }
        Update: {
          body?: string
          cleaned_count?: number | null
          created_at?: string | null
          failed_count?: number | null
          id?: string
          results?: Json | null
          send_to_all?: boolean | null
          sent_by?: string
          success_count?: number | null
          tag?: string | null
          title?: string
          total_recipients?: number | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string | null
          endpoint: string
          id: string
          member_id: string
          p256dh: string
          updated_at: string | null
          user_agent: string | null
        }
        Insert: {
          auth: string
          created_at?: string | null
          endpoint: string
          id?: string
          member_id: string
          p256dh: string
          updated_at?: string | null
          user_agent?: string | null
        }
        Update: {
          auth?: string
          created_at?: string | null
          endpoint?: string
          id?: string
          member_id?: string
          p256dh?: string
          updated_at?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "member_current_status"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "push_subscriptions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_subscriptions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "user_monthly_stats"
            referencedColumns: ["user_id"]
          },
        ]
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
            referencedRelation: "member_current_status"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "restaurants_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurants_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_monthly_stats"
            referencedColumns: ["user_id"]
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
            referencedRelation: "member_current_status"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "settlement_status_settled_by_fkey"
            columns: ["settled_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlement_status_settled_by_fkey"
            columns: ["settled_by"]
            isOneToOne: false
            referencedRelation: "user_monthly_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "settlement_status_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "member_current_status"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "settlement_status_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlement_status_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_monthly_stats"
            referencedColumns: ["user_id"]
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
            referencedRelation: "member_current_status"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "usage_record_audit_logs_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usage_record_audit_logs_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "user_monthly_stats"
            referencedColumns: ["user_id"]
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
          co_payers: string[] | null
          companions: string[] | null
          created_at: string | null
          delay_reason: string | null
          description: string
          first_reviewed_at: string | null
          first_reviewed_by: string | null
          id: string
          is_reviewed: boolean | null
          last_modified_at: string | null
          last_modified_by: string | null
          member_id: string
          no: number
          notes: string | null
          receipt_url: string | null
          review_status: number
          reviewed_at: string | null
          reviewed_by: string | null
          second_reviewed_at: string | null
          second_reviewed_by: string | null
          type: Database["public"]["Enums"]["budget_type"]
          updated_at: string | null
          used_at: string
        }
        Insert: {
          allocation_id: string
          amount: number
          co_payers?: string[] | null
          companions?: string[] | null
          created_at?: string | null
          delay_reason?: string | null
          description: string
          first_reviewed_at?: string | null
          first_reviewed_by?: string | null
          id?: string
          is_reviewed?: boolean | null
          last_modified_at?: string | null
          last_modified_by?: string | null
          member_id: string
          no?: number
          notes?: string | null
          receipt_url?: string | null
          review_status?: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          second_reviewed_at?: string | null
          second_reviewed_by?: string | null
          type: Database["public"]["Enums"]["budget_type"]
          updated_at?: string | null
          used_at: string
        }
        Update: {
          allocation_id?: string
          amount?: number
          co_payers?: string[] | null
          companions?: string[] | null
          created_at?: string | null
          delay_reason?: string | null
          description?: string
          first_reviewed_at?: string | null
          first_reviewed_by?: string | null
          id?: string
          is_reviewed?: boolean | null
          last_modified_at?: string | null
          last_modified_by?: string | null
          member_id?: string
          no?: number
          notes?: string | null
          receipt_url?: string | null
          review_status?: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          second_reviewed_at?: string | null
          second_reviewed_by?: string | null
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
            foreignKeyName: "usage_records_first_reviewed_by_fkey"
            columns: ["first_reviewed_by"]
            isOneToOne: false
            referencedRelation: "member_current_status"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "usage_records_first_reviewed_by_fkey"
            columns: ["first_reviewed_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usage_records_first_reviewed_by_fkey"
            columns: ["first_reviewed_by"]
            isOneToOne: false
            referencedRelation: "user_monthly_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "usage_records_last_modified_by_fkey"
            columns: ["last_modified_by"]
            isOneToOne: false
            referencedRelation: "member_current_status"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "usage_records_last_modified_by_fkey"
            columns: ["last_modified_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usage_records_last_modified_by_fkey"
            columns: ["last_modified_by"]
            isOneToOne: false
            referencedRelation: "user_monthly_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "usage_records_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "member_current_status"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "usage_records_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usage_records_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "user_monthly_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "usage_records_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "member_current_status"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "usage_records_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usage_records_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "user_monthly_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "usage_records_second_reviewed_by_fkey"
            columns: ["second_reviewed_by"]
            isOneToOne: false
            referencedRelation: "member_current_status"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "usage_records_second_reviewed_by_fkey"
            columns: ["second_reviewed_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usage_records_second_reviewed_by_fkey"
            columns: ["second_reviewed_by"]
            isOneToOne: false
            referencedRelation: "user_monthly_stats"
            referencedColumns: ["user_id"]
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
        Relationships: [
          {
            foreignKeyName: "budget_allocations_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "member_current_status"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "budget_allocations_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_allocations_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "user_monthly_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      member_current_status: {
        Row: {
          current_status:
            | Database["public"]["Enums"]["member_status_type"]
            | null
          division_id: string | null
          division_name: string | null
          email: string | null
          full_name: string | null
          member_id: string | null
          member_role: Database["public"]["Enums"]["member_role"] | null
          position_id: string | null
          position_name: string | null
          status_end_date: string | null
          status_id: string | null
          status_note: string | null
          status_start_date: string | null
          team_id: string | null
          team_name: string | null
          title_id: string | null
          title_name: string | null
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
            foreignKeyName: "members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      user_monthly_stats: {
        Row: {
          annual_leave_days: number | null
          balance: number | null
          daily_allowance: number | null
          day_off_days: number | null
          full_name: string | null
          half_day_deduction: number | null
          half_day_off_count: number | null
          holiday_count: number | null
          holiday_deduction: number | null
          individual_meal_deduction: number | null
          individual_meals: number | null
          login_id: string | null
          month: number | null
          no_meal_deduction: number | null
          original_allowance: number | null
          public_holiday_count: number | null
          remote_work_days: number | null
          total_allowance: number | null
          total_deduction: number | null
          total_used: number | null
          user_id: string | null
          weekend_work_days: number | null
          work_days: number | null
          year: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      advance_review_status: {
        Args: { p_reviewer_id: string; p_usage_record_id: string }
        Returns: {
          allocation_id: string
          amount: number
          companions: string[] | null
          created_at: string | null
          delay_reason: string | null
          description: string
          first_reviewed_at: string | null
          first_reviewed_by: string | null
          id: string
          is_reviewed: boolean | null
          last_modified_at: string | null
          last_modified_by: string | null
          member_id: string
          no: number
          notes: string | null
          receipt_url: string | null
          review_status: number
          reviewed_at: string | null
          reviewed_by: string | null
          second_reviewed_at: string | null
          second_reviewed_by: string | null
          type: Database["public"]["Enums"]["budget_type"]
          updated_at: string | null
          used_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "usage_records"
          isOneToOne: false
          isSetofReturn: true
        }
      }
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
      get_dayoff_monthly_stats: {
        Args: { p_month: number; p_year: number }
        Returns: {
          count: number
          leave_type_id: number
          leave_type_name: string
          member_id: string
          member_name: string
          team_name: string
        }[]
      }
      get_popular_restaurants: {
        Args: { limit_count?: number }
        Returns: {
          count: number
          name: string
        }[]
      }
      get_user_monthly_stats: {
        Args: { p_month: number; p_user_id?: string; p_year: number }
        Returns: {
          annual_leave_days: number
          balance: number
          daily_allowance: number
          day_off_days: number
          full_name: string
          half_day_deduction: number
          half_day_off_count: number
          holiday_count: number
          holiday_deduction: number
          individual_meal_deduction: number
          individual_meals: number
          login_id: string
          no_meal_deduction: number
          original_allowance: number
          public_holiday_count: number
          remote_work_days: number
          total_allowance: number
          total_deduction: number
          total_used: number
          user_id: string
          weekend_work_days: number
          work_days: number
        }[]
      }
      normalize_restaurant_name: { Args: { name: string }; Returns: string }
      revert_review_status: {
        Args: {
          p_reviewer_id: string
          p_target_status: number
          p_usage_record_id: string
        }
        Returns: {
          allocation_id: string
          amount: number
          companions: string[] | null
          created_at: string | null
          delay_reason: string | null
          description: string
          first_reviewed_at: string | null
          first_reviewed_by: string | null
          id: string
          is_reviewed: boolean | null
          last_modified_at: string | null
          last_modified_by: string | null
          member_id: string
          no: number
          notes: string | null
          receipt_url: string | null
          review_status: number
          reviewed_at: string | null
          reviewed_by: string | null
          second_reviewed_at: string | null
          second_reviewed_by: string | null
          type: Database["public"]["Enums"]["budget_type"]
          updated_at: string | null
          used_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "usage_records"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      toggle_review_status: {
        Args: { p_reviewer_id: string; p_usage_record_id: string }
        Returns: {
          allocation_id: string
          amount: number
          companions: string[] | null
          created_at: string | null
          delay_reason: string | null
          description: string
          first_reviewed_at: string | null
          first_reviewed_by: string | null
          id: string
          is_reviewed: boolean | null
          last_modified_at: string | null
          last_modified_by: string | null
          member_id: string
          no: number
          notes: string | null
          receipt_url: string | null
          review_status: number
          reviewed_at: string | null
          reviewed_by: string | null
          second_reviewed_at: string | null
          second_reviewed_by: string | null
          type: Database["public"]["Enums"]["budget_type"]
          updated_at: string | null
          used_at: string
        }
        SetofOptions: {
          from: "*"
          to: "usage_records"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      budget_type: "복지포인트" | "활동비"
      member_role: "본부장" | "팀장" | "팀원" | "인턴"
      member_status_type:
        | "육아휴직"
        | "병가"
        | "재택근무"
        | "파견"
        | "휴직"
        | "퇴사"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      budget_type: ["복지포인트", "활동비"],
      member_role: ["본부장", "팀장", "팀원", "인턴"],
      member_status_type: [
        "육아휴직",
        "병가",
        "재택근무",
        "파견",
        "휴직",
        "퇴사",
      ],
    },
  },
} as const

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
export type LunchGroupExcludedMember = Tables<"lunch_group_excluded_members">
export type MonthlyDrinkSettings = Tables<"monthly_drink_settings">
export type MonthlyDrinkApplication = Tables<"monthly_drink_applications">
export type DrinkCollection = Tables<"drink_collections">
export type DrinkCollectionInsert = TablesInsert<"drink_collections">
export type DrinkCollectionUpdate = TablesUpdate<"drink_collections">

// Points management types
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
export type PushSubscription = Tables<"push_subscriptions">
export type PushSubscriptionInsert = TablesInsert<"push_subscriptions">

// Dayoff types
export type Dayoff = Tables<"dayoffs">
export type DayoffInsert = TablesInsert<"dayoffs">
export type DayoffUpdate = TablesUpdate<"dayoffs">
export type LeaveType = Tables<"leave_types">

// Views helper
type Views<T extends keyof Database["public"]["Views"]> =
  Database["public"]["Views"][T]["Row"]

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

