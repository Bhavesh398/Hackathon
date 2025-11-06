export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      event_registrations: {
        Row: {
          id: string
          created_at: string
          event_id: string
          user_id: string
          full_name: string
          email: string
          phone: string
          college_name: string
          course: string
          graduation_year: number
          github_url: string | null
          linkedin_url: string | null
          portfolio_url: string | null
          team_name: string | null
          why_join: string
          status: 'pending' | 'approved' | 'rejected'
        }
        Insert: {
          id?: string
          created_at?: string
          event_id: string
          user_id: string
          full_name: string
          email: string
          phone: string
          college_name: string
          course: string
          graduation_year: number
          github_url?: string | null
          linkedin_url?: string | null
          portfolio_url?: string | null
          team_name?: string | null
          why_join: string
          status?: 'pending' | 'approved' | 'rejected'
        }
        Update: {
          id?: string
          created_at?: string
          event_id?: string
          user_id?: string
          full_name?: string
          email?: string
          phone?: string
          college_name?: string
          course?: string
          graduation_year?: number
          github_url?: string | null
          linkedin_url?: string | null
          portfolio_url?: string | null
          team_name?: string | null
          why_join?: string
          status?: 'pending' | 'approved' | 'rejected'
        }
      }
      events: {
        Row: {
          id: string
          created_at: string
          title: string
          description: string
          start_date: string
          end_date: string
          registration_deadline: string
          max_team_size: number
          min_team_size: number
          registration_fee: number
          is_team_event: boolean
          prizes: Json
          organizer_id: string
          status: 'draft' | 'published' | 'closed' | 'cancelled'
        }
        Insert: {
          id?: string
          created_at?: string
          title: string
          description: string
          start_date: string
          end_date: string
          registration_deadline: string
          max_team_size?: number
          min_team_size?: number
          registration_fee?: number
          is_team_event?: boolean
          prizes?: Json
          organizer_id: string
          status?: 'draft' | 'published' | 'closed' | 'cancelled'
        }
        Update: {
          id?: string
          created_at?: string
          title?: string
          description?: string
          start_date?: string
          end_date?: string
          registration_deadline?: string
          max_team_size?: number
          min_team_size?: number
          registration_fee?: number
          is_team_event?: boolean
          prizes?: Json
          organizer_id?: string
          status?: 'draft' | 'published' | 'closed' | 'cancelled'
        }
      }
    }
    Functions: {
      is_registration_open: {
        Args: { event_id: string }
        Returns: boolean
      }
    }
    Enums: {
      event_status: 'draft' | 'published' | 'closed' | 'cancelled'
      registration_status: 'pending' | 'approved' | 'rejected'
    }
  }
}

// Export specific table types for convenience
export type Tables = Database['public']['Tables'];
export type EventRegistration = Tables['event_registrations']['Row'];
export type Event = Tables['events']['Row'];
