export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      buchungen: {
        Row: {
          id: string
          date: string
          details: string
          amount: number
          direction: 'Incoming' | 'Outgoing'
          modified: boolean | null
          kategorie: string | null
          user_id: string
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          date: string
          details: string
          amount: number
          direction: 'Incoming' | 'Outgoing'
          modified?: boolean | null
          kategorie?: string | null
          user_id: string
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          date?: string
          details?: string
          amount?: number
          direction?: 'Incoming' | 'Outgoing'
          modified?: boolean | null
          kategorie?: string | null
          user_id?: string
          created_at?: string
          updated_at?: string | null
        }
      }
      fixkosten: {
        Row: {
          id: string
          name: string
          betrag: number
          rhythmus: 'monatlich' | 'quartalsweise' | 'halbjährlich' | 'jährlich'
          start: string
          enddatum: string | null
          user_id: string
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          betrag: number
          rhythmus: 'monatlich' | 'quartalsweise' | 'halbjährlich' | 'jährlich'
          start: string
          enddatum?: string | null
          user_id: string
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          betrag?: number
          rhythmus?: 'monatlich' | 'quartalsweise' | 'halbjährlich' | 'jährlich'
          start?: string
          enddatum?: string | null
          user_id?: string
          created_at?: string
          updated_at?: string | null
        }
      }
      lohndaten: {
        Row: {
          id: string
          mitarbeiter_id: string
          Start: string
          Ende: string | null
          Betrag: number
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          mitarbeiter_id: string
          Start: string
          Ende?: string | null
          Betrag: number
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          mitarbeiter_id?: string
          Start?: string
          Ende?: string | null
          Betrag?: number
          created_at?: string
          updated_at?: string | null
        }
      }
      mitarbeiter: {
        Row: {
          id: string
          Name: string
          user_id: string
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          Name: string
          user_id: string
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          Name?: string
          user_id?: string
          created_at?: string
          updated_at?: string | null
        }
      }
      profiles: {
        Row: {
          id: string
          name: string | null
          role: 'admin' | 'user'
          read_only: boolean
          created_at: string
          settings: Json | null
        }
        Insert: {
          id: string
          name?: string | null
          role?: 'admin' | 'user'
          read_only?: boolean
          created_at?: string
          settings?: Json | null
        }
        Update: {
          id?: string
          name?: string | null
          role?: 'admin' | 'user'
          read_only?: boolean
          created_at?: string
          settings?: Json | null
        }
      }
      simulationen: {
        Row: {
          id: string
          name: string
          details: string
          date: string
          amount: number
          direction: 'Incoming' | 'Outgoing'
          recurring: boolean
          interval: 'monthly' | 'quarterly' | 'yearly' | null
          end_date: string | null
          user_id: string
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          details: string
          date: string
          amount: number
          direction: 'Incoming' | 'Outgoing'
          recurring?: boolean
          interval?: 'monthly' | 'quarterly' | 'yearly' | null
          end_date?: string | null
          user_id: string
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          details?: string
          date?: string
          amount?: number
          direction?: 'Incoming' | 'Outgoing'
          recurring?: boolean
          interval?: 'monthly' | 'quarterly' | 'yearly' | null
          end_date?: string | null
          user_id?: string
          created_at?: string
          updated_at?: string | null
        }
      }
      user_settings: {
        Row: {
          user_id: string
          start_balance: number
          primary_color: string
          secondary_color: string
          background_color: string
          created_at: string
          updated_at: string | null
        }
        Insert: {
          user_id: string
          start_balance?: number
          primary_color?: string
          secondary_color?: string
          background_color?: string
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          user_id?: string
          start_balance?: number
          primary_color?: string
          secondary_color?: string
          background_color?: string
          created_at?: string
          updated_at?: string | null
        }
      }
      daily_balance_snapshots: {
        Row: {
          id: string
          date: string
          balance: number
          user_id: string
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          date: string
          balance: number
          user_id: string
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          date?: string
          balance?: number
          user_id?: string
          created_at?: string
          updated_at?: string | null
        }
      }
      current_balance: {
        Row: {
          user_id: string
          balance: number
          effective_date: string
          updated_at: string
        }
        Insert: {
          user_id: string
          balance: number
          effective_date: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          balance?: number
          effective_date?: string
          updated_at?: string
        }
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