
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "amenities": {
                  Row: {
                    "id": string,"name": string,"slug": string,"sort": number
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: string,"name": string,"slug": string,"sort"?: number
                  }
                  Update: {
                    "id"?: string,"name"?: string,"slug"?: string,"sort"?: number
                  }
                  Relationships: [
                    
                  ]
                },"audit_log": {
                  Row: {
                    "action": string,"actor_id": string | null,"created_at": string,"diff": NonNullable<Json>,"entity": string,"entity_id": string | null,"id": number,"venue_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"actor_id"?: string | null,"created_at"?: string,"diff"?: NonNullable<Json>,"entity": string,"entity_id"?: string | null,"id"?: never,"venue_id"?: string | null
                  }
                  Update: {
                    "action"?: string,"actor_id"?: string | null,"created_at"?: string,"diff"?: NonNullable<Json>,"entity"?: string,"entity_id"?: string | null,"id"?: never,"venue_id"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"booking_events": {
                  Row: {
                    "actor_id": string | null,"booking_id": string,"created_at": string,"from_status": Database["public"]['Enums']["booking_status"] | null,"id": number,"note": string | null,"to_status": Database["public"]['Enums']["booking_status"]
                  }
                  ComputedFields: never
                  Insert: {
                    "actor_id"?: string | null,"booking_id": string,"created_at"?: string,"from_status"?: Database["public"]['Enums']["booking_status"] | null,"id"?: never,"note"?: string | null,"to_status": Database["public"]['Enums']["booking_status"]
                  }
                  Update: {
                    "actor_id"?: string | null,"booking_id"?: string,"created_at"?: string,"from_status"?: Database["public"]['Enums']["booking_status"] | null,"id"?: never,"note"?: string | null,"to_status"?: Database["public"]['Enums']["booking_status"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "booking_events_booking_id_fkey"
      columns: ["booking_id"]
isOneToOne: false
      referencedRelation: "bookings"
      referencedColumns: ["id"]
    }
                  ]
                },"booking_payments": {
                  Row: {
                    "amount_centavos": number,"booking_id": string,"id": string,"proof_path": string | null,"reason": string | null,"reference_no": string | null,"reviewed_at": string | null,"reviewed_by": string | null,"status": Database["public"]['Enums']["proof_status"],"submitted_at": string,"submitted_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "amount_centavos": number,"booking_id": string,"id"?: string,"proof_path"?: string | null,"reason"?: string | null,"reference_no"?: string | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"status"?: Database["public"]['Enums']["proof_status"],"submitted_at"?: string,"submitted_by"?: string | null
                  }
                  Update: {
                    "amount_centavos"?: number,"booking_id"?: string,"id"?: string,"proof_path"?: string | null,"reason"?: string | null,"reference_no"?: string | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"status"?: Database["public"]['Enums']["proof_status"],"submitted_at"?: string,"submitted_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "booking_payments_booking_id_fkey"
      columns: ["booking_id"]
isOneToOne: false
      referencedRelation: "bookings"
      referencedColumns: ["id"]
    }
                  ]
                },"bookings": {
                  Row: {
                    "cancel_reason": string | null,"cancelled_at": string | null,"checked_in_at": string | null,"checked_in_by": string | null,"code": string,"court_id": string,"created_at": string,"created_by": string | null,"customer_name": string | null,"customer_phone": string | null,"during": unknown,"hold_expires_at": string | null,"id": string,"kind": Database["public"]['Enums']["booking_kind"],"notes": string | null,"payment_mode": Database["public"]['Enums']["payment_mode"],"payment_status": Database["public"]['Enums']["payment_status"],"player_id": string | null,"price_total_centavos": number,"reminded_at": string | null,"status": Database["public"]['Enums']["booking_status"],"venue_id": string,"insert_booking": {
              "cancel_reason": string | null,
"cancelled_at": string | null,
"checked_in_at": string | null,
"checked_in_by": string | null,
"code": string,
"court_id": string,
"created_at": string,
"created_by": string | null,
"customer_name": string | null,
"customer_phone": string | null,
"during": unknown,
"hold_expires_at": string | null,
"id": string,
"kind": Database["public"]['Enums']["booking_kind"],
"notes": string | null,
"payment_mode": Database["public"]['Enums']["payment_mode"],
"payment_status": Database["public"]['Enums']["payment_status"],
"player_id": string | null,
"price_total_centavos": number,
"reminded_at": string | null,
"status": Database["public"]['Enums']["booking_status"],
"venue_id": string
            } | null
                  }
                  ComputedFields: "insert_booking"
                  Insert: {
                    "cancel_reason"?: string | null,"cancelled_at"?: string | null,"checked_in_at"?: string | null,"checked_in_by"?: string | null,"code"?: string,"court_id": string,"created_at"?: string,"created_by"?: string | null,"customer_name"?: string | null,"customer_phone"?: string | null,"during": unknown,"hold_expires_at"?: string | null,"id"?: string,"kind": Database["public"]['Enums']["booking_kind"],"notes"?: string | null,"payment_mode": Database["public"]['Enums']["payment_mode"],"payment_status"?: Database["public"]['Enums']["payment_status"],"player_id"?: string | null,"price_total_centavos"?: number,"reminded_at"?: string | null,"status": Database["public"]['Enums']["booking_status"],"venue_id": string
                  }
                  Update: {
                    "cancel_reason"?: string | null,"cancelled_at"?: string | null,"checked_in_at"?: string | null,"checked_in_by"?: string | null,"code"?: string,"court_id"?: string,"created_at"?: string,"created_by"?: string | null,"customer_name"?: string | null,"customer_phone"?: string | null,"during"?: unknown,"hold_expires_at"?: string | null,"id"?: string,"kind"?: Database["public"]['Enums']["booking_kind"],"notes"?: string | null,"payment_mode"?: Database["public"]['Enums']["payment_mode"],"payment_status"?: Database["public"]['Enums']["payment_status"],"player_id"?: string | null,"price_total_centavos"?: number,"reminded_at"?: string | null,"status"?: Database["public"]['Enums']["booking_status"],"venue_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "bookings_court_in_venue"
      columns: ["court_id","venue_id"]
isOneToOne: false
      referencedRelation: "courts"
      referencedColumns: ["id","venue_id"]
    },{
      foreignKeyName: "bookings_player_id_fkey"
      columns: ["player_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "bookings_venue_id_fkey"
      columns: ["venue_id"]
isOneToOne: false
      referencedRelation: "venues"
      referencedColumns: ["id"]
    }
                  ]
                },"court_rates": {
                  Row: {
                    "court_id": string,"created_at": string,"ends_at": string,"id": string,"rate_centavos": number,"starts_at": string,"weekdays": (number)[]
                  }
                  ComputedFields: never
                  Insert: {
                    "court_id": string,"created_at"?: string,"ends_at": string,"id"?: string,"rate_centavos": number,"starts_at": string,"weekdays": (number)[]
                  }
                  Update: {
                    "court_id"?: string,"created_at"?: string,"ends_at"?: string,"id"?: string,"rate_centavos"?: number,"starts_at"?: string,"weekdays"?: (number)[]
                  }
                  Relationships: [
                    {
      foreignKeyName: "court_rates_court_id_fkey"
      columns: ["court_id"]
isOneToOne: false
      referencedRelation: "courts"
      referencedColumns: ["id"]
    }
                  ]
                },"courts": {
                  Row: {
                    "base_rate_centavos": number,"created_at": string,"has_lights": boolean,"id": string,"is_active": boolean,"is_indoor": boolean,"name": string,"sort": number,"sport_id": string,"surface": string,"venue_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "base_rate_centavos": number,"created_at"?: string,"has_lights"?: boolean,"id"?: string,"is_active"?: boolean,"is_indoor"?: boolean,"name": string,"sort"?: number,"sport_id": string,"surface"?: string,"venue_id": string
                  }
                  Update: {
                    "base_rate_centavos"?: number,"created_at"?: string,"has_lights"?: boolean,"id"?: string,"is_active"?: boolean,"is_indoor"?: boolean,"name"?: string,"sort"?: number,"sport_id"?: string,"surface"?: string,"venue_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "courts_sport_id_fkey"
      columns: ["sport_id"]
isOneToOne: false
      referencedRelation: "sports"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "courts_venue_id_fkey"
      columns: ["venue_id"]
isOneToOne: false
      referencedRelation: "venues"
      referencedColumns: ["id"]
    }
                  ]
                },"favorites": {
                  Row: {
                    "created_at": string,"user_id": string,"venue_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"user_id": string,"venue_id": string
                  }
                  Update: {
                    "created_at"?: string,"user_id"?: string,"venue_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "favorites_venue_id_fkey"
      columns: ["venue_id"]
isOneToOne: false
      referencedRelation: "venues"
      referencedColumns: ["id"]
    }
                  ]
                },"notifications": {
                  Row: {
                    "created_at": string,"id": number,"payload": NonNullable<Json>,"read_at": string | null,"type": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: never,"payload"?: NonNullable<Json>,"read_at"?: string | null,"type": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: never,"payload"?: NonNullable<Json>,"read_at"?: string | null,"type"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"platform_admins": {
                  Row: {
                    "created_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"platform_settings": {
                  Row: {
                    "announcement": string | null,"grace_days": number,"id": boolean,"payout_bank_details": string | null,"payout_gcash_name": string | null,"payout_gcash_number": string | null,"payout_gcash_qr_path": string | null,"pro_monthly_centavos": number,"pro_yearly_centavos": number,"trial_days": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "announcement"?: string | null,"grace_days"?: number,"id"?: boolean,"payout_bank_details"?: string | null,"payout_gcash_name"?: string | null,"payout_gcash_number"?: string | null,"payout_gcash_qr_path"?: string | null,"pro_monthly_centavos"?: number,"pro_yearly_centavos"?: number,"trial_days"?: number,"updated_at"?: string
                  }
                  Update: {
                    "announcement"?: string | null,"grace_days"?: number,"id"?: boolean,"payout_bank_details"?: string | null,"payout_gcash_name"?: string | null,"payout_gcash_number"?: string | null,"payout_gcash_qr_path"?: string | null,"pro_monthly_centavos"?: number,"pro_yearly_centavos"?: number,"trial_days"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"profiles": {
                  Row: {
                    "avatar_path": string | null,"created_at": string,"full_name": string,"id": string,"phone": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "avatar_path"?: string | null,"created_at"?: string,"full_name"?: string,"id": string,"phone"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "avatar_path"?: string | null,"created_at"?: string,"full_name"?: string,"id"?: string,"phone"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"sports": {
                  Row: {
                    "id": string,"name": string,"slug": string,"sort": number
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: string,"name": string,"slug": string,"sort"?: number
                  }
                  Update: {
                    "id"?: string,"name"?: string,"slug"?: string,"sort"?: number
                  }
                  Relationships: [
                    
                  ]
                },"subscription_payments": {
                  Row: {
                    "amount_centavos": number,"id": string,"period": Database["public"]['Enums']["billing_period"],"period_end": string | null,"period_start": string | null,"proof_path": string,"reason": string | null,"reference_no": string,"reviewed_at": string | null,"reviewed_by": string | null,"status": Database["public"]['Enums']["proof_status"],"submitted_at": string,"submitted_by": string | null,"venue_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount_centavos": number,"id"?: string,"period": Database["public"]['Enums']["billing_period"],"period_end"?: string | null,"period_start"?: string | null,"proof_path": string,"reason"?: string | null,"reference_no": string,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"status"?: Database["public"]['Enums']["proof_status"],"submitted_at"?: string,"submitted_by"?: string | null,"venue_id": string
                  }
                  Update: {
                    "amount_centavos"?: number,"id"?: string,"period"?: Database["public"]['Enums']["billing_period"],"period_end"?: string | null,"period_start"?: string | null,"proof_path"?: string,"reason"?: string | null,"reference_no"?: string,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"status"?: Database["public"]['Enums']["proof_status"],"submitted_at"?: string,"submitted_by"?: string | null,"venue_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "subscription_payments_venue_id_fkey"
      columns: ["venue_id"]
isOneToOne: false
      referencedRelation: "venues"
      referencedColumns: ["id"]
    }
                  ]
                },"venue_amenities": {
                  Row: {
                    "amenity_id": string,"venue_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amenity_id": string,"venue_id": string
                  }
                  Update: {
                    "amenity_id"?: string,"venue_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "venue_amenities_amenity_id_fkey"
      columns: ["amenity_id"]
isOneToOne: false
      referencedRelation: "amenities"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "venue_amenities_venue_id_fkey"
      columns: ["venue_id"]
isOneToOne: false
      referencedRelation: "venues"
      referencedColumns: ["id"]
    }
                  ]
                },"venue_hours": {
                  Row: {
                    "closes_at": string,"is_closed": boolean,"opens_at": string,"venue_id": string,"weekday": number
                  }
                  ComputedFields: never
                  Insert: {
                    "closes_at": string,"is_closed"?: boolean,"opens_at": string,"venue_id": string,"weekday": number
                  }
                  Update: {
                    "closes_at"?: string,"is_closed"?: boolean,"opens_at"?: string,"venue_id"?: string,"weekday"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "venue_hours_venue_id_fkey"
      columns: ["venue_id"]
isOneToOne: false
      referencedRelation: "venues"
      referencedColumns: ["id"]
    }
                  ]
                },"venue_invites": {
                  Row: {
                    "created_at": string,"created_by": string | null,"expires_at": string,"id": string,"role": Database["public"]['Enums']["member_role"],"token_hash": string,"used_at": string | null,"used_by": string | null,"venue_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"expires_at"?: string,"id"?: string,"role": Database["public"]['Enums']["member_role"],"token_hash": string,"used_at"?: string | null,"used_by"?: string | null,"venue_id": string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"expires_at"?: string,"id"?: string,"role"?: Database["public"]['Enums']["member_role"],"token_hash"?: string,"used_at"?: string | null,"used_by"?: string | null,"venue_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "venue_invites_venue_id_fkey"
      columns: ["venue_id"]
isOneToOne: false
      referencedRelation: "venues"
      referencedColumns: ["id"]
    }
                  ]
                },"venue_members": {
                  Row: {
                    "created_at": string,"role": Database["public"]['Enums']["member_role"],"user_id": string,"venue_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"role": Database["public"]['Enums']["member_role"],"user_id": string,"venue_id": string
                  }
                  Update: {
                    "created_at"?: string,"role"?: Database["public"]['Enums']["member_role"],"user_id"?: string,"venue_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "venue_members_venue_id_fkey"
      columns: ["venue_id"]
isOneToOne: false
      referencedRelation: "venues"
      referencedColumns: ["id"]
    }
                  ]
                },"venue_payment_details": {
                  Row: {
                    "gcash_name": string | null,"gcash_number": string | null,"gcash_qr_path": string | null,"updated_at": string,"venue_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "gcash_name"?: string | null,"gcash_number"?: string | null,"gcash_qr_path"?: string | null,"updated_at"?: string,"venue_id": string
                  }
                  Update: {
                    "gcash_name"?: string | null,"gcash_number"?: string | null,"gcash_qr_path"?: string | null,"updated_at"?: string,"venue_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "venue_payment_details_venue_id_fkey"
      columns: ["venue_id"]
isOneToOne: true
      referencedRelation: "venues"
      referencedColumns: ["id"]
    }
                  ]
                },"venue_photos": {
                  Row: {
                    "alt": string,"created_at": string,"height": number,"id": string,"path": string,"sort": number,"venue_id": string,"width": number
                  }
                  ComputedFields: never
                  Insert: {
                    "alt"?: string,"created_at"?: string,"height": number,"id"?: string,"path": string,"sort"?: number,"venue_id": string,"width": number
                  }
                  Update: {
                    "alt"?: string,"created_at"?: string,"height"?: number,"id"?: string,"path"?: string,"sort"?: number,"venue_id"?: string,"width"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "venue_photos_venue_id_fkey"
      columns: ["venue_id"]
isOneToOne: false
      referencedRelation: "venues"
      referencedColumns: ["id"]
    }
                  ]
                },"venues": {
                  Row: {
                    "address_line": string | null,"advance_days": number,"approved_at": string | null,"cancel_cutoff_hours": number,"city": string | null,"created_at": string,"created_by": string | null,"description": string | null,"facebook_url": string | null,"hold_minutes": number,"id": string,"location": unknown,"max_duration_minutes": number,"messenger_url": string | null,"min_duration_minutes": number,"min_lead_minutes": number,"name": string,"payment_mode": Database["public"]['Enums']["payment_mode"],"phone": string | null,"pro_until": string | null,"province": string | null,"review_note": string | null,"search": unknown,"slot_minutes": number,"slug": string,"status": Database["public"]['Enums']["venue_status"],"submitted_at": string | null,"timezone": string,"trial_ends_at": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "address_line"?: string | null,"advance_days"?: number,"approved_at"?: string | null,"cancel_cutoff_hours"?: number,"city"?: string | null,"created_at"?: string,"created_by"?: string | null,"description"?: string | null,"facebook_url"?: string | null,"hold_minutes"?: number,"id"?: string,"location"?: unknown,"max_duration_minutes"?: number,"messenger_url"?: string | null,"min_duration_minutes"?: number,"min_lead_minutes"?: number,"name": string,"payment_mode"?: Database["public"]['Enums']["payment_mode"],"phone"?: string | null,"pro_until"?: string | null,"province"?: string | null,"review_note"?: string | null,"search"?: never,"slot_minutes"?: number,"slug": string,"status"?: Database["public"]['Enums']["venue_status"],"submitted_at"?: string | null,"timezone"?: string,"trial_ends_at"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "address_line"?: string | null,"advance_days"?: number,"approved_at"?: string | null,"cancel_cutoff_hours"?: number,"city"?: string | null,"created_at"?: string,"created_by"?: string | null,"description"?: string | null,"facebook_url"?: string | null,"hold_minutes"?: number,"id"?: string,"location"?: unknown,"max_duration_minutes"?: number,"messenger_url"?: string | null,"min_duration_minutes"?: number,"min_lead_minutes"?: number,"name"?: string,"payment_mode"?: Database["public"]['Enums']["payment_mode"],"phone"?: string | null,"pro_until"?: string | null,"province"?: string | null,"review_note"?: string | null,"search"?: never,"slot_minutes"?: number,"slug"?: string,"status"?: Database["public"]['Enums']["venue_status"],"submitted_at"?: string | null,"timezone"?: string,"trial_ends_at"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "admin_set_pro_until":
{ Args: { "p_pro_until": string,"p_venue_id": string }; Returns: {
              "address_line": string | null,
"advance_days": number,
"approved_at": string | null,
"cancel_cutoff_hours": number,
"city": string | null,
"created_at": string,
"created_by": string | null,
"description": string | null,
"facebook_url": string | null,
"hold_minutes": number,
"id": string,
"location": unknown,
"max_duration_minutes": number,
"messenger_url": string | null,
"min_duration_minutes": number,
"min_lead_minutes": number,
"name": string,
"payment_mode": Database["public"]['Enums']["payment_mode"],
"phone": string | null,
"pro_until": string | null,
"province": string | null,
"review_note": string | null,
"search": unknown,
"slot_minutes": number,
"slug": string,
"status": Database["public"]['Enums']["venue_status"],
"submitted_at": string | null,
"timezone": string,
"trial_ends_at": string | null,
"updated_at": string
            }
                          SetofOptions: {
        from: "*"
        to: "venues"
        isOneToOne: true
        isSetofReturn: false
      } },
"approve_venue":
{ Args: { "p_venue_id": string }; Returns: {
              "address_line": string | null,
"advance_days": number,
"approved_at": string | null,
"cancel_cutoff_hours": number,
"city": string | null,
"created_at": string,
"created_by": string | null,
"description": string | null,
"facebook_url": string | null,
"hold_minutes": number,
"id": string,
"location": unknown,
"max_duration_minutes": number,
"messenger_url": string | null,
"min_duration_minutes": number,
"min_lead_minutes": number,
"name": string,
"payment_mode": Database["public"]['Enums']["payment_mode"],
"phone": string | null,
"pro_until": string | null,
"province": string | null,
"review_note": string | null,
"search": unknown,
"slot_minutes": number,
"slug": string,
"status": Database["public"]['Enums']["venue_status"],
"submitted_at": string | null,
"timezone": string,
"trial_ends_at": string | null,
"updated_at": string
            }
                          SetofOptions: {
        from: "*"
        to: "venues"
        isOneToOne: true
        isSetofReturn: false
      } },
"cancel_booking":
{ Args: { "p_booking_id": string,"p_reason"?: string }; Returns: {
              "cancel_reason": string | null,
"cancelled_at": string | null,
"checked_in_at": string | null,
"checked_in_by": string | null,
"code": string,
"court_id": string,
"created_at": string,
"created_by": string | null,
"customer_name": string | null,
"customer_phone": string | null,
"during": unknown,
"hold_expires_at": string | null,
"id": string,
"kind": Database["public"]['Enums']["booking_kind"],
"notes": string | null,
"payment_mode": Database["public"]['Enums']["payment_mode"],
"payment_status": Database["public"]['Enums']["payment_status"],
"player_id": string | null,
"price_total_centavos": number,
"reminded_at": string | null,
"status": Database["public"]['Enums']["booking_status"],
"venue_id": string
            }
                          SetofOptions: {
        from: "*"
        to: "bookings"
        isOneToOne: true
        isSetofReturn: false
      } },
"check_in_booking":
{ Args: { "p_code": string,"p_mark_paid"?: boolean,"p_venue_id": string }; Returns: {
              "cancel_reason": string | null,
"cancelled_at": string | null,
"checked_in_at": string | null,
"checked_in_by": string | null,
"code": string,
"court_id": string,
"created_at": string,
"created_by": string | null,
"customer_name": string | null,
"customer_phone": string | null,
"during": unknown,
"hold_expires_at": string | null,
"id": string,
"kind": Database["public"]['Enums']["booking_kind"],
"notes": string | null,
"payment_mode": Database["public"]['Enums']["payment_mode"],
"payment_status": Database["public"]['Enums']["payment_status"],
"player_id": string | null,
"price_total_centavos": number,
"reminded_at": string | null,
"status": Database["public"]['Enums']["booking_status"],
"venue_id": string
            }
                          SetofOptions: {
        from: "*"
        to: "bookings"
        isOneToOne: true
        isSetofReturn: false
      } },
"complete_ended_bookings":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"compute_price":
{ Args: { "p_court_id": string,"p_ends_at": string,"p_starts_at": string }; Returns: number
                           },
"create_block":
{ Args: { "p_court_id": string,"p_ends_at": string,"p_note": string,"p_starts_at": string }; Returns: {
              "cancel_reason": string | null,
"cancelled_at": string | null,
"checked_in_at": string | null,
"checked_in_by": string | null,
"code": string,
"court_id": string,
"created_at": string,
"created_by": string | null,
"customer_name": string | null,
"customer_phone": string | null,
"during": unknown,
"hold_expires_at": string | null,
"id": string,
"kind": Database["public"]['Enums']["booking_kind"],
"notes": string | null,
"payment_mode": Database["public"]['Enums']["payment_mode"],
"payment_status": Database["public"]['Enums']["payment_status"],
"player_id": string | null,
"price_total_centavos": number,
"reminded_at": string | null,
"status": Database["public"]['Enums']["booking_status"],
"venue_id": string
            }
                          SetofOptions: {
        from: "*"
        to: "bookings"
        isOneToOne: true
        isSetofReturn: false
      } },
"create_booking":
{ Args: { "p_court_id": string,"p_minutes": number,"p_starts_at": string }; Returns: {
              "cancel_reason": string | null,
"cancelled_at": string | null,
"checked_in_at": string | null,
"checked_in_by": string | null,
"code": string,
"court_id": string,
"created_at": string,
"created_by": string | null,
"customer_name": string | null,
"customer_phone": string | null,
"during": unknown,
"hold_expires_at": string | null,
"id": string,
"kind": Database["public"]['Enums']["booking_kind"],
"notes": string | null,
"payment_mode": Database["public"]['Enums']["payment_mode"],
"payment_status": Database["public"]['Enums']["payment_status"],
"player_id": string | null,
"price_total_centavos": number,
"reminded_at": string | null,
"status": Database["public"]['Enums']["booking_status"],
"venue_id": string
            }
                          SetofOptions: {
        from: "*"
        to: "bookings"
        isOneToOne: true
        isSetofReturn: false
      } },
"create_walk_in":
{ Args: { "p_court_id": string,"p_customer_name": string,"p_customer_phone"?: string,"p_minutes": number,"p_paid"?: boolean,"p_starts_at": string }; Returns: {
              "cancel_reason": string | null,
"cancelled_at": string | null,
"checked_in_at": string | null,
"checked_in_by": string | null,
"code": string,
"court_id": string,
"created_at": string,
"created_by": string | null,
"customer_name": string | null,
"customer_phone": string | null,
"during": unknown,
"hold_expires_at": string | null,
"id": string,
"kind": Database["public"]['Enums']["booking_kind"],
"notes": string | null,
"payment_mode": Database["public"]['Enums']["payment_mode"],
"payment_status": Database["public"]['Enums']["payment_status"],
"player_id": string | null,
"price_total_centavos": number,
"reminded_at": string | null,
"status": Database["public"]['Enums']["booking_status"],
"venue_id": string
            }
                          SetofOptions: {
        from: "*"
        to: "bookings"
        isOneToOne: true
        isSetofReturn: false
      } },
"expire_stale_holds":
{ Args: { "p_court_id"?: string }; Returns: number
                           },
"gen_booking_code":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"get_availability":
{ Args: { "p_date": string,"p_venue_id": string }; Returns: {
              "busy": Json,"court_id": string,"court_name": string,"session": unknown,"sport_slug": string
            }[]
                           },
"has_live_hold_at":
{ Args: { "p_venue_id": string }; Returns: boolean
                           },
"has_venue_role":
{ Args: { "p_min": Database["public"]['Enums']["member_role"],"p_venue_id": string }; Returns: boolean
                           },
"insert_booking":
{ Args: { "p_booking": Omit<Database["public"]['Tables']["bookings"]['Row'], Database["public"]['Tables']["bookings"]['ComputedFields']> }; Returns: {
              "cancel_reason": string | null,
"cancelled_at": string | null,
"checked_in_at": string | null,
"checked_in_by": string | null,
"code": string,
"court_id": string,
"created_at": string,
"created_by": string | null,
"customer_name": string | null,
"customer_phone": string | null,
"during": unknown,
"hold_expires_at": string | null,
"id": string,
"kind": Database["public"]['Enums']["booking_kind"],
"notes": string | null,
"payment_mode": Database["public"]['Enums']["payment_mode"],
"payment_status": Database["public"]['Enums']["payment_status"],
"player_id": string | null,
"price_total_centavos": number,
"reminded_at": string | null,
"status": Database["public"]['Enums']["booking_status"],
"venue_id": string
            }
                          SetofOptions: {
        from: "bookings"
        to: "bookings"
        isOneToOne: true
        isSetofReturn: false
      } },
"is_booking_player":
{ Args: { "p_booking_id": string }; Returns: boolean
                           },
"is_booking_venue_manager":
{ Args: { "p_booking_id": string }; Returns: boolean
                           },
"is_platform_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_within_hours":
{ Args: { "p_ends_at": string,"p_starts_at": string,"p_venue_id": string }; Returns: boolean
                           },
"lock_subscription_payment_for_admin":
{ Args: { "p_payment_id": string }; Returns: {
              "amount_centavos": number,
"id": string,
"period": Database["public"]['Enums']["billing_period"],
"period_end": string | null,
"period_start": string | null,
"proof_path": string,
"reason": string | null,
"reference_no": string,
"reviewed_at": string | null,
"reviewed_by": string | null,
"status": Database["public"]['Enums']["proof_status"],
"submitted_at": string,
"submitted_by": string | null,
"venue_id": string
            }
                          SetofOptions: {
        from: "*"
        to: "subscription_payments"
        isOneToOne: true
        isSetofReturn: false
      } },
"lock_venue_for_admin":
{ Args: { "p_venue_id": string }; Returns: {
              "address_line": string | null,
"advance_days": number,
"approved_at": string | null,
"cancel_cutoff_hours": number,
"city": string | null,
"created_at": string,
"created_by": string | null,
"description": string | null,
"facebook_url": string | null,
"hold_minutes": number,
"id": string,
"location": unknown,
"max_duration_minutes": number,
"messenger_url": string | null,
"min_duration_minutes": number,
"min_lead_minutes": number,
"name": string,
"payment_mode": Database["public"]['Enums']["payment_mode"],
"phone": string | null,
"pro_until": string | null,
"province": string | null,
"review_note": string | null,
"search": unknown,
"slot_minutes": number,
"slug": string,
"status": Database["public"]['Enums']["venue_status"],
"submitted_at": string | null,
"timezone": string,
"trial_ends_at": string | null,
"updated_at": string
            }
                          SetofOptions: {
        from: "*"
        to: "venues"
        isOneToOne: true
        isSetofReturn: false
      } },
"mark_booking_paid":
{ Args: { "p_booking_id": string }; Returns: {
              "cancel_reason": string | null,
"cancelled_at": string | null,
"checked_in_at": string | null,
"checked_in_by": string | null,
"code": string,
"court_id": string,
"created_at": string,
"created_by": string | null,
"customer_name": string | null,
"customer_phone": string | null,
"during": unknown,
"hold_expires_at": string | null,
"id": string,
"kind": Database["public"]['Enums']["booking_kind"],
"notes": string | null,
"payment_mode": Database["public"]['Enums']["payment_mode"],
"payment_status": Database["public"]['Enums']["payment_status"],
"player_id": string | null,
"price_total_centavos": number,
"reminded_at": string | null,
"status": Database["public"]['Enums']["booking_status"],
"venue_id": string
            }
                          SetofOptions: {
        from: "*"
        to: "bookings"
        isOneToOne: true
        isSetofReturn: false
      } },
"mark_no_show":
{ Args: { "p_booking_id": string }; Returns: {
              "cancel_reason": string | null,
"cancelled_at": string | null,
"checked_in_at": string | null,
"checked_in_by": string | null,
"code": string,
"court_id": string,
"created_at": string,
"created_by": string | null,
"customer_name": string | null,
"customer_phone": string | null,
"during": unknown,
"hold_expires_at": string | null,
"id": string,
"kind": Database["public"]['Enums']["booking_kind"],
"notes": string | null,
"payment_mode": Database["public"]['Enums']["payment_mode"],
"payment_status": Database["public"]['Enums']["payment_status"],
"player_id": string | null,
"price_total_centavos": number,
"reminded_at": string | null,
"status": Database["public"]['Enums']["booking_status"],
"venue_id": string
            }
                          SetofOptions: {
        from: "*"
        to: "bookings"
        isOneToOne: true
        isSetofReturn: false
      } },
"mark_refunded":
{ Args: { "p_booking_id": string }; Returns: {
              "cancel_reason": string | null,
"cancelled_at": string | null,
"checked_in_at": string | null,
"checked_in_by": string | null,
"code": string,
"court_id": string,
"created_at": string,
"created_by": string | null,
"customer_name": string | null,
"customer_phone": string | null,
"during": unknown,
"hold_expires_at": string | null,
"id": string,
"kind": Database["public"]['Enums']["booking_kind"],
"notes": string | null,
"payment_mode": Database["public"]['Enums']["payment_mode"],
"payment_status": Database["public"]['Enums']["payment_status"],
"player_id": string | null,
"price_total_centavos": number,
"reminded_at": string | null,
"status": Database["public"]['Enums']["booking_status"],
"venue_id": string
            }
                          SetofOptions: {
        from: "*"
        to: "bookings"
        isOneToOne: true
        isSetofReturn: false
      } },
"member_role_rank":
{ Args: { "p_role": Database["public"]['Enums']["member_role"] }; Returns: number
                           },
"my_venues":
{ Args: Record<PropertyKey, never>; Returns: {
              "has_pro": boolean,"id": string,"name": string,"role": Database["public"]['Enums']["member_role"],"slug": string,"status": Database["public"]['Enums']["venue_status"]
            }[]
                           },
"notify":
{ Args: { "p_payload"?: Json,"p_type": string,"p_user_id": string }; Returns: undefined
                           },
"notify_admins":
{ Args: { "p_payload": Json,"p_type": string }; Returns: undefined
                           },
"notify_venue":
{ Args: { "p_min": Database["public"]['Enums']["member_role"],"p_payload": Json,"p_type": string,"p_venue_id": string }; Returns: undefined
                           },
"payment_qr_venue_id":
{ Args: { "p_name": string }; Returns: string
                           },
"quote_booking":
{ Args: { "p_court_id": string,"p_minutes": number,"p_starts_at": string }; Returns: number
                           },
"reinstate_venue":
{ Args: { "p_venue_id": string }; Returns: {
              "address_line": string | null,
"advance_days": number,
"approved_at": string | null,
"cancel_cutoff_hours": number,
"city": string | null,
"created_at": string,
"created_by": string | null,
"description": string | null,
"facebook_url": string | null,
"hold_minutes": number,
"id": string,
"location": unknown,
"max_duration_minutes": number,
"messenger_url": string | null,
"min_duration_minutes": number,
"min_lead_minutes": number,
"name": string,
"payment_mode": Database["public"]['Enums']["payment_mode"],
"phone": string | null,
"pro_until": string | null,
"province": string | null,
"review_note": string | null,
"search": unknown,
"slot_minutes": number,
"slug": string,
"status": Database["public"]['Enums']["venue_status"],
"submitted_at": string | null,
"timezone": string,
"trial_ends_at": string | null,
"updated_at": string
            }
                          SetofOptions: {
        from: "*"
        to: "venues"
        isOneToOne: true
        isSetofReturn: false
      } },
"reject_booking_payment":
{ Args: { "p_payment_id": string,"p_reason": string }; Returns: {
              "cancel_reason": string | null,
"cancelled_at": string | null,
"checked_in_at": string | null,
"checked_in_by": string | null,
"code": string,
"court_id": string,
"created_at": string,
"created_by": string | null,
"customer_name": string | null,
"customer_phone": string | null,
"during": unknown,
"hold_expires_at": string | null,
"id": string,
"kind": Database["public"]['Enums']["booking_kind"],
"notes": string | null,
"payment_mode": Database["public"]['Enums']["payment_mode"],
"payment_status": Database["public"]['Enums']["payment_status"],
"player_id": string | null,
"price_total_centavos": number,
"reminded_at": string | null,
"status": Database["public"]['Enums']["booking_status"],
"venue_id": string
            }
                          SetofOptions: {
        from: "*"
        to: "bookings"
        isOneToOne: true
        isSetofReturn: false
      } },
"reject_subscription_payment":
{ Args: { "p_payment_id": string,"p_reason": string }; Returns: {
              "amount_centavos": number,
"id": string,
"period": Database["public"]['Enums']["billing_period"],
"period_end": string | null,
"period_start": string | null,
"proof_path": string,
"reason": string | null,
"reference_no": string,
"reviewed_at": string | null,
"reviewed_by": string | null,
"status": Database["public"]['Enums']["proof_status"],
"submitted_at": string,
"submitted_by": string | null,
"venue_id": string
            }
                          SetofOptions: {
        from: "*"
        to: "subscription_payments"
        isOneToOne: true
        isSetofReturn: false
      } },
"reject_venue":
{ Args: { "p_reason": string,"p_venue_id": string }; Returns: {
              "address_line": string | null,
"advance_days": number,
"approved_at": string | null,
"cancel_cutoff_hours": number,
"city": string | null,
"created_at": string,
"created_by": string | null,
"description": string | null,
"facebook_url": string | null,
"hold_minutes": number,
"id": string,
"location": unknown,
"max_duration_minutes": number,
"messenger_url": string | null,
"min_duration_minutes": number,
"min_lead_minutes": number,
"name": string,
"payment_mode": Database["public"]['Enums']["payment_mode"],
"phone": string | null,
"pro_until": string | null,
"province": string | null,
"review_note": string | null,
"search": unknown,
"slot_minutes": number,
"slug": string,
"status": Database["public"]['Enums']["venue_status"],
"submitted_at": string | null,
"timezone": string,
"trial_ends_at": string | null,
"updated_at": string
            }
                          SetofOptions: {
        from: "*"
        to: "venues"
        isOneToOne: true
        isSetofReturn: false
      } },
"search_venues":
{ Args: { "p_amenities"?: (string)[],"p_bookable_only"?: boolean,"p_city"?: string,"p_free_at"?: string,"p_free_minutes"?: number,"p_indoor"?: boolean,"p_lat"?: number,"p_limit"?: number,"p_lng"?: number,"p_max_rate_centavos"?: number,"p_offset"?: number,"p_query"?: string,"p_radius_km"?: number,"p_sort"?: string,"p_sport"?: string }; Returns: {
              "city": string,"cover_photo_path": string,"distance_km": number,"id": string,"is_bookable": boolean,"lat": number,"lng": number,"min_rate_centavos": number,"name": string,"province": string,"slug": string,"sports": (string)[],"total_count": number
            }[]
                           },
"send_booking_reminders":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"send_pro_expiry_reminders":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"session_bounds":
{ Args: { "p_date": string,"p_venue_id": string }; Returns: unknown
                           },
"session_containing":
{ Args: { "p_ends_at": string,"p_starts_at": string,"p_venue_id": string }; Returns: unknown
                           },
"submit_booking_payment":
{ Args: { "p_booking_id": string,"p_proof_path": string,"p_reference_no": string }; Returns: {
              "cancel_reason": string | null,
"cancelled_at": string | null,
"checked_in_at": string | null,
"checked_in_by": string | null,
"code": string,
"court_id": string,
"created_at": string,
"created_by": string | null,
"customer_name": string | null,
"customer_phone": string | null,
"during": unknown,
"hold_expires_at": string | null,
"id": string,
"kind": Database["public"]['Enums']["booking_kind"],
"notes": string | null,
"payment_mode": Database["public"]['Enums']["payment_mode"],
"payment_status": Database["public"]['Enums']["payment_status"],
"player_id": string | null,
"price_total_centavos": number,
"reminded_at": string | null,
"status": Database["public"]['Enums']["booking_status"],
"venue_id": string
            }
                          SetofOptions: {
        from: "*"
        to: "bookings"
        isOneToOne: true
        isSetofReturn: false
      } },
"submit_subscription_payment":
{ Args: { "p_period": Database["public"]['Enums']["billing_period"],"p_proof_path": string,"p_reference_no": string,"p_venue_id": string }; Returns: {
              "amount_centavos": number,
"id": string,
"period": Database["public"]['Enums']["billing_period"],
"period_end": string | null,
"period_start": string | null,
"proof_path": string,
"reason": string | null,
"reference_no": string,
"reviewed_at": string | null,
"reviewed_by": string | null,
"status": Database["public"]['Enums']["proof_status"],
"submitted_at": string,
"submitted_by": string | null,
"venue_id": string
            }
                          SetofOptions: {
        from: "*"
        to: "subscription_payments"
        isOneToOne: true
        isSetofReturn: false
      } },
"submit_venue_for_review":
{ Args: { "p_venue_id": string }; Returns: {
              "address_line": string | null,
"advance_days": number,
"approved_at": string | null,
"cancel_cutoff_hours": number,
"city": string | null,
"created_at": string,
"created_by": string | null,
"description": string | null,
"facebook_url": string | null,
"hold_minutes": number,
"id": string,
"location": unknown,
"max_duration_minutes": number,
"messenger_url": string | null,
"min_duration_minutes": number,
"min_lead_minutes": number,
"name": string,
"payment_mode": Database["public"]['Enums']["payment_mode"],
"phone": string | null,
"pro_until": string | null,
"province": string | null,
"review_note": string | null,
"search": unknown,
"slot_minutes": number,
"slug": string,
"status": Database["public"]['Enums']["venue_status"],
"submitted_at": string | null,
"timezone": string,
"trial_ends_at": string | null,
"updated_at": string
            }
                          SetofOptions: {
        from: "*"
        to: "venues"
        isOneToOne: true
        isSetofReturn: false
      } },
"suspend_venue":
{ Args: { "p_reason": string,"p_venue_id": string }; Returns: {
              "address_line": string | null,
"advance_days": number,
"approved_at": string | null,
"cancel_cutoff_hours": number,
"city": string | null,
"created_at": string,
"created_by": string | null,
"description": string | null,
"facebook_url": string | null,
"hold_minutes": number,
"id": string,
"location": unknown,
"max_duration_minutes": number,
"messenger_url": string | null,
"min_duration_minutes": number,
"min_lead_minutes": number,
"name": string,
"payment_mode": Database["public"]['Enums']["payment_mode"],
"phone": string | null,
"pro_until": string | null,
"province": string | null,
"review_note": string | null,
"search": unknown,
"slot_minutes": number,
"slug": string,
"status": Database["public"]['Enums']["venue_status"],
"submitted_at": string | null,
"timezone": string,
"trial_ends_at": string | null,
"updated_at": string
            }
                          SetofOptions: {
        from: "*"
        to: "venues"
        isOneToOne: true
        isSetofReturn: false
      } },
"try_uuid":
{ Args: { "p_value": string }; Returns: string
                           },
"validate_booking_range":
{ Args: { "p_court_id": string,"p_enforce_window": boolean,"p_minutes": number,"p_starts_at": string }; Returns: {
              "address_line": string | null,
"advance_days": number,
"approved_at": string | null,
"cancel_cutoff_hours": number,
"city": string | null,
"created_at": string,
"created_by": string | null,
"description": string | null,
"facebook_url": string | null,
"hold_minutes": number,
"id": string,
"location": unknown,
"max_duration_minutes": number,
"messenger_url": string | null,
"min_duration_minutes": number,
"min_lead_minutes": number,
"name": string,
"payment_mode": Database["public"]['Enums']["payment_mode"],
"phone": string | null,
"pro_until": string | null,
"province": string | null,
"review_note": string | null,
"search": unknown,
"slot_minutes": number,
"slug": string,
"status": Database["public"]['Enums']["venue_status"],
"submitted_at": string | null,
"timezone": string,
"trial_ends_at": string | null,
"updated_at": string
            }
                          SetofOptions: {
        from: "*"
        to: "venues"
        isOneToOne: true
        isSetofReturn: false
      } },
"venue_has_pro":
{ Args: { "p_venue_id": string }; Returns: boolean
                           },
"venue_role":
{ Args: { "p_venue_id": string }; Returns: Database["public"]['Enums']["member_role"]
                           },
"verify_booking_payment":
{ Args: { "p_payment_id": string }; Returns: {
              "cancel_reason": string | null,
"cancelled_at": string | null,
"checked_in_at": string | null,
"checked_in_by": string | null,
"code": string,
"court_id": string,
"created_at": string,
"created_by": string | null,
"customer_name": string | null,
"customer_phone": string | null,
"during": unknown,
"hold_expires_at": string | null,
"id": string,
"kind": Database["public"]['Enums']["booking_kind"],
"notes": string | null,
"payment_mode": Database["public"]['Enums']["payment_mode"],
"payment_status": Database["public"]['Enums']["payment_status"],
"player_id": string | null,
"price_total_centavos": number,
"reminded_at": string | null,
"status": Database["public"]['Enums']["booking_status"],
"venue_id": string
            }
                          SetofOptions: {
        from: "*"
        to: "bookings"
        isOneToOne: true
        isSetofReturn: false
      } },
"verify_subscription_payment":
{ Args: { "p_payment_id": string }; Returns: {
              "address_line": string | null,
"advance_days": number,
"approved_at": string | null,
"cancel_cutoff_hours": number,
"city": string | null,
"created_at": string,
"created_by": string | null,
"description": string | null,
"facebook_url": string | null,
"hold_minutes": number,
"id": string,
"location": unknown,
"max_duration_minutes": number,
"messenger_url": string | null,
"min_duration_minutes": number,
"min_lead_minutes": number,
"name": string,
"payment_mode": Database["public"]['Enums']["payment_mode"],
"phone": string | null,
"pro_until": string | null,
"province": string | null,
"review_note": string | null,
"search": unknown,
"slot_minutes": number,
"slug": string,
"status": Database["public"]['Enums']["venue_status"],
"submitted_at": string | null,
"timezone": string,
"trial_ends_at": string | null,
"updated_at": string
            }
                          SetofOptions: {
        from: "*"
        to: "venues"
        isOneToOne: true
        isSetofReturn: false
      } }
          }
          Enums: {
            "billing_period": "monthly"|"yearly","booking_kind": "online"|"walk_in"|"block","booking_status": "held"|"pending_verification"|"confirmed"|"checked_in"|"completed"|"cancelled"|"expired"|"no_show","member_role": "owner"|"manager"|"staff","payment_mode": "at_venue"|"gcash_proof","payment_status": "unpaid"|"proof_submitted"|"paid"|"refund_due"|"refunded"|"waived","proof_status": "submitted"|"verified"|"rejected","venue_status": "draft"|"pending_review"|"active"|"rejected"|"suspended"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "billing_period": ["monthly", "yearly"],"booking_kind": ["online", "walk_in", "block"],"booking_status": ["held", "pending_verification", "confirmed", "checked_in", "completed", "cancelled", "expired", "no_show"],"member_role": ["owner", "manager", "staff"],"payment_mode": ["at_venue", "gcash_proof"],"payment_status": ["unpaid", "proof_submitted", "paid", "refund_due", "refunded", "waived"],"proof_status": ["submitted", "verified", "rejected"],"venue_status": ["draft", "pending_review", "active", "rejected", "suspended"]
          }
        }
} as const
