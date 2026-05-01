
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { PropertyType, ConditionRating, LocationRating } from './types';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './env';

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json }
  | Json[]

export interface Database {
  public: {
    Tables: {
      properties: {
        Row: {
          id: string
          created_at: string
          user_id: string
          address: string
          price: number
          area: number
          property_type: PropertyType
          condition: ConditionRating
          location: LocationRating
          parking_spots: number
          has_garage: boolean
          garden_size: number
          has_rental_unit: boolean
          renovation_needs: string
          other_attributes: string
          year_built: number
          bedrooms: number
          bathrooms: number
          finn_link: string | null
          user_comment: string | null
          kitchen_quality: number
          living_room_quality: number
          storage_quality: number
          floor_plan_quality: number
          balcony_terrace_quality: number
          light_and_air_quality: number
          area_impression: number
          neighborhood_impression: number
          public_transport_access: number
          schools_proximity: number
          viewing_impression: number
          potential_score: number
        }
        Insert: {
          id: string
          user_id: string
          address: string
          price: number
          area: number
          property_type: PropertyType
          condition: ConditionRating
          location: LocationRating
          parking_spots: number
          has_garage: boolean
          garden_size: number
          has_rental_unit: boolean
          renovation_needs: string
          other_attributes: string
          year_built: number
          bedrooms: number
          bathrooms: number
          finn_link?: string | null
          user_comment?: string | null
          kitchen_quality: number
          living_room_quality: number
          storage_quality: number
          floor_plan_quality: number
          balcony_terrace_quality: number
          light_and_air_quality: number
          area_impression: number
          neighborhood_impression: number
          public_transport_access: number
          schools_proximity: number
          viewing_impression: number
          potential_score: number
        }
        Update: {
          address?: string
          price?: number
          area?: number
          property_type?: PropertyType
          condition?: ConditionRating
          location?: LocationRating
          parking_spots?: number
          has_garage?: boolean
          garden_size?: number
          has_rental_unit?: boolean
          renovation_needs?: string
          other_attributes?: string
          year_built?: number
          bedrooms?: number
          bathrooms?: number
          finn_link?: string | null
          user_comment?: string | null
          kitchen_quality?: number
          living_room_quality?: number
          storage_quality?: number
          floor_plan_quality?: number
          balcony_terrace_quality?: number
          light_and_air_quality?: number
          area_impression?: number
          neighborhood_impression?: number
          public_transport_access?: number
          schools_proximity?: number
          viewing_impression?: number
          potential_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "properties_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      user_weights: {
        Row: {
          user_id: string
          updated_at: string
          weights: Json
        }
        Insert: {
          user_id: string
          weights: Json
        }
        Update: {
          weights?: Json
        }
        Relationships: [
          {
            foreignKeyName: "user_weights_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      users: {
        Row: {
          id: string
        }
        Insert: {}
        Update: {}
        Relationships: []
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

const supabaseUrl = SUPABASE_URL;
const supabaseKey = SUPABASE_ANON_KEY;

let supabaseInstance: SupabaseClient<Database> | null = null;

if (supabaseUrl && supabaseKey && !supabaseUrl.includes('your-supabase-url')) {
  supabaseInstance = createClient<Database>(supabaseUrl, supabaseKey);
} else {
  console.warn(
    "Supabase configuration is missing or incomplete. The app will run in local-only guest mode. Please create and configure the `env.ts` file with your SUPABASE_URL and SUPABASE_ANON_KEY to enable cloud features."
  );
}

export const supabase = supabaseInstance;
export const isSupabaseConfigured = !!supabaseInstance;