/**
 * Auto-generated Supabase Database Types
 * Generated from schema: supabase/migrations/001_shuttle_tracking.sql
 *
 * To regenerate these types:
 * npx supabase gen types typescript --linked > src/lib/supabase/database.types.ts
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      shuttles: {
        Row: {
          id: string;
          name: string;
          driver_id: string;
          capacity: number;
          status: "active" | "offline" | "maintenance";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          driver_id: string;
          capacity: number;
          status?: "active" | "offline" | "maintenance";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          driver_id?: string;
          capacity?: number;
          status?: "active" | "offline" | "maintenance";
          created_at?: string;
          updated_at?: string;
        };
      };
      shuttle_trips: {
        Row: {
          id: string;
          shuttle_id: string;
          driver_id: string;
          pickup_location: string;
          dropoff_location: string;
          current_location: {
            type: "Point";
            coordinates: [number, number];
          } | null;
          current_latitude: number | null;
          current_longitude: number | null;
          accuracy: number | null;
          altitude: number | null;
          status: "en_route" | "arrived" | "completed" | "cancelled";
          started_at: string;
          arrived_at: string | null;
          completed_at: string | null;
          initial_eta_minutes: number | null;
          estimated_arrival: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          shuttle_id: string;
          driver_id: string;
          pickup_location: string;
          dropoff_location: string;
          current_location?: {
            type: "Point";
            coordinates: [number, number];
          } | null;
          current_latitude?: number | null;
          current_longitude?: number | null;
          accuracy?: number | null;
          altitude?: number | null;
          status?: "en_route" | "arrived" | "completed" | "cancelled";
          started_at?: string;
          arrived_at?: string | null;
          completed_at?: string | null;
          initial_eta_minutes?: number | null;
          estimated_arrival?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          shuttle_id?: string;
          driver_id?: string;
          pickup_location?: string;
          dropoff_location?: string;
          current_location?: {
            type: "Point";
            coordinates: [number, number];
          } | null;
          current_latitude?: number | null;
          current_longitude?: number | null;
          accuracy?: number | null;
          altitude?: number | null;
          status?: "en_route" | "arrived" | "completed" | "cancelled";
          started_at?: string;
          arrived_at?: string | null;
          completed_at?: string | null;
          initial_eta_minutes?: number | null;
          estimated_arrival?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      shuttle_passengers: {
        Row: {
          id: string;
          trip_id: string;
          user_id: string;
          pickup_location: string;
          dropoff_location: string;
          pickup_latitude: number | null;
          pickup_longitude: number | null;
          dropoff_latitude: number | null;
          dropoff_longitude: number | null;
          status: "waiting" | "picked_up" | "dropped_off" | "cancelled";
          pickup_requested_at: string;
          picked_up_at: string | null;
          dropped_off_at: string | null;
          estimated_pickup: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          trip_id: string;
          user_id: string;
          pickup_location: string;
          dropoff_location: string;
          pickup_latitude?: number | null;
          pickup_longitude?: number | null;
          dropoff_latitude?: number | null;
          dropoff_longitude?: number | null;
          status?: "waiting" | "picked_up" | "dropped_off" | "cancelled";
          pickup_requested_at?: string;
          picked_up_at?: string | null;
          dropped_off_at?: string | null;
          estimated_pickup?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          trip_id?: string;
          user_id?: string;
          pickup_location?: string;
          dropoff_location?: string;
          pickup_latitude?: number | null;
          pickup_longitude?: number | null;
          dropoff_latitude?: number | null;
          dropoff_longitude?: number | null;
          status?: "waiting" | "picked_up" | "dropped_off" | "cancelled";
          pickup_requested_at?: string;
          picked_up_at?: string | null;
          dropped_off_at?: string | null;
          estimated_pickup?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      shuttle_location_history: {
        Row: {
          id: string;
          trip_id: string;
          shuttle_id: string;
          latitude: number;
          longitude: number;
          accuracy: number | null;
          altitude: number | null;
          location: {
            type: "Point";
            coordinates: [number, number];
          } | null;
          speed: number | null;
          bearing: number | null;
          timestamp: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          trip_id: string;
          shuttle_id: string;
          latitude: number;
          longitude: number;
          accuracy?: number | null;
          altitude?: number | null;
          location?: {
            type: "Point";
            coordinates: [number, number];
          } | null;
          speed?: number | null;
          bearing?: number | null;
          timestamp?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          trip_id?: string;
          shuttle_id?: string;
          latitude?: number;
          longitude?: number;
          accuracy?: number | null;
          altitude?: number | null;
          location?: {
            type: "Point";
            coordinates: [number, number];
          } | null;
          speed?: number | null;
          bearing?: number | null;
          timestamp?: string;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      calculate_distance: {
        Args: {
          lat1: number;
          lon1: number;
          lat2: number;
          lon2: number;
        };
        Returns: number;
      };
      find_nearby_shuttles: {
        Args: {
          user_lat: number;
          user_lon: number;
          radius_meters: number;
        };
        Returns: Array<{
          shuttle_id: string;
          trip_id: string;
          distance_meters: number;
          current_latitude: number;
          current_longitude: number;
        }>;
      };
      estimate_eta: {
        Args: {
          current_lat: number;
          current_lon: number;
          dropoff_lat: number;
          dropoff_lon: number;
        };
        Returns: string; // PostgreSQL INTERVAL as string
      };
    };
    Enums: {
      shuttle_trip_status: "en_route" | "arrived" | "completed" | "cancelled";
      passenger_status: "waiting" | "picked_up" | "dropped_off" | "cancelled";
      shuttle_status: "active" | "offline" | "maintenance";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
