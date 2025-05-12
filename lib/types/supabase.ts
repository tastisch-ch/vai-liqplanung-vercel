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
          direction: "Incoming" | "Outgoing"
          modified: boolean
          kategorie: string | null
          user_id: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id: string
          date: string
          details: string
          amount: number
          direction: "Incoming" | "Outgoing"
          modified?: boolean
          kategorie?: string | null
          user_id?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          date?: string
          details?: string
          amount?: number
          direction?: "Incoming" | "Outgoing"
          modified?: boolean
          kategorie?: string | null
          user_id?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      fixkosten: {
        Row: {
          id: string
          name: string
          betrag: number
          rhythmus: "monatlich" | "quartalsweise" | "halbjährlich" | "jährlich"
          start: string
          enddatum: string | null
          user_id: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id: string
          name: string
          betrag: number
          rhythmus: "monatlich" | "quartalsweise" | "halbjährlich" | "jährlich"
          start: string
          enddatum?: string | null
          user_id?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          betrag?: number
          rhythmus?: "monatlich" | "quartalsweise" | "halbjährlich" | "jährlich"
          start?: string
          enddatum?: string | null
          user_id?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      loehne: {
        Row: {
          id: string
          mitarbeiter_id: string
          datum: string
          bruttolohn: number
          ahv_iv_eo: number | null
          alv: number | null
          nbu: number | null
          pensionskasse: number | null
          quellensteuer: number | null
          sonstige_abzuege: number | null
          nettolohn: number | null
          bezahlt: boolean
          user_id: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          mitarbeiter_id: string
          datum: string
          bruttolohn: number
          ahv_iv_eo?: number | null
          alv?: number | null
          nbu?: number | null
          pensionskasse?: number | null
          quellensteuer?: number | null
          sonstige_abzuege?: number | null
          nettolohn?: number | null
          bezahlt?: boolean
          user_id?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          mitarbeiter_id?: string
          datum?: string
          bruttolohn?: number
          ahv_iv_eo?: number | null
          alv?: number | null
          nbu?: number | null
          pensionskasse?: number | null
          quellensteuer?: number | null
          sonstige_abzuege?: number | null
          nettolohn?: number | null
          bezahlt?: boolean
          user_id?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      mitarbeiter: {
        Row: {
          id: string
          vorname: string
          nachname: string
          email: string | null
          telefon: string | null
          position: string | null
          eintrittsdatum: string
          austrittsdatum: string | null
          prozent: number | null
          notizen: string | null
          user_id: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          vorname: string
          nachname: string
          email?: string | null
          telefon?: string | null
          position?: string | null
          eintrittsdatum: string
          austrittsdatum?: string | null
          prozent?: number | null
          notizen?: string | null
          user_id?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          vorname?: string
          nachname?: string
          email?: string | null
          telefon?: string | null
          position?: string | null
          eintrittsdatum?: string
          austrittsdatum?: string | null
          prozent?: number | null
          notizen?: string | null
          user_id?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      profiles: {
        Row: {
          id: string
          updated_at: string | null
          username: string | null
          full_name: string | null
          avatar_url: string | null
          website: string | null
        }
        Insert: {
          id: string
          updated_at?: string | null
          username?: string | null
          full_name?: string | null
          avatar_url?: string | null
          website?: string | null
        }
        Update: {
          id?: string
          updated_at?: string | null
          username?: string | null
          full_name?: string | null
          avatar_url?: string | null
          website?: string | null
        }
      }
      simulationen: {
        Row: {
          id: string
          name: string
          beschreibung: string | null
          start_datum: string
          end_datum: string
          start_betrag: number
          simulation_data: Json | null
          is_active: boolean
          user_id: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          beschreibung?: string | null
          start_datum: string
          end_datum: string
          start_betrag: number
          simulation_data?: Json | null
          is_active?: boolean
          user_id?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          beschreibung?: string | null
          start_datum?: string
          end_datum?: string
          start_betrag?: number
          simulation_data?: Json | null
          is_active?: boolean
          user_id?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      user_settings: {
        Row: {
          user_id: string
          start_balance: number | null
          primary_color: string | null
          secondary_color: string | null
          background_color: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          user_id: string
          start_balance?: number | null
          primary_color?: string | null
          secondary_color?: string | null
          background_color?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          user_id?: string
          start_balance?: number | null
          primary_color?: string | null
          secondary_color?: string | null
          background_color?: string | null
          created_at?: string | null
          updated_at?: string | null
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