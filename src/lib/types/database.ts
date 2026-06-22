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
  pm: {
    Tables: {
      attachments: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          file_size_bytes: number | null
          filename: string
          id: string
          mime_type: string | null
          storage_path: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          file_size_bytes?: number | null
          filename: string
          id?: string
          mime_type?: string | null
          storage_path: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          file_size_bytes?: number | null
          filename?: string
          id?: string
          mime_type?: string | null
          storage_path?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "v_team_workload"
            referencedColumns: ["id"]
          },
        ]
      }
      change_history: {
        Row: {
          action: Database["pm"]["Enums"]["change_action"]
          changed_at: string
          changed_by: string | null
          entity_id: string
          entity_type: string
          id: string
          new_values: Json | null
          old_values: Json | null
        }
        Insert: {
          action: Database["pm"]["Enums"]["change_action"]
          changed_at?: string
          changed_by?: string | null
          entity_id: string
          entity_type: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
        }
        Update: {
          action?: Database["pm"]["Enums"]["change_action"]
          changed_at?: string
          changed_by?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "change_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "v_team_workload"
            referencedColumns: ["id"]
          },
        ]
      }
      client_credentials: {
        Row: {
          client_id: string
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          password: string | null
          platform: string
          updated_at: string
          url: string | null
          username: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          password?: string | null
          platform: string
          updated_at?: string
          url?: string | null
          username?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          password?: string | null
          platform?: string
          updated_at?: string
          url?: string | null
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_credentials_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_billable_hours_this_month"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "client_credentials_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_credentials_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_credentials_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_team_workload"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_financials: {
        Row: {
          cdn_expenses: number
          cdn_sales: number
          created_at: string
          id: string
          month: number
          updated_at: string
          updated_by: string | null
          usd_expenses: number
          usd_sales: number
          year: number
        }
        Insert: {
          cdn_expenses?: number
          cdn_sales?: number
          created_at?: string
          id?: string
          month: number
          updated_at?: string
          updated_by?: string | null
          usd_expenses?: number
          usd_sales?: number
          year: number
        }
        Update: {
          cdn_expenses?: number
          cdn_sales?: number
          created_at?: string
          id?: string
          month?: number
          updated_at?: string
          updated_by?: string | null
          usd_expenses?: number
          usd_sales?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "monthly_financials_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monthly_financials_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "v_team_workload"
            referencedColumns: ["id"]
          },
        ]
      }
      client_portal_users: {
        Row: {
          access_level: Database["pm"]["Enums"]["access_level"]
          auth_user_id: string | null
          client_id: string
          contact_id: string | null
          email: string
          id: string
          invited_at: string
          is_active: boolean
          last_login: string | null
          name: string | null
        }
        Insert: {
          access_level?: Database["pm"]["Enums"]["access_level"]
          auth_user_id?: string | null
          client_id: string
          contact_id?: string | null
          email: string
          id?: string
          invited_at?: string
          is_active?: boolean
          last_login?: string | null
          name?: string | null
        }
        Update: {
          access_level?: Database["pm"]["Enums"]["access_level"]
          auth_user_id?: string | null
          client_id?: string
          contact_id?: string | null
          email?: string
          id?: string
          invited_at?: string
          is_active?: boolean
          last_login?: string | null
          name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_portal_users_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_billable_hours_this_month"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "client_portal_users_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_health"
            referencedColumns: ["id"]
          },
        ]
      }
      client_updates: {
        Row: {
          client_id: string
          created_at: string
          id: string
          logged_by: string | null
          marketing_channel: string
          occurred_at: string
          summary: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          logged_by?: string | null
          marketing_channel: string
          occurred_at?: string
          summary: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          logged_by?: string | null
          marketing_channel?: string
          occurred_at?: string
          summary?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_updates_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_billable_hours_this_month"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "client_updates_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_updates_logged_by_fkey"
            columns: ["logged_by"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_updates_logged_by_fkey"
            columns: ["logged_by"]
            isOneToOne: false
            referencedRelation: "v_team_workload"
            referencedColumns: ["id"]
          },
        ]
      }
      email_log: {
        Row: {
          body_html: string | null
          body_text: string | null
          cc_email: string | null
          created_at: string
          from_email: string
          id: string
          interaction_id: string | null
          matched_client_id: string | null
          received_at: string
          status: string
          subject: string | null
          team_member_id: string | null
          to_email: string | null
        }
        Insert: {
          body_html?: string | null
          body_text?: string | null
          cc_email?: string | null
          created_at?: string
          from_email: string
          id?: string
          interaction_id?: string | null
          matched_client_id?: string | null
          received_at?: string
          status?: string
          subject?: string | null
          team_member_id?: string | null
          to_email?: string | null
        }
        Update: {
          body_html?: string | null
          body_text?: string | null
          cc_email?: string | null
          created_at?: string
          from_email?: string
          id?: string
          interaction_id?: string | null
          matched_client_id?: string | null
          received_at?: string
          status?: string
          subject?: string | null
          team_member_id?: string | null
          to_email?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_log_interaction_id_fkey"
            columns: ["interaction_id"]
            isOneToOne: false
            referencedRelation: "interactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_log_matched_client_id_fkey"
            columns: ["matched_client_id"]
            isOneToOne: false
            referencedRelation: "v_client_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_log_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      interactions: {
        Row: {
          body: string | null
          channel: Database["pm"]["Enums"]["interaction_channel"] | null
          client_id: string
          contact_id: string | null
          contact_ids: string[]
          created_at: string
          id: string
          logged_by: string | null
          occurred_at: string
          summary: string
          type: Database["pm"]["Enums"]["interaction_type"]
        }
        Insert: {
          body?: string | null
          channel?: Database["pm"]["Enums"]["interaction_channel"] | null
          client_id: string
          contact_id?: string | null
          contact_ids?: string[]
          created_at?: string
          id?: string
          logged_by?: string | null
          occurred_at?: string
          summary: string
          type: Database["pm"]["Enums"]["interaction_type"]
        }
        Update: {
          body?: string | null
          channel?: Database["pm"]["Enums"]["interaction_channel"] | null
          client_id?: string
          contact_id?: string | null
          contact_ids?: string[]
          created_at?: string
          id?: string
          logged_by?: string | null
          occurred_at?: string
          summary?: string
          type?: Database["pm"]["Enums"]["interaction_type"]
        }
        Relationships: [
          {
            foreignKeyName: "interactions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_billable_hours_this_month"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "interactions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interactions_logged_by_fkey"
            columns: ["logged_by"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interactions_logged_by_fkey"
            columns: ["logged_by"]
            isOneToOne: false
            referencedRelation: "v_team_workload"
            referencedColumns: ["id"]
          },
        ]
      }
      interaction_attendees: {
        Row: {
          company: string | null
          created_at: string
          email: string | null
          id: string
          interaction_id: string
          name: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          interaction_id: string
          name: string
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          interaction_id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "interaction_attendees_interaction_id_fkey"
            columns: ["interaction_id"]
            isOneToOne: false
            referencedRelation: "interactions"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_milestones: {
        Row: {
          completed: boolean
          completed_at: string | null
          created_at: string
          description: string | null
          id: string
          project_id: string
          target_date: string | null
          title: string
          updated_at: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          project_id: string
          target_date?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          project_id?: string
          target_date?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "internal_milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "internal_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_project_members: {
        Row: {
          id: string
          joined_at: string
          project_id: string
          role: Database["pm"]["Enums"]["project_member_role"]
          team_member_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          project_id: string
          role?: Database["pm"]["Enums"]["project_member_role"]
          team_member_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          project_id?: string
          role?: Database["pm"]["Enums"]["project_member_role"]
          team_member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "internal_project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "internal_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_project_members_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_project_members_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "v_team_workload"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_project_sections: {
        Row: {
          created_at: string
          display_order: number
          id: string
          name: string
          project_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          name: string
          project_id: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          name?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "internal_project_sections_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "internal_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_projects: {
        Row: {
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          name: string
          owner_id: string | null
          rag_status: Database["pm"]["Enums"]["rag_status"]
          start_date: string | null
          status: Database["pm"]["Enums"]["project_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          name: string
          owner_id?: string | null
          rag_status?: Database["pm"]["Enums"]["rag_status"]
          start_date?: string | null
          status?: Database["pm"]["Enums"]["project_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          name?: string
          owner_id?: string | null
          rag_status?: Database["pm"]["Enums"]["rag_status"]
          start_date?: string | null
          status?: Database["pm"]["Enums"]["project_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "internal_projects_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_projects_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "v_team_workload"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_task_comments: {
        Row: {
          author_id: string | null
          body: string
          created_at: string
          id: string
          task_id: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          body: string
          created_at?: string
          id?: string
          task_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          body?: string
          created_at?: string
          id?: string
          task_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "internal_task_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_task_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "v_team_workload"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "internal_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_task_dependencies: {
        Row: {
          created_at: string
          depends_on_task_id: string
          id: string
          task_id: string
        }
        Insert: {
          created_at?: string
          depends_on_task_id: string
          id?: string
          task_id: string
        }
        Update: {
          created_at?: string
          depends_on_task_id?: string
          id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "internal_task_dependencies_depends_on_task_id_fkey"
            columns: ["depends_on_task_id"]
            isOneToOne: false
            referencedRelation: "internal_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_task_dependencies_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "internal_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_tasks: {
        Row: {
          assignee_id: string | null
          created_at: string
          description: string | null
          due_date: string | null
          estimated_hours: number | null
          id: string
          is_recurring: boolean
          notes: string | null
          parent_task_id: string | null
          priority: Database["pm"]["Enums"]["task_priority"]
          project_id: string
          recurrence_rule: string | null
          section_id: string | null
          status: Database["pm"]["Enums"]["task_status"]
          title: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          id?: string
          is_recurring?: boolean
          notes?: string | null
          parent_task_id?: string | null
          priority?: Database["pm"]["Enums"]["task_priority"]
          project_id: string
          recurrence_rule?: string | null
          section_id?: string | null
          status?: Database["pm"]["Enums"]["task_status"]
          title: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          id?: string
          is_recurring?: boolean
          notes?: string | null
          parent_task_id?: string | null
          priority?: Database["pm"]["Enums"]["task_priority"]
          project_id?: string
          recurrence_rule?: string | null
          section_id?: string | null
          status?: Database["pm"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "internal_tasks_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_tasks_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "v_team_workload"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "internal_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "internal_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_tasks_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "internal_project_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_time_entries: {
        Row: {
          billable: boolean
          created_at: string
          description: string | null
          duration_minutes: number
          id: string
          logged_date: string
          task_id: string
          team_member_id: string
        }
        Insert: {
          billable?: boolean
          created_at?: string
          description?: string | null
          duration_minutes: number
          id?: string
          logged_date?: string
          task_id: string
          team_member_id: string
        }
        Update: {
          billable?: boolean
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          logged_date?: string
          task_id?: string
          team_member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "internal_time_entries_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "internal_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_time_entries_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_time_entries_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "v_team_workload"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_participants: {
        Row: {
          created_at: string
          id: string
          meeting_id: string
          team_member_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          meeting_id: string
          team_member_id: string
        }
        Update: {
          created_at?: string
          id?: string
          meeting_id?: string
          team_member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_participants_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "team_meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_participants_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_participants_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "v_team_workload"
            referencedColumns: ["id"]
          },
        ]
      }
      milestones: {
        Row: {
          approved_at: string | null
          approved_by_client: boolean
          completed: boolean
          completed_at: string | null
          created_at: string
          description: string | null
          id: string
          project_id: string
          target_date: string | null
          title: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by_client?: boolean
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          project_id: string
          target_date?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by_client?: boolean
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          project_id?: string
          target_date?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_billable_hours_this_month"
            referencedColumns: ["project_id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          read: boolean
          read_at: string | null
          recipient_id: string
          title: string
          type: Database["pm"]["Enums"]["notification_type"]
        }
        Insert: {
          body?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          read?: boolean
          read_at?: string | null
          recipient_id: string
          title: string
          type: Database["pm"]["Enums"]["notification_type"]
        }
        Update: {
          body?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          read?: boolean
          read_at?: string | null
          recipient_id?: string
          title?: string
          type?: Database["pm"]["Enums"]["notification_type"]
        }
        Relationships: [
          {
            foreignKeyName: "notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "v_team_workload"
            referencedColumns: ["id"]
          },
        ]
      }
      project_members: {
        Row: {
          id: string
          joined_at: string
          project_id: string
          role: Database["pm"]["Enums"]["project_member_role"]
          team_member_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          project_id: string
          role?: Database["pm"]["Enums"]["project_member_role"]
          team_member_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          project_id?: string
          role?: Database["pm"]["Enums"]["project_member_role"]
          team_member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_billable_hours_this_month"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_members_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_members_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "v_team_workload"
            referencedColumns: ["id"]
          },
        ]
      }
      project_sections: {
        Row: {
          created_at: string
          display_order: number
          id: string
          name: string
          project_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          name: string
          project_id: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          name?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_sections_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_sections_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_billable_hours_this_month"
            referencedColumns: ["project_id"]
          },
        ]
      }
      project_template_sections: {
        Row: {
          created_at: string
          display_order: number
          id: string
          name: string
          template_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          name: string
          template_id: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          name?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_template_sections_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "project_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      project_template_tasks: {
        Row: {
          assignee_id: string | null
          created_at: string
          days_from_start: number | null
          description: string | null
          display_order: number
          estimated_hours: number | null
          id: string
          is_recurring: boolean
          notes: string | null
          parent_task_id: string | null
          priority: Database["pm"]["Enums"]["task_priority"]
          recurrence_rule: string | null
          section_id: string | null
          template_id: string
          title: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          created_at?: string
          days_from_start?: number | null
          description?: string | null
          display_order?: number
          estimated_hours?: number | null
          id?: string
          is_recurring?: boolean
          notes?: string | null
          parent_task_id?: string | null
          priority?: Database["pm"]["Enums"]["task_priority"]
          recurrence_rule?: string | null
          section_id?: string | null
          template_id: string
          title: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          created_at?: string
          days_from_start?: number | null
          description?: string | null
          display_order?: number
          estimated_hours?: number | null
          id?: string
          is_recurring?: boolean
          notes?: string | null
          parent_task_id?: string | null
          priority?: Database["pm"]["Enums"]["task_priority"]
          recurrence_rule?: string | null
          section_id?: string | null
          template_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_template_tasks_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_template_tasks_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "v_team_workload"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_template_tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "project_template_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_template_tasks_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "project_template_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_template_tasks_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "project_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      project_templates: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_team_workload"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          client_id: string
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          name: string
          owner_id: string | null
          rag_status: Database["pm"]["Enums"]["rag_status"]
          start_date: string | null
          status: Database["pm"]["Enums"]["project_status"]
          template_id: string | null
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          name: string
          owner_id?: string | null
          rag_status?: Database["pm"]["Enums"]["rag_status"]
          start_date?: string | null
          status?: Database["pm"]["Enums"]["project_status"]
          template_id?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          name?: string
          owner_id?: string | null
          rag_status?: Database["pm"]["Enums"]["rag_status"]
          start_date?: string | null
          status?: Database["pm"]["Enums"]["project_status"]
          template_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_billable_hours_this_month"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "v_team_workload"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "project_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      task_comments: {
        Row: {
          author_id: string | null
          body: string
          created_at: string
          id: string
          portal_user_id: string | null
          task_id: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          body: string
          created_at?: string
          id?: string
          portal_user_id?: string | null
          task_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          body?: string
          created_at?: string
          id?: string
          portal_user_id?: string | null
          task_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "v_team_workload"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_comments_portal_user_id_fkey"
            columns: ["portal_user_id"]
            isOneToOne: false
            referencedRelation: "client_portal_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_dependencies: {
        Row: {
          created_at: string
          depends_on_task_id: string
          id: string
          task_id: string
        }
        Insert: {
          created_at?: string
          depends_on_task_id: string
          id?: string
          task_id: string
        }
        Update: {
          created_at?: string
          depends_on_task_id?: string
          id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_dependencies_depends_on_task_id_fkey"
            columns: ["depends_on_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_dependencies_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assignee_id: string | null
          created_at: string
          description: string | null
          due_date: string | null
          estimated_hours: number | null
          id: string
          is_recurring: boolean
          notes: string | null
          parent_task_id: string | null
          priority: Database["pm"]["Enums"]["task_priority"]
          project_id: string
          recurrence_rule: string | null
          section_id: string | null
          status: Database["pm"]["Enums"]["task_status"]
          title: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          id?: string
          is_recurring?: boolean
          notes?: string | null
          parent_task_id?: string | null
          priority?: Database["pm"]["Enums"]["task_priority"]
          project_id: string
          recurrence_rule?: string | null
          section_id?: string | null
          status?: Database["pm"]["Enums"]["task_status"]
          title: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          id?: string
          is_recurring?: boolean
          notes?: string | null
          parent_task_id?: string | null
          priority?: Database["pm"]["Enums"]["task_priority"]
          project_id?: string
          recurrence_rule?: string | null
          section_id?: string | null
          status?: Database["pm"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "v_team_workload"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_billable_hours_this_month"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "tasks_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "project_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      team_meetings: {
        Row: {
          body: string | null
          created_at: string
          created_by: string | null
          id: string
          occurred_at: string
          summary: string | null
          title: string
          type: Database["pm"]["Enums"]["meeting_type"]
          updated_at: string
          visibility: Database["pm"]["Enums"]["meeting_visibility"]
        }
        Insert: {
          body?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          occurred_at?: string
          summary?: string | null
          title: string
          type?: Database["pm"]["Enums"]["meeting_type"]
          updated_at?: string
          visibility?: Database["pm"]["Enums"]["meeting_visibility"]
        }
        Update: {
          body?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          occurred_at?: string
          summary?: string | null
          title?: string
          type?: Database["pm"]["Enums"]["meeting_type"]
          updated_at?: string
          visibility?: Database["pm"]["Enums"]["meeting_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "team_meetings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_meetings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_team_workload"
            referencedColumns: ["id"]
          },
        ]
      }
      team_member_agencies: {
        Row: {
          agency_id: string
          created_at: string
          id: string
          team_member_id: string
        }
        Insert: {
          agency_id: string
          created_at?: string
          id?: string
          team_member_id: string
        }
        Update: {
          agency_id?: string
          created_at?: string
          id?: string
          team_member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_member_agencies_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_member_agencies_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "v_team_workload"
            referencedColumns: ["id"]
          },
        ]
      }
      team_member_clients: {
        Row: {
          client_id: string
          created_at: string
          id: string
          team_member_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          team_member_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          team_member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_member_clients_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_billable_hours_this_month"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "team_member_clients_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_member_clients_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_member_clients_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "v_team_workload"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          agency_id: string | null
          auth_user_id: string | null
          avatar_url: string | null
          can_view_mrr: boolean
          capacity_hours: number
          created_at: string
          email: string
          id: string
          is_active: boolean
          is_available: boolean
          name: string
          role: Database["pm"]["Enums"]["team_member_role"]
          updated_at: string
        }
        Insert: {
          agency_id?: string | null
          auth_user_id?: string | null
          avatar_url?: string | null
          can_view_mrr?: boolean
          capacity_hours?: number
          created_at?: string
          email: string
          id?: string
          is_active?: boolean
          is_available?: boolean
          name: string
          role?: Database["pm"]["Enums"]["team_member_role"]
          updated_at?: string
        }
        Update: {
          agency_id?: string | null
          auth_user_id?: string | null
          avatar_url?: string | null
          can_view_mrr?: boolean
          capacity_hours?: number
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
          is_available?: boolean
          name?: string
          role?: Database["pm"]["Enums"]["team_member_role"]
          updated_at?: string
        }
        Relationships: []
      }
      team_member_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          team_member_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          team_member_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          team_member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_member_emails_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      time_entries: {
        Row: {
          billable: boolean
          created_at: string
          description: string | null
          duration_minutes: number
          id: string
          logged_date: string
          task_id: string
          team_member_id: string
        }
        Insert: {
          billable?: boolean
          created_at?: string
          description?: string | null
          duration_minutes: number
          id?: string
          logged_date?: string
          task_id: string
          team_member_id: string
        }
        Update: {
          billable?: boolean
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          logged_date?: string
          task_id?: string
          team_member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "v_team_workload"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_billable_hours_this_month: {
        Row: {
          agency_name: string | null
          billable_hours: number | null
          client_id: string | null
          client_name: string | null
          project_id: string | null
          project_name: string | null
          total_hours: number | null
        }
        Relationships: []
      }
      v_client_health: {
        Row: {
          account_manager: string | null
          active_projects: number | null
          agency_name: string | null
          id: string | null
          last_interaction_at: string | null
          name: string | null
          overdue_tasks: number | null
          primary_contact: string | null
          primary_contact_email: string | null
          rag_status: Database["pm"]["Enums"]["rag_status"] | null
          status: string | null
        }
        Relationships: []
      }
      v_team_workload: {
        Row: {
          agency_name: string | null
          capacity_hours: number | null
          estimated_hours_remaining: number | null
          id: string | null
          is_available: boolean | null
          name: string | null
          open_tasks: number | null
          overdue_tasks: number | null
          role: Database["pm"]["Enums"]["team_member_role"] | null
        }
        Relationships: []
      }
    }
    Functions: {
      apply_project_template: {
        Args: {
          p_project_id: string
          p_team_member_id: string
          p_template_id: string
        }
        Returns: undefined
      }
      can_access_client: { Args: { p_client_id: string }; Returns: boolean }
      can_manage_meeting: { Args: { p_meeting_id: string }; Returns: boolean }
      can_read_meeting: { Args: { p_meeting_id: string }; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
      is_portal_user_for: { Args: { p_client_id: string }; Returns: boolean }
      is_team_member: { Args: never; Returns: boolean }
      my_portal_access_level: {
        Args: never
        Returns: Database["pm"]["Enums"]["access_level"]
      }
      my_portal_client_id: { Args: never; Returns: string }
      my_portal_user_id: { Args: never; Returns: string }
      my_team_member_id: { Args: never; Returns: string }
    }
    Enums: {
      access_level: "viewer" | "approver" | "collaborator"
      change_action: "insert" | "update" | "delete"
      interaction_channel:
        | "phone"
        | "email"
        | "video"
        | "in_person"
        | "slack"
        | "sms"
      interaction_type:
        | "call"
        | "email"
        | "meeting"
        | "note"
        | "demo"
        | "support"
        | "check_in"
        | "report"
        | "quote"
      meeting_type:
        | "team_meeting"
        | "one_on_one"
        | "standup"
        | "planning"
        | "retrospective"
        | "training"
        | "other"
      meeting_visibility: "all" | "admin_only" | "participants"
      notification_type:
        | "task_assigned"
        | "task_due"
        | "comment_mention"
        | "task_complete"
        | "task_review"
        | "milestone_due"
        | "approval_needed"
        | "milestone_approved"
      project_member_role: "lead" | "contributor" | "reviewer" | "observer"
      project_status:
        | "planned"
        | "active"
        | "on_hold"
        | "completed"
        | "cancelled"
      rag_status: "red" | "amber" | "green"
      task_priority: "low" | "medium" | "high" | "urgent"
      task_status:
        | "backlog"
        | "todo"
        | "in_progress"
        | "in_review"
        | "done"
        | "cancelled"
      team_member_role: "admin" | "manager" | "member" | "agency_contact"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      agencies: {
        Row: {
          created_at: string
          google_ads_developer_token: string | null
          google_ads_mcc_id: string | null
          google_ads_refresh_token: string | null
          id: string
          internal_dashboard_access: boolean
          logo_url: string | null
          name: string
          primary_color: string | null
          secondary_color: string | null
          tiktok_access_token: string | null
          tiktok_token_expires_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          google_ads_developer_token?: string | null
          google_ads_mcc_id?: string | null
          google_ads_refresh_token?: string | null
          id?: string
          internal_dashboard_access?: boolean
          logo_url?: string | null
          name: string
          primary_color?: string | null
          secondary_color?: string | null
          tiktok_access_token?: string | null
          tiktok_token_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          google_ads_developer_token?: string | null
          google_ads_mcc_id?: string | null
          google_ads_refresh_token?: string | null
          id?: string
          internal_dashboard_access?: boolean
          logo_url?: string | null
          name?: string
          primary_color?: string | null
          secondary_color?: string | null
          tiktok_access_token?: string | null
          tiktok_token_expires_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      campaign_conversion_daily: {
        Row: {
          campaign_id: string
          client_id: string
          connection_id: string | null
          conversion_value: number | null
          conversions: number | null
          created_at: string
          event_name: string
          id: string
          platform: string | null
          report_date: string
          updated_at: string
        }
        Insert: {
          campaign_id: string
          client_id: string
          connection_id?: string | null
          conversion_value?: number | null
          conversions?: number | null
          created_at?: string
          event_name: string
          id?: string
          platform?: string | null
          report_date: string
          updated_at?: string
        }
        Update: {
          campaign_id?: string
          client_id?: string
          connection_id?: string | null
          conversion_value?: number | null
          conversions?: number | null
          created_at?: string
          event_name?: string
          id?: string
          platform?: string | null
          report_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_conversion_daily_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_conversion_daily_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_conversion_daily_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "platform_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_daily_performance: {
        Row: {
          avg_cpc: number | null
          campaign_id: string
          clicks: number | null
          client_id: string
          conversions: number | null
          cost_per_conversion: number | null
          created_at: string
          ctr: number | null
          id: string
          impressions: number | null
          landing_page_views: number | null
          platform: string | null
          reach: number | null
          report_date: string
          spend_cents: number | null
          updated_at: string
        }
        Insert: {
          avg_cpc?: number | null
          campaign_id: string
          clicks?: number | null
          client_id: string
          conversions?: number | null
          cost_per_conversion?: number | null
          created_at?: string
          ctr?: number | null
          id?: string
          impressions?: number | null
          landing_page_views?: number | null
          platform?: string | null
          reach?: number | null
          report_date: string
          spend_cents?: number | null
          updated_at?: string
        }
        Update: {
          avg_cpc?: number | null
          campaign_id?: string
          clicks?: number | null
          client_id?: string
          conversions?: number | null
          cost_per_conversion?: number | null
          created_at?: string
          ctr?: number | null
          id?: string
          impressions?: number | null
          landing_page_views?: number | null
          platform?: string | null
          reach?: number | null
          report_date?: string
          spend_cents?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_daily_performance_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_daily_performance_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          campaign_id: string
          campaign_name: string
          campaign_type: string | null
          client_id: string
          connection_id: string | null
          created_at: string
          external_id: string | null
          first_seen_at: string
          id: string
          platform: string
          status: string | null
          updated_at: string
        }
        Insert: {
          campaign_id: string
          campaign_name: string
          campaign_type?: string | null
          client_id: string
          connection_id?: string | null
          created_at?: string
          external_id?: string | null
          first_seen_at?: string
          id?: string
          platform: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          campaign_id?: string
          campaign_name?: string
          campaign_type?: string | null
          client_id?: string
          connection_id?: string | null
          created_at?: string
          external_id?: string | null
          first_seen_at?: string
          id?: string
          platform?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "platform_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      client_contacts: {
        Row: {
          client_id: string
          created_at: string
          email: string
          first_name: string | null
          id: string
          is_active: boolean
          is_primary: boolean
          job_title: string | null
          last_name: string | null
          name: string | null
          phone: string | null
          pm_notes: string | null
          preferred_contact_method: string | null
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          email: string
          first_name?: string | null
          id?: string
          is_active?: boolean
          is_primary?: boolean
          job_title?: string | null
          last_name?: string | null
          name?: string | null
          phone?: string | null
          pm_notes?: string | null
          preferred_contact_method?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          email?: string
          first_name?: string | null
          id?: string
          is_active?: boolean
          is_primary?: boolean
          job_title?: string | null
          last_name?: string | null
          name?: string | null
          phone?: string | null
          pm_notes?: string | null
          preferred_contact_method?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_contacts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_conversions: {
        Row: {
          client_id: string
          conversion_type: string
          created_at: string
          display_name: string | null
          first_seen_at: string
          group_name: string
          id: string
          is_active: boolean
          is_primary: boolean
          last_seen_at: string
          mapped_name: string | null
          platform: string
          raw_name: string
          sort_order: number
          status: string
        }
        Insert: {
          client_id: string
          conversion_type?: string
          created_at?: string
          display_name?: string | null
          first_seen_at?: string
          group_name?: string
          id?: string
          is_active?: boolean
          is_primary?: boolean
          last_seen_at?: string
          mapped_name?: string | null
          platform: string
          raw_name: string
          sort_order?: number
          status?: string
        }
        Update: {
          client_id?: string
          conversion_type?: string
          created_at?: string
          display_name?: string | null
          first_seen_at?: string
          group_name?: string
          id?: string
          is_active?: boolean
          is_primary?: boolean
          last_seen_at?: string
          mapped_name?: string | null
          platform?: string
          raw_name?: string
          sort_order?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_conversions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_metric_config: {
        Row: {
          client_id: string
          created_at: string
          id: string
          metric_key: string
          metric_value: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          metric_key: string
          metric_value: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          metric_key?: string
          metric_value?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_metric_config_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_users: {
        Row: {
          client_id: string
          created_at: string | null
          role: string
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string | null
          role?: string
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_users_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          account_manager_id: string | null
          address_city: string | null
          address_country: string
          address_postal: string | null
          address_postal_code: string | null
          address_province: string | null
          address_street: string | null
          agency_id: string
          business_phone: string | null
          client_type: string
          created_at: string
          currency: string
          default_chart_mode: string
          ga4_id: string | null
          ghl_pipeline_config: Json | null
          gmb_url: string | null
          google_drive_url: string | null
          hst_number: string | null
          hourly_rate: number
          id: string
          industry: string | null
          is_hourly: boolean
          lead_quality_score: number | null
          legal_name: string | null
          marketing_brief: string | null
          marketing_channels: string[]
          meta_attribution_window: string | null
          mrr_breakdown: Json
          mrr_cents: number
          name: string
          pm_notes: string | null
          rag_status: Database["pm"]["Enums"]["rag_status"]
          report_slug: string | null
          show_ecommerce_hero_row: boolean | null
          show_prior_year_ytd: boolean | null
          status: string
          tracking_setup: string | null
          updated_at: string
          website_url: string | null
          whatconverts_config: Json | null
          whatconverts_profile_id: string | null
        }
        Insert: {
          account_manager_id?: string | null
          address_city?: string | null
          address_country?: string
          address_postal?: string | null
          address_postal_code?: string | null
          address_province?: string | null
          address_street?: string | null
          agency_id: string
          business_phone?: string | null
          client_type?: string
          created_at?: string
          currency?: string
          default_chart_mode?: string
          ga4_id?: string | null
          ghl_pipeline_config?: Json | null
          gmb_url?: string | null
          google_drive_url?: string | null
          hst_number?: string | null
          hourly_rate?: number
          id?: string
          industry?: string | null
          is_hourly?: boolean
          lead_quality_score?: number | null
          legal_name?: string | null
          marketing_brief?: string | null
          marketing_channels?: string[]
          meta_attribution_window?: string | null
          mrr_breakdown?: Json
          mrr_cents?: number
          name: string
          pm_notes?: string | null
          rag_status?: Database["pm"]["Enums"]["rag_status"]
          report_slug?: string | null
          show_ecommerce_hero_row?: boolean | null
          show_prior_year_ytd?: boolean | null
          status?: string
          tracking_setup?: string | null
          updated_at?: string
          website_url?: string | null
          whatconverts_config?: Json | null
          whatconverts_profile_id?: string | null
        }
        Update: {
          account_manager_id?: string | null
          address_city?: string | null
          address_country?: string
          address_postal?: string | null
          address_postal_code?: string | null
          address_province?: string | null
          address_street?: string | null
          agency_id?: string
          business_phone?: string | null
          client_type?: string
          created_at?: string
          currency?: string
          default_chart_mode?: string
          ga4_id?: string | null
          ghl_pipeline_config?: Json | null
          gmb_url?: string | null
          google_drive_url?: string | null
          hst_number?: string | null
          hourly_rate?: number
          id?: string
          industry?: string | null
          is_hourly?: boolean
          lead_quality_score?: number | null
          legal_name?: string | null
          marketing_brief?: string | null
          marketing_channels?: string[]
          meta_attribution_window?: string | null
          mrr_breakdown?: Json
          mrr_cents?: number
          name?: string
          pm_notes?: string | null
          rag_status?: Database["pm"]["Enums"]["rag_status"]
          report_slug?: string | null
          show_ecommerce_hero_row?: boolean | null
          show_prior_year_ytd?: boolean | null
          status?: string
          tracking_setup?: string | null
          updated_at?: string
          website_url?: string | null
          whatconverts_config?: Json | null
          whatconverts_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      conversion_events: {
        Row: {
          client_id: string
          connection_id: string | null
          created_at: string
          event_count: number
          event_name: string
          id: string
          metadata: Json
          occurred_on: string
          platform: string
        }
        Insert: {
          client_id: string
          connection_id?: string | null
          created_at?: string
          event_count?: number
          event_name: string
          id?: string
          metadata?: Json
          occurred_on: string
          platform: string
        }
        Update: {
          client_id?: string
          connection_id?: string | null
          created_at?: string
          event_count?: number
          event_name?: string
          id?: string
          metadata?: Json
          occurred_on?: string
          platform?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversion_events_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversion_events_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "platform_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_performance: {
        Row: {
          clicks: number
          client_id: string
          conversion_value_cents: number | null
          conversions: number
          created_at: string
          id: string
          impressions: number
          platform: string
          raw: Json
          report_date: string
          roas: number | null
          search_lost_budget: number | null
          search_lost_rank: number | null
          spend_cents: number
          updated_at: string
        }
        Insert: {
          clicks?: number
          client_id: string
          conversion_value_cents?: number | null
          conversions?: number
          created_at?: string
          id?: string
          impressions?: number
          platform: string
          raw?: Json
          report_date: string
          roas?: number | null
          search_lost_budget?: number | null
          search_lost_rank?: number | null
          spend_cents?: number
          updated_at?: string
        }
        Update: {
          clicks?: number
          client_id?: string
          conversion_value_cents?: number | null
          conversions?: number
          created_at?: string
          id?: string
          impressions?: number
          platform?: string
          raw?: Json
          report_date?: string
          roas?: number | null
          search_lost_budget?: number | null
          search_lost_rank?: number | null
          spend_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_performance_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      ghl_contact_sources: {
        Row: {
          client_id: string
          contact_count: number
          created_at: string
          id: string
          snapshot_date: string
          source_name: string
        }
        Insert: {
          client_id: string
          contact_count?: number
          created_at?: string
          id?: string
          snapshot_date: string
          source_name: string
        }
        Update: {
          client_id?: string
          contact_count?: number
          created_at?: string
          id?: string
          snapshot_date?: string
          source_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "ghl_contact_sources_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      ghl_contact_tag_events: {
        Row: {
          client_id: string | null
          contact_id: string
          detected_at: string | null
          id: string
          tag: string
        }
        Insert: {
          client_id?: string | null
          contact_id: string
          detected_at?: string | null
          id?: string
          tag: string
        }
        Update: {
          client_id?: string | null
          contact_id?: string
          detected_at?: string | null
          id?: string
          tag?: string
        }
        Relationships: [
          {
            foreignKeyName: "ghl_contact_tag_events_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      ghl_contacts: {
        Row: {
          appointment_booked_date: string | null
          client_id: string | null
          consultation_attended_date: string | null
          contact_id: string
          created_at: string | null
          custom_fields: Json
          customer_won_date: string | null
          date_added: string | null
          first_name: string | null
          id: string
          last_name: string | null
          location_id: string | null
          source: string | null
          tags: string[] | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          appointment_booked_date?: string | null
          client_id?: string | null
          consultation_attended_date?: string | null
          contact_id: string
          created_at?: string | null
          custom_fields?: Json
          customer_won_date?: string | null
          date_added?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          location_id?: string | null
          source?: string | null
          tags?: string[] | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          appointment_booked_date?: string | null
          client_id?: string | null
          consultation_attended_date?: string | null
          contact_id?: string
          created_at?: string | null
          custom_fields?: Json
          customer_won_date?: string | null
          date_added?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          location_id?: string | null
          source?: string | null
          tags?: string[] | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ghl_contacts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      ghl_daily_snapshot: {
        Row: {
          client_id: string
          created_at: string
          id: string
          metrics: Json
          new_contacts: number
          opportunities_created: number
          pipeline_value_cents: number
          snapshot_date: string
          total_contacts: number
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          metrics?: Json
          new_contacts?: number
          opportunities_created?: number
          pipeline_value_cents?: number
          snapshot_date: string
          total_contacts?: number
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          metrics?: Json
          new_contacts?: number
          opportunities_created?: number
          pipeline_value_cents?: number
          snapshot_date?: string
          total_contacts?: number
        }
        Relationships: [
          {
            foreignKeyName: "ghl_daily_snapshot_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      ghl_location_keys: {
        Row: {
          api_key: string
          client_id: string | null
          created_at: string
          id: string
          location_id: string
          location_name: string | null
          updated_at: string
        }
        Insert: {
          api_key: string
          client_id?: string | null
          created_at?: string
          id?: string
          location_id: string
          location_name?: string | null
          updated_at?: string
        }
        Update: {
          api_key?: string
          client_id?: string | null
          created_at?: string
          id?: string
          location_id?: string
          location_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ghl_location_keys_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      ghl_opportunities: {
        Row: {
          appointment_booked_date: string | null
          client_id: string | null
          consultation_attended_date: string | null
          contact_id: string | null
          created_at_ghl: string | null
          custom_fields: Json
          customer_won_date: string | null
          id: string
          monetary_value: number | null
          opportunity_id: string
          pipeline_id: string | null
          pipeline_name: string | null
          source: string | null
          stage_id: string | null
          stage_name: string | null
          status: string | null
          synced_at: string | null
          updated_at_ghl: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          appointment_booked_date?: string | null
          client_id?: string | null
          consultation_attended_date?: string | null
          contact_id?: string | null
          created_at_ghl?: string | null
          custom_fields?: Json
          customer_won_date?: string | null
          id?: string
          monetary_value?: number | null
          opportunity_id: string
          pipeline_id?: string | null
          pipeline_name?: string | null
          source?: string | null
          stage_id?: string | null
          stage_name?: string | null
          status?: string | null
          synced_at?: string | null
          updated_at_ghl?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          appointment_booked_date?: string | null
          client_id?: string | null
          consultation_attended_date?: string | null
          contact_id?: string | null
          created_at_ghl?: string | null
          custom_fields?: Json
          customer_won_date?: string | null
          id?: string
          monetary_value?: number | null
          opportunity_id?: string
          pipeline_id?: string | null
          pipeline_name?: string | null
          source?: string | null
          stage_id?: string | null
          stage_name?: string | null
          status?: string | null
          synced_at?: string | null
          updated_at_ghl?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ghl_opportunities_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      ghl_opportunity_stage_history: {
        Row: {
          client_id: string | null
          contact_id: string | null
          id: string
          opportunity_id: string
          recorded_at: string | null
          stage_id: string | null
          stage_name: string | null
        }
        Insert: {
          client_id?: string | null
          contact_id?: string | null
          id?: string
          opportunity_id: string
          recorded_at?: string | null
          stage_id?: string | null
          stage_name?: string | null
        }
        Update: {
          client_id?: string | null
          contact_id?: string | null
          id?: string
          opportunity_id?: string
          recorded_at?: string | null
          stage_id?: string | null
          stage_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ghl_opportunity_stage_history_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      ghl_pipeline_snapshot: {
        Row: {
          client_id: string
          created_at: string
          id: string
          opportunity_count: number
          pipeline_id: string
          pipeline_name: string | null
          snapshot_date: string
          stage_name: string | null
          value_cents: number
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          opportunity_count?: number
          pipeline_id: string
          pipeline_name?: string | null
          snapshot_date: string
          stage_name?: string | null
          value_cents?: number
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          opportunity_count?: number
          pipeline_id?: string
          pipeline_name?: string | null
          snapshot_date?: string
          stage_name?: string | null
          value_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "ghl_pipeline_snapshot_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_budgets: {
        Row: {
          budget_amount_cents: number
          client_id: string
          created_at: string
          currency: string
          id: string
          month: number
          platform: string
          updated_at: string
          year: number
        }
        Insert: {
          budget_amount_cents: number
          client_id: string
          created_at?: string
          currency?: string
          id?: string
          month: number
          platform?: string
          updated_at?: string
          year: number
        }
        Update: {
          budget_amount_cents?: number
          client_id?: string
          created_at?: string
          currency?: string
          id?: string
          month?: number
          platform?: string
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "monthly_budgets_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_connections: {
        Row: {
          access_token: string | null
          campaign_filter: Json | null
          client_id: string
          created_at: string
          credentials_ref: string | null
          external_account_id: string | null
          id: string
          last_sync_at: string | null
          platform: string
          refresh_token: string | null
          status: string
          token_expires_at: string | null
          updated_at: string
        }
        Insert: {
          access_token?: string | null
          campaign_filter?: Json | null
          client_id: string
          created_at?: string
          credentials_ref?: string | null
          external_account_id?: string | null
          id?: string
          last_sync_at?: string | null
          platform: string
          refresh_token?: string | null
          status?: string
          token_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string | null
          campaign_filter?: Json | null
          client_id?: string
          created_at?: string
          credentials_ref?: string | null
          external_account_id?: string | null
          id?: string
          last_sync_at?: string | null
          platform?: string
          refresh_token?: string | null
          status?: string
          token_expires_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_connections_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      search_term_performance: {
        Row: {
          avg_cpc: number
          campaign_id: string | null
          campaign_name: string
          clicks: number
          client_id: string
          connection_id: string | null
          conversions: number
          created_at: string
          ctr: number
          id: string
          impressions: number
          platform: string
          report_date: string
          search_term: string
          spend_cents: number
          updated_at: string
        }
        Insert: {
          avg_cpc?: number
          campaign_id?: string | null
          campaign_name?: string
          clicks?: number
          client_id: string
          connection_id?: string | null
          conversions?: number
          created_at?: string
          ctr?: number
          id?: string
          impressions?: number
          platform: string
          report_date: string
          search_term: string
          spend_cents?: number
          updated_at?: string
        }
        Update: {
          avg_cpc?: number
          campaign_id?: string | null
          campaign_name?: string
          clicks?: number
          client_id?: string
          connection_id?: string | null
          conversions?: number
          created_at?: string
          ctr?: number
          id?: string
          impressions?: number
          platform?: string
          report_date?: string
          search_term?: string
          spend_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "search_term_performance_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "search_term_performance_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "search_term_performance_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "platform_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_log: {
        Row: {
          client_id: string | null
          completed_at: string | null
          error_message: string | null
          id: string
          job_type: string
          platform: string | null
          raw_payload: Json
          records_processed: number | null
          started_at: string
          status: string
        }
        Insert: {
          client_id?: string | null
          completed_at?: string | null
          error_message?: string | null
          id?: string
          job_type: string
          platform?: string | null
          raw_payload?: Json
          records_processed?: number | null
          started_at?: string
          status?: string
        }
        Update: {
          client_id?: string | null
          completed_at?: string | null
          error_message?: string | null
          id?: string
          job_type?: string
          platform?: string | null
          raw_payload?: Json
          records_processed?: number | null
          started_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_log_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      user_agencies: {
        Row: {
          agency_id: string
          created_at: string
          role: string
          user_id: string
        }
        Insert: {
          agency_id: string
          created_at?: string
          role?: string
          user_id: string
        }
        Update: {
          agency_id?: string
          created_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_agencies_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      whatconverts_leads: {
        Row: {
          client_id: string | null
          contact_name: string | null
          date_created: string | null
          form_name: string | null
          id: string
          lead_campaign: string | null
          lead_id: number
          lead_medium: string | null
          lead_source: string | null
          lead_status: string | null
          lead_type: string | null
          quotable: string | null
          sales_value: number | null
          synced_at: string | null
        }
        Insert: {
          client_id?: string | null
          contact_name?: string | null
          date_created?: string | null
          form_name?: string | null
          id?: string
          lead_campaign?: string | null
          lead_id: number
          lead_medium?: string | null
          lead_source?: string | null
          lead_status?: string | null
          lead_type?: string | null
          quotable?: string | null
          sales_value?: number | null
          synced_at?: string | null
        }
        Update: {
          client_id?: string | null
          contact_name?: string | null
          date_created?: string | null
          form_name?: string | null
          id?: string
          lead_campaign?: string | null
          lead_id?: number
          lead_medium?: string | null
          lead_source?: string | null
          lead_status?: string | null
          lead_type?: string | null
          quotable?: string | null
          sales_value?: number | null
          synced_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatconverts_leads_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _status_for_internal_section: {
        Args: { p_section_id: string }
        Returns: Database["pm"]["Enums"]["task_status"]
      }
      _status_for_section: {
        Args: { p_section_id: string }
        Returns: Database["pm"]["Enums"]["task_status"]
      }
      add_meeting_participant_with_team_member_context: {
        Args: {
          p_meeting_id: string
          p_participant_id: string
          p_team_member_id: string
        }
        Returns: string
      }
      apply_project_template_with_team_member_context: {
        Args: {
          p_project_id: string
          p_team_member_id: string
          p_template_id: string
        }
        Returns: undefined
      }
      attachment_visible_to_client: {
        Args: {
          p_client_id: string
          p_entity_id: string
          p_entity_type: string
        }
        Returns: boolean
      }
      delete_interaction_with_team_member_context: {
        Args: { p_interaction_id: string; p_team_member_id: string }
        Returns: undefined
      }
      delete_internal_task_with_team_member_context: {
        Args: { p_task_id: string; p_team_member_id: string }
        Returns: undefined
      }
      delete_meeting_with_team_member_context: {
        Args: { p_meeting_id: string; p_team_member_id: string }
        Returns: undefined
      }
      delete_project_member_with_team_member_context: {
        Args: { p_member_id: string; p_team_member_id: string }
        Returns: undefined
      }
      delete_project_template_section_with_team_member_context: {
        Args: { p_section_id: string; p_team_member_id: string }
        Returns: undefined
      }
      delete_project_template_task_with_team_member_context: {
        Args: { p_task_id: string; p_team_member_id: string }
        Returns: undefined
      }
      delete_project_template_with_team_member_context: {
        Args: { p_team_member_id: string; p_template_id: string }
        Returns: undefined
      }
      delete_task_comment_with_team_member_context: {
        Args: { p_comment_id: string; p_team_member_id: string }
        Returns: undefined
      }
      delete_task_dependency_with_team_member_context: {
        Args: { p_dependency_id: string; p_team_member_id: string }
        Returns: undefined
      }
      delete_task_with_team_member_context: {
        Args: { p_task_id: string; p_team_member_id: string }
        Returns: undefined
      }
      delete_time_entry_with_team_member_context: {
        Args: { p_entry_id: string; p_team_member_id: string }
        Returns: undefined
      }
      duplicate_project_template_with_team_member_context: {
        Args: { p_team_member_id: string; p_template_id: string }
        Returns: string
      }
      filter_client_contact_ids_by_search: {
        Args: { p_query: string }
        Returns: string[]
      }
      insert_client_contact_with_team_member_context: {
        Args: { p_contact: Json; p_team_member_id: string }
        Returns: string
      }
      insert_client_with_team_member_context: {
        Args: { p_client: Json; p_contact?: Json; p_team_member_id: string }
        Returns: string
      }
      insert_interaction_with_team_member_context: {
        Args: { p_payload: Json; p_team_member_id: string }
        Returns: string
      }
      insert_internal_project_with_team_member_context: {
        Args: { p_project: Json; p_team_member_id: string }
        Returns: string
      }
      insert_internal_section_with_team_member_context: {
        Args: { p_payload: Json; p_team_member_id: string }
        Returns: string
      }
      insert_internal_task_with_team_member_context: {
        Args: { p_payload: Json; p_team_member_id: string }
        Returns: string
      }
      insert_meeting_with_team_member_context: {
        Args: { p_payload: Json; p_team_member_id: string }
        Returns: string
      }
      insert_milestone_with_team_member_context: {
        Args: { p_payload: Json; p_team_member_id: string }
        Returns: string
      }
      insert_project_member_with_team_member_context: {
        Args: { p_payload: Json; p_team_member_id: string }
        Returns: string
      }
      insert_project_template_section_with_team_member_context: {
        Args: { p_payload: Json; p_team_member_id: string }
        Returns: string
      }
      insert_project_template_task_with_team_member_context: {
        Args: { p_payload: Json; p_team_member_id: string }
        Returns: string
      }
      insert_project_template_with_team_member_context: {
        Args: { p_payload: Json; p_team_member_id: string }
        Returns: string
      }
      insert_project_with_team_member_context: {
        Args: { p_project: Json; p_team_member_id: string }
        Returns: string
      }
      insert_task_comment_with_team_member_context: {
        Args: { p_payload: Json; p_team_member_id: string }
        Returns: string
      }
      insert_task_dependency_with_team_member_context: {
        Args: { p_payload: Json; p_team_member_id: string }
        Returns: string
      }
      insert_task_with_team_member_context: {
        Args: { p_payload: Json; p_team_member_id: string }
        Returns: string
      }
      insert_time_entry_with_team_member_context: {
        Args: { p_payload: Json; p_team_member_id: string }
        Returns: string
      }
      is_client_report_contact: {
        Args: { p_client_id: string }
        Returns: boolean
      }
      remove_client_platform: {
        Args: { client_uuid: string; platform_name: string }
        Returns: undefined
      }
      remove_meeting_participant_with_team_member_context: {
        Args: { p_participant_id: string; p_team_member_id: string }
        Returns: undefined
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      storage_path_visible_to_client: {
        Args: { p_client_id: string; p_path: string }
        Returns: boolean
      }
      update_client_contact_with_team_member_context: {
        Args: {
          p_contact_id: string
          p_payload: Json
          p_team_member_id: string
        }
        Returns: undefined
      }
      update_client_with_team_member_context:
        | {
            Args: {
              p_account_manager_id?: string
              p_address_city?: string
              p_address_country?: string
              p_address_postal?: string
              p_address_province?: string
              p_address_street?: string
              p_client_id: string
              p_client_type?: string
              p_ga4_id?: string
              p_hst_number?: string
              p_industry?: string
              p_legal_name?: string
              p_marketing_channels?: string[]
              p_mrr_cents?: number
              p_name?: string
              p_pm_notes?: string
              p_rag_status?: string
              p_status?: string
              p_team_member_id: string
              p_tracking_setup?: string
              p_website_url?: string
            }
            Returns: undefined
          }
        | {
            Args: {
              p_client_id: string
              p_payload: Json
              p_team_member_id: string
            }
            Returns: undefined
          }
      update_interaction_with_team_member_context: {
        Args: {
          p_interaction_id: string
          p_payload: Json
          p_team_member_id: string
        }
        Returns: undefined
      }
      update_internal_project_with_team_member_context: {
        Args: {
          p_payload: Json
          p_project_id: string
          p_team_member_id: string
        }
        Returns: undefined
      }
      update_internal_task_section_with_team_member_context: {
        Args: {
          p_section_id: string
          p_task_id: string
          p_team_member_id: string
        }
        Returns: undefined
      }
      update_internal_task_with_team_member_context: {
        Args: { p_payload: Json; p_task_id: string; p_team_member_id: string }
        Returns: undefined
      }
      update_meeting_with_team_member_context: {
        Args: {
          p_meeting_id: string
          p_payload: Json
          p_team_member_id: string
        }
        Returns: undefined
      }
      update_milestone_with_team_member_context: {
        Args: {
          p_milestone_id: string
          p_payload: Json
          p_team_member_id: string
        }
        Returns: undefined
      }
      update_project_template_section_with_team_member_context: {
        Args: {
          p_payload: Json
          p_section_id: string
          p_team_member_id: string
        }
        Returns: undefined
      }
      update_project_template_task_with_team_member_context: {
        Args: { p_payload: Json; p_task_id: string; p_team_member_id: string }
        Returns: undefined
      }
      update_project_template_with_team_member_context: {
        Args: {
          p_payload: Json
          p_team_member_id: string
          p_template_id: string
        }
        Returns: undefined
      }
      update_task_section_with_team_member_context: {
        Args: {
          p_section_id: string
          p_task_id: string
          p_team_member_id: string
        }
        Returns: undefined
      }
      update_task_with_team_member_context: {
        Args: { p_payload: Json; p_task_id: string; p_team_member_id: string }
        Returns: undefined
      }
      update_team_member_availability_with_team_member_context: {
        Args: {
          p_is_available: boolean
          p_target_member_id: string
          p_team_member_id: string
        }
        Returns: undefined
      }
      upsert_platform_connection:
        | {
            Args: {
              p_client_id: string
              p_external_account_id: string
              p_platform: string
            }
            Returns: undefined
          }
        | {
            Args: {
              p_client_id: string
              p_external_account_id: string
              p_platform: string
              p_team_member_id: string
            }
            Returns: undefined
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
  pm: {
    Enums: {
      access_level: ["viewer", "approver", "collaborator"],
      change_action: ["insert", "update", "delete"],
      interaction_channel: [
        "phone",
        "email",
        "video",
        "in_person",
        "slack",
        "sms",
      ],
      interaction_type: [
        "call",
        "email",
        "meeting",
        "note",
        "demo",
        "support",
        "check_in",
        "report",
        "quote",
      ],
      meeting_type: [
        "team_meeting",
        "one_on_one",
        "standup",
        "planning",
        "retrospective",
        "training",
        "other",
      ],
      meeting_visibility: ["all", "admin_only", "participants"],
      notification_type: [
        "task_assigned",
        "task_due",
        "comment_mention",
        "task_complete",
        "task_review",
        "milestone_due",
        "approval_needed",
        "milestone_approved",
      ],
      project_member_role: ["lead", "contributor", "reviewer", "observer"],
      project_status: [
        "planned",
        "active",
        "on_hold",
        "completed",
        "cancelled",
      ],
      rag_status: ["red", "amber", "green"],
      task_priority: ["low", "medium", "high", "urgent"],
      task_status: [
        "backlog",
        "todo",
        "in_progress",
        "in_review",
        "done",
        "cancelled",
      ],
      team_member_role: ["admin", "manager", "member", "agency_contact"],
    },
  },
  public: {
    Enums: {},
  },
} as const
