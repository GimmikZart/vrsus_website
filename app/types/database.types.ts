export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      activities: {
        Row: {
          active: boolean
          archived_at: string | null
          category_id: string | null
          created_at: string
          description: string | null
          id: string
          image_path: string | null
          metadata: Json
          name: string
          seo_description: string | null
          seo_title: string | null
          short_description: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          archived_at?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_path?: string | null
          metadata?: Json
          name: string
          seo_description?: string | null
          seo_title?: string | null
          short_description?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          archived_at?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_path?: string | null
          metadata?: Json
          name?: string
          seo_description?: string | null
          seo_title?: string | null
          short_description?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'activities_category_id_fkey'
            columns: ['category_id']
            isOneToOne: false
            referencedRelation: 'activity_categories'
            referencedColumns: ['id']
          },
        ]
      }
      activity_categories: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_user_id: string | null
          after_data: Json | null
          before_data: Json | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: 'audit_logs_actor_user_id_fkey'
            columns: ['actor_user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      bookings: {
        Row: {
          admin_notes: string | null
          cancelled_at: string | null
          checked_in_at: string | null
          confirmed_at: string | null
          created_at: string
          event_id: string
          id: string
          notes: string | null
          payment_status: string
          qr_issued_at: string | null
          qr_token_hash: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          cancelled_at?: string | null
          checked_in_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          event_id: string
          id?: string
          notes?: string | null
          payment_status?: string
          qr_issued_at?: string | null
          qr_token_hash?: string | null
          status: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          cancelled_at?: string | null
          checked_in_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          event_id?: string
          id?: string
          notes?: string | null
          payment_status?: string
          qr_issued_at?: string | null
          qr_token_hash?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'bookings_event_id_fkey'
            columns: ['event_id']
            isOneToOne: false
            referencedRelation: 'events'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'bookings_event_id_fkey'
            columns: ['event_id']
            isOneToOne: false
            referencedRelation: 'public_events'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'bookings_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      event_activities: {
        Row: {
          access_mode: string
          active: boolean
          activity_id: string
          capacity: number | null
          created_at: string
          description_override: string | null
          ends_at: string | null
          event_id: string
          id: string
          is_public: boolean
          metadata: Json
          public_name: string | null
          starts_at: string | null
          updated_at: string
        }
        Insert: {
          access_mode: string
          active?: boolean
          activity_id: string
          capacity?: number | null
          created_at?: string
          description_override?: string | null
          ends_at?: string | null
          event_id: string
          id?: string
          is_public?: boolean
          metadata?: Json
          public_name?: string | null
          starts_at?: string | null
          updated_at?: string
        }
        Update: {
          access_mode?: string
          active?: boolean
          activity_id?: string
          capacity?: number | null
          created_at?: string
          description_override?: string | null
          ends_at?: string | null
          event_id?: string
          id?: string
          is_public?: boolean
          metadata?: Json
          public_name?: string | null
          starts_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'event_activities_activity_id_fkey'
            columns: ['activity_id']
            isOneToOne: false
            referencedRelation: 'activities'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'event_activities_activity_id_fkey'
            columns: ['activity_id']
            isOneToOne: false
            referencedRelation: 'public_activities'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'event_activities_event_id_fkey'
            columns: ['event_id']
            isOneToOne: false
            referencedRelation: 'events'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'event_activities_event_id_fkey'
            columns: ['event_id']
            isOneToOne: false
            referencedRelation: 'public_events'
            referencedColumns: ['id']
          },
        ]
      }
      event_checkins: {
        Row: {
          booking_id: string
          checked_in_at: string
          checked_in_by: string
          event_id: string
          id: string
          notes: string | null
          payment_status_at_checkin: string
          user_id: string
        }
        Insert: {
          booking_id: string
          checked_in_at?: string
          checked_in_by: string
          event_id: string
          id?: string
          notes?: string | null
          payment_status_at_checkin: string
          user_id: string
        }
        Update: {
          booking_id?: string
          checked_in_at?: string
          checked_in_by?: string
          event_id?: string
          id?: string
          notes?: string | null
          payment_status_at_checkin?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'event_checkins_booking_id_fkey'
            columns: ['booking_id']
            isOneToOne: true
            referencedRelation: 'bookings'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'event_checkins_checked_in_by_fkey'
            columns: ['checked_in_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'event_checkins_event_id_fkey'
            columns: ['event_id']
            isOneToOne: false
            referencedRelation: 'events'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'event_checkins_event_id_fkey'
            columns: ['event_id']
            isOneToOne: false
            referencedRelation: 'public_events'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'event_checkins_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      event_station_activities: {
        Row: {
          capacity_override: number | null
          created_at: string
          event_activity_id: string
          event_station_id: string
          metadata: Json
          sort_order: number
          updated_at: string
        }
        Insert: {
          capacity_override?: number | null
          created_at?: string
          event_activity_id: string
          event_station_id: string
          metadata?: Json
          sort_order?: number
          updated_at?: string
        }
        Update: {
          capacity_override?: number | null
          created_at?: string
          event_activity_id?: string
          event_station_id?: string
          metadata?: Json
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'event_station_activities_event_activity_id_fkey'
            columns: ['event_activity_id']
            isOneToOne: false
            referencedRelation: 'event_activities'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'event_station_activities_event_activity_id_fkey'
            columns: ['event_activity_id']
            isOneToOne: false
            referencedRelation: 'public_event_activities'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'event_station_activities_event_station_id_fkey'
            columns: ['event_station_id']
            isOneToOne: false
            referencedRelation: 'event_stations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'event_station_activities_event_station_id_fkey'
            columns: ['event_station_id']
            isOneToOne: false
            referencedRelation: 'public_event_stations'
            referencedColumns: ['id']
          },
        ]
      }
      event_stations: {
        Row: {
          active: boolean
          capacity_override: number | null
          created_at: string
          description_override: string | null
          event_id: string
          id: string
          is_public: boolean
          metadata: Json
          public_name: string | null
          sort_order: number
          station_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          capacity_override?: number | null
          created_at?: string
          description_override?: string | null
          event_id: string
          id?: string
          is_public?: boolean
          metadata?: Json
          public_name?: string | null
          sort_order?: number
          station_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          capacity_override?: number | null
          created_at?: string
          description_override?: string | null
          event_id?: string
          id?: string
          is_public?: boolean
          metadata?: Json
          public_name?: string | null
          sort_order?: number
          station_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'event_stations_event_id_fkey'
            columns: ['event_id']
            isOneToOne: false
            referencedRelation: 'events'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'event_stations_event_id_fkey'
            columns: ['event_id']
            isOneToOne: false
            referencedRelation: 'public_events'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'event_stations_station_id_fkey'
            columns: ['station_id']
            isOneToOne: false
            referencedRelation: 'stations'
            referencedColumns: ['id']
          },
        ]
      }
      events: {
        Row: {
          archived_at: string | null
          booking_closes_at: string | null
          booking_enabled: boolean
          booking_opens_at: string | null
          capacity_visibility: string
          cover_image_path: string | null
          created_at: string
          description: string | null
          ends_at: string
          id: string
          is_public: boolean
          max_capacity: number | null
          payment_required: boolean
          price_cents: number
          seo_description: string | null
          seo_image_path: string | null
          seo_title: string | null
          short_description: string | null
          slug: string
          starts_at: string
          status: string
          title: string
          updated_at: string
          venue_address: string | null
          venue_name: string | null
          venue_notes: string | null
          waitlist_enabled: boolean
        }
        Insert: {
          archived_at?: string | null
          booking_closes_at?: string | null
          booking_enabled?: boolean
          booking_opens_at?: string | null
          capacity_visibility?: string
          cover_image_path?: string | null
          created_at?: string
          description?: string | null
          ends_at: string
          id?: string
          is_public?: boolean
          max_capacity?: number | null
          payment_required?: boolean
          price_cents?: number
          seo_description?: string | null
          seo_image_path?: string | null
          seo_title?: string | null
          short_description?: string | null
          slug: string
          starts_at: string
          status?: string
          title: string
          updated_at?: string
          venue_address?: string | null
          venue_name?: string | null
          venue_notes?: string | null
          waitlist_enabled?: boolean
        }
        Update: {
          archived_at?: string | null
          booking_closes_at?: string | null
          booking_enabled?: boolean
          booking_opens_at?: string | null
          capacity_visibility?: string
          cover_image_path?: string | null
          created_at?: string
          description?: string | null
          ends_at?: string
          id?: string
          is_public?: boolean
          max_capacity?: number | null
          payment_required?: boolean
          price_cents?: number
          seo_description?: string | null
          seo_image_path?: string | null
          seo_title?: string | null
          short_description?: string | null
          slug?: string
          starts_at?: string
          status?: string
          title?: string
          updated_at?: string
          venue_address?: string | null
          venue_name?: string | null
          venue_notes?: string | null
          waitlist_enabled?: boolean
        }
        Relationships: []
      }
      matches: {
        Row: {
          bracket_position: number
          called_at: string | null
          completed_at: string | null
          created_at: string
          entry_a_id: string | null
          entry_b_id: string | null
          event_station_id: string | null
          id: string
          next_match_id: string | null
          next_match_slot: string | null
          round_number: number
          scheduled_at: string | null
          score_payload: Json
          started_at: string | null
          status: string
          tournament_id: string
          updated_at: string
          winner_entry_id: string | null
        }
        Insert: {
          bracket_position: number
          called_at?: string | null
          completed_at?: string | null
          created_at?: string
          entry_a_id?: string | null
          entry_b_id?: string | null
          event_station_id?: string | null
          id?: string
          next_match_id?: string | null
          next_match_slot?: string | null
          round_number: number
          scheduled_at?: string | null
          score_payload?: Json
          started_at?: string | null
          status?: string
          tournament_id: string
          updated_at?: string
          winner_entry_id?: string | null
        }
        Update: {
          bracket_position?: number
          called_at?: string | null
          completed_at?: string | null
          created_at?: string
          entry_a_id?: string | null
          entry_b_id?: string | null
          event_station_id?: string | null
          id?: string
          next_match_id?: string | null
          next_match_slot?: string | null
          round_number?: number
          scheduled_at?: string | null
          score_payload?: Json
          started_at?: string | null
          status?: string
          tournament_id?: string
          updated_at?: string
          winner_entry_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'matches_entry_a_id_fkey'
            columns: ['entry_a_id']
            isOneToOne: false
            referencedRelation: 'public_tournament_entries'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'matches_entry_a_id_fkey'
            columns: ['entry_a_id']
            isOneToOne: false
            referencedRelation: 'tournament_entries'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'matches_entry_b_id_fkey'
            columns: ['entry_b_id']
            isOneToOne: false
            referencedRelation: 'public_tournament_entries'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'matches_entry_b_id_fkey'
            columns: ['entry_b_id']
            isOneToOne: false
            referencedRelation: 'tournament_entries'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'matches_event_station_id_fkey'
            columns: ['event_station_id']
            isOneToOne: false
            referencedRelation: 'event_stations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'matches_event_station_id_fkey'
            columns: ['event_station_id']
            isOneToOne: false
            referencedRelation: 'public_event_stations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'matches_next_match_id_fkey'
            columns: ['next_match_id']
            isOneToOne: false
            referencedRelation: 'matches'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'matches_next_match_id_fkey'
            columns: ['next_match_id']
            isOneToOne: false
            referencedRelation: 'public_tournament_matches'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'matches_tournament_id_fkey'
            columns: ['tournament_id']
            isOneToOne: false
            referencedRelation: 'public_tournaments'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'matches_tournament_id_fkey'
            columns: ['tournament_id']
            isOneToOne: false
            referencedRelation: 'tournaments'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'matches_winner_entry_id_fkey'
            columns: ['winner_entry_id']
            isOneToOne: false
            referencedRelation: 'public_tournament_entries'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'matches_winner_entry_id_fkey'
            columns: ['winner_entry_id']
            isOneToOne: false
            referencedRelation: 'tournament_entries'
            referencedColumns: ['id']
          },
        ]
      }
      news_posts: {
        Row: {
          author_id: string | null
          content: string
          cover_image_path: string | null
          created_at: string
          excerpt: string | null
          id: string
          published_at: string | null
          push_on_publish: boolean
          seo_description: string | null
          seo_image_path: string | null
          seo_title: string | null
          show_in_app: boolean
          show_on_home: boolean
          slug: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          content: string
          cover_image_path?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          published_at?: string | null
          push_on_publish?: boolean
          seo_description?: string | null
          seo_image_path?: string | null
          seo_title?: string | null
          show_in_app?: boolean
          show_on_home?: boolean
          slug: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          content?: string
          cover_image_path?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          published_at?: string | null
          push_on_publish?: boolean
          seo_description?: string | null
          seo_image_path?: string | null
          seo_title?: string | null
          show_in_app?: boolean
          show_on_home?: boolean
          slug?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'news_posts_author_id_fkey'
            columns: ['author_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      notification_preferences: {
        Row: {
          email_enabled: boolean
          push_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          email_enabled?: boolean
          push_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          email_enabled?: boolean
          push_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'notification_preferences_user_id_fkey'
            columns: ['user_id']
            isOneToOne: true
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      notifications: {
        Row: {
          action_url: string | null
          created_at: string
          expires_at: string | null
          id: string
          message: string
          metadata: Json
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          message: string
          metadata?: Json
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          message?: string
          metadata?: Json
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'notifications_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      profiles: {
        Row: {
          avatar_path: string | null
          created_at: string
          display_name: string
          first_name: string | null
          id: string
          is_public_profile: boolean
          last_name: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_path?: string | null
          created_at?: string
          display_name: string
          first_name?: string | null
          id: string
          is_public_profile?: boolean
          last_name?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_path?: string | null
          created_at?: string
          display_name?: string
          first_name?: string | null
          id?: string
          is_public_profile?: boolean
          last_name?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          active: boolean
          created_at: string
          device_label: string | null
          id: string
          provider: string
          provider_subscription_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          device_label?: string | null
          id?: string
          provider: string
          provider_subscription_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          device_label?: string | null
          id?: string
          provider?: string
          provider_subscription_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'push_subscriptions_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      ranking_points_ledger: {
        Row: {
          activity_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          metadata: Json
          points: number
          reason_code: string
          tournament_id: string | null
          user_id: string
        }
        Insert: {
          activity_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          metadata?: Json
          points: number
          reason_code: string
          tournament_id?: string | null
          user_id: string
        }
        Update: {
          activity_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          metadata?: Json
          points?: number
          reason_code?: string
          tournament_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'ranking_points_ledger_activity_id_fkey'
            columns: ['activity_id']
            isOneToOne: false
            referencedRelation: 'activities'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ranking_points_ledger_activity_id_fkey'
            columns: ['activity_id']
            isOneToOne: false
            referencedRelation: 'public_activities'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ranking_points_ledger_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ranking_points_ledger_tournament_id_fkey'
            columns: ['tournament_id']
            isOneToOne: false
            referencedRelation: 'public_tournaments'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ranking_points_ledger_tournament_id_fkey'
            columns: ['tournament_id']
            isOneToOne: false
            referencedRelation: 'tournaments'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ranking_points_ledger_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      roles: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      service_inquiries: {
        Row: {
          admin_notes: string | null
          created_at: string
          email: string
          id: string
          message: string
          name: string
          organization: string | null
          people_count: number | null
          phone: string | null
          preferred_date: string | null
          service_page_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          organization?: string | null
          people_count?: number | null
          phone?: string | null
          preferred_date?: string | null
          service_page_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          organization?: string | null
          people_count?: number | null
          phone?: string | null
          preferred_date?: string | null
          service_page_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'service_inquiries_service_page_id_fkey'
            columns: ['service_page_id']
            isOneToOne: false
            referencedRelation: 'public_service_pages'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'service_inquiries_service_page_id_fkey'
            columns: ['service_page_id']
            isOneToOne: false
            referencedRelation: 'service_pages'
            referencedColumns: ['id']
          },
        ]
      }
      service_pages: {
        Row: {
          active: boolean
          content: string
          cover_image_path: string | null
          created_at: string
          excerpt: string | null
          id: string
          seo_description: string | null
          seo_image_path: string | null
          seo_title: string | null
          slug: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          content: string
          cover_image_path?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          seo_description?: string | null
          seo_image_path?: string | null
          seo_title?: string | null
          slug: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          content?: string
          cover_image_path?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          seo_description?: string | null
          seo_image_path?: string | null
          seo_title?: string | null
          slug?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: 'site_settings_updated_by_fkey'
            columns: ['updated_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      station_activities: {
        Row: {
          activity_id: string
          station_id: string
        }
        Insert: {
          activity_id: string
          station_id: string
        }
        Update: {
          activity_id?: string
          station_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'station_activities_activity_id_fkey'
            columns: ['activity_id']
            isOneToOne: false
            referencedRelation: 'activities'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'station_activities_activity_id_fkey'
            columns: ['activity_id']
            isOneToOne: false
            referencedRelation: 'public_activities'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'station_activities_station_id_fkey'
            columns: ['station_id']
            isOneToOne: false
            referencedRelation: 'stations'
            referencedColumns: ['id']
          },
        ]
      }
      station_categories: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: string
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      stations: {
        Row: {
          active: boolean
          archived_at: string | null
          category_id: string | null
          created_at: string
          default_capacity: number | null
          description: string | null
          id: string
          image_path: string | null
          metadata: Json
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          archived_at?: string | null
          category_id?: string | null
          created_at?: string
          default_capacity?: number | null
          description?: string | null
          id?: string
          image_path?: string | null
          metadata?: Json
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          archived_at?: string | null
          category_id?: string | null
          created_at?: string
          default_capacity?: number | null
          description?: string | null
          id?: string
          image_path?: string | null
          metadata?: Json
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'stations_category_id_fkey'
            columns: ['category_id']
            isOneToOne: false
            referencedRelation: 'station_categories'
            referencedColumns: ['id']
          },
        ]
      }
      tournament_checkins: {
        Row: {
          checked_in_at: string
          checked_in_by: string | null
          entry_id: string
          id: string
          tournament_id: string
        }
        Insert: {
          checked_in_at?: string
          checked_in_by?: string | null
          entry_id: string
          id?: string
          tournament_id: string
        }
        Update: {
          checked_in_at?: string
          checked_in_by?: string | null
          entry_id?: string
          id?: string
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'tournament_checkins_checked_in_by_fkey'
            columns: ['checked_in_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tournament_checkins_entry_id_fkey'
            columns: ['entry_id']
            isOneToOne: false
            referencedRelation: 'public_tournament_entries'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tournament_checkins_entry_id_fkey'
            columns: ['entry_id']
            isOneToOne: false
            referencedRelation: 'tournament_entries'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tournament_checkins_tournament_id_fkey'
            columns: ['tournament_id']
            isOneToOne: false
            referencedRelation: 'public_tournaments'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tournament_checkins_tournament_id_fkey'
            columns: ['tournament_id']
            isOneToOne: false
            referencedRelation: 'tournaments'
            referencedColumns: ['id']
          },
        ]
      }
      tournament_entries: {
        Row: {
          created_at: string
          display_name: string
          id: string
          seed: number | null
          status: string
          tournament_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name: string
          id?: string
          seed?: number | null
          status?: string
          tournament_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          seed?: number | null
          status?: string
          tournament_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'tournament_entries_tournament_id_fkey'
            columns: ['tournament_id']
            isOneToOne: false
            referencedRelation: 'public_tournaments'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tournament_entries_tournament_id_fkey'
            columns: ['tournament_id']
            isOneToOne: false
            referencedRelation: 'tournaments'
            referencedColumns: ['id']
          },
        ]
      }
      tournament_entry_members: {
        Row: {
          entry_id: string
          is_captain: boolean
          user_id: string
        }
        Insert: {
          entry_id: string
          is_captain?: boolean
          user_id: string
        }
        Update: {
          entry_id?: string
          is_captain?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'tournament_entry_members_entry_id_fkey'
            columns: ['entry_id']
            isOneToOne: false
            referencedRelation: 'public_tournament_entries'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tournament_entry_members_entry_id_fkey'
            columns: ['entry_id']
            isOneToOne: false
            referencedRelation: 'tournament_entries'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tournament_entry_members_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      tournaments: {
        Row: {
          checkin_required: boolean
          created_at: string
          description: string | null
          event_activity_id: string | null
          event_id: string
          format: string
          id: string
          is_public: boolean
          max_entries: number | null
          name: string
          ranking_enabled: boolean
          registration_closes_at: string | null
          registration_opens_at: string | null
          requires_event_booking: boolean
          rules: string | null
          slug: string
          starts_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          checkin_required?: boolean
          created_at?: string
          description?: string | null
          event_activity_id?: string | null
          event_id: string
          format?: string
          id?: string
          is_public?: boolean
          max_entries?: number | null
          name: string
          ranking_enabled?: boolean
          registration_closes_at?: string | null
          registration_opens_at?: string | null
          requires_event_booking?: boolean
          rules?: string | null
          slug: string
          starts_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          checkin_required?: boolean
          created_at?: string
          description?: string | null
          event_activity_id?: string | null
          event_id?: string
          format?: string
          id?: string
          is_public?: boolean
          max_entries?: number | null
          name?: string
          ranking_enabled?: boolean
          registration_closes_at?: string | null
          registration_opens_at?: string | null
          requires_event_booking?: boolean
          rules?: string | null
          slug?: string
          starts_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'tournaments_event_activity_id_fkey'
            columns: ['event_activity_id']
            isOneToOne: false
            referencedRelation: 'event_activities'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tournaments_event_activity_id_fkey'
            columns: ['event_activity_id']
            isOneToOne: false
            referencedRelation: 'public_event_activities'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tournaments_event_id_fkey'
            columns: ['event_id']
            isOneToOne: false
            referencedRelation: 'events'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tournaments_event_id_fkey'
            columns: ['event_id']
            isOneToOne: false
            referencedRelation: 'public_events'
            referencedColumns: ['id']
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          created_by: string | null
          role_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          role_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'user_roles_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'user_roles_role_id_fkey'
            columns: ['role_id']
            isOneToOne: false
            referencedRelation: 'roles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'user_roles_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      public_activities: {
        Row: {
          category_name: string | null
          category_slug: string | null
          description: string | null
          id: string | null
          image_path: string | null
          name: string | null
          seo_description: string | null
          seo_title: string | null
          short_description: string | null
          slug: string | null
        }
        Relationships: []
      }
      public_event_activities: {
        Row: {
          access_mode: string | null
          category_name: string | null
          category_slug: string | null
          description: string | null
          ends_at: string | null
          event_id: string | null
          id: string | null
          image_path: string | null
          name: string | null
          starts_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'event_activities_event_id_fkey'
            columns: ['event_id']
            isOneToOne: false
            referencedRelation: 'events'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'event_activities_event_id_fkey'
            columns: ['event_id']
            isOneToOne: false
            referencedRelation: 'public_events'
            referencedColumns: ['id']
          },
        ]
      }
      public_event_station_activities: {
        Row: {
          event_activity_id: string | null
          event_station_id: string | null
          sort_order: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'event_station_activities_event_activity_id_fkey'
            columns: ['event_activity_id']
            isOneToOne: false
            referencedRelation: 'event_activities'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'event_station_activities_event_activity_id_fkey'
            columns: ['event_activity_id']
            isOneToOne: false
            referencedRelation: 'public_event_activities'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'event_station_activities_event_station_id_fkey'
            columns: ['event_station_id']
            isOneToOne: false
            referencedRelation: 'event_stations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'event_station_activities_event_station_id_fkey'
            columns: ['event_station_id']
            isOneToOne: false
            referencedRelation: 'public_event_stations'
            referencedColumns: ['id']
          },
        ]
      }
      public_event_stations: {
        Row: {
          category_name: string | null
          category_slug: string | null
          description: string | null
          event_id: string | null
          id: string | null
          image_path: string | null
          name: string | null
          sort_order: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'event_stations_event_id_fkey'
            columns: ['event_id']
            isOneToOne: false
            referencedRelation: 'events'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'event_stations_event_id_fkey'
            columns: ['event_id']
            isOneToOne: false
            referencedRelation: 'public_events'
            referencedColumns: ['id']
          },
        ]
      }
      public_events: {
        Row: {
          booking_closes_at: string | null
          booking_enabled: boolean | null
          booking_opens_at: string | null
          cover_image_path: string | null
          description: string | null
          ends_at: string | null
          id: string | null
          payment_required: boolean | null
          price_cents: number | null
          public_capacity_status: string | null
          public_confirmed_count: number | null
          public_max_capacity: number | null
          seo_description: string | null
          seo_image_path: string | null
          seo_title: string | null
          short_description: string | null
          slug: string | null
          starts_at: string | null
          status: string | null
          title: string | null
          venue_address: string | null
          venue_name: string | null
          venue_notes: string | null
          waitlist_enabled: boolean | null
        }
        Relationships: []
      }
      public_news_posts: {
        Row: {
          content: string | null
          cover_image_path: string | null
          excerpt: string | null
          id: string | null
          published_at: string | null
          seo_description: string | null
          seo_image_path: string | null
          seo_title: string | null
          slug: string | null
          title: string | null
        }
        Insert: {
          content?: string | null
          cover_image_path?: string | null
          excerpt?: string | null
          id?: string | null
          published_at?: string | null
          seo_description?: string | null
          seo_image_path?: string | null
          seo_title?: string | null
          slug?: string | null
          title?: string | null
        }
        Update: {
          content?: string | null
          cover_image_path?: string | null
          excerpt?: string | null
          id?: string | null
          published_at?: string | null
          seo_description?: string | null
          seo_image_path?: string | null
          seo_title?: string | null
          slug?: string | null
          title?: string | null
        }
        Relationships: []
      }
      public_ranking: {
        Row: {
          display_name: string | null
          points: number | null
          tournaments_played: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'ranking_points_ledger_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      public_ranking_by_activity: {
        Row: {
          activity_id: string | null
          activity_name: string | null
          display_name: string | null
          points: number | null
          tournaments_played: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'ranking_points_ledger_activity_id_fkey'
            columns: ['activity_id']
            isOneToOne: false
            referencedRelation: 'activities'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ranking_points_ledger_activity_id_fkey'
            columns: ['activity_id']
            isOneToOne: false
            referencedRelation: 'public_activities'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ranking_points_ledger_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      public_service_pages: {
        Row: {
          content: string | null
          cover_image_path: string | null
          excerpt: string | null
          id: string | null
          seo_description: string | null
          seo_image_path: string | null
          seo_title: string | null
          slug: string | null
          sort_order: number | null
          title: string | null
        }
        Insert: {
          content?: string | null
          cover_image_path?: string | null
          excerpt?: string | null
          id?: string | null
          seo_description?: string | null
          seo_image_path?: string | null
          seo_title?: string | null
          slug?: string | null
          sort_order?: number | null
          title?: string | null
        }
        Update: {
          content?: string | null
          cover_image_path?: string | null
          excerpt?: string | null
          id?: string | null
          seo_description?: string | null
          seo_image_path?: string | null
          seo_title?: string | null
          slug?: string | null
          sort_order?: number | null
          title?: string | null
        }
        Relationships: []
      }
      public_tournament_entries: {
        Row: {
          created_at: string | null
          display_name: string | null
          id: string | null
          seed: number | null
          status: string | null
          tournament_id: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'tournament_entries_tournament_id_fkey'
            columns: ['tournament_id']
            isOneToOne: false
            referencedRelation: 'public_tournaments'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tournament_entries_tournament_id_fkey'
            columns: ['tournament_id']
            isOneToOne: false
            referencedRelation: 'tournaments'
            referencedColumns: ['id']
          },
        ]
      }
      public_tournament_matches: {
        Row: {
          bracket_position: number | null
          called_at: string | null
          completed_at: string | null
          entry_a_id: string | null
          entry_b_id: string | null
          event_station_id: string | null
          id: string | null
          next_match_id: string | null
          next_match_slot: string | null
          round_number: number | null
          scheduled_at: string | null
          score_payload: Json | null
          started_at: string | null
          status: string | null
          tournament_id: string | null
          winner_entry_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'matches_entry_a_id_fkey'
            columns: ['entry_a_id']
            isOneToOne: false
            referencedRelation: 'public_tournament_entries'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'matches_entry_a_id_fkey'
            columns: ['entry_a_id']
            isOneToOne: false
            referencedRelation: 'tournament_entries'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'matches_entry_b_id_fkey'
            columns: ['entry_b_id']
            isOneToOne: false
            referencedRelation: 'public_tournament_entries'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'matches_entry_b_id_fkey'
            columns: ['entry_b_id']
            isOneToOne: false
            referencedRelation: 'tournament_entries'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'matches_event_station_id_fkey'
            columns: ['event_station_id']
            isOneToOne: false
            referencedRelation: 'event_stations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'matches_event_station_id_fkey'
            columns: ['event_station_id']
            isOneToOne: false
            referencedRelation: 'public_event_stations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'matches_next_match_id_fkey'
            columns: ['next_match_id']
            isOneToOne: false
            referencedRelation: 'matches'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'matches_next_match_id_fkey'
            columns: ['next_match_id']
            isOneToOne: false
            referencedRelation: 'public_tournament_matches'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'matches_tournament_id_fkey'
            columns: ['tournament_id']
            isOneToOne: false
            referencedRelation: 'public_tournaments'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'matches_tournament_id_fkey'
            columns: ['tournament_id']
            isOneToOne: false
            referencedRelation: 'tournaments'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'matches_winner_entry_id_fkey'
            columns: ['winner_entry_id']
            isOneToOne: false
            referencedRelation: 'public_tournament_entries'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'matches_winner_entry_id_fkey'
            columns: ['winner_entry_id']
            isOneToOne: false
            referencedRelation: 'tournament_entries'
            referencedColumns: ['id']
          },
        ]
      }
      public_tournaments: {
        Row: {
          checkin_required: boolean | null
          created_at: string | null
          description: string | null
          event_activity_id: string | null
          event_id: string | null
          format: string | null
          id: string | null
          is_public: boolean | null
          max_entries: number | null
          name: string | null
          ranking_enabled: boolean | null
          registration_closes_at: string | null
          registration_opens_at: string | null
          rules: string | null
          slug: string | null
          starts_at: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          checkin_required?: boolean | null
          created_at?: string | null
          description?: string | null
          event_activity_id?: string | null
          event_id?: string | null
          format?: string | null
          id?: string | null
          is_public?: boolean | null
          max_entries?: number | null
          name?: string | null
          ranking_enabled?: boolean | null
          registration_closes_at?: string | null
          registration_opens_at?: string | null
          rules?: string | null
          slug?: string | null
          starts_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          checkin_required?: boolean | null
          created_at?: string | null
          description?: string | null
          event_activity_id?: string | null
          event_id?: string | null
          format?: string | null
          id?: string | null
          is_public?: boolean | null
          max_entries?: number | null
          name?: string | null
          ranking_enabled?: boolean | null
          registration_closes_at?: string | null
          registration_opens_at?: string | null
          rules?: string | null
          slug?: string | null
          starts_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'tournaments_event_activity_id_fkey'
            columns: ['event_activity_id']
            isOneToOne: false
            referencedRelation: 'event_activities'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tournaments_event_activity_id_fkey'
            columns: ['event_activity_id']
            isOneToOne: false
            referencedRelation: 'public_event_activities'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tournaments_event_id_fkey'
            columns: ['event_id']
            isOneToOne: false
            referencedRelation: 'events'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tournaments_event_id_fkey'
            columns: ['event_id']
            isOneToOne: false
            referencedRelation: 'public_events'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Functions: {
      _advance_tournament_winner: {
        Args: { p_match_id: string; p_winner_entry_id: string }
        Returns: undefined
      }
      _award_tournament_points: {
        Args: {
          p_tournament_id: string
          p_entry_id: string
          p_reason: string
          p_points: number
        }
        Returns: undefined
      }
      _promote_waitlist_for_event: {
        Args: { p_event_id: string }
        Returns: number
      }
      adjust_ranking_points: {
        Args: {
          p_user_id: string
          p_activity_id: string
          p_points: number
          p_reason: string
          p_description?: string
        }
        Returns: string
      }
      amend_match_score: {
        Args: { p_match_id: string; p_score_payload: Json }
        Returns: string
      }
      archive_event: {
        Args: { p_event_id: string }
        Returns: boolean
      }
      assign_match_station: {
        Args: { p_match_id: string; p_event_station_id: string }
        Returns: string
      }
      call_tournament_match: {
        Args: { p_match_id: string }
        Returns: Json
      }
      cancel_event_booking: {
        Args: { p_booking_id: string }
        Returns: {
          booking_id: string
          promoted_count: number
        }[]
      }
      check_in_booking: {
        Args: { p_qr_token: string; p_payment_status?: string }
        Returns: {
          booking_id: string
          event_id: string
          user_id: string
          event_title: string
          status: string
          payment_status: string
          checked_in_at: string
          already_checked_in: boolean
        }[]
      }
      check_in_tournament_entry: {
        Args: { p_entry_id: string }
        Returns: boolean
      }
      create_event_booking: {
        Args: { p_event_id: string }
        Returns: {
          booking_id: string
          status: string
        }[]
      }
      create_single_elimination_bracket: {
        Args: { p_tournament_id: string }
        Returns: number
      }
      deactivate_push_subscription: {
        Args: { p_subscription_id: string }
        Returns: boolean
      }
      duplicate_event: {
        Args: {
          p_source_event_id: string
          p_new_slug: string
          p_new_title: string
          p_new_starts_at: string
          p_new_ends_at: string
        }
        Returns: string
      }
      get_my_booking_qr: {
        Args: { p_booking_id: string }
        Returns: {
          booking_id: string
          event_id: string
          event_title: string
          event_slug: string
          status: string
          payment_status: string
          checked_in_at: string
          qr_token: string
          qr_issued_at: string
        }[]
      }
      get_my_bookings: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          event_id: string
          status: string
          payment_status: string
          qr_issued_at: string
          confirmed_at: string
          cancelled_at: string
          checked_in_at: string
          notes: string
          created_at: string
          updated_at: string
        }[]
      }
      get_my_ranking_summary: {
        Args: Record<PropertyKey, never>
        Returns: {
          points: number
          tournaments_played: number
          wins: number
          runner_ups: number
        }[]
      }
      get_my_roles: {
        Args: Record<PropertyKey, never>
        Returns: {
          code: string
        }[]
      }
      get_public_capacity_threshold: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      has_any_role: {
        Args: { required_roles: string[] }
        Returns: boolean
      }
      has_role: {
        Args: { required_role: string }
        Returns: boolean
      }
      is_public_event: {
        Args: { target_event_id: string }
        Returns: boolean
      }
      mark_booking_no_show: {
        Args: { p_booking_id: string }
        Returns: {
          booking_id: string
          status: string
        }[]
      }
      mark_onsite_payment: {
        Args: { p_booking_id: string; p_status: string }
        Returns: {
          booking_id: string
          payment_status: string
        }[]
      }
      promote_waitlist: {
        Args: { p_event_id: string }
        Returns: number
      }
      record_match_result: {
        Args: {
          p_match_id: string
          p_score_payload: Json
          p_winner_entry_id: string
        }
        Returns: string
      }
      register_tournament_entry: {
        Args: { p_tournament_id: string }
        Returns: string
      }
      set_user_role: {
        Args: {
          target_user_id: string
          target_role_code: string
          should_assign: boolean
        }
        Returns: undefined
      }
      start_tournament_match: {
        Args: { p_match_id: string }
        Returns: string
      }
      upsert_notification_preferences: {
        Args: { p_push_enabled?: boolean; p_email_enabled?: boolean }
        Returns: {
          email_enabled: boolean
          push_enabled: boolean
          updated_at: string
          user_id: string
        }
      }
      upsert_push_subscription: {
        Args: {
          p_provider: string
          p_provider_subscription_id: string
          p_device_label?: string
        }
        Returns: string
      }
      withdraw_tournament_entry: {
        Args: { p_tournament_id: string }
        Returns: boolean
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

type DefaultSchema = Database[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof Database },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        Database[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      Database[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
        DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] &
        DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof Database },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof Database },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof Database },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof Database },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
