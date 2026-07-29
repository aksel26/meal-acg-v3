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
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_name: string | null
          created_at: string
          id: string
          ip_address: string | null
          metadata: Json
          reason: string | null
          request_path: string | null
          risk_level: string
          target_id: string | null
          target_label: string | null
          target_type: string
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_name?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json
          reason?: string | null
          request_path?: string | null
          risk_level?: string
          target_id?: string | null
          target_label?: string | null
          target_type: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_name?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json
          reason?: string | null
          request_path?: string | null
          risk_level?: string
          target_id?: string | null
          target_label?: string | null
          target_type?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "member_current_status"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "admin_audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "user_monthly_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      admin_member_permission_overrides: {
        Row: {
          created_at: string
          effect: string
          id: string
          member_id: string
          permission: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          effect: string
          id?: string
          member_id: string
          permission: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          effect?: string
          id?: string
          member_id?: string
          permission?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_member_permission_overrides_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "member_current_status"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "admin_member_permission_overrides_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_member_permission_overrides_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "user_monthly_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      admin_role_permission_policies: {
        Row: {
          admin_role: string
          created_at: string
          enabled: boolean
          id: string
          permission: string
          updated_at: string
        }
        Insert: {
          admin_role: string
          created_at?: string
          enabled?: boolean
          id?: string
          permission: string
          updated_at?: string
        }
        Update: {
          admin_role?: string
          created_at?: string
          enabled?: boolean
          id?: string
          permission?: string
          updated_at?: string
        }
        Relationships: []
      }
      approval_requests: {
        Row: {
          approver_id: string
          cc_member_ids: string[] | null
          id: string
          reject_reason: string | null
          related_id: string | null
          related_table: string | null
          requested_at: string
          requester_id: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
          type: string
        }
        Insert: {
          approver_id: string
          cc_member_ids?: string[] | null
          id?: string
          reject_reason?: string | null
          related_id?: string | null
          related_table?: string | null
          requested_at?: string
          requester_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          type: string
        }
        Update: {
          approver_id?: string
          cc_member_ids?: string[] | null
          id?: string
          reject_reason?: string | null
          related_id?: string | null
          related_table?: string | null
          requested_at?: string
          requester_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_requests_approver_id_fkey"
            columns: ["approver_id"]
            isOneToOne: false
            referencedRelation: "member_current_status"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "approval_requests_approver_id_fkey"
            columns: ["approver_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_requests_approver_id_fkey"
            columns: ["approver_id"]
            isOneToOne: false
            referencedRelation: "user_monthly_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "approval_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "member_current_status"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "approval_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "user_monthly_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "approval_requests_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "member_current_status"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "approval_requests_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_requests_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "user_monthly_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      attendance_modification_requests: {
        Row: {
          approval_status: string
          attendance_record_id: string
          created_at: string
          final_approved_at: string | null
          final_approver_id: string | null
          first_approved_at: string | null
          first_approver_id: string | null
          id: string
          original_type: string
          reason: string
          reject_reason: string | null
          requested_type: string
          requester_id: string
          updated_at: string
        }
        Insert: {
          approval_status?: string
          attendance_record_id: string
          created_at?: string
          final_approved_at?: string | null
          final_approver_id?: string | null
          first_approved_at?: string | null
          first_approver_id?: string | null
          id?: string
          original_type: string
          reason: string
          reject_reason?: string | null
          requested_type: string
          requester_id: string
          updated_at?: string
        }
        Update: {
          approval_status?: string
          attendance_record_id?: string
          created_at?: string
          final_approved_at?: string | null
          final_approver_id?: string | null
          first_approved_at?: string | null
          first_approver_id?: string | null
          id?: string
          original_type?: string
          reason?: string
          reject_reason?: string | null
          requested_type?: string
          requester_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_modification_requests_attendance_record_id_fkey"
            columns: ["attendance_record_id"]
            isOneToOne: false
            referencedRelation: "attendance_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_modification_requests_final_approver_id_fkey"
            columns: ["final_approver_id"]
            isOneToOne: false
            referencedRelation: "member_current_status"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "attendance_modification_requests_final_approver_id_fkey"
            columns: ["final_approver_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_modification_requests_final_approver_id_fkey"
            columns: ["final_approver_id"]
            isOneToOne: false
            referencedRelation: "user_monthly_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "attendance_modification_requests_first_approver_id_fkey"
            columns: ["first_approver_id"]
            isOneToOne: false
            referencedRelation: "member_current_status"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "attendance_modification_requests_first_approver_id_fkey"
            columns: ["first_approver_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_modification_requests_first_approver_id_fkey"
            columns: ["first_approver_id"]
            isOneToOne: false
            referencedRelation: "user_monthly_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "attendance_modification_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "member_current_status"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "attendance_modification_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_modification_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "user_monthly_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      attendance_records: {
        Row: {
          approved_at: string | null
          approver_id: string | null
          attendance_type: string
          check_in_at: string | null
          check_in_status: string | null
          check_out_at: string | null
          check_out_status: string | null
          created_at: string
          date: string
          id: string
          is_weekend: boolean
          location: string | null
          login_ip: string | null
          login_ip2: string | null
          member_id: string
          modifier_id: string | null
          note: string | null
          overtime_minutes: number
          reference: string | null
          status: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approver_id?: string | null
          attendance_type?: string
          check_in_at?: string | null
          check_in_status?: string | null
          check_out_at?: string | null
          check_out_status?: string | null
          created_at?: string
          date: string
          id?: string
          is_weekend?: boolean
          location?: string | null
          login_ip?: string | null
          login_ip2?: string | null
          member_id: string
          modifier_id?: string | null
          note?: string | null
          overtime_minutes?: number
          reference?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approver_id?: string | null
          attendance_type?: string
          check_in_at?: string | null
          check_in_status?: string | null
          check_out_at?: string | null
          check_out_status?: string | null
          created_at?: string
          date?: string
          id?: string
          is_weekend?: boolean
          location?: string | null
          login_ip?: string | null
          login_ip2?: string | null
          member_id?: string
          modifier_id?: string | null
          note?: string | null
          overtime_minutes?: number
          reference?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_approver_id_fkey"
            columns: ["approver_id"]
            isOneToOne: false
            referencedRelation: "member_current_status"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "attendance_records_approver_id_fkey"
            columns: ["approver_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_approver_id_fkey"
            columns: ["approver_id"]
            isOneToOne: false
            referencedRelation: "user_monthly_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "attendance_records_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "member_current_status"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "attendance_records_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "user_monthly_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "attendance_records_modifier_id_fkey"
            columns: ["modifier_id"]
            isOneToOne: false
            referencedRelation: "member_current_status"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "attendance_records_modifier_id_fkey"
            columns: ["modifier_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_modifier_id_fkey"
            columns: ["modifier_id"]
            isOneToOne: false
            referencedRelation: "user_monthly_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      book_rentals: {
        Row: {
          approved_at: string | null
          book_id: string
          created_at: string
          due_at: string | null
          id: string
          processed_by: string | null
          reject_reason: string | null
          rented_at: string | null
          requested_at: string
          requester_id: string
          return_requested_at: string | null
          returned_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          book_id: string
          created_at?: string
          due_at?: string | null
          id?: string
          processed_by?: string | null
          reject_reason?: string | null
          rented_at?: string | null
          requested_at?: string
          requester_id: string
          return_requested_at?: string | null
          returned_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          book_id?: string
          created_at?: string
          due_at?: string | null
          id?: string
          processed_by?: string | null
          reject_reason?: string | null
          rented_at?: string | null
          requested_at?: string
          requester_id?: string
          return_requested_at?: string | null
          returned_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "book_rentals_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "book_rentals_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "member_current_status"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "book_rentals_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "book_rentals_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "user_monthly_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "book_rentals_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "member_current_status"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "book_rentals_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "book_rentals_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "user_monthly_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      books: {
        Row: {
          author: string | null
          created_at: string
          id: string
          memo: string | null
          rental_period_days_override: number | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          author?: string | null
          created_at?: string
          id?: string
          memo?: string | null
          rental_period_days_override?: number | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          author?: string | null
          created_at?: string
          id?: string
          memo?: string | null
          rental_period_days_override?: number | null
          status?: string
          title?: string
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
      company_documents: {
        Row: {
          category: string
          content_type: string
          created_at: string
          description: string | null
          file_name: string
          id: string
          note: string | null
          published_at: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          size_bytes: number
          status: string
          storage_path: string
          submitted_by: string
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          content_type: string
          created_at?: string
          description?: string | null
          file_name: string
          id?: string
          note?: string | null
          published_at?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          size_bytes: number
          status?: string
          storage_path: string
          submitted_by: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          content_type?: string
          created_at?: string
          description?: string | null
          file_name?: string
          id?: string
          note?: string | null
          published_at?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          size_bytes?: number
          status?: string
          storage_path?: string
          submitted_by?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_documents_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "member_current_status"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "company_documents_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_documents_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "user_monthly_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "company_documents_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "member_current_status"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "company_documents_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_documents_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "user_monthly_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      company_vehicles: {
        Row: {
          created_at: string
          has_hipass: boolean
          id: string
          license_plate: string | null
          memo: string | null
          odometer_km: number | null
          passenger_capacity: number
          status: string
          updated_at: string
          vehicle_name: string
          vehicle_type: string
        }
        Insert: {
          created_at?: string
          has_hipass?: boolean
          id?: string
          license_plate?: string | null
          memo?: string | null
          odometer_km?: number | null
          passenger_capacity?: number
          status?: string
          updated_at?: string
          vehicle_name: string
          vehicle_type: string
        }
        Update: {
          created_at?: string
          has_hipass?: boolean
          id?: string
          license_plate?: string | null
          memo?: string | null
          odometer_km?: number | null
          passenger_capacity?: number
          status?: string
          updated_at?: string
          vehicle_name?: string
          vehicle_type?: string
        }
        Relationships: []
      }
      corporate_card_transactions: {
        Row: {
          amount: number
          business_purpose: string
          card_id: string
          category: string
          created_at: string
          id: string
          member_id: string
          merchant: string
          note: string | null
          receipt_content_type: string | null
          receipt_file_name: string | null
          receipt_size_bytes: number | null
          receipt_storage_path: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          usage_date: string
        }
        Insert: {
          amount: number
          business_purpose: string
          card_id: string
          category: string
          created_at?: string
          id?: string
          member_id: string
          merchant: string
          note?: string | null
          receipt_content_type?: string | null
          receipt_file_name?: string | null
          receipt_size_bytes?: number | null
          receipt_storage_path?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          usage_date: string
        }
        Update: {
          amount?: number
          business_purpose?: string
          card_id?: string
          category?: string
          created_at?: string
          id?: string
          member_id?: string
          merchant?: string
          note?: string | null
          receipt_content_type?: string | null
          receipt_file_name?: string | null
          receipt_size_bytes?: number | null
          receipt_storage_path?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          usage_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "corporate_card_transactions_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "corporate_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corporate_card_transactions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "member_current_status"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "corporate_card_transactions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corporate_card_transactions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "user_monthly_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "corporate_card_transactions_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "member_current_status"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "corporate_card_transactions_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corporate_card_transactions_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "user_monthly_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      corporate_cards: {
        Row: {
          assigned_member_id: string | null
          assigned_team_id: string | null
          created_at: string
          id: string
          issuer: string
          last_four: string
          monthly_limit: number | null
          name: string
          note: string | null
          status: string
          updated_at: string
        }
        Insert: {
          assigned_member_id?: string | null
          assigned_team_id?: string | null
          created_at?: string
          id?: string
          issuer: string
          last_four: string
          monthly_limit?: number | null
          name: string
          note?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_member_id?: string | null
          assigned_team_id?: string | null
          created_at?: string
          id?: string
          issuer?: string
          last_four?: string
          monthly_limit?: number | null
          name?: string
          note?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "corporate_cards_assigned_member_id_fkey"
            columns: ["assigned_member_id"]
            isOneToOne: false
            referencedRelation: "member_current_status"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "corporate_cards_assigned_member_id_fkey"
            columns: ["assigned_member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corporate_cards_assigned_member_id_fkey"
            columns: ["assigned_member_id"]
            isOneToOne: false
            referencedRelation: "user_monthly_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "corporate_cards_assigned_team_id_fkey"
            columns: ["assigned_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      dayoffs: {
        Row: {
          approval_status: string
          approved_at: string | null
          approver_id: string | null
          author_id: string
          cc_member_ids: string[] | null
          created_at: string
          edit_reason: string | null
          final_approved_at: string | null
          final_approver_id: string | null
          first_approved_at: string | null
          first_approver_id: string | null
          id: string
          is_deleted: boolean
          last_editor_id: string | null
          late_hour: string | null
          late_minute: string | null
          leave_date: string
          leave_type_id: number
          reason: string | null
          request_fingerprint: string | null
          request_id: string | null
          target_id: string
          updated_at: string
        }
        Insert: {
          approval_status?: string
          approved_at?: string | null
          approver_id?: string | null
          author_id: string
          cc_member_ids?: string[] | null
          created_at?: string
          edit_reason?: string | null
          final_approved_at?: string | null
          final_approver_id?: string | null
          first_approved_at?: string | null
          first_approver_id?: string | null
          id?: string
          is_deleted?: boolean
          last_editor_id?: string | null
          late_hour?: string | null
          late_minute?: string | null
          leave_date: string
          leave_type_id: number
          reason?: string | null
          request_fingerprint?: string | null
          request_id?: string | null
          target_id: string
          updated_at?: string
        }
        Update: {
          approval_status?: string
          approved_at?: string | null
          approver_id?: string | null
          author_id?: string
          cc_member_ids?: string[] | null
          created_at?: string
          edit_reason?: string | null
          final_approved_at?: string | null
          final_approver_id?: string | null
          first_approved_at?: string | null
          first_approver_id?: string | null
          id?: string
          is_deleted?: boolean
          last_editor_id?: string | null
          late_hour?: string | null
          late_minute?: string | null
          leave_date?: string
          leave_type_id?: number
          reason?: string | null
          request_fingerprint?: string | null
          request_id?: string | null
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
            foreignKeyName: "dayoffs_final_approver_id_fkey"
            columns: ["final_approver_id"]
            isOneToOne: false
            referencedRelation: "member_current_status"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "dayoffs_final_approver_id_fkey"
            columns: ["final_approver_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dayoffs_final_approver_id_fkey"
            columns: ["final_approver_id"]
            isOneToOne: false
            referencedRelation: "user_monthly_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "dayoffs_first_approver_id_fkey"
            columns: ["first_approver_id"]
            isOneToOne: false
            referencedRelation: "member_current_status"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "dayoffs_first_approver_id_fkey"
            columns: ["first_approver_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dayoffs_first_approver_id_fkey"
            columns: ["first_approver_id"]
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
      drink_collections: {
        Row: {
          created_at: string | null
          drink_options: Json | null
          id: string
          is_active: boolean
          is_one_time: boolean
          month: number | null
          pickup_persons: Json | null
          title: string
          updated_at: string | null
          year: number
        }
        Insert: {
          created_at?: string | null
          drink_options?: Json | null
          id?: string
          is_active?: boolean
          is_one_time?: boolean
          month?: number | null
          pickup_persons?: Json | null
          title: string
          updated_at?: string | null
          year: number
        }
        Update: {
          created_at?: string | null
          drink_options?: Json | null
          id?: string
          is_active?: boolean
          is_one_time?: boolean
          month?: number | null
          pickup_persons?: Json | null
          title?: string
          updated_at?: string | null
          year?: number
        }
        Relationships: []
      }
      early_leave_requests: {
        Row: {
          approval_status: string
          attendance_record_id: string
          created_at: string
          final_approved_at: string | null
          final_approver_id: string | null
          first_approved_at: string | null
          first_approver_id: string | null
          id: string
          reason: string
          reject_reason: string | null
          requester_id: string
          updated_at: string
        }
        Insert: {
          approval_status?: string
          attendance_record_id: string
          created_at?: string
          final_approved_at?: string | null
          final_approver_id?: string | null
          first_approved_at?: string | null
          first_approver_id?: string | null
          id?: string
          reason: string
          reject_reason?: string | null
          requester_id: string
          updated_at?: string
        }
        Update: {
          approval_status?: string
          attendance_record_id?: string
          created_at?: string
          final_approved_at?: string | null
          final_approver_id?: string | null
          first_approved_at?: string | null
          first_approver_id?: string | null
          id?: string
          reason?: string
          reject_reason?: string | null
          requester_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "early_leave_requests_attendance_record_id_fkey"
            columns: ["attendance_record_id"]
            isOneToOne: false
            referencedRelation: "attendance_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "early_leave_requests_final_approver_id_fkey"
            columns: ["final_approver_id"]
            isOneToOne: false
            referencedRelation: "member_current_status"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "early_leave_requests_final_approver_id_fkey"
            columns: ["final_approver_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "early_leave_requests_final_approver_id_fkey"
            columns: ["final_approver_id"]
            isOneToOne: false
            referencedRelation: "user_monthly_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "early_leave_requests_first_approver_id_fkey"
            columns: ["first_approver_id"]
            isOneToOne: false
            referencedRelation: "member_current_status"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "early_leave_requests_first_approver_id_fkey"
            columns: ["first_approver_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "early_leave_requests_first_approver_id_fkey"
            columns: ["first_approver_id"]
            isOneToOne: false
            referencedRelation: "user_monthly_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "early_leave_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "member_current_status"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "early_leave_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "early_leave_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "user_monthly_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      finance_attachments: {
        Row: {
          content_type: string | null
          created_at: string
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          related_id: string
          related_table: string
          uploaded_by: string | null
        }
        Insert: {
          content_type?: string | null
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          related_id: string
          related_table: string
          uploaded_by?: string | null
        }
        Update: {
          content_type?: string | null
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          related_id?: string
          related_table?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "finance_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "member_current_status"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "finance_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "user_monthly_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      finance_audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          after_data: Json | null
          before_data: Json | null
          created_at: string
          entity_id: string
          entity_type: string
          id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "member_current_status"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "finance_audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "user_monthly_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      finance_clients: {
        Row: {
          business_registration_number: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          id: string
          memo: string | null
          name: string
          payment_terms: string | null
          representative_name: string | null
          status: string
          updated_at: string
        }
        Insert: {
          business_registration_number?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          memo?: string | null
          name: string
          payment_terms?: string | null
          representative_name?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          business_registration_number?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          memo?: string | null
          name?: string
          payment_terms?: string | null
          representative_name?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      finance_expense_records: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          created_at: string
          description: string
          expense_type: string
          id: string
          memo: string | null
          paid_at: string | null
          project_id: string
          reject_reason: string | null
          requester_id: string | null
          status: string
          updated_at: string
          used_at: string
        }
        Insert: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          description?: string
          expense_type: string
          id?: string
          memo?: string | null
          paid_at?: string | null
          project_id: string
          reject_reason?: string | null
          requester_id?: string | null
          status?: string
          updated_at?: string
          used_at?: string
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          description?: string
          expense_type?: string
          id?: string
          memo?: string | null
          paid_at?: string | null
          project_id?: string
          reject_reason?: string | null
          requester_id?: string | null
          status?: string
          updated_at?: string
          used_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_expense_records_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "member_current_status"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "finance_expense_records_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_expense_records_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "user_monthly_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "finance_expense_records_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "finance_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_expense_records_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "member_current_status"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "finance_expense_records_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_expense_records_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "user_monthly_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      finance_projects: {
        Row: {
          client_id: string
          contract_amount: number
          contract_end_date: string | null
          contract_start_date: string | null
          created_at: string
          id: string
          memo: string | null
          name: string
          owner_member_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          client_id: string
          contract_amount?: number
          contract_end_date?: string | null
          contract_start_date?: string | null
          created_at?: string
          id?: string
          memo?: string | null
          name: string
          owner_member_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          contract_amount?: number
          contract_end_date?: string | null
          contract_start_date?: string | null
          created_at?: string
          id?: string
          memo?: string | null
          name?: string
          owner_member_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "finance_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_projects_owner_member_id_fkey"
            columns: ["owner_member_id"]
            isOneToOne: false
            referencedRelation: "member_current_status"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "finance_projects_owner_member_id_fkey"
            columns: ["owner_member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_projects_owner_member_id_fkey"
            columns: ["owner_member_id"]
            isOneToOne: false
            referencedRelation: "user_monthly_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      finance_quote_items: {
        Row: {
          description: string | null
          id: string
          name: string
          quantity: number
          quote_id: string
          sort_order: number
          supply_amount: number
          tax_amount: number
          total_amount: number
          unit_price: number
        }
        Insert: {
          description?: string | null
          id?: string
          name: string
          quantity?: number
          quote_id: string
          sort_order?: number
          supply_amount?: number
          tax_amount?: number
          total_amount?: number
          unit_price?: number
        }
        Update: {
          description?: string | null
          id?: string
          name?: string
          quantity?: number
          quote_id?: string
          sort_order?: number
          supply_amount?: number
          tax_amount?: number
          total_amount?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "finance_quote_items_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "finance_quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_quotes: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          client_id: string
          created_at: string
          id: string
          memo: string | null
          project_id: string | null
          quote_date: string
          quote_no: string
          sent_at: string | null
          status: string
          subtotal_amount: number
          tax_amount: number
          total_amount: number
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          client_id: string
          created_at?: string
          id?: string
          memo?: string | null
          project_id?: string | null
          quote_date?: string
          quote_no: string
          sent_at?: string | null
          status?: string
          subtotal_amount?: number
          tax_amount?: number
          total_amount?: number
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          client_id?: string
          created_at?: string
          id?: string
          memo?: string | null
          project_id?: string | null
          quote_date?: string
          quote_no?: string
          sent_at?: string | null
          status?: string
          subtotal_amount?: number
          tax_amount?: number
          total_amount?: number
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "finance_quotes_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "member_current_status"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "finance_quotes_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_quotes_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "user_monthly_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "finance_quotes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "finance_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_quotes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "finance_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_revenue_records: {
        Row: {
          amount: number
          client_id: string
          created_at: string
          expected_payment_date: string | null
          id: string
          memo: string | null
          paid_at: string | null
          project_id: string | null
          quote_id: string | null
          revenue_date: string | null
          revenue_month: string
          status: string
          tax_invoice_status: string
          updated_at: string
        }
        Insert: {
          amount?: number
          client_id: string
          created_at?: string
          expected_payment_date?: string | null
          id?: string
          memo?: string | null
          paid_at?: string | null
          project_id?: string | null
          quote_id?: string | null
          revenue_date?: string | null
          revenue_month: string
          status?: string
          tax_invoice_status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          client_id?: string
          created_at?: string
          expected_payment_date?: string | null
          id?: string
          memo?: string | null
          paid_at?: string | null
          project_id?: string | null
          quote_id?: string | null
          revenue_date?: string | null
          revenue_month?: string
          status?: string
          tax_invoice_status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_revenue_records_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "finance_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_revenue_records_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "finance_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_revenue_records_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "finance_quotes"
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
          adjusted_by: string
          amount: number
          balance_id: string
          created_at: string
          id: string
          reason: string | null
        }
        Insert: {
          adjusted_by: string
          amount: number
          balance_id: string
          created_at?: string
          id?: string
          reason?: string | null
        }
        Update: {
          adjusted_by?: string
          amount?: number
          balance_id?: string
          created_at?: string
          id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leave_adjustments_adjusted_by_fkey"
            columns: ["adjusted_by"]
            isOneToOne: false
            referencedRelation: "member_current_status"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "leave_adjustments_adjusted_by_fkey"
            columns: ["adjusted_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_adjustments_adjusted_by_fkey"
            columns: ["adjusted_by"]
            isOneToOne: false
            referencedRelation: "user_monthly_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "leave_adjustments_balance_id_fkey"
            columns: ["balance_id"]
            isOneToOne: false
            referencedRelation: "leave_balances"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_balances: {
        Row: {
          adjusted: number
          created_at: string
          granted: number
          id: string
          member_id: string
          note: string | null
          type: string
          updated_at: string
          used: number
          year: number
        }
        Insert: {
          adjusted?: number
          created_at?: string
          granted?: number
          id?: string
          member_id: string
          note?: string | null
          type: string
          updated_at?: string
          used?: number
          year: number
        }
        Update: {
          adjusted?: number
          created_at?: string
          granted?: number
          id?: string
          member_id?: string
          note?: string | null
          type?: string
          updated_at?: string
          used?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "leave_balances_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "member_current_status"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "leave_balances_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_balances_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "user_monthly_stats"
            referencedColumns: ["user_id"]
          },
        ]
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
      library_settings: {
        Row: {
          default_rental_period_days: number
          id: string
          updated_at: string
        }
        Insert: {
          default_rental_period_days?: number
          id?: string
          updated_at?: string
        }
        Update: {
          default_rental_period_days?: number
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      locker_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          created_at: string
          id: string
          locker_id: string
          member_id: string
          memo: string | null
          released_at: string | null
          updated_at: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          created_at?: string
          id?: string
          locker_id: string
          member_id: string
          memo?: string | null
          released_at?: string | null
          updated_at?: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          created_at?: string
          id?: string
          locker_id?: string
          member_id?: string
          memo?: string | null
          released_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "locker_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "member_current_status"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "locker_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "locker_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "user_monthly_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "locker_assignments_locker_id_fkey"
            columns: ["locker_id"]
            isOneToOne: false
            referencedRelation: "lockers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "locker_assignments_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "member_current_status"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "locker_assignments_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "locker_assignments_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "user_monthly_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      locker_requests: {
        Row: {
          created_at: string
          current_locker_id: string | null
          id: string
          preferred_locker_id: string | null
          processed_at: string | null
          processed_by: string | null
          reason: string
          reject_reason: string | null
          request_type: string
          requester_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_locker_id?: string | null
          id?: string
          preferred_locker_id?: string | null
          processed_at?: string | null
          processed_by?: string | null
          reason: string
          reject_reason?: string | null
          request_type: string
          requester_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_locker_id?: string | null
          id?: string
          preferred_locker_id?: string | null
          processed_at?: string | null
          processed_by?: string | null
          reason?: string
          reject_reason?: string | null
          request_type?: string
          requester_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "locker_requests_current_locker_id_fkey"
            columns: ["current_locker_id"]
            isOneToOne: false
            referencedRelation: "lockers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "locker_requests_preferred_locker_id_fkey"
            columns: ["preferred_locker_id"]
            isOneToOne: false
            referencedRelation: "lockers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "locker_requests_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "member_current_status"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "locker_requests_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "locker_requests_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "user_monthly_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "locker_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "member_current_status"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "locker_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "locker_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "user_monthly_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      lockers: {
        Row: {
          code: string
          column_label: string | null
          created_at: string
          floor: string | null
          id: string
          location_detail: string
          location_zone: string
          memo: string | null
          row_label: string | null
          status: string
          updated_at: string
        }
        Insert: {
          code: string
          column_label?: string | null
          created_at?: string
          floor?: string | null
          id?: string
          location_detail: string
          location_zone: string
          memo?: string | null
          row_label?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          code?: string
          column_label?: string | null
          created_at?: string
          floor?: string | null
          id?: string
          location_detail?: string
          location_zone?: string
          memo?: string | null
          row_label?: string | null
          status?: string
          updated_at?: string
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
      member_hr_profiles: {
        Row: {
          account_enc: string | null
          created_at: string
          member_id: string
          resident_id_enc: string | null
          salary_effective_date: string | null
          salary_enc: string | null
          salary_note: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          account_enc?: string | null
          created_at?: string
          member_id: string
          resident_id_enc?: string | null
          salary_effective_date?: string | null
          salary_enc?: string | null
          salary_note?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          account_enc?: string | null
          created_at?: string
          member_id?: string
          resident_id_enc?: string | null
          salary_effective_date?: string | null
          salary_enc?: string | null
          salary_note?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "member_hr_profiles_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: true
            referencedRelation: "member_current_status"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "member_hr_profiles_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: true
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_hr_profiles_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: true
            referencedRelation: "user_monthly_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "member_hr_profiles_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "member_current_status"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "member_hr_profiles_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_hr_profiles_updated_by_fkey"
            columns: ["updated_by"]
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
          admin_role: string | null
          birth_date: string | null
          created_at: string | null
          division_id: string | null
          email: string | null
          full_name: string
          hire_date: string | null
          id: string
          intern_months: number | null
          login_id: string
          member_role: Database["public"]["Enums"]["member_role"]
          note: string | null
          organization_id: string | null
          passport_number: string | null
          password: string
          phone: string | null
          position_id: string
          role: string | null
          team_id: string | null
          title_id: string | null
          updated_at: string | null
          user_authority: string | null
        }
        Insert: {
          admin_role?: string | null
          birth_date?: string | null
          created_at?: string | null
          division_id?: string | null
          email?: string | null
          full_name: string
          hire_date?: string | null
          id?: string
          intern_months?: number | null
          login_id: string
          member_role?: Database["public"]["Enums"]["member_role"]
          note?: string | null
          organization_id?: string | null
          passport_number?: string | null
          password: string
          phone?: string | null
          position_id?: string
          role?: string | null
          team_id?: string | null
          title_id?: string | null
          updated_at?: string | null
          user_authority?: string | null
        }
        Update: {
          admin_role?: string | null
          birth_date?: string | null
          created_at?: string | null
          division_id?: string | null
          email?: string | null
          full_name?: string
          hire_date?: string | null
          id?: string
          intern_months?: number | null
          login_id?: string
          member_role?: Database["public"]["Enums"]["member_role"]
          note?: string | null
          organization_id?: string | null
          passport_number?: string | null
          password?: string
          phone?: string | null
          position_id?: string
          role?: string | null
          team_id?: string | null
          title_id?: string | null
          updated_at?: string | null
          user_authority?: string | null
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
            foreignKeyName: "members_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "members_title_id_fkey"
            columns: ["title_id"]
            isOneToOne: false
            referencedRelation: "titles"
            referencedColumns: ["id"]
          },
        ]
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
      monthly_drink_applications: {
        Row: {
          collection_id: string | null
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
          collection_id?: string | null
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
          collection_id?: string | null
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
      multisource_evaluation_assignments: {
        Row: {
          created_at: string
          evaluator_member_id: string
          excluded_reason: string | null
          id: string
          is_excluded: boolean
          round_id: string
          source: Database["public"]["Enums"]["multisource_evaluation_assignment_source"]
          subject_member_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          evaluator_member_id: string
          excluded_reason?: string | null
          id?: string
          is_excluded?: boolean
          round_id: string
          source?: Database["public"]["Enums"]["multisource_evaluation_assignment_source"]
          subject_member_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          evaluator_member_id?: string
          excluded_reason?: string | null
          id?: string
          is_excluded?: boolean
          round_id?: string
          source?: Database["public"]["Enums"]["multisource_evaluation_assignment_source"]
          subject_member_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "multisource_evaluation_assignments_evaluator_member_id_fkey"
            columns: ["evaluator_member_id"]
            isOneToOne: false
            referencedRelation: "member_current_status"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "multisource_evaluation_assignments_evaluator_member_id_fkey"
            columns: ["evaluator_member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "multisource_evaluation_assignments_evaluator_member_id_fkey"
            columns: ["evaluator_member_id"]
            isOneToOne: false
            referencedRelation: "user_monthly_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "multisource_evaluation_assignments_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "multisource_evaluation_rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "multisource_evaluation_assignments_subject_fkey"
            columns: ["round_id", "subject_member_id"]
            isOneToOne: false
            referencedRelation: "multisource_evaluation_subjects"
            referencedColumns: ["round_id", "member_id"]
          },
          {
            foreignKeyName: "multisource_evaluation_assignments_subject_member_id_fkey"
            columns: ["subject_member_id"]
            isOneToOne: false
            referencedRelation: "member_current_status"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "multisource_evaluation_assignments_subject_member_id_fkey"
            columns: ["subject_member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "multisource_evaluation_assignments_subject_member_id_fkey"
            columns: ["subject_member_id"]
            isOneToOne: false
            referencedRelation: "user_monthly_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      multisource_evaluation_audit_logs: {
        Row: {
          action: string
          actor_member_id: string | null
          actor_name: string | null
          created_at: string
          id: string
          new_data: Json | null
          old_data: Json | null
          round_id: string | null
          target_id: string | null
          target_table: string
        }
        Insert: {
          action: string
          actor_member_id?: string | null
          actor_name?: string | null
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          round_id?: string | null
          target_id?: string | null
          target_table: string
        }
        Update: {
          action?: string
          actor_member_id?: string | null
          actor_name?: string | null
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          round_id?: string | null
          target_id?: string | null
          target_table?: string
        }
        Relationships: [
          {
            foreignKeyName: "multisource_evaluation_audit_logs_actor_member_id_fkey"
            columns: ["actor_member_id"]
            isOneToOne: false
            referencedRelation: "member_current_status"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "multisource_evaluation_audit_logs_actor_member_id_fkey"
            columns: ["actor_member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "multisource_evaluation_audit_logs_actor_member_id_fkey"
            columns: ["actor_member_id"]
            isOneToOne: false
            referencedRelation: "user_monthly_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "multisource_evaluation_audit_logs_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "multisource_evaluation_rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      multisource_evaluation_question_set_items: {
        Row: {
          category: string | null
          created_at: string
          detail: string | null
          evaluator_title_ids: string[]
          evaluator_types: string[]
          id: string
          is_required: boolean
          position_id: string
          prompt: string
          question_set_id: string
          question_type: Database["public"]["Enums"]["multisource_evaluation_question_type"]
          scale_guide: string | null
          scale_max: number
          scale_min: number
          scale_weights: Json
          sort_order: number
          subcategory: string | null
          updated_at: string
          weight: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          detail?: string | null
          evaluator_title_ids?: string[]
          evaluator_types?: string[]
          id?: string
          is_required?: boolean
          position_id: string
          prompt: string
          question_set_id: string
          question_type: Database["public"]["Enums"]["multisource_evaluation_question_type"]
          scale_guide?: string | null
          scale_max?: number
          scale_min?: number
          scale_weights?: Json
          sort_order?: number
          subcategory?: string | null
          updated_at?: string
          weight?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string
          detail?: string | null
          evaluator_title_ids?: string[]
          evaluator_types?: string[]
          id?: string
          is_required?: boolean
          position_id?: string
          prompt?: string
          question_set_id?: string
          question_type?: Database["public"]["Enums"]["multisource_evaluation_question_type"]
          scale_guide?: string | null
          scale_max?: number
          scale_min?: number
          scale_weights?: Json
          sort_order?: number
          subcategory?: string | null
          updated_at?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "multisource_evaluation_question_set_items_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "multisource_evaluation_question_set_items_set_id_fkey"
            columns: ["question_set_id"]
            isOneToOne: false
            referencedRelation: "multisource_evaluation_question_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      multisource_evaluation_question_sets: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          is_default: boolean
          name: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "multisource_evaluation_question_sets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "member_current_status"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "multisource_evaluation_question_sets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "multisource_evaluation_question_sets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_monthly_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "multisource_evaluation_question_sets_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "member_current_status"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "multisource_evaluation_question_sets_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "multisource_evaluation_question_sets_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_monthly_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      multisource_evaluation_questions: {
        Row: {
          created_at: string
          evaluator_types: string[]
          id: string
          is_required: boolean
          position_id: string
          prompt: string
          question_type: Database["public"]["Enums"]["multisource_evaluation_question_type"]
          round_id: string
          scale_weights: Json
          sort_order: number
          updated_at: string
          weight: number | null
        }
        Insert: {
          created_at?: string
          evaluator_types?: string[]
          id?: string
          is_required?: boolean
          position_id: string
          prompt: string
          question_type: Database["public"]["Enums"]["multisource_evaluation_question_type"]
          round_id: string
          scale_weights?: Json
          sort_order?: number
          updated_at?: string
          weight?: number | null
        }
        Update: {
          created_at?: string
          evaluator_types?: string[]
          id?: string
          is_required?: boolean
          position_id?: string
          prompt?: string
          question_type?: Database["public"]["Enums"]["multisource_evaluation_question_type"]
          round_id?: string
          scale_weights?: Json
          sort_order?: number
          updated_at?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "multisource_evaluation_questions_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "multisource_evaluation_questions_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "multisource_evaluation_rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      multisource_evaluation_response_answers: {
        Row: {
          created_at: string
          id: string
          question_id: string | null
          question_prompt: string
          question_type: Database["public"]["Enums"]["multisource_evaluation_question_type"]
          response_id: string
          scale_weight: number | null
          score_value: number | null
          text_answer: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          question_id?: string | null
          question_prompt: string
          question_type: Database["public"]["Enums"]["multisource_evaluation_question_type"]
          response_id: string
          scale_weight?: number | null
          score_value?: number | null
          text_answer?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          question_id?: string | null
          question_prompt?: string
          question_type?: Database["public"]["Enums"]["multisource_evaluation_question_type"]
          response_id?: string
          scale_weight?: number | null
          score_value?: number | null
          text_answer?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "multisource_evaluation_response_answers_question_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "multisource_evaluation_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "multisource_evaluation_response_answers_response_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "multisource_evaluation_responses"
            referencedColumns: ["id"]
          },
        ]
      }
      multisource_evaluation_responses: {
        Row: {
          assignment_id: string
          created_at: string
          evaluator_member_id: string
          id: string
          round_id: string
          subject_member_id: string
          submitted_at: string
        }
        Insert: {
          assignment_id: string
          created_at?: string
          evaluator_member_id: string
          id?: string
          round_id: string
          subject_member_id: string
          submitted_at?: string
        }
        Update: {
          assignment_id?: string
          created_at?: string
          evaluator_member_id?: string
          id?: string
          round_id?: string
          subject_member_id?: string
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "multisource_evaluation_responses_evaluator_fkey"
            columns: ["evaluator_member_id"]
            isOneToOne: false
            referencedRelation: "member_current_status"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "multisource_evaluation_responses_evaluator_fkey"
            columns: ["evaluator_member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "multisource_evaluation_responses_evaluator_fkey"
            columns: ["evaluator_member_id"]
            isOneToOne: false
            referencedRelation: "user_monthly_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "multisource_evaluation_responses_round_assignment_fkey"
            columns: ["assignment_id"]
            isOneToOne: true
            referencedRelation: "multisource_evaluation_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "multisource_evaluation_responses_round_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "multisource_evaluation_rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "multisource_evaluation_responses_subject_fkey"
            columns: ["subject_member_id"]
            isOneToOne: false
            referencedRelation: "member_current_status"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "multisource_evaluation_responses_subject_fkey"
            columns: ["subject_member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "multisource_evaluation_responses_subject_fkey"
            columns: ["subject_member_id"]
            isOneToOne: false
            referencedRelation: "user_monthly_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      multisource_evaluation_rounds: {
        Row: {
          config_version: number
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          created_by: string | null
          deployed_at: string | null
          deployed_by: string | null
          description: string | null
          end_date: string
          id: string
          is_deployed: boolean
          name: string
          question_set_applied_at: string | null
          question_set_id: string | null
          start_date: string
          status: Database["public"]["Enums"]["multisource_evaluation_round_status"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          config_version?: number
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          created_by?: string | null
          deployed_at?: string | null
          deployed_by?: string | null
          description?: string | null
          end_date: string
          id?: string
          is_deployed?: boolean
          name: string
          question_set_applied_at?: string | null
          question_set_id?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["multisource_evaluation_round_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          config_version?: number
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          created_by?: string | null
          deployed_at?: string | null
          deployed_by?: string | null
          description?: string | null
          end_date?: string
          id?: string
          is_deployed?: boolean
          name?: string
          question_set_applied_at?: string | null
          question_set_id?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["multisource_evaluation_round_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "multisource_evaluation_rounds_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "member_current_status"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "multisource_evaluation_rounds_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "multisource_evaluation_rounds_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "user_monthly_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "multisource_evaluation_rounds_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "member_current_status"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "multisource_evaluation_rounds_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "multisource_evaluation_rounds_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_monthly_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "multisource_evaluation_rounds_deployed_by_fkey"
            columns: ["deployed_by"]
            isOneToOne: false
            referencedRelation: "member_current_status"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "multisource_evaluation_rounds_deployed_by_fkey"
            columns: ["deployed_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "multisource_evaluation_rounds_deployed_by_fkey"
            columns: ["deployed_by"]
            isOneToOne: false
            referencedRelation: "user_monthly_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "multisource_evaluation_rounds_question_set_id_fkey"
            columns: ["question_set_id"]
            isOneToOne: false
            referencedRelation: "multisource_evaluation_question_sets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "multisource_evaluation_rounds_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "member_current_status"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "multisource_evaluation_rounds_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "multisource_evaluation_rounds_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_monthly_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      multisource_evaluation_subjects: {
        Row: {
          created_at: string
          excluded_reason: string | null
          id: string
          is_excluded: boolean
          member_id: string
          round_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          excluded_reason?: string | null
          id?: string
          is_excluded?: boolean
          member_id: string
          round_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          excluded_reason?: string | null
          id?: string
          is_excluded?: boolean
          member_id?: string
          round_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "multisource_evaluation_subjects_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "member_current_status"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "multisource_evaluation_subjects_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "multisource_evaluation_subjects_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "user_monthly_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "multisource_evaluation_subjects_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "multisource_evaluation_rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      offboarding_checklist_items: {
        Row: {
          completed_at: string | null
          completion_note: string | null
          created_at: string
          description: string | null
          id: string
          is_completed: boolean
          offboarding_request_id: string
          responsible_party: string | null
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          completion_note?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_completed?: boolean
          offboarding_request_id: string
          responsible_party?: string | null
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          completion_note?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_completed?: boolean
          offboarding_request_id?: string
          responsible_party?: string | null
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "offboarding_checklist_items_offboarding_request_id_fkey"
            columns: ["offboarding_request_id"]
            isOneToOne: false
            referencedRelation: "offboarding_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      offboarding_checklist_presets: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          responsible_party: string | null
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          responsible_party?: string | null
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          responsible_party?: string | null
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      offboarding_requests: {
        Row: {
          admin_note: string | null
          completed_at: string | null
          confirmed_final_working_date: string | null
          created_at: string
          id: string
          member_id: string
          note: string | null
          processed_at: string | null
          processed_by: string | null
          reason: string
          rejection_reason: string | null
          requested_final_working_date: string
          status: string
          updated_at: string
        }
        Insert: {
          admin_note?: string | null
          completed_at?: string | null
          confirmed_final_working_date?: string | null
          created_at?: string
          id?: string
          member_id: string
          note?: string | null
          processed_at?: string | null
          processed_by?: string | null
          reason: string
          rejection_reason?: string | null
          requested_final_working_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          admin_note?: string | null
          completed_at?: string | null
          confirmed_final_working_date?: string | null
          created_at?: string
          id?: string
          member_id?: string
          note?: string | null
          processed_at?: string | null
          processed_by?: string | null
          reason?: string
          rejection_reason?: string | null
          requested_final_working_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "offboarding_requests_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "member_current_status"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "offboarding_requests_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offboarding_requests_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "user_monthly_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "offboarding_requests_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "member_current_status"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "offboarding_requests_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offboarding_requests_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "user_monthly_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      office_seats: {
        Row: {
          code: string
          column_label: string | null
          created_at: string
          floor: string | null
          id: string
          name: string
          note: string | null
          row_label: string | null
          status: string
          updated_at: string
          zone: string
        }
        Insert: {
          code: string
          column_label?: string | null
          created_at?: string
          floor?: string | null
          id?: string
          name: string
          note?: string | null
          row_label?: string | null
          status?: string
          updated_at?: string
          zone: string
        }
        Update: {
          code?: string
          column_label?: string | null
          created_at?: string
          floor?: string | null
          id?: string
          name?: string
          note?: string | null
          row_label?: string | null
          status?: string
          updated_at?: string
          zone?: string
        }
        Relationships: []
      }
      onboarding_checklist_items: {
        Row: {
          completed_at: string | null
          completion_note: string | null
          created_at: string
          description: string | null
          id: string
          is_completed: boolean
          onboarding_request_id: string
          responsible_party: string | null
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          completion_note?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_completed?: boolean
          onboarding_request_id: string
          responsible_party?: string | null
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          completion_note?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_completed?: boolean
          onboarding_request_id?: string
          responsible_party?: string | null
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_checklist_items_onboarding_request_id_fkey"
            columns: ["onboarding_request_id"]
            isOneToOne: false
            referencedRelation: "onboarding_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_checklist_presets: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          responsible_party: string | null
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          responsible_party?: string | null
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          responsible_party?: string | null
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      onboarding_requests: {
        Row: {
          admin_note: string | null
          completed_at: string | null
          created_at: string
          id: string
          member_id: string
          note: string | null
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          admin_note?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          member_id: string
          note?: string | null
          start_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          admin_note?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          member_id?: string
          note?: string | null
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_requests_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "member_current_status"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "onboarding_requests_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_requests_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "user_monthly_stats"
            referencedColumns: ["user_id"]
          },
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
      parking_notice_settings: {
        Row: {
          content: Json
          created_at: string
          id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          content: Json
          created_at?: string
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          content?: Json
          created_at?: string
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "parking_notice_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "member_current_status"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "parking_notice_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parking_notice_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_monthly_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      parking_registrations: {
        Row: {
          admin_note: string | null
          created_at: string
          extra_ticket_codes: string[]
          id: string
          member_id: string
          note: string | null
          plate_normalized: string | null
          processed_at: string | null
          processed_by: string | null
          rejection_reason: string | null
          requested_end_date: string | null
          requested_start_date: string
          status: string
          ticket_code: string
          updated_at: string
          usage_type: string
          vehicle_name: string
          vehicle_plate: string
          vehicle_type: string
        }
        Insert: {
          admin_note?: string | null
          created_at?: string
          extra_ticket_codes?: string[]
          id?: string
          member_id: string
          note?: string | null
          plate_normalized?: string | null
          processed_at?: string | null
          processed_by?: string | null
          rejection_reason?: string | null
          requested_end_date?: string | null
          requested_start_date: string
          status?: string
          ticket_code?: string
          updated_at?: string
          usage_type?: string
          vehicle_name: string
          vehicle_plate: string
          vehicle_type: string
        }
        Update: {
          admin_note?: string | null
          created_at?: string
          extra_ticket_codes?: string[]
          id?: string
          member_id?: string
          note?: string | null
          plate_normalized?: string | null
          processed_at?: string | null
          processed_by?: string | null
          rejection_reason?: string | null
          requested_end_date?: string | null
          requested_start_date?: string
          status?: string
          ticket_code?: string
          updated_at?: string
          usage_type?: string
          vehicle_name?: string
          vehicle_plate?: string
          vehicle_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "parking_registrations_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "member_current_status"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "parking_registrations_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parking_registrations_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "user_monthly_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "parking_registrations_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "member_current_status"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "parking_registrations_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parking_registrations_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "user_monthly_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      positions: {
        Row: {
          annual_leave_days: number
          created_at: string | null
          id: string
          leave_accrual_rule: string
          name: string
          sort_order: number
          updated_at: string | null
        }
        Insert: {
          annual_leave_days?: number
          created_at?: string | null
          id?: string
          leave_accrual_rule?: string
          name: string
          sort_order: number
          updated_at?: string | null
        }
        Update: {
          annual_leave_days?: number
          created_at?: string | null
          id?: string
          leave_accrual_rule?: string
          name?: string
          sort_order?: number
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
      seat_assignments: {
        Row: {
          assigned_by: string | null
          created_at: string
          end_date: string | null
          ended_at: string | null
          id: string
          is_primary: boolean
          member_id: string
          note: string | null
          request_id: string | null
          seat_id: string
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          assigned_by?: string | null
          created_at?: string
          end_date?: string | null
          ended_at?: string | null
          id?: string
          is_primary?: boolean
          member_id: string
          note?: string | null
          request_id?: string | null
          seat_id: string
          start_date?: string
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_by?: string | null
          created_at?: string
          end_date?: string | null
          ended_at?: string | null
          id?: string
          is_primary?: boolean
          member_id?: string
          note?: string | null
          request_id?: string | null
          seat_id?: string
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seat_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "member_current_status"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "seat_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seat_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "user_monthly_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "seat_assignments_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "member_current_status"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "seat_assignments_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seat_assignments_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "user_monthly_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "seat_assignments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "seat_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seat_assignments_seat_id_fkey"
            columns: ["seat_id"]
            isOneToOne: false
            referencedRelation: "office_seats"
            referencedColumns: ["id"]
          },
        ]
      }
      seat_requests: {
        Row: {
          assigned_seat_id: string | null
          created_at: string
          id: string
          member_id: string
          note: string | null
          processed_at: string | null
          processed_by: string | null
          rejection_reason: string | null
          requested_end_date: string | null
          requested_seat_id: string | null
          requested_start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          assigned_seat_id?: string | null
          created_at?: string
          id?: string
          member_id: string
          note?: string | null
          processed_at?: string | null
          processed_by?: string | null
          rejection_reason?: string | null
          requested_end_date?: string | null
          requested_seat_id?: string | null
          requested_start_date?: string
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_seat_id?: string | null
          created_at?: string
          id?: string
          member_id?: string
          note?: string | null
          processed_at?: string | null
          processed_by?: string | null
          rejection_reason?: string | null
          requested_end_date?: string | null
          requested_seat_id?: string | null
          requested_start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seat_requests_assigned_seat_id_fkey"
            columns: ["assigned_seat_id"]
            isOneToOne: false
            referencedRelation: "office_seats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seat_requests_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "member_current_status"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "seat_requests_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seat_requests_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "user_monthly_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "seat_requests_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "member_current_status"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "seat_requests_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seat_requests_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "user_monthly_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "seat_requests_requested_seat_id_fkey"
            columns: ["requested_seat_id"]
            isOneToOne: false
            referencedRelation: "office_seats"
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
      titles: {
        Row: {
          created_at: string | null
          id: string
          name: string
          sort_order: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          sort_order: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string | null
        }
        Relationships: []
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
          no: number
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
      vehicle_applications: {
        Row: {
          applicant_name: string
          approver_name: string
          arrival_place: string
          created_at: string
          department: string
          departure_place: string
          edited_at: string | null
          end_at: string
          has_hipass: boolean
          id: string
          passengers: string | null
          purpose: string
          reject_reason: string | null
          request_date: string
          requester_id: string | null
          return_distance_km: number | null
          return_end_odometer_km: number | null
          return_memo: string | null
          return_start_odometer_km: number | null
          returned_at: string | null
          returned_by_id: string | null
          returned_by_name: string | null
          same_day_distance_km: number | null
          shared_references: string | null
          start_at: string
          status: string
          total_distance_km: number | null
          updated_at: string
          vehicle_id: string | null
          vehicle_name_snapshot: string
          vehicle_type: string
        }
        Insert: {
          applicant_name: string
          approver_name?: string
          arrival_place: string
          created_at?: string
          department: string
          departure_place: string
          edited_at?: string | null
          end_at: string
          has_hipass?: boolean
          id?: string
          passengers?: string | null
          purpose: string
          reject_reason?: string | null
          request_date?: string
          requester_id?: string | null
          return_distance_km?: number | null
          return_end_odometer_km?: number | null
          return_memo?: string | null
          return_start_odometer_km?: number | null
          returned_at?: string | null
          returned_by_id?: string | null
          returned_by_name?: string | null
          same_day_distance_km?: number | null
          shared_references?: string | null
          start_at: string
          status?: string
          total_distance_km?: number | null
          updated_at?: string
          vehicle_id?: string | null
          vehicle_name_snapshot: string
          vehicle_type: string
        }
        Update: {
          applicant_name?: string
          approver_name?: string
          arrival_place?: string
          created_at?: string
          department?: string
          departure_place?: string
          edited_at?: string | null
          end_at?: string
          has_hipass?: boolean
          id?: string
          passengers?: string | null
          purpose?: string
          reject_reason?: string | null
          request_date?: string
          requester_id?: string | null
          return_distance_km?: number | null
          return_end_odometer_km?: number | null
          return_memo?: string | null
          return_start_odometer_km?: number | null
          returned_at?: string | null
          returned_by_id?: string | null
          returned_by_name?: string | null
          same_day_distance_km?: number | null
          shared_references?: string | null
          start_at?: string
          status?: string
          total_distance_km?: number | null
          updated_at?: string
          vehicle_id?: string | null
          vehicle_name_snapshot?: string
          vehicle_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_applications_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "member_current_status"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "vehicle_applications_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_applications_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "user_monthly_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "vehicle_applications_returned_by_id_fkey"
            columns: ["returned_by_id"]
            isOneToOne: false
            referencedRelation: "member_current_status"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "vehicle_applications_returned_by_id_fkey"
            columns: ["returned_by_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_applications_returned_by_id_fkey"
            columns: ["returned_by_id"]
            isOneToOne: false
            referencedRelation: "user_monthly_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "vehicle_applications_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "company_vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      work_applications: {
        Row: {
          application_type: string
          approved_at: string | null
          approver_id: string | null
          created_at: string
          end_time: string
          id: string
          location: string | null
          project_name: string
          reason: string
          reject_reason: string | null
          requester_id: string
          start_time: string
          status: string
          updated_at: string
          work_date: string
        }
        Insert: {
          application_type: string
          approved_at?: string | null
          approver_id?: string | null
          created_at?: string
          end_time: string
          id?: string
          location?: string | null
          project_name: string
          reason: string
          reject_reason?: string | null
          requester_id: string
          start_time: string
          status?: string
          updated_at?: string
          work_date: string
        }
        Update: {
          application_type?: string
          approved_at?: string | null
          approver_id?: string | null
          created_at?: string
          end_time?: string
          id?: string
          location?: string | null
          project_name?: string
          reason?: string
          reject_reason?: string | null
          requester_id?: string
          start_time?: string
          status?: string
          updated_at?: string
          work_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_applications_approver_id_fkey"
            columns: ["approver_id"]
            isOneToOne: false
            referencedRelation: "member_current_status"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "work_applications_approver_id_fkey"
            columns: ["approver_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_applications_approver_id_fkey"
            columns: ["approver_id"]
            isOneToOne: false
            referencedRelation: "user_monthly_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "work_applications_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "member_current_status"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "work_applications_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_applications_requester_id_fkey"
            columns: ["requester_id"]
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
          birth_date: string | null
          created_at: string | null
          current_status:
            | Database["public"]["Enums"]["member_status_type"]
            | null
          division_id: string | null
          division_name: string | null
          email: string | null
          full_name: string | null
          login_id: string | null
          member_id: string | null
          member_role: Database["public"]["Enums"]["member_role"] | null
          passport_number: string | null
          phone: string | null
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
            foreignKeyName: "members_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "members_title_id_fkey"
            columns: ["title_id"]
            isOneToOne: false
            referencedRelation: "titles"
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
        }[]
        SetofOptions: {
          from: "*"
          to: "usage_records"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      apply_leave_balance_delta: {
        Args: {
          p_leave_date: string
          p_leave_type_id: number
          p_member_id: string
          p_multiplier: number
        }
        Returns: undefined
      }
      assert_safe_corporate_card_payload: {
        Args: { p_payload: Json }
        Returns: undefined
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
      change_member_password: {
        Args: {
          p_current_password: string
          p_member_id: string
          p_new_password: string
        }
        Returns: boolean
      }
      complete_offboarding_request: {
        Args: { p_request_id: string }
        Returns: string
      }
      complete_onboarding_request: {
        Args: { p_request_id: string }
        Returns: string
      }
      create_leave_request_atomic: {
        Args: {
          p_approver_id: string
          p_author_id: string
          p_cc_member_ids?: string[]
          p_dates: string[]
          p_initial_status?: string
          p_late_hour?: string
          p_late_minute?: string
          p_leave_type_id: number
          p_reason?: string
          p_request_id: string
          p_target_id: string
        }
        Returns: {
          approval_id: string
          approval_status: string
          dayoff_id: string
          leave_date: string
        }[]
      }
      create_work_application_with_approvals: {
        Args: {
          p_application_type: string
          p_approver_ids: string[]
          p_cc_member_ids?: string[]
          p_end_time: string
          p_location?: string
          p_project_name: string
          p_reason: string
          p_requester_id: string
          p_start_time: string
          p_work_date: string
        }
        Returns: {
          application_type: string
          approved_at: string | null
          approver_id: string | null
          created_at: string
          end_time: string
          id: string
          location: string | null
          project_name: string
          reason: string
          reject_reason: string | null
          requester_id: string
          start_time: string
          status: string
          updated_at: string
          work_date: string
        }[]
        SetofOptions: {
          from: "*"
          to: "work_applications"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      default_position_id: { Args: never; Returns: string }
      delete_dayoff_atomic: {
        Args: { p_actor_id: string; p_dayoff_id: string; p_is_admin: boolean }
        Returns: undefined
      }
      generate_annual_leave: { Args: { p_year: number }; Returns: number }
      get_approver_for_member: {
        Args: { p_member_id: string }
        Returns: string
      }
      get_cc_approval_request_ids: {
        Args: { p_limit?: number; p_member_id: string }
        Returns: {
          approval_id: string
        }[]
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
      move_seat_assignment: {
        Args: {
          p_actor_id: string
          p_assignment_id: string
          p_end_date?: string
          p_new_seat_id: string
          p_note?: string
          p_start_date?: string
        }
        Returns: string
      }
      mutate_company_document_file: {
        Args: {
          p_actor_id: string
          p_ip_address?: string
          p_operation: string
          p_payload: Json
          p_request_path?: string
          p_user_agent?: string
        }
        Returns: Json
      }
      normalize_restaurant_name: { Args: { name: string }; Returns: string }
      record_attendance_check_in: {
        Args: { p_member_id: string }
        Returns: {
          approved_at: string | null
          approver_id: string | null
          attendance_type: string
          check_in_at: string | null
          check_in_status: string | null
          check_out_at: string | null
          check_out_status: string | null
          created_at: string
          date: string
          id: string
          is_weekend: boolean
          location: string | null
          login_ip: string | null
          login_ip2: string | null
          member_id: string
          modifier_id: string | null
          note: string | null
          overtime_minutes: number
          reference: string | null
          status: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "attendance_records"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      record_attendance_check_out: {
        Args: { p_early_leave_reason?: string; p_member_id: string }
        Returns: {
          approved_at: string | null
          approver_id: string | null
          attendance_type: string
          check_in_at: string | null
          check_in_status: string | null
          check_out_at: string | null
          check_out_status: string | null
          created_at: string
          date: string
          id: string
          is_weekend: boolean
          location: string | null
          login_ip: string | null
          login_ip2: string | null
          member_id: string
          modifier_id: string | null
          note: string | null
          overtime_minutes: number
          reference: string | null
          status: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "attendance_records"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      resolve_leave_approval_atomic: {
        Args: {
          p_action: string
          p_actor_id: string
          p_approval_id: string
          p_reject_reason?: string
          p_require_assigned_approver?: boolean
        }
        Returns: {
          approver_id: string
          cc_member_ids: string[] | null
          id: string
          reject_reason: string | null
          related_id: string | null
          related_table: string | null
          requested_at: string
          requester_id: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
          type: string
        }[]
        SetofOptions: {
          from: "*"
          to: "approval_requests"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      resolve_seat_request: {
        Args: {
          p_action: string
          p_actor_id: string
          p_end_date?: string
          p_rejection_reason?: string
          p_request_id: string
          p_seat_id?: string
          p_start_date?: string
        }
        Returns: string
      }
      resolve_work_application_approval: {
        Args: {
          p_action: string
          p_approval_id: string
          p_approver_id: string
          p_reject_reason?: string
          p_resolved_by?: string
        }
        Returns: {
          application_type: string
          approved_at: string | null
          approver_id: string | null
          created_at: string
          end_time: string
          id: string
          location: string | null
          project_name: string
          reason: string
          reject_reason: string | null
          requester_id: string
          start_time: string
          status: string
          updated_at: string
          work_date: string
        }[]
        SetofOptions: {
          from: "*"
          to: "work_applications"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      revert_review_status: {
        Args: {
          p_reviewer_id: string
          p_target_status: number
          p_usage_record_id: string
        }
        Returns: {
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
        }[]
        SetofOptions: {
          from: "*"
          to: "usage_records"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      set_work_application_approval_status: {
        Args: {
          p_application_id: string
          p_reject_reason?: string
          p_resolved_by: string
          p_status: string
        }
        Returns: {
          application_type: string
          approved_at: string | null
          approver_id: string | null
          created_at: string
          end_time: string
          id: string
          location: string | null
          project_name: string
          reason: string
          reject_reason: string | null
          requester_id: string
          start_time: string
          status: string
          updated_at: string
          work_date: string
        }[]
        SetofOptions: {
          from: "*"
          to: "work_applications"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      toggle_review_status: {
        Args: { p_reviewer_id: string; p_usage_record_id: string }
        Returns: {
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
        SetofOptions: {
          from: "*"
          to: "usage_records"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_dayoff_atomic: {
        Args: {
          p_changes: Json
          p_dayoff_id: string
          p_editor_id: string
          p_is_admin: boolean
        }
        Returns: {
          approval_status: string
          approved_at: string | null
          approver_id: string | null
          author_id: string
          cc_member_ids: string[] | null
          created_at: string
          edit_reason: string | null
          final_approved_at: string | null
          final_approver_id: string | null
          first_approved_at: string | null
          first_approver_id: string | null
          id: string
          is_deleted: boolean
          last_editor_id: string | null
          late_hour: string | null
          late_minute: string | null
          leave_date: string
          leave_type_id: number
          reason: string | null
          request_fingerprint: string | null
          request_id: string | null
          target_id: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "dayoffs"
          isOneToOne: false
          isSetofReturn: true
        }
      }
    }
    Enums: {
      budget_type: "복지포인트" | "활동비"
      member_role: "대표" | "본부장" | "팀장" | "팀원" | "인턴"
      member_status_type:
        | "육아휴직"
        | "병가"
        | "재택근무"
        | "파견"
        | "휴직"
        | "퇴사"
      multisource_evaluation_assignment_source:
        | "auto_same_team"
        | "auto_leader"
        | "manual"
      multisource_evaluation_question_type: "score" | "subjective"
      multisource_evaluation_round_status: "draft" | "confirmed" | "closed"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  supervisor: {
    Tables: {
      assignments: {
        Row: {
          assigned_at: string
          attendance_confirmed_at: string | null
          attendance_confirmed_by: string | null
          attendance_status: string | null
          checked_in_at: string | null
          confirmed_at: string | null
          confirmed_by: string | null
          contract_status: string | null
          id: string
          job_posting_id: string
          pay_rate_override: number | null
          pay_type_override: string | null
          room_slots: Json | null
          signature_image_path: string | null
          signed_at: string | null
          status: string
          updated_at: string
          worker_id: string
        }
        Insert: {
          assigned_at?: string
          attendance_confirmed_at?: string | null
          attendance_confirmed_by?: string | null
          attendance_status?: string | null
          checked_in_at?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          contract_status?: string | null
          id?: string
          job_posting_id: string
          pay_rate_override?: number | null
          pay_type_override?: string | null
          room_slots?: Json | null
          signature_image_path?: string | null
          signed_at?: string | null
          status?: string
          updated_at?: string
          worker_id: string
        }
        Update: {
          assigned_at?: string
          attendance_confirmed_at?: string | null
          attendance_confirmed_by?: string | null
          attendance_status?: string | null
          checked_in_at?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          contract_status?: string | null
          id?: string
          job_posting_id?: string
          pay_rate_override?: number | null
          pay_type_override?: string | null
          room_slots?: Json | null
          signature_image_path?: string | null
          signed_at?: string | null
          status?: string
          updated_at?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignments_job_posting_id_fkey"
            columns: ["job_posting_id"]
            isOneToOne: false
            referencedRelation: "job_postings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      auth_rate_limits: {
        Row: {
          attempts: number
          rate_key: string
          window_started_at: string
        }
        Insert: {
          attempts?: number
          rate_key: string
          window_started_at?: string
        }
        Update: {
          attempts?: number
          rate_key?: string
          window_started_at?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          id: string
          memo: string | null
          name: string
          parent_company: string | null
          updated_at: string
        }
        Insert: {
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          memo?: string | null
          name: string
          parent_company?: string | null
          updated_at?: string
        }
        Update: {
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          memo?: string | null
          name?: string
          parent_company?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      contract_documents: {
        Row: {
          assignment_id: string | null
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          mime_type: string | null
          uploaded_at: string
          uploaded_by: string | null
          worker_id: string
        }
        Insert: {
          assignment_id?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          uploaded_at?: string
          uploaded_by?: string | null
          worker_id: string
        }
        Update: {
          assignment_id?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          uploaded_at?: string
          uploaded_by?: string | null
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_documents_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_documents_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_expense_reports: {
        Row: {
          created_at: string
          grand_total: number
          id: string
          items: Json
          job_posting_id: string | null
          month: number | null
          status: string
          title: string
          total_extra_cost: number
          total_labor_cost: number
          updated_at: string
          year: number | null
        }
        Insert: {
          created_at?: string
          grand_total?: number
          id?: string
          items?: Json
          job_posting_id?: string | null
          month?: number | null
          status?: string
          title: string
          total_extra_cost?: number
          total_labor_cost?: number
          updated_at?: string
          year?: number | null
        }
        Update: {
          created_at?: string
          grand_total?: number
          id?: string
          items?: Json
          job_posting_id?: string | null
          month?: number | null
          status?: string
          title?: string
          total_extra_cost?: number
          total_labor_cost?: number
          updated_at?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "interview_expense_reports_job_posting_id_fkey"
            columns: ["job_posting_id"]
            isOneToOne: true
            referencedRelation: "interview_job_postings"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_job_assignments: {
        Row: {
          created_at: string
          id: string
          job_posting_id: string
          note: string | null
          pay_rate: number
          pay_type: string
          personnel_id: string
          status: string
          work_hours: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          job_posting_id: string
          note?: string | null
          pay_rate: number
          pay_type?: string
          personnel_id: string
          status?: string
          work_hours?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          job_posting_id?: string
          note?: string | null
          pay_rate?: number
          pay_type?: string
          personnel_id?: string
          status?: string
          work_hours?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "interview_job_assignments_job_posting_id_fkey"
            columns: ["job_posting_id"]
            isOneToOne: false
            referencedRelation: "interview_job_postings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_job_assignments_personnel_id_fkey"
            columns: ["personnel_id"]
            isOneToOne: false
            referencedRelation: "interview_personnel"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_job_postings: {
        Row: {
          client_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          end_date: string
          ft_count: number
          id: string
          instructor_count: number
          other_count: number
          pay_rate: number | null
          pay_type: string | null
          platform: string | null
          rp_count: number
          start_date: string
          status: string
          title: string
          total_headcount: number
          updated_at: string
          work_end: string | null
          work_start: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date: string
          ft_count?: number
          id?: string
          instructor_count?: number
          other_count?: number
          pay_rate?: number | null
          pay_type?: string | null
          platform?: string | null
          rp_count?: number
          start_date: string
          status?: string
          title: string
          total_headcount?: number
          updated_at?: string
          work_end?: string | null
          work_start?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string
          ft_count?: number
          id?: string
          instructor_count?: number
          other_count?: number
          pay_rate?: number | null
          pay_type?: string | null
          platform?: string | null
          rp_count?: number
          start_date?: string
          status?: string
          title?: string
          total_headcount?: number
          updated_at?: string
          work_end?: string | null
          work_start?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "interview_job_postings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_personnel: {
        Row: {
          account_number: string | null
          bank_name: string | null
          contract_amount: number | null
          created_at: string
          default_pay_rate: number | null
          experience: string | null
          id: string
          memo: string | null
          name: string
          pay_type: string
          phone: string | null
          role: string
          status: string
          updated_at: string
        }
        Insert: {
          account_number?: string | null
          bank_name?: string | null
          contract_amount?: number | null
          created_at?: string
          default_pay_rate?: number | null
          experience?: string | null
          id?: string
          memo?: string | null
          name: string
          pay_type: string
          phone?: string | null
          role: string
          status?: string
          updated_at?: string
        }
        Update: {
          account_number?: string | null
          bank_name?: string | null
          contract_amount?: number | null
          created_at?: string
          default_pay_rate?: number | null
          experience?: string | null
          id?: string
          memo?: string | null
          name?: string
          pay_type?: string
          phone?: string | null
          role?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      interview_work_records: {
        Row: {
          created_at: string
          id: string
          note: string | null
          pay_rate_override: number | null
          pay_type_override: string | null
          personnel_id: string
          work_date: string
          work_hours: number
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          pay_rate_override?: number | null
          pay_type_override?: string | null
          personnel_id: string
          work_date: string
          work_hours: number
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          pay_rate_override?: number | null
          pay_type_override?: string | null
          personnel_id?: string
          work_date?: string
          work_hours?: number
        }
        Relationships: [
          {
            foreignKeyName: "interview_work_records_personnel_id_fkey"
            columns: ["personnel_id"]
            isOneToOne: false
            referencedRelation: "interview_personnel"
            referencedColumns: ["id"]
          },
        ]
      }
      job_postings: {
        Row: {
          client_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          end_date: string
          headcount: number
          id: string
          location: string | null
          lunch_end: string | null
          lunch_start: string | null
          pay_rate: number
          pay_type: string
          platform: string | null
          rooms: Json | null
          shift_type: string | null
          start_date: string
          status: string
          supervisor_id: string | null
          supervisor_name: string | null
          title: string
          updated_at: string
          work_end: string | null
          work_start: string | null
          work_type: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date: string
          headcount?: number
          id?: string
          location?: string | null
          lunch_end?: string | null
          lunch_start?: string | null
          pay_rate: number
          pay_type?: string
          platform?: string | null
          rooms?: Json | null
          shift_type?: string | null
          start_date: string
          status?: string
          supervisor_id?: string | null
          supervisor_name?: string | null
          title: string
          updated_at?: string
          work_end?: string | null
          work_start?: string | null
          work_type?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string
          headcount?: number
          id?: string
          location?: string | null
          lunch_end?: string | null
          lunch_start?: string | null
          pay_rate?: number
          pay_type?: string
          platform?: string | null
          rooms?: Json | null
          shift_type?: string | null
          start_date?: string
          status?: string
          supervisor_id?: string | null
          supervisor_name?: string | null
          title?: string
          updated_at?: string
          work_end?: string | null
          work_start?: string | null
          work_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_postings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      room_reservations: {
        Row: {
          cc_members: string[] | null
          content: string | null
          created_at: string
          date: string
          end_time: string
          id: string
          reserved_by: string
          room_id: string
          start_time: string
          title: string | null
          type: string
          updated_at: string
        }
        Insert: {
          cc_members?: string[] | null
          content?: string | null
          created_at?: string
          date: string
          end_time: string
          id?: string
          reserved_by: string
          room_id: string
          start_time: string
          title?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          cc_members?: string[] | null
          content?: string | null
          created_at?: string
          date?: string
          end_time?: string
          id?: string
          reserved_by?: string
          room_id?: string
          start_time?: string
          title?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      settlement_audit_logs: {
        Row: {
          action: string
          changed_at: string
          changed_by: string | null
          id: string
          new_data: Json | null
          old_data: Json | null
          record_id: string
          table_name: string
        }
        Insert: {
          action: string
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id: string
          table_name: string
        }
        Update: {
          action?: string
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string
          table_name?: string
        }
        Relationships: []
      }
      settlement_locks: {
        Row: {
          id: string
          locked_at: string
          locked_by: string
          memo: string | null
          month: number
          type: Database["supervisor"]["Enums"]["settlement_type"]
          year: number
        }
        Insert: {
          id?: string
          locked_at?: string
          locked_by: string
          memo?: string | null
          month: number
          type: Database["supervisor"]["Enums"]["settlement_type"]
          year: number
        }
        Update: {
          id?: string
          locked_at?: string
          locked_by?: string
          memo?: string | null
          month?: number
          type?: Database["supervisor"]["Enums"]["settlement_type"]
          year?: number
        }
        Relationships: []
      }
      sso_handoffs: {
        Row: {
          code_hash: string
          consumed_at: string | null
          created_at: string
          expires_at: string
          member_id: string
          source_app: string
        }
        Insert: {
          code_hash: string
          consumed_at?: string | null
          created_at?: string
          expires_at: string
          member_id: string
          source_app: string
        }
        Update: {
          code_hash?: string
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          member_id?: string
          source_app?: string
        }
        Relationships: []
      }
      work_records: {
        Row: {
          assignment_id: string
          created_at: string | null
          id: string
          note: string | null
          updated_at: string | null
          work_date: string
          work_hours: number
        }
        Insert: {
          assignment_id: string
          created_at?: string | null
          id?: string
          note?: string | null
          updated_at?: string | null
          work_date: string
          work_hours: number
        }
        Update: {
          assignment_id?: string
          created_at?: string | null
          id?: string
          note?: string | null
          updated_at?: string | null
          work_date?: string
          work_hours?: number
        }
        Relationships: [
          {
            foreignKeyName: "work_records_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      workers: {
        Row: {
          account_number: string | null
          address: string | null
          bank_name: string | null
          birth_date: string | null
          created_at: string
          created_by: string | null
          email: string | null
          experience: string | null
          gender: string | null
          id: string
          name: string
          note: string | null
          phone: string | null
          resident_id: string | null
          resident_id_enc: string | null
          status: string
          updated_at: string
          warning: string | null
          work_end: string | null
          work_start: string | null
        }
        Insert: {
          account_number?: string | null
          address?: string | null
          bank_name?: string | null
          birth_date?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          experience?: string | null
          gender?: string | null
          id?: string
          name: string
          note?: string | null
          phone?: string | null
          resident_id?: string | null
          resident_id_enc?: string | null
          status?: string
          updated_at?: string
          warning?: string | null
          work_end?: string | null
          work_start?: string | null
        }
        Update: {
          account_number?: string | null
          address?: string | null
          bank_name?: string | null
          birth_date?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          experience?: string | null
          gender?: string | null
          id?: string
          name?: string
          note?: string | null
          phone?: string | null
          resident_id?: string | null
          resident_id_enc?: string | null
          status?: string
          updated_at?: string
          warning?: string | null
          work_end?: string | null
          work_start?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      consume_auth_rate_limit: {
        Args: { p_key: string; p_limit: number; p_window_seconds: number }
        Returns: boolean
      }
      consume_sso_handoff: {
        Args: { p_code_hash: string }
        Returns: {
          member_id: string
          source_app: string
        }[]
      }
    }
    Enums: {
      settlement_type: "supervisor" | "interview"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  work: {
    Tables: {
      asset_images: {
        Row: {
          asset_id: string
          content_type: string | null
          created_at: string
          file_name: string
          id: string
          is_primary: boolean
          size_bytes: number
          storage_path: string
          uploaded_by: string
          uploaded_by_name: string
        }
        Insert: {
          asset_id: string
          content_type?: string | null
          created_at?: string
          file_name: string
          id?: string
          is_primary?: boolean
          size_bytes: number
          storage_path: string
          uploaded_by: string
          uploaded_by_name: string
        }
        Update: {
          asset_id?: string
          content_type?: string | null
          created_at?: string
          file_name?: string
          id?: string
          is_primary?: boolean
          size_bytes?: number
          storage_path?: string
          uploaded_by?: string
          uploaded_by_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_images_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      assets: {
        Row: {
          asset_number: string | null
          category: string
          created_at: string
          created_by: string
          created_by_name: string
          id: string
          location: string | null
          manager_id: string
          manager_name: string
          memo: string | null
          name: string
          purchase_amount: number
          purchase_date: string
          serial_number: string | null
          status: string
          updated_at: string
          user_id: string
          user_name: string
        }
        Insert: {
          asset_number?: string | null
          category: string
          created_at?: string
          created_by: string
          created_by_name: string
          id?: string
          location?: string | null
          manager_id: string
          manager_name: string
          memo?: string | null
          name: string
          purchase_amount: number
          purchase_date: string
          serial_number?: string | null
          status: string
          updated_at?: string
          user_id: string
          user_name: string
        }
        Update: {
          asset_number?: string | null
          category?: string
          created_at?: string
          created_by?: string
          created_by_name?: string
          id?: string
          location?: string | null
          manager_id?: string
          manager_name?: string
          memo?: string | null
          name?: string
          purchase_amount?: number
          purchase_date?: string
          serial_number?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          user_name?: string
        }
        Relationships: []
      }
      attachments: {
        Row: {
          comment_id: string | null
          content_type: string | null
          created_at: string
          file_name: string
          id: string
          request_id: string
          size_bytes: number
          storage_path: string
          uploaded_by: string
          uploaded_by_name: string
        }
        Insert: {
          comment_id?: string | null
          content_type?: string | null
          created_at?: string
          file_name: string
          id?: string
          request_id: string
          size_bytes?: number
          storage_path: string
          uploaded_by: string
          uploaded_by_name: string
        }
        Update: {
          comment_id?: string | null
          content_type?: string | null
          created_at?: string
          file_name?: string
          id?: string
          request_id?: string
          size_bytes?: number
          storage_path?: string
          uploaded_by?: string
          uploaded_by_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "attachments_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attachments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          author_id: string
          author_name: string
          body: string
          created_at: string
          deleted_at: string | null
          id: string
          is_system: boolean
          request_id: string
          updated_at: string | null
        }
        Insert: {
          author_id: string
          author_name: string
          body: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_system?: boolean
          request_id: string
          updated_at?: string | null
        }
        Update: {
          author_id?: string
          author_name?: string
          body?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_system?: boolean
          request_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          actor_id: string
          actor_name: string
          after: Json | null
          before: Json | null
          created_at: string
          event_type: string
          id: string
          request_id: string
        }
        Insert: {
          actor_id: string
          actor_name: string
          after?: Json | null
          before?: Json | null
          created_at?: string
          event_type: string
          id?: string
          request_id: string
        }
        Update: {
          actor_id?: string
          actor_name?: string
          after?: Json | null
          before?: Json | null
          created_at?: string
          event_type?: string
          id?: string
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
      project_attachments: {
        Row: {
          content_type: string | null
          created_at: string
          file_name: string
          id: string
          project_id: string
          size_bytes: number
          storage_path: string
          uploaded_by: string
          uploaded_by_name: string
        }
        Insert: {
          content_type?: string | null
          created_at?: string
          file_name: string
          id?: string
          project_id: string
          size_bytes?: number
          storage_path: string
          uploaded_by: string
          uploaded_by_name: string
        }
        Update: {
          content_type?: string | null
          created_at?: string
          file_name?: string
          id?: string
          project_id?: string
          size_bytes?: number
          storage_path?: string
          uploaded_by?: string
          uploaded_by_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_attachments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_checklist_items: {
        Row: {
          assignee_id: string | null
          assignee_name: string | null
          created_at: string
          created_by: string
          created_by_name: string
          due_date: string | null
          id: string
          is_done: boolean
          project_id: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          assignee_name?: string | null
          created_at?: string
          created_by: string
          created_by_name: string
          due_date?: string | null
          id?: string
          is_done?: boolean
          project_id: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          assignee_name?: string | null
          created_at?: string
          created_by?: string
          created_by_name?: string
          due_date?: string | null
          id?: string
          is_done?: boolean
          project_id?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_checklist_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_feed_attachments: {
        Row: {
          content_type: string | null
          created_at: string
          feed_item_id: string
          file_name: string
          id: string
          project_id: string
          size_bytes: number
          storage_path: string
          updated_at: string
          uploaded_by: string
          uploaded_by_name: string
        }
        Insert: {
          content_type?: string | null
          created_at?: string
          feed_item_id: string
          file_name: string
          id?: string
          project_id: string
          size_bytes?: number
          storage_path: string
          updated_at?: string
          uploaded_by: string
          uploaded_by_name: string
        }
        Update: {
          content_type?: string | null
          created_at?: string
          feed_item_id?: string
          file_name?: string
          id?: string
          project_id?: string
          size_bytes?: number
          storage_path?: string
          updated_at?: string
          uploaded_by?: string
          uploaded_by_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_feed_attachments_feed_item_id_fkey"
            columns: ["feed_item_id"]
            isOneToOne: false
            referencedRelation: "project_feed_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_feed_attachments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_feed_items: {
        Row: {
          content: string
          created_at: string
          created_by: string
          created_by_name: string
          deleted_at: string | null
          id: string
          project_id: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by: string
          created_by_name: string
          deleted_at?: string | null
          id?: string
          project_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          created_by_name?: string
          deleted_at?: string | null
          id?: string
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_feed_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_requests: {
        Row: {
          created_at: string
          linked_by: string
          linked_by_name: string
          project_id: string
          request_id: string
        }
        Insert: {
          created_at?: string
          linked_by: string
          linked_by_name: string
          project_id: string
          request_id: string
        }
        Update: {
          created_at?: string
          linked_by?: string
          linked_by_name?: string
          project_id?: string
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_requests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_requests_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          affiliate_names: string[]
          created_at: string
          created_by: string
          created_by_name: string
          customer_names: string[]
          description: string | null
          due_date: string | null
          id: string
          manager_ids: string[]
          manager_names: string[]
          owner_id: string | null
          owner_name: string | null
          stakeholder_ids: string[]
          stakeholder_names: string[]
          stakeholder_team_ids: string[]
          stakeholder_team_names: string[]
          start_date: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          affiliate_names?: string[]
          created_at?: string
          created_by: string
          created_by_name: string
          customer_names?: string[]
          description?: string | null
          due_date?: string | null
          id?: string
          manager_ids?: string[]
          manager_names?: string[]
          owner_id?: string | null
          owner_name?: string | null
          stakeholder_ids?: string[]
          stakeholder_names?: string[]
          stakeholder_team_ids?: string[]
          stakeholder_team_names?: string[]
          start_date?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          affiliate_names?: string[]
          created_at?: string
          created_by?: string
          created_by_name?: string
          customer_names?: string[]
          description?: string | null
          due_date?: string | null
          id?: string
          manager_ids?: string[]
          manager_names?: string[]
          owner_id?: string | null
          owner_name?: string | null
          stakeholder_ids?: string[]
          stakeholder_names?: string[]
          stakeholder_team_ids?: string[]
          stakeholder_team_names?: string[]
          start_date?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      requests: {
        Row: {
          affiliate_names: string[]
          assignee_id: string | null
          assignee_ids: string[]
          assignee_name: string | null
          assignee_names: string[]
          body: string | null
          completed_at: string | null
          completion_note: string | null
          created_at: string
          customer_names: string[]
          due_date: string | null
          id: string
          priority: string
          request_type: string | null
          request_type_name: string | null
          requester_id: string
          requester_name: string
          status: string
          team_name: string | null
          team_names: string[]
          title: string
          updated_at: string
        }
        Insert: {
          affiliate_names?: string[]
          assignee_id?: string | null
          assignee_ids?: string[]
          assignee_name?: string | null
          assignee_names?: string[]
          body?: string | null
          completed_at?: string | null
          completion_note?: string | null
          created_at?: string
          customer_names?: string[]
          due_date?: string | null
          id?: string
          priority?: string
          request_type?: string | null
          request_type_name?: string | null
          requester_id: string
          requester_name: string
          status?: string
          team_name?: string | null
          team_names?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          affiliate_names?: string[]
          assignee_id?: string | null
          assignee_ids?: string[]
          assignee_name?: string | null
          assignee_names?: string[]
          body?: string | null
          completed_at?: string | null
          completion_note?: string | null
          created_at?: string
          customer_names?: string[]
          due_date?: string | null
          id?: string
          priority?: string
          request_type?: string | null
          request_type_name?: string | null
          requester_id?: string
          requester_name?: string
          status?: string
          team_name?: string | null
          team_names?: string[]
          title?: string
          updated_at?: string
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
  public: {
    Enums: {
      budget_type: ["복지포인트", "활동비"],
      member_role: ["대표", "본부장", "팀장", "팀원", "인턴"],
      member_status_type: [
        "육아휴직",
        "병가",
        "재택근무",
        "파견",
        "휴직",
        "퇴사",
      ],
      multisource_evaluation_assignment_source: [
        "auto_same_team",
        "auto_leader",
        "manual",
      ],
      multisource_evaluation_question_type: ["score", "subjective"],
      multisource_evaluation_round_status: ["draft", "confirmed", "closed"],
    },
  },
  supervisor: {
    Enums: {
      settlement_type: ["supervisor", "interview"],
    },
  },
  work: {
    Enums: {},
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
export type PushSubscription = Tables<"push_subscriptions">
export type PushSubscriptionInsert = TablesInsert<"push_subscriptions">

// Points management types
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

// /api/lunch-group/fixed-schedules 는 `select("*, members(*)")` 로 조회하므로 키가 members 다.
// (alias 를 쓰는 /api/lunch-group 쪽은 member 라 서로 다르다)
export interface LunchFixedScheduleWithMember extends LunchFixedSchedule {
  members?: Member
}

// Auth session type
export interface AuthSession {
  userId: string
  fullName: string
  role: "user" | "admin"
}
