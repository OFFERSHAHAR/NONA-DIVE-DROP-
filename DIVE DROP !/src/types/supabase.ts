export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          first_name: string;
          last_name: string;
          bio: string | null;
          avatar_url: string | null;
          diving_experience: 'beginner' | 'intermediate' | 'advanced' | 'instructor';
          location: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          first_name: string;
          last_name: string;
          bio?: string | null;
          avatar_url?: string | null;
          diving_experience?: 'beginner' | 'intermediate' | 'advanced' | 'instructor';
          location?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          first_name?: string;
          last_name?: string;
          bio?: string | null;
          avatar_url?: string | null;
          diving_experience?: 'beginner' | 'intermediate' | 'advanced' | 'instructor';
          location?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      dive_sites: {
        Row: {
          id: string;
          name: string;
          description: string;
          location: string;
          latitude: number;
          longitude: number;
          depth: number;
          difficulty: 'easy' | 'intermediate' | 'hard';
          image_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description: string;
          location: string;
          latitude: number;
          longitude: number;
          depth: number;
          difficulty: 'easy' | 'intermediate' | 'hard';
          image_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string;
          location?: string;
          latitude?: number;
          longitude?: number;
          depth?: number;
          difficulty?: 'easy' | 'intermediate' | 'hard';
          image_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      dive_plans: {
        Row: {
          id: string;
          user_id: string;
          dive_site_id: string | null;
          instructor_id: string | null;
          experience_level: string;
          goal: string;
          ai_message: string | null;
          tips: string[] | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          dive_site_id?: string | null;
          instructor_id?: string | null;
          experience_level: string;
          goal: string;
          ai_message?: string | null;
          tips?: string[] | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          dive_site_id?: string | null;
          instructor_id?: string | null;
          experience_level?: string;
          goal?: string;
          ai_message?: string | null;
          tips?: string[] | null;
          created_at?: string;
        };
        Relationships: [];
      };
      dive_logs: {
        Row: {
          id: string;
          user_id: string;
          dive_site_id: string | null;
          bottom_time_minutes: number;
          max_depth_m: number | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          dive_site_id?: string | null;
          bottom_time_minutes: number;
          max_depth_m?: number | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          dive_site_id?: string | null;
          bottom_time_minutes?: number;
          max_depth_m?: number | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      content_items: {
        Row: {
          id: string;
          kind: string;
          slug: string;
          title_he: string;
          title_en: string;
          summary_he: string;
          summary_en: string;
          body_he: string;
          body_en: string;
          location: string;
          image_url: string;
          tags: string[];
          metadata: Json;
          sort_order: number;
          is_published: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          kind: string;
          slug: string;
          title_he: string;
          title_en?: string;
          summary_he?: string;
          summary_en?: string;
          body_he?: string;
          body_en?: string;
          location?: string;
          image_url?: string;
          tags?: string[];
          metadata?: Json;
          sort_order?: number;
          is_published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          kind?: string;
          slug?: string;
          title_he?: string;
          title_en?: string;
          summary_he?: string;
          summary_en?: string;
          body_he?: string;
          body_en?: string;
          location?: string;
          image_url?: string;
          tags?: string[];
          metadata?: Json;
          sort_order?: number;
          is_published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      booking_requests: {
        Row: {
          id: string;
          request_type: string;
          category: string;
          module: string;
          site_slug: string;
          item_slug: string;
          contact_name: string;
          phone: string;
          email: string;
          preferred_date: string | null;
          diver_level: string;
          notes: string;
          status: string;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          request_type?: string;
          category?: string;
          module?: string;
          site_slug?: string;
          item_slug?: string;
          contact_name: string;
          phone: string;
          email?: string;
          preferred_date?: string | null;
          diver_level?: string;
          notes?: string;
          status?: string;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          request_type?: string;
          category?: string;
          module?: string;
          site_slug?: string;
          item_slug?: string;
          contact_name?: string;
          phone?: string;
          email?: string;
          preferred_date?: string | null;
          diver_level?: string;
          notes?: string;
          status?: string;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          user_id: string;
          first_name: string;
          last_name: string;
          experience_level: 'beginner' | 'intermediate' | 'advanced';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          first_name?: string;
          last_name?: string;
          experience_level?: 'beginner' | 'intermediate' | 'advanced';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          first_name?: string;
          last_name?: string;
          experience_level?: 'beginner' | 'intermediate' | 'advanced';
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
