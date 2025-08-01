export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      admin_settings: {
        Row: {
          created_at: string
          default_trial_days: number
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_trial_days?: number
          id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_trial_days?: number
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          address: string
          company: string | null
          company_id: string | null
          created_at: string
          email: string
          id: string
          name: string
          notes: string | null
          phone: string
        }
        Insert: {
          address: string
          company?: string | null
          company_id?: string | null
          created_at?: string
          email: string
          id?: string
          name: string
          notes?: string | null
          phone: string
        }
        Update: {
          address?: string
          company?: string | null
          company_id?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          notes?: string | null
          phone?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      clientview_invoice: {
        Row: {
          created_at: string
          html_content: string
          id: string
          invoice_id: string
          updated_at: string
          view_link: string
        }
        Insert: {
          created_at?: string
          html_content: string
          id?: string
          invoice_id: string
          updated_at?: string
          view_link: string
        }
        Update: {
          created_at?: string
          html_content?: string
          id?: string
          invoice_id?: string
          updated_at?: string
          view_link?: string
        }
        Relationships: [
          {
            foreignKeyName: "clientview_invoice_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address: string | null
          country: string | null
          created_at: string | null
          currency: string | null
          email: string | null
          id: string
          is_default: boolean | null
          logo_url: string | null
          name: string
          payment_methods: string | null
          phone: string | null
          theme: string | null
          timezone: string
          updated_at: string | null
          user_id: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          country?: string | null
          created_at?: string | null
          currency?: string | null
          email?: string | null
          id?: string
          is_default?: boolean | null
          logo_url?: string | null
          name: string
          payment_methods?: string | null
          phone?: string | null
          theme?: string | null
          timezone?: string
          updated_at?: string | null
          user_id?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          country?: string | null
          created_at?: string | null
          currency?: string | null
          email?: string | null
          id?: string
          is_default?: boolean | null
          logo_url?: string | null
          name?: string
          payment_methods?: string | null
          phone?: string | null
          theme?: string | null
          timezone?: string
          updated_at?: string | null
          user_id?: string | null
          website?: string | null
        }
        Relationships: []
      }
      company_clientview: {
        Row: {
          address: string | null
          company_id: string
          created_at: string
          email: string | null
          id: string
          logo_url: string | null
          name: string
          payment_methods: string | null
          phone: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          company_id: string
          created_at?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          name: string
          payment_methods?: string | null
          phone?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          company_id?: string
          created_at?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          payment_methods?: string | null
          phone?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_clientview_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_templates: {
        Row: {
          company_id: string | null
          content: string
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id?: string | null
          content: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string | null
          content?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_templates: {
        Row: {
          amount: number
          company_id: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          company_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          company_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discount_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      email_history: {
        Row: {
          body: string
          error_message: string | null
          id: string
          recipient_email: string
          recipient_user_id: string | null
          sent_at: string
          status: string
          subject: string
          template_id: string | null
        }
        Insert: {
          body: string
          error_message?: string | null
          id?: string
          recipient_email: string
          recipient_user_id?: string | null
          sent_at?: string
          status?: string
          subject: string
          template_id?: string | null
        }
        Update: {
          body?: string
          error_message?: string | null
          id?: string
          recipient_email?: string
          recipient_user_id?: string | null
          sent_at?: string
          status?: string
          subject?: string
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_history_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          body: string
          category: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          subject: string
          updated_at: string
        }
        Insert: {
          body: string
          category: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          subject: string
          updated_at?: string
        }
        Update: {
          body?: string
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      expense_categories: {
        Row: {
          company_id: string | null
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_categories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category_id: string | null
          company_id: string | null
          created_at: string
          date: string
          description: string
          id: string
          notes: string | null
          receipt_url: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          category_id?: string | null
          company_id?: string | null
          created_at?: string
          date: string
          description: string
          id?: string
          notes?: string | null
          receipt_url?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          category_id?: string | null
          company_id?: string | null
          created_at?: string
          date?: string
          description?: string
          id?: string
          notes?: string | null
          receipt_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          amount: number
          created_at: string
          description: string
          id: string
          invoice_id: string
          name: string | null
          quantity: number
          rate: number
        }
        Insert: {
          amount: number
          created_at?: string
          description: string
          id?: string
          invoice_id: string
          name?: string | null
          quantity: number
          rate: number
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          id?: string
          invoice_id?: string
          name?: string | null
          quantity?: number
          rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_templates: {
        Row: {
          company_id: string | null
          content: string
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id?: string | null
          content: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string | null
          content?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          client_id: string
          company_id: string | null
          contract_accepted_at: string | null
          contract_accepted_by: string | null
          contract_status: string | null
          contract_terms: string | null
          created_at: string
          date: string
          due_date: string
          html_content: string | null
          html_generated_at: string | null
          id: string
          invoice_accepted_at: string | null
          invoice_accepted_by: string | null
          job_id: string | null
          notes: string | null
          number: string
          pdf_url: string | null
          shooting_date: string | null
          status: string
          view_link: string
        }
        Insert: {
          amount: number
          client_id: string
          company_id?: string | null
          contract_accepted_at?: string | null
          contract_accepted_by?: string | null
          contract_status?: string | null
          contract_terms?: string | null
          created_at?: string
          date: string
          due_date: string
          html_content?: string | null
          html_generated_at?: string | null
          id?: string
          invoice_accepted_at?: string | null
          invoice_accepted_by?: string | null
          job_id?: string | null
          notes?: string | null
          number: string
          pdf_url?: string | null
          shooting_date?: string | null
          status: string
          view_link: string
        }
        Update: {
          amount?: number
          client_id?: string
          company_id?: string | null
          contract_accepted_at?: string | null
          contract_accepted_by?: string | null
          contract_status?: string | null
          contract_terms?: string | null
          created_at?: string
          date?: string
          due_date?: string
          html_content?: string | null
          html_generated_at?: string | null
          id?: string
          invoice_accepted_at?: string | null
          invoice_accepted_by?: string | null
          job_id?: string | null
          notes?: string | null
          number?: string
          pdf_url?: string | null
          shooting_date?: string | null
          status?: string
          view_link?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_teammates: {
        Row: {
          calendar_event_id: string | null
          created_at: string
          id: string
          invitation_status: string
          invited_at: string | null
          job_id: string
          responded_at: string | null
          teammate_email: string
          teammate_id: string | null
          teammate_name: string | null
          updated_at: string
        }
        Insert: {
          calendar_event_id?: string | null
          created_at?: string
          id?: string
          invitation_status?: string
          invited_at?: string | null
          job_id: string
          responded_at?: string | null
          teammate_email: string
          teammate_id?: string | null
          teammate_name?: string | null
          updated_at?: string
        }
        Update: {
          calendar_event_id?: string | null
          created_at?: string
          id?: string
          invitation_status?: string
          invited_at?: string | null
          job_id?: string
          responded_at?: string | null
          teammate_email?: string
          teammate_id?: string | null
          teammate_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_teammates_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_teammates_teammate_id_fkey"
            columns: ["teammate_id"]
            isOneToOne: false
            referencedRelation: "teammates"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          calendar_event_id: string | null
          calendar_id: string | null
          client_id: string
          company_id: string | null
          created_at: string
          date: string | null
          description: string | null
          end_time: string | null
          id: string
          is_full_day: boolean | null
          location: string | null
          start_time: string | null
          status: string
          timezone: string | null
          title: string
          updated_at: string
        }
        Insert: {
          calendar_event_id?: string | null
          calendar_id?: string | null
          client_id: string
          company_id?: string | null
          created_at?: string
          date?: string | null
          description?: string | null
          end_time?: string | null
          id?: string
          is_full_day?: boolean | null
          location?: string | null
          start_time?: string | null
          status?: string
          timezone?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          calendar_event_id?: string | null
          calendar_id?: string | null
          client_id?: string
          company_id?: string | null
          created_at?: string
          date?: string | null
          description?: string | null
          end_time?: string | null
          id?: string
          is_full_day?: boolean | null
          location?: string | null
          start_time?: string | null
          status?: string
          timezone?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      packages: {
        Row: {
          company_id: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          price: number
          tax_rate: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          price?: number
          tax_rate?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          price?: number
          tax_rate?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "packages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_schedules: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          due_date: string
          id: string
          invoice_id: string
          payment_date: string | null
          percentage: number | null
          status: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          due_date: string
          id?: string
          invoice_id: string
          payment_date?: string | null
          percentage?: number | null
          status?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          due_date?: string
          id?: string
          invoice_id?: string
          payment_date?: string | null
          percentage?: number | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_schedules_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          is_admin: boolean | null
          last_sign_in_at: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id: string
          is_admin?: boolean | null
          last_sign_in_at?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          is_admin?: boolean | null
          last_sign_in_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      scheduled_emails: {
        Row: {
          created_at: string
          custom_body: string | null
          custom_subject: string | null
          id: string
          recipient_email: string
          recipient_user_id: string | null
          scheduled_for: string
          sent_at: string | null
          status: string
          template_id: string | null
          updated_at: string
          variables: Json | null
        }
        Insert: {
          created_at?: string
          custom_body?: string | null
          custom_subject?: string | null
          id?: string
          recipient_email: string
          recipient_user_id?: string | null
          scheduled_for: string
          sent_at?: string | null
          status?: string
          template_id?: string | null
          updated_at?: string
          variables?: Json | null
        }
        Update: {
          created_at?: string
          custom_body?: string | null
          custom_subject?: string | null
          id?: string
          recipient_email?: string
          recipient_user_id?: string | null
          scheduled_for?: string
          sent_at?: string | null
          status?: string
          template_id?: string | null
          updated_at?: string
          variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_emails_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
        }
        Relationships: []
      }
      subscription_sessions: {
        Row: {
          created_at: string
          id: string
          session_id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          session_id: string
          status: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          session_id?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      teammate_calendar_responses: {
        Row: {
          calendar_event_id: string
          created_at: string
          id: string
          job_teammate_id: string
          responded_at: string
          response_comment: string | null
          response_status: string
        }
        Insert: {
          calendar_event_id: string
          created_at?: string
          id?: string
          job_teammate_id: string
          responded_at?: string
          response_comment?: string | null
          response_status: string
        }
        Update: {
          calendar_event_id?: string
          created_at?: string
          id?: string
          job_teammate_id?: string
          responded_at?: string
          response_comment?: string | null
          response_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "teammate_calendar_responses_job_teammate_id_fkey"
            columns: ["job_teammate_id"]
            isOneToOne: false
            referencedRelation: "job_teammates"
            referencedColumns: ["id"]
          },
        ]
      }
      teammates: {
        Row: {
          company_id: string | null
          created_at: string
          email: string
          id: string
          name: string
          notes: string | null
          phone: string | null
          role: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          email: string
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          role?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          role?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teammates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_integrations: {
        Row: {
          access_token: string | null
          calendar_id: string | null
          calendar_name: string | null
          company_id: string | null
          created_at: string
          expires_at: string | null
          id: string
          provider: string
          refresh_token: string | null
          token_type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token?: string | null
          calendar_id?: string | null
          calendar_name?: string | null
          company_id?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          provider: string
          refresh_token?: string | null
          token_type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string | null
          calendar_id?: string | null
          calendar_name?: string | null
          company_id?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          provider?: string
          refresh_token?: string | null
          token_type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_integrations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_settings: {
        Row: {
          contract_template: string | null
          created_at: string
          custom_format: string | null
          default_currency: string
          id: string
          invoice_number_format: string
          invoice_template: string | null
          updated_at: string
          use_custom_format: boolean
          user_id: string
        }
        Insert: {
          contract_template?: string | null
          created_at?: string
          custom_format?: string | null
          default_currency?: string
          id?: string
          invoice_number_format?: string
          invoice_template?: string | null
          updated_at?: string
          use_custom_format?: boolean
          user_id: string
        }
        Update: {
          contract_template?: string | null
          created_at?: string
          custom_format?: string | null
          default_currency?: string
          id?: string
          invoice_number_format?: string
          invoice_template?: string | null
          updated_at?: string
          use_custom_format?: boolean
          user_id?: string
        }
        Relationships: []
      }
      user_subscription_history: {
        Row: {
          admin_id: string
          created_at: string
          id: string
          new_status: string
          new_trial_end_date: string | null
          notes: string | null
          previous_status: string | null
          previous_trial_end_date: string | null
          user_id: string
        }
        Insert: {
          admin_id: string
          created_at?: string
          id?: string
          new_status: string
          new_trial_end_date?: string | null
          notes?: string | null
          previous_status?: string | null
          previous_trial_end_date?: string | null
          user_id: string
        }
        Update: {
          admin_id?: string
          created_at?: string
          id?: string
          new_status?: string
          new_trial_end_date?: string | null
          notes?: string | null
          previous_status?: string | null
          previous_trial_end_date?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          admin_override: boolean | null
          cancel_at: string | null
          created_at: string
          current_period_end: string
          id: string
          override_at: string | null
          override_by: string | null
          override_notes: string | null
          status: string
          stripe_customer_id: string
          stripe_subscription_id: string
          trial_end_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_override?: boolean | null
          cancel_at?: string | null
          created_at?: string
          current_period_end: string
          id?: string
          override_at?: string | null
          override_by?: string | null
          override_notes?: string | null
          status: string
          stripe_customer_id: string
          stripe_subscription_id: string
          trial_end_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_override?: boolean | null
          cancel_at?: string | null
          created_at?: string
          current_period_end?: string
          id?: string
          override_at?: string | null
          override_by?: string | null
          override_notes?: string | null
          status?: string
          stripe_customer_id?: string
          stripe_subscription_id?: string
          trial_end_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      set_user_trial_end_date: {
        Args: { user_id: string; days_from_now: number }
        Returns: string
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
  public: {
    Enums: {},
  },
} as const
