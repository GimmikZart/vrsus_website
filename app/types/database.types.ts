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
      board_poll_options: {
        Row: {
          id: string
          label: string
          post_id: string
          sort_order: number
        }
        Insert: {
          id?: string
          label: string
          post_id: string
          sort_order?: number
        }
        Update: {
          id?: string
          label?: string
          post_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: 'board_poll_options_post_id_fkey'
            columns: ['post_id']
            isOneToOne: false
            referencedRelation: 'board_posts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'board_poll_options_post_id_fkey'
            columns: ['post_id']
            isOneToOne: false
            referencedRelation: 'public_board_posts'
            referencedColumns: ['id']
          },
        ]
      }
      board_poll_votes: {
        Row: {
          created_at: string
          id: string
          option_id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          option_id: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          option_id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'board_poll_votes_option_id_fkey'
            columns: ['option_id']
            isOneToOne: false
            referencedRelation: 'board_poll_options'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'board_poll_votes_option_id_fkey'
            columns: ['option_id']
            isOneToOne: false
            referencedRelation: 'public_board_poll_options'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'board_poll_votes_post_id_fkey'
            columns: ['post_id']
            isOneToOne: false
            referencedRelation: 'board_posts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'board_poll_votes_post_id_fkey'
            columns: ['post_id']
            isOneToOne: false
            referencedRelation: 'public_board_posts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'board_poll_votes_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      board_posts: {
        Row: {
          author_id: string | null
          body: string | null
          created_at: string
          id: string
          image_path: string | null
          pinned: boolean
          post_type: string
          published_at: string | null
          slug: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          body?: string | null
          created_at?: string
          id?: string
          image_path?: string | null
          pinned?: boolean
          post_type: string
          published_at?: string | null
          slug: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          body?: string | null
          created_at?: string
          id?: string
          image_path?: string | null
          pinned?: boolean
          post_type?: string
          published_at?: string | null
          slug?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'board_posts_author_id_fkey'
            columns: ['author_id']
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
      event_platform_games: {
        Row: {
          active: boolean
          created_at: string
          event_platform_id: string
          game_id: string
          id: string
          sort_order: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          event_platform_id: string
          game_id: string
          id?: string
          sort_order?: number
        }
        Update: {
          active?: boolean
          created_at?: string
          event_platform_id?: string
          game_id?: string
          id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: 'event_platform_games_event_platform_id_fkey'
            columns: ['event_platform_id']
            isOneToOne: false
            referencedRelation: 'event_platforms'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'event_platform_games_event_platform_id_fkey'
            columns: ['event_platform_id']
            isOneToOne: false
            referencedRelation: 'public_event_platforms'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'event_platform_games_game_id_fkey'
            columns: ['game_id']
            isOneToOne: false
            referencedRelation: 'games'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'event_platform_games_game_id_fkey'
            columns: ['game_id']
            isOneToOne: false
            referencedRelation: 'public_games'
            referencedColumns: ['id']
          },
        ]
      }
      event_platforms: {
        Row: {
          active: boolean
          capacity_override: number | null
          created_at: string
          description_override: string | null
          event_id: string
          id: string
          is_public: boolean
          metadata: Json
          platform_id: string
          public_name: string | null
          sort_order: number
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
          platform_id: string
          public_name?: string | null
          sort_order?: number
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
          platform_id?: string
          public_name?: string | null
          sort_order?: number
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
            columns: ['platform_id']
            isOneToOne: false
            referencedRelation: 'platforms'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'event_stations_station_id_fkey'
            columns: ['platform_id']
            isOneToOne: false
            referencedRelation: 'public_platforms'
            referencedColumns: ['id']
          },
        ]
      }
      events: {
        Row: {
          archived_at: string | null
          arci_required: boolean
          booking_closes_at: string | null
          booking_enabled: boolean
          booking_opens_at: string | null
          capacity_visibility: string
          cover_image_path: string | null
          created_at: string
          description: string | null
          ends_at: string
          event_type: string
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
          arci_required?: boolean
          booking_closes_at?: string | null
          booking_enabled?: boolean
          booking_opens_at?: string | null
          capacity_visibility?: string
          cover_image_path?: string | null
          created_at?: string
          description?: string | null
          ends_at: string
          event_type?: string
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
          arci_required?: boolean
          booking_closes_at?: string | null
          booking_enabled?: boolean
          booking_opens_at?: string | null
          capacity_visibility?: string
          cover_image_path?: string | null
          created_at?: string
          description?: string | null
          ends_at?: string
          event_type?: string
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
      game_rankings: {
        Row: {
          created_at: string
          created_by: string | null
          ends_at: string | null
          game_id: string
          id: string
          is_public: boolean
          name: string
          rules: string | null
          score_direction: string
          score_kind: string
          starts_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          game_id: string
          id?: string
          is_public?: boolean
          name: string
          rules?: string | null
          score_direction?: string
          score_kind?: string
          starts_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          game_id?: string
          id?: string
          is_public?: boolean
          name?: string
          rules?: string | null
          score_direction?: string
          score_kind?: string
          starts_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'game_rankings_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'game_rankings_game_id_fkey'
            columns: ['game_id']
            isOneToOne: false
            referencedRelation: 'games'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'game_rankings_game_id_fkey'
            columns: ['game_id']
            isOneToOne: false
            referencedRelation: 'public_games'
            referencedColumns: ['id']
          },
        ]
      }
      game_scores: {
        Row: {
          event_id: string | null
          game_id: string
          id: string
          notes: string | null
          ranking_id: string | null
          recorded_at: string
          recorded_by: string
          score: number
          tournament_id: string | null
          user_id: string
        }
        Insert: {
          event_id?: string | null
          game_id: string
          id?: string
          notes?: string | null
          ranking_id?: string | null
          recorded_at?: string
          recorded_by: string
          score: number
          tournament_id?: string | null
          user_id: string
        }
        Update: {
          event_id?: string | null
          game_id?: string
          id?: string
          notes?: string | null
          ranking_id?: string | null
          recorded_at?: string
          recorded_by?: string
          score?: number
          tournament_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'game_scores_event_id_fkey'
            columns: ['event_id']
            isOneToOne: false
            referencedRelation: 'events'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'game_scores_event_id_fkey'
            columns: ['event_id']
            isOneToOne: false
            referencedRelation: 'public_events'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'game_scores_game_id_fkey'
            columns: ['game_id']
            isOneToOne: false
            referencedRelation: 'games'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'game_scores_game_id_fkey'
            columns: ['game_id']
            isOneToOne: false
            referencedRelation: 'public_games'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'game_scores_ranking_id_fkey'
            columns: ['ranking_id']
            isOneToOne: false
            referencedRelation: 'game_rankings'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'game_scores_ranking_id_fkey'
            columns: ['ranking_id']
            isOneToOne: false
            referencedRelation: 'public_game_rankings'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'game_scores_recorded_by_fkey'
            columns: ['recorded_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'game_scores_tournament_id_fkey'
            columns: ['tournament_id']
            isOneToOne: false
            referencedRelation: 'public_tournaments'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'game_scores_tournament_id_fkey'
            columns: ['tournament_id']
            isOneToOne: false
            referencedRelation: 'tournaments'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'game_scores_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      games: {
        Row: {
          active: boolean
          archived_at: string | null
          created_at: string
          description: string | null
          genre: string | null
          id: string
          image_path: string | null
          max_players: number | null
          metadata: Json
          min_players: number | null
          name: string
          platform_id: string
          score_direction: string
          slug: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          archived_at?: string | null
          created_at?: string
          description?: string | null
          genre?: string | null
          id?: string
          image_path?: string | null
          max_players?: number | null
          metadata?: Json
          min_players?: number | null
          name: string
          platform_id: string
          score_direction?: string
          slug: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          archived_at?: string | null
          created_at?: string
          description?: string | null
          genre?: string | null
          id?: string
          image_path?: string | null
          max_players?: number | null
          metadata?: Json
          min_players?: number | null
          name?: string
          platform_id?: string
          score_direction?: string
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'games_platform_id_fkey'
            columns: ['platform_id']
            isOneToOne: false
            referencedRelation: 'platforms'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'games_platform_id_fkey'
            columns: ['platform_id']
            isOneToOne: false
            referencedRelation: 'public_platforms'
            referencedColumns: ['id']
          },
        ]
      }
      guardian_consents: {
        Row: {
          consent_given_at: string
          consent_source: string
          guardian_email: string
          guardian_first_name: string
          guardian_last_name: string
          guardian_phone: string | null
          id: string
          relationship: string
          revoked_at: string | null
          user_id: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          consent_given_at?: string
          consent_source?: string
          guardian_email: string
          guardian_first_name: string
          guardian_last_name: string
          guardian_phone?: string | null
          id?: string
          relationship?: string
          revoked_at?: string | null
          user_id: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          consent_given_at?: string
          consent_source?: string
          guardian_email?: string
          guardian_first_name?: string
          guardian_last_name?: string
          guardian_phone?: string | null
          id?: string
          relationship?: string
          revoked_at?: string | null
          user_id?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'guardian_consents_user_id_fkey'
            columns: ['user_id']
            isOneToOne: true
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'guardian_consents_verified_by_fkey'
            columns: ['verified_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      match_participants: {
        Row: {
          created_at: string
          entry_id: string | null
          id: string
          match_id: string
          outcome: string | null
          placement: number | null
          points_awarded: number
          score: number | null
          slot: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          entry_id?: string | null
          id?: string
          match_id: string
          outcome?: string | null
          placement?: number | null
          points_awarded?: number
          score?: number | null
          slot: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          entry_id?: string | null
          id?: string
          match_id?: string
          outcome?: string | null
          placement?: number | null
          points_awarded?: number
          score?: number | null
          slot?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'match_participants_entry_id_fkey'
            columns: ['entry_id']
            isOneToOne: false
            referencedRelation: 'public_tournament_entries'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'match_participants_entry_id_fkey'
            columns: ['entry_id']
            isOneToOne: false
            referencedRelation: 'tournament_entries'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'match_participants_match_id_fkey'
            columns: ['match_id']
            isOneToOne: false
            referencedRelation: 'matches'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'match_participants_match_id_fkey'
            columns: ['match_id']
            isOneToOne: false
            referencedRelation: 'public_tournament_matches'
            referencedColumns: ['id']
          },
        ]
      }
      matches: {
        Row: {
          bracket_position: number
          called_at: string | null
          completed_at: string | null
          created_at: string
          event_platform_id: string | null
          id: string
          next_match_id: string | null
          next_match_slot: string | null
          round_number: number
          scheduled_at: string | null
          stage_number: number
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
          event_platform_id?: string | null
          id?: string
          next_match_id?: string | null
          next_match_slot?: string | null
          round_number: number
          scheduled_at?: string | null
          stage_number?: number
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
          event_platform_id?: string | null
          id?: string
          next_match_id?: string | null
          next_match_slot?: string | null
          round_number?: number
          scheduled_at?: string | null
          stage_number?: number
          started_at?: string | null
          status?: string
          tournament_id?: string
          updated_at?: string
          winner_entry_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'matches_event_station_id_fkey'
            columns: ['event_platform_id']
            isOneToOne: false
            referencedRelation: 'event_platforms'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'matches_event_station_id_fkey'
            columns: ['event_platform_id']
            isOneToOne: false
            referencedRelation: 'public_event_platforms'
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
      platform_categories: {
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
      platforms: {
        Row: {
          active: boolean
          archived_at: string | null
          category_id: string | null
          code: string
          created_at: string
          default_capacity: number | null
          description: string | null
          id: string
          image_path: string | null
          internal: boolean
          metadata: Json
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          archived_at?: string | null
          category_id?: string | null
          code: string
          created_at?: string
          default_capacity?: number | null
          description?: string | null
          id?: string
          image_path?: string | null
          internal?: boolean
          metadata?: Json
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          archived_at?: string | null
          category_id?: string | null
          code?: string
          created_at?: string
          default_capacity?: number | null
          description?: string | null
          id?: string
          image_path?: string | null
          internal?: boolean
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
            referencedRelation: 'platform_categories'
            referencedColumns: ['id']
          },
        ]
      }
      point_scheme_rules: {
        Row: {
          id: string
          placement_from: number | null
          placement_to: number | null
          points: number
          rule_type: string
          scheme_id: string
          sort_order: number
        }
        Insert: {
          id?: string
          placement_from?: number | null
          placement_to?: number | null
          points: number
          rule_type: string
          scheme_id: string
          sort_order?: number
        }
        Update: {
          id?: string
          placement_from?: number | null
          placement_to?: number | null
          points?: number
          rule_type?: string
          scheme_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: 'point_scheme_rules_scheme_id_fkey'
            columns: ['scheme_id']
            isOneToOne: false
            referencedRelation: 'point_schemes'
            referencedColumns: ['id']
          },
        ]
      }
      point_schemes: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      profile_nickname_history: {
        Row: {
          changed_at: string
          id: string
          previous_nickname: string
          user_id: string
        }
        Insert: {
          changed_at?: string
          id?: string
          previous_nickname: string
          user_id: string
        }
        Update: {
          changed_at?: string
          id?: string
          previous_nickname?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'profile_nickname_history_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      profiles: {
        Row: {
          arci_card_verified_at: string | null
          arci_card_verified_by: string | null
          avatar_path: string | null
          birth_date: string | null
          created_at: string
          display_name: string
          first_name: string | null
          id: string
          is_public_profile: boolean
          last_name: string | null
          nickname: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          arci_card_verified_at?: string | null
          arci_card_verified_by?: string | null
          avatar_path?: string | null
          birth_date?: string | null
          created_at?: string
          display_name: string
          first_name?: string | null
          id: string
          is_public_profile?: boolean
          last_name?: string | null
          nickname?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          arci_card_verified_at?: string | null
          arci_card_verified_by?: string | null
          avatar_path?: string | null
          birth_date?: string | null
          created_at?: string
          display_name?: string
          first_name?: string | null
          id?: string
          is_public_profile?: boolean
          last_name?: string | null
          nickname?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'profiles_arci_card_verified_by_fkey'
            columns: ['arci_card_verified_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
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
          created_at: string
          created_by: string | null
          description: string | null
          game_id: string | null
          id: string
          metadata: Json
          points: number
          reason_code: string
          tournament_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          game_id?: string | null
          id?: string
          metadata?: Json
          points: number
          reason_code: string
          tournament_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          game_id?: string | null
          id?: string
          metadata?: Json
          points?: number
          reason_code?: string
          tournament_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'ranking_points_ledger_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ranking_points_ledger_game_id_fkey'
            columns: ['game_id']
            isOneToOne: false
            referencedRelation: 'games'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ranking_points_ledger_game_id_fkey'
            columns: ['game_id']
            isOneToOne: false
            referencedRelation: 'public_games'
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
          join_code: string | null
          seed: number | null
          status: string
          tournament_id: string
          updated_at: string
          visibility: string
        }
        Insert: {
          created_at?: string
          display_name: string
          id?: string
          join_code?: string | null
          seed?: number | null
          status?: string
          tournament_id: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          join_code?: string | null
          seed?: number | null
          status?: string
          tournament_id?: string
          updated_at?: string
          visibility?: string
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
          allow_draw: boolean
          checkin_required: boolean
          created_at: string
          description: string | null
          entry_size: number
          event_id: string | null
          format: string
          game_id: string | null
          group_size: number | null
          heat_seeding: string
          id: string
          is_public: boolean
          max_entries: number | null
          name: string
          platform_id: string | null
          point_scheme_id: string | null
          ranking_enabled: boolean
          registration_closes_at: string | null
          registration_opens_at: string | null
          requires_event_booking: boolean
          result_kind: string
          rounds_count: number | null
          rules: string | null
          score_direction: string | null
          scoring_config: Json
          slug: string
          standing_metric: string | null
          starts_at: string | null
          status: string
          team_formation: string
          updated_at: string
        }
        Insert: {
          allow_draw?: boolean
          checkin_required?: boolean
          created_at?: string
          description?: string | null
          entry_size?: number
          event_id?: string | null
          format?: string
          game_id?: string | null
          group_size?: number | null
          heat_seeding?: string
          id?: string
          is_public?: boolean
          max_entries?: number | null
          name: string
          platform_id?: string | null
          point_scheme_id?: string | null
          ranking_enabled?: boolean
          registration_closes_at?: string | null
          registration_opens_at?: string | null
          requires_event_booking?: boolean
          result_kind?: string
          rounds_count?: number | null
          rules?: string | null
          score_direction?: string | null
          scoring_config?: Json
          slug?: string
          standing_metric?: string | null
          starts_at?: string | null
          status?: string
          team_formation?: string
          updated_at?: string
        }
        Update: {
          allow_draw?: boolean
          checkin_required?: boolean
          created_at?: string
          description?: string | null
          entry_size?: number
          event_id?: string | null
          format?: string
          game_id?: string | null
          group_size?: number | null
          heat_seeding?: string
          id?: string
          is_public?: boolean
          max_entries?: number | null
          name?: string
          platform_id?: string | null
          point_scheme_id?: string | null
          ranking_enabled?: boolean
          registration_closes_at?: string | null
          registration_opens_at?: string | null
          requires_event_booking?: boolean
          result_kind?: string
          rounds_count?: number | null
          rules?: string | null
          score_direction?: string | null
          scoring_config?: Json
          slug?: string
          standing_metric?: string | null
          starts_at?: string | null
          status?: string
          team_formation?: string
          updated_at?: string
        }
        Relationships: [
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
          {
            foreignKeyName: 'tournaments_game_id_fkey'
            columns: ['game_id']
            isOneToOne: false
            referencedRelation: 'games'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tournaments_game_id_fkey'
            columns: ['game_id']
            isOneToOne: false
            referencedRelation: 'public_games'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tournaments_platform_id_fkey'
            columns: ['platform_id']
            isOneToOne: false
            referencedRelation: 'platforms'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tournaments_platform_id_fkey'
            columns: ['platform_id']
            isOneToOne: false
            referencedRelation: 'public_platforms'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tournaments_point_scheme_id_fkey'
            columns: ['point_scheme_id']
            isOneToOne: false
            referencedRelation: 'point_schemes'
            referencedColumns: ['id']
          },
        ]
      }
      user_feedback: {
        Row: {
          body: string
          created_at: string
          id: string
          internal_notes: string | null
          kind: string
          rating: number | null
          status: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          internal_notes?: string | null
          kind: string
          rating?: number | null
          status?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          internal_notes?: string | null
          kind?: string
          rating?: number | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'user_feedback_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
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
      public_board_poll_options: {
        Row: {
          id: string | null
          label: string | null
          post_id: string | null
          sort_order: number | null
          votes: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'board_poll_options_post_id_fkey'
            columns: ['post_id']
            isOneToOne: false
            referencedRelation: 'board_posts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'board_poll_options_post_id_fkey'
            columns: ['post_id']
            isOneToOne: false
            referencedRelation: 'public_board_posts'
            referencedColumns: ['id']
          },
        ]
      }
      public_board_posts: {
        Row: {
          body: string | null
          id: string | null
          image_path: string | null
          pinned: boolean | null
          post_type: string | null
          published_at: string | null
          slug: string | null
          title: string | null
        }
        Insert: {
          body?: string | null
          id?: string | null
          image_path?: string | null
          pinned?: boolean | null
          post_type?: string | null
          published_at?: string | null
          slug?: string | null
          title?: string | null
        }
        Update: {
          body?: string | null
          id?: string | null
          image_path?: string | null
          pinned?: boolean | null
          post_type?: string | null
          published_at?: string | null
          slug?: string | null
          title?: string | null
        }
        Relationships: []
      }
      public_event_platform_games: {
        Row: {
          event_platform_id: string | null
          game_id: string | null
          game_name: string | null
          image_path: string | null
          sort_order: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'event_platform_games_event_platform_id_fkey'
            columns: ['event_platform_id']
            isOneToOne: false
            referencedRelation: 'event_platforms'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'event_platform_games_event_platform_id_fkey'
            columns: ['event_platform_id']
            isOneToOne: false
            referencedRelation: 'public_event_platforms'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'event_platform_games_game_id_fkey'
            columns: ['game_id']
            isOneToOne: false
            referencedRelation: 'games'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'event_platform_games_game_id_fkey'
            columns: ['game_id']
            isOneToOne: false
            referencedRelation: 'public_games'
            referencedColumns: ['id']
          },
        ]
      }
      public_event_platforms: {
        Row: {
          category_name: string | null
          category_slug: string | null
          code: string | null
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
          arci_required: boolean | null
          booking_closes_at: string | null
          booking_enabled: boolean | null
          booking_opens_at: string | null
          cover_image_path: string | null
          description: string | null
          ends_at: string | null
          event_type: string | null
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
      public_game_leaderboards: {
        Row: {
          attempts: number | null
          best_score: number | null
          game_id: string | null
          last_recorded_at: string | null
          nickname: string | null
          platform_id: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'game_scores_game_id_fkey'
            columns: ['game_id']
            isOneToOne: false
            referencedRelation: 'games'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'game_scores_game_id_fkey'
            columns: ['game_id']
            isOneToOne: false
            referencedRelation: 'public_games'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'game_scores_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'games_platform_id_fkey'
            columns: ['platform_id']
            isOneToOne: false
            referencedRelation: 'platforms'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'games_platform_id_fkey'
            columns: ['platform_id']
            isOneToOne: false
            referencedRelation: 'public_platforms'
            referencedColumns: ['id']
          },
        ]
      }
      public_game_rankings: {
        Row: {
          created_at: string | null
          ends_at: string | null
          game_id: string | null
          game_name: string | null
          id: string | null
          name: string | null
          platform_code: string | null
          platform_id: string | null
          platform_name: string | null
          rules: string | null
          score_direction: string | null
          score_kind: string | null
          starts_at: string | null
          status: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'game_rankings_game_id_fkey'
            columns: ['game_id']
            isOneToOne: false
            referencedRelation: 'games'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'game_rankings_game_id_fkey'
            columns: ['game_id']
            isOneToOne: false
            referencedRelation: 'public_games'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'games_platform_id_fkey'
            columns: ['platform_id']
            isOneToOne: false
            referencedRelation: 'platforms'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'games_platform_id_fkey'
            columns: ['platform_id']
            isOneToOne: false
            referencedRelation: 'public_platforms'
            referencedColumns: ['id']
          },
        ]
      }
      public_games: {
        Row: {
          description: string | null
          genre: string | null
          id: string | null
          image_path: string | null
          max_players: number | null
          min_players: number | null
          name: string | null
          platform_code: string | null
          platform_id: string | null
          platform_name: string | null
          platform_slug: string | null
          slug: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'games_platform_id_fkey'
            columns: ['platform_id']
            isOneToOne: false
            referencedRelation: 'platforms'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'games_platform_id_fkey'
            columns: ['platform_id']
            isOneToOne: false
            referencedRelation: 'public_platforms'
            referencedColumns: ['id']
          },
        ]
      }
      public_match_participants: {
        Row: {
          entry_id: string | null
          id: string | null
          match_id: string | null
          outcome: string | null
          placement: number | null
          points_awarded: number | null
          score: number | null
          slot: number | null
          tournament_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'match_participants_entry_id_fkey'
            columns: ['entry_id']
            isOneToOne: false
            referencedRelation: 'public_tournament_entries'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'match_participants_entry_id_fkey'
            columns: ['entry_id']
            isOneToOne: false
            referencedRelation: 'tournament_entries'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'match_participants_match_id_fkey'
            columns: ['match_id']
            isOneToOne: false
            referencedRelation: 'matches'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'match_participants_match_id_fkey'
            columns: ['match_id']
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
        ]
      }
      public_platforms: {
        Row: {
          category_name: string | null
          category_slug: string | null
          code: string | null
          description: string | null
          id: string | null
          image_path: string | null
          name: string | null
          slug: string | null
        }
        Relationships: []
      }
      public_ranking: {
        Row: {
          nickname: string | null
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
      public_ranking_by_game: {
        Row: {
          game_id: string | null
          game_name: string | null
          nickname: string | null
          platform_id: string | null
          points: number | null
          tournaments_played: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'games_platform_id_fkey'
            columns: ['platform_id']
            isOneToOne: false
            referencedRelation: 'platforms'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'games_platform_id_fkey'
            columns: ['platform_id']
            isOneToOne: false
            referencedRelation: 'public_platforms'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ranking_points_ledger_game_id_fkey'
            columns: ['game_id']
            isOneToOne: false
            referencedRelation: 'games'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ranking_points_ledger_game_id_fkey'
            columns: ['game_id']
            isOneToOne: false
            referencedRelation: 'public_games'
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
      public_ranking_standings: {
        Row: {
          attempts: number | null
          best_score: number | null
          last_recorded_at: string | null
          nickname: string | null
          ranking_id: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'game_scores_ranking_id_fkey'
            columns: ['ranking_id']
            isOneToOne: false
            referencedRelation: 'game_rankings'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'game_scores_ranking_id_fkey'
            columns: ['ranking_id']
            isOneToOne: false
            referencedRelation: 'public_game_rankings'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'game_scores_user_id_fkey'
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
          members_count: number | null
          seed: number | null
          status: string | null
          tournament_id: string | null
          updated_at: string | null
          visibility: string | null
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
      public_tournament_entry_members: {
        Row: {
          display_name: string | null
          entry_id: string | null
          is_captain: boolean | null
          nickname: string | null
          tournament_id: string | null
          user_id: string | null
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
      public_tournament_matches: {
        Row: {
          bracket_position: number | null
          called_at: string | null
          completed_at: string | null
          event_platform_id: string | null
          id: string | null
          next_match_id: string | null
          next_match_slot: string | null
          round_number: number | null
          scheduled_at: string | null
          stage_number: number | null
          started_at: string | null
          status: string | null
          tournament_id: string | null
          winner_entry_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'matches_event_station_id_fkey'
            columns: ['event_platform_id']
            isOneToOne: false
            referencedRelation: 'event_platforms'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'matches_event_station_id_fkey'
            columns: ['event_platform_id']
            isOneToOne: false
            referencedRelation: 'public_event_platforms'
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
          allow_draw: boolean | null
          checkin_required: boolean | null
          created_at: string | null
          description: string | null
          entry_size: number | null
          event_id: string | null
          format: string | null
          game_id: string | null
          group_size: number | null
          heat_seeding: string | null
          id: string | null
          is_public: boolean | null
          max_entries: number | null
          name: string | null
          platform_id: string | null
          ranking_enabled: boolean | null
          registration_closes_at: string | null
          registration_opens_at: string | null
          result_kind: string | null
          rounds_count: number | null
          rules: string | null
          score_direction: string | null
          scoring_config: Json | null
          slug: string | null
          standing_metric: string | null
          starts_at: string | null
          status: string | null
          team_formation: string | null
          updated_at: string | null
        }
        Insert: {
          allow_draw?: boolean | null
          checkin_required?: boolean | null
          created_at?: string | null
          description?: string | null
          entry_size?: number | null
          event_id?: string | null
          format?: string | null
          game_id?: string | null
          group_size?: number | null
          heat_seeding?: string | null
          id?: string | null
          is_public?: boolean | null
          max_entries?: number | null
          name?: string | null
          platform_id?: string | null
          ranking_enabled?: boolean | null
          registration_closes_at?: string | null
          registration_opens_at?: string | null
          result_kind?: string | null
          rounds_count?: number | null
          rules?: string | null
          score_direction?: string | null
          scoring_config?: Json | null
          slug?: string | null
          standing_metric?: string | null
          starts_at?: string | null
          status?: string | null
          team_formation?: string | null
          updated_at?: string | null
        }
        Update: {
          allow_draw?: boolean | null
          checkin_required?: boolean | null
          created_at?: string | null
          description?: string | null
          entry_size?: number | null
          event_id?: string | null
          format?: string | null
          game_id?: string | null
          group_size?: number | null
          heat_seeding?: string | null
          id?: string | null
          is_public?: boolean | null
          max_entries?: number | null
          name?: string | null
          platform_id?: string | null
          ranking_enabled?: boolean | null
          registration_closes_at?: string | null
          registration_opens_at?: string | null
          result_kind?: string | null
          rounds_count?: number | null
          rules?: string | null
          score_direction?: string | null
          scoring_config?: Json | null
          slug?: string | null
          standing_metric?: string | null
          starts_at?: string | null
          status?: string | null
          team_formation?: string | null
          updated_at?: string | null
        }
        Relationships: [
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
          {
            foreignKeyName: 'tournaments_game_id_fkey'
            columns: ['game_id']
            isOneToOne: false
            referencedRelation: 'games'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tournaments_game_id_fkey'
            columns: ['game_id']
            isOneToOne: false
            referencedRelation: 'public_games'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tournaments_platform_id_fkey'
            columns: ['platform_id']
            isOneToOne: false
            referencedRelation: 'platforms'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tournaments_platform_id_fkey'
            columns: ['platform_id']
            isOneToOne: false
            referencedRelation: 'public_platforms'
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
      _award_final_placements: {
        Args: { p_tournament_id: string }
        Returns: undefined
      }
      _award_participation_points: {
        Args: { p_tournament_id: string }
        Returns: undefined
      }
      _award_scheme_points: {
        Args: {
          p_entry_id: string
          p_placement?: number
          p_reason_suffix?: string
          p_rule_type: string
          p_tournament_id: string
        }
        Returns: undefined
      }
      _award_tournament_points: {
        Args: {
          p_entry_id: string
          p_points: number
          p_reason: string
          p_tournament_id: string
        }
        Returns: undefined
      }
      _generate_heat_round: {
        Args: { p_round: number; p_tournament_id: string }
        Returns: number
      }
      _generate_join_code: { Args: never; Returns: string }
      _promote_waitlist_for_event: {
        Args: { p_event_id: string }
        Returns: number
      }
      _scheme_points: {
        Args: { p_placement?: number; p_rule_type: string; p_scheme_id: string }
        Returns: number
      }
      _settle_match: { Args: { p_match_id: string }; Returns: string }
      _tournament_eligible_entries: {
        Args: { p_tournament_id: string }
        Returns: string[]
      }
      adjust_ranking_points: {
        Args: {
          p_description?: string
          p_game_id: string
          p_points: number
          p_reason: string
          p_user_id: string
        }
        Returns: string
      }
      amend_match_results: {
        Args: { p_match_id: string; p_results: Json }
        Returns: string
      }
      archive_event: { Args: { p_event_id: string }; Returns: boolean }
      arci_card_is_valid: { Args: { p_verified_at: string }; Returns: boolean }
      arci_membership_overview: {
        Args: never
        Returns: {
          member_count: number
          renewal_day: number
          renewal_month: number
          reset_at: string
          season_start: string
          valid_count: number
        }[]
      }
      arci_membership_settings: { Args: never; Returns: Json }
      arci_season_start: { Args: never; Returns: string }
      assign_match_station: {
        Args: { p_event_platform_id: string; p_match_id: string }
        Returns: string
      }
      call_tournament_match: { Args: { p_match_id: string }; Returns: Json }
      cancel_event_booking: {
        Args: { p_booking_id: string }
        Returns: {
          booking_id: string
          promoted_count: number
        }[]
      }
      check_in_booking: {
        Args: { p_payment_status?: string; p_qr_token: string }
        Returns: {
          already_checked_in: boolean
          arci_card_valid: boolean
          arci_required: boolean
          booking_id: string
          checked_in_at: string
          event_id: string
          event_title: string
          payment_status: string
          status: string
          user_id: string
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
      create_tournament_team: {
        Args: {
          p_name?: string
          p_tournament_id: string
          p_visibility?: string
        }
        Returns: string
      }
      deactivate_push_subscription: {
        Args: { p_subscription_id: string }
        Returns: boolean
      }
      duplicate_event: {
        Args: {
          p_new_ends_at: string
          p_new_slug: string
          p_new_starts_at: string
          p_new_title: string
          p_source_event_id: string
        }
        Returns: string
      }
      entry_tournament_is_visible: {
        Args: { p_entry_id: string }
        Returns: boolean
      }
      generate_tournament_schedule: {
        Args: { p_tournament_id: string }
        Returns: number
      }
      get_my_booking_display: {
        Args: { p_booking_id: string }
        Returns: {
          arci_required: boolean
          event_title: string
          payment_required: boolean
          price_cents: number
        }[]
      }
      get_my_booking_qr: {
        Args: { p_booking_id: string }
        Returns: {
          booking_id: string
          checked_in_at: string
          event_id: string
          event_slug: string
          event_title: string
          payment_status: string
          qr_issued_at: string
          qr_token: string
          status: string
        }[]
      }
      get_my_booking_tournaments: {
        Args: { p_booking_id: string }
        Returns: {
          tournament_id: string
          tournament_name: string
          tournament_status: string
        }[]
      }
      get_my_bookings: {
        Args: never
        Returns: {
          cancelled_at: string
          checked_in_at: string
          confirmed_at: string
          created_at: string
          event_id: string
          id: string
          notes: string
          payment_status: string
          qr_issued_at: string
          status: string
          updated_at: string
        }[]
      }
      get_my_ranking_summary: {
        Args: never
        Returns: {
          points: number
          runner_ups: number
          tournaments_played: number
          wins: number
        }[]
      }
      get_my_roles: {
        Args: never
        Returns: {
          code: string
        }[]
      }
      get_public_capacity_threshold: { Args: never; Returns: number }
      has_any_role: { Args: { required_roles: string[] }; Returns: boolean }
      has_role: { Args: { required_role: string }; Returns: boolean }
      is_minor: { Args: { p_birth_date: string }; Returns: boolean }
      is_public_event: { Args: { target_event_id: string }; Returns: boolean }
      is_public_platform: { Args: { p_platform_id: string }; Returns: boolean }
      join_tournament_team: {
        Args: { p_code?: string; p_entry_id?: string }
        Returns: string
      }
      leave_tournament_team: {
        Args: { p_entry_id: string }
        Returns: undefined
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
      match_tournament_is_visible: {
        Args: { p_match_id: string }
        Returns: boolean
      }
      my_arci_status: {
        Args: never
        Returns: {
          card_valid: boolean
          season_start: string
          verified_at: string
        }[]
      }
      my_consent_status: {
        Args: never
        Returns: {
          has_consent: boolean
          is_minor: boolean
        }[]
      }
      nickname_available: { Args: { p_nickname: string }; Returns: boolean }
      promote_waitlist: { Args: { p_event_id: string }; Returns: number }
      record_guardian_consent: {
        Args: {
          p_email: string
          p_first_name: string
          p_last_name: string
          p_phone?: string
          p_relationship?: string
        }
        Returns: string
      }
      record_match_results: {
        Args: { p_match_id: string; p_results: Json }
        Returns: string
      }
      register_tournament_entry: {
        Args: { p_tournament_id: string }
        Returns: string
      }
      reset_arci_cards: { Args: never; Returns: string }
      set_arci_card: {
        Args: { p_user_id: string; p_valid: boolean }
        Returns: {
          arci_card_valid: boolean
          arci_card_verified_at: string
          user_id: string
        }[]
      }
      set_arci_renewal: {
        Args: { p_day: number; p_month: number }
        Returns: Json
      }
      send_manual_notification: {
        Args: {
          p_dispatch_id: string
          p_event_id: string | null
          p_message: string
          p_scope: string
          p_target_user_id: string | null
        }
        Returns: number
      }
      set_user_role: {
        Args: {
          should_assign: boolean
          target_role_code: string
          target_user_id: string
        }
        Returns: undefined
      }
      start_tournament_match: { Args: { p_match_id: string }; Returns: string }
      tournament_is_visible: {
        Args: { p_tournament_id: string }
        Returns: boolean
      }
      tournament_slug_source: {
        Args: {
          p_game_id: string
          p_name: string
          p_platform_id: string
          p_starts_at: string
        }
        Returns: string
      }
      tournament_standings: {
        Args: { p_tournament_id: string }
        Returns: {
          best_score: number
          display_name: string
          draws: number
          eliminated_round: number
          entry_id: string
          losses: number
          played: number
          points: number
          standing_position: number
          total_score: number
          wins: number
        }[]
      }
      update_my_nickname: { Args: { p_nickname: string }; Returns: string }
      upsert_notification_preferences: {
        Args: { p_email_enabled?: boolean; p_push_enabled?: boolean }
        Returns: {
          email_enabled: boolean
          push_enabled: boolean
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: '*'
          to: 'notification_preferences'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      upsert_push_subscription: {
        Args: {
          p_device_label?: string
          p_provider: string
          p_provider_subscription_id: string
        }
        Returns: string
      }
      vote_board_poll: {
        Args: { p_option_id: string; p_post_id: string }
        Returns: undefined
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

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
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
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
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
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
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
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
