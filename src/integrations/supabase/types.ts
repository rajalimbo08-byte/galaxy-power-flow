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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          details: Json | null
          entity: string | null
          entity_id: string | null
          id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          entity?: string | null
          entity_id?: string | null
          id?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          entity?: string | null
          entity_id?: string | null
          id?: string
        }
        Relationships: []
      }
      manager_permissions: {
        Row: {
          can_assign_tickets: boolean
          can_create_tickets: boolean
          can_download_reports: boolean
          can_edit_tickets: boolean
          can_export_data: boolean
          can_manage_technicians: boolean
          can_view_reports: boolean
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          can_assign_tickets?: boolean
          can_create_tickets?: boolean
          can_download_reports?: boolean
          can_edit_tickets?: boolean
          can_export_data?: boolean
          can_manage_technicians?: boolean
          can_view_reports?: boolean
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          can_assign_tickets?: boolean
          can_create_tickets?: boolean
          can_download_reports?: boolean
          can_edit_tickets?: boolean
          can_export_data?: boolean
          can_manage_technicians?: boolean
          can_view_reports?: boolean
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          branch: string | null
          city: string | null
          created_at: string
          email: string
          employee_id: string | null
          full_name: string
          id: string
          mobile: string | null
          reporting_manager_id: string | null
          state: string | null
          status: Database["public"]["Enums"]["user_status"]
          updated_at: string
          zone: Database["public"]["Enums"]["zone_type"] | null
        }
        Insert: {
          branch?: string | null
          city?: string | null
          created_at?: string
          email?: string
          employee_id?: string | null
          full_name?: string
          id: string
          mobile?: string | null
          reporting_manager_id?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
          zone?: Database["public"]["Enums"]["zone_type"] | null
        }
        Update: {
          branch?: string | null
          city?: string | null
          created_at?: string
          email?: string
          employee_id?: string | null
          full_name?: string
          id?: string
          mobile?: string | null
          reporting_manager_id?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
          zone?: Database["public"]["Enums"]["zone_type"] | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_reporting_manager_id_fkey"
            columns: ["reporting_manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      report_attachments: {
        Row: {
          created_at: string
          drive_file_id: string
          drive_folder_id: string | null
          drive_link: string | null
          file_name: string | null
          id: string
          kind: string
          mime_type: string | null
          report_id: string
          size_bytes: number | null
        }
        Insert: {
          created_at?: string
          drive_file_id: string
          drive_folder_id?: string | null
          drive_link?: string | null
          file_name?: string | null
          id?: string
          kind?: string
          mime_type?: string | null
          report_id: string
          size_bytes?: number | null
        }
        Update: {
          created_at?: string
          drive_file_id?: string
          drive_folder_id?: string | null
          drive_link?: string | null
          file_name?: string | null
          id?: string
          kind?: string
          mime_type?: string | null
          report_id?: string
          size_bytes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "report_attachments_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "service_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      service_reports: {
        Row: {
          battery_make: string | null
          battery_model: string | null
          battery_qty: number | null
          battery_serials: string | null
          battery_voltage: string | null
          chk_battery_installed: boolean
          chk_charging: boolean
          chk_earthing: boolean
          chk_output_checked: boolean
          chk_ups_installed: boolean
          company_name: string | null
          complaint: string | null
          contact_number: string | null
          created_at: string
          customer_name: string | null
          customer_signature_drive_id: string | null
          customer_signature_url: string | null
          drive_folder_id: string | null
          engineer_name: string | null
          engineer_signature_drive_id: string | null
          engineer_signature_url: string | null
          fault_found: string | null
          frequency: string | null
          id: string
          input_voltage: string | null
          load_pct: string | null
          output_voltage: string | null
          pdf_drive_id: string | null
          pdf_url: string | null
          recommendations: string | null
          remarks: string | null
          report_date: string
          report_number: string
          root_cause: string | null
          site_address: string | null
          site_name: string | null
          spare_parts: string | null
          submitted_at: string | null
          technician_id: string
          ticket_id: string | null
          updated_at: string
          ups_capacity: string | null
          ups_make: string | null
          ups_model: string | null
          ups_serial: string | null
          work_done: string | null
        }
        Insert: {
          battery_make?: string | null
          battery_model?: string | null
          battery_qty?: number | null
          battery_serials?: string | null
          battery_voltage?: string | null
          chk_battery_installed?: boolean
          chk_charging?: boolean
          chk_earthing?: boolean
          chk_output_checked?: boolean
          chk_ups_installed?: boolean
          company_name?: string | null
          complaint?: string | null
          contact_number?: string | null
          created_at?: string
          customer_name?: string | null
          customer_signature_drive_id?: string | null
          customer_signature_url?: string | null
          drive_folder_id?: string | null
          engineer_name?: string | null
          engineer_signature_drive_id?: string | null
          engineer_signature_url?: string | null
          fault_found?: string | null
          frequency?: string | null
          id?: string
          input_voltage?: string | null
          load_pct?: string | null
          output_voltage?: string | null
          pdf_drive_id?: string | null
          pdf_url?: string | null
          recommendations?: string | null
          remarks?: string | null
          report_date?: string
          report_number?: string
          root_cause?: string | null
          site_address?: string | null
          site_name?: string | null
          spare_parts?: string | null
          submitted_at?: string | null
          technician_id: string
          ticket_id?: string | null
          updated_at?: string
          ups_capacity?: string | null
          ups_make?: string | null
          ups_model?: string | null
          ups_serial?: string | null
          work_done?: string | null
        }
        Update: {
          battery_make?: string | null
          battery_model?: string | null
          battery_qty?: number | null
          battery_serials?: string | null
          battery_voltage?: string | null
          chk_battery_installed?: boolean
          chk_charging?: boolean
          chk_earthing?: boolean
          chk_output_checked?: boolean
          chk_ups_installed?: boolean
          company_name?: string | null
          complaint?: string | null
          contact_number?: string | null
          created_at?: string
          customer_name?: string | null
          customer_signature_drive_id?: string | null
          customer_signature_url?: string | null
          drive_folder_id?: string | null
          engineer_name?: string | null
          engineer_signature_drive_id?: string | null
          engineer_signature_url?: string | null
          fault_found?: string | null
          frequency?: string | null
          id?: string
          input_voltage?: string | null
          load_pct?: string | null
          output_voltage?: string | null
          pdf_drive_id?: string | null
          pdf_url?: string | null
          recommendations?: string | null
          remarks?: string | null
          report_date?: string
          report_number?: string
          root_cause?: string | null
          site_address?: string | null
          site_name?: string | null
          spare_parts?: string | null
          submitted_at?: string | null
          technician_id?: string
          ticket_id?: string | null
          updated_at?: string
          ups_capacity?: string | null
          ups_make?: string | null
          ups_model?: string | null
          ups_serial?: string | null
          work_done?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_reports_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          assigned_to: string | null
          battery_details: string | null
          city: string | null
          closed_at: string | null
          company_name: string | null
          complaint: string
          contact_number: string | null
          contact_person: string | null
          created_at: string
          created_by: string | null
          customer_name: string
          id: string
          is_recall: boolean
          priority: Database["public"]["Enums"]["ticket_priority"]
          recall_of: string | null
          site_address: string | null
          site_name: string | null
          state: string | null
          status: Database["public"]["Enums"]["ticket_status"]
          ticket_number: string
          updated_at: string
          ups_capacity: string | null
          ups_make: string | null
          ups_model: string | null
          ups_serial: string | null
          visit_date: string | null
          zone: Database["public"]["Enums"]["zone_type"] | null
        }
        Insert: {
          assigned_to?: string | null
          battery_details?: string | null
          city?: string | null
          closed_at?: string | null
          company_name?: string | null
          complaint?: string
          contact_number?: string | null
          contact_person?: string | null
          created_at?: string
          created_by?: string | null
          customer_name: string
          id?: string
          is_recall?: boolean
          priority?: Database["public"]["Enums"]["ticket_priority"]
          recall_of?: string | null
          site_address?: string | null
          site_name?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          ticket_number?: string
          updated_at?: string
          ups_capacity?: string | null
          ups_make?: string | null
          ups_model?: string | null
          ups_serial?: string | null
          visit_date?: string | null
          zone?: Database["public"]["Enums"]["zone_type"] | null
        }
        Update: {
          assigned_to?: string | null
          battery_details?: string | null
          city?: string | null
          closed_at?: string | null
          company_name?: string | null
          complaint?: string
          contact_number?: string | null
          contact_person?: string | null
          created_at?: string
          created_by?: string | null
          customer_name?: string
          id?: string
          is_recall?: boolean
          priority?: Database["public"]["Enums"]["ticket_priority"]
          recall_of?: string | null
          site_address?: string | null
          site_name?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          ticket_number?: string
          updated_at?: string
          ups_capacity?: string | null
          ups_make?: string | null
          ups_model?: string | null
          ups_serial?: string | null
          visit_date?: string | null
          zone?: Database["public"]["Enums"]["zone_type"] | null
        }
        Relationships: [
          {
            foreignKeyName: "tickets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_recall_of_fkey"
            columns: ["recall_of"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_permission: {
        Args: { _perm: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "admin"
        | "manager"
        | "technician"
        | "temp_technician"
      ticket_priority: "Low" | "Medium" | "High" | "Critical"
      ticket_status:
        | "Open"
        | "Assigned"
        | "In Progress"
        | "Completed"
        | "Closed"
      user_status: "Active" | "Inactive"
      zone_type: "North" | "South" | "East" | "West" | "Central"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: [
        "super_admin",
        "admin",
        "manager",
        "technician",
        "temp_technician",
      ],
      ticket_priority: ["Low", "Medium", "High", "Critical"],
      ticket_status: ["Open", "Assigned", "In Progress", "Completed", "Closed"],
      user_status: ["Active", "Inactive"],
      zone_type: ["North", "South", "East", "West", "Central"],
    },
  },
} as const
