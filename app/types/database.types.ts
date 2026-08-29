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
        Insert: {
          booking_closes_at?: string | null
          booking_enabled?: boolean | null
          booking_opens_at?: string | null
          cover_image_path?: string | null
          description?: string | null
          ends_at?: string | null
          id?: string | null
          payment_required?: boolean | null
          price_cents?: number | null
          seo_description?: string | null
          seo_image_path?: string | null
          seo_title?: string | null
          short_description?: string | null
          slug?: string | null
          starts_at?: string | null
          status?: string | null
          title?: string | null
          venue_address?: string | null
          venue_name?: string | null
          venue_notes?: string | null
          waitlist_enabled?: boolean | null
        }
        Update: {
          booking_closes_at?: string | null
          booking_enabled?: boolean | null
          booking_opens_at?: string | null
          cover_image_path?: string | null
          description?: string | null
          ends_at?: string | null
          id?: string | null
          payment_required?: boolean | null
          price_cents?: number | null
          seo_description?: string | null
          seo_image_path?: string | null
          seo_title?: string | null
          short_description?: string | null
          slug?: string | null
          starts_at?: string | null
          status?: string | null
          title?: string | null
          venue_address?: string | null
          venue_name?: string | null
          venue_notes?: string | null
          waitlist_enabled?: boolean | null
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
    }
    Functions: {
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
      get_my_roles: {
        Args: Record<PropertyKey, never>
        Returns: {
          code: string
        }[]
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
      set_user_role: {
        Args: {
          target_user_id: string
          target_role_code: string
          should_assign: boolean
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
