import { Database } from './supabase';

export type EventType = 'hackathon' | 'workshop' | 'competition';
export type RegistrationStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';

export type Round = {
  name: string;
  start_date: string;
  end_date: string;
  description?: string;
};

export type JudgingCriterion = {
  name: string;
  weight: number;
  description?: string;
};

export type EventSettings = {
  judges_criteria?: JudgingCriterion[];
  rounds?: Round[];
  registration_form_fields?: {
    college_name: boolean;
    course: boolean;
    graduation_year: boolean;
    skills: boolean;
    github_url: boolean;
    linkedin_url: boolean;
    portfolio_url: boolean;
    why_join: boolean;
  };
};

export type Event = Database['public']['Tables']['events']['Row'] & {
  settings: EventSettings;
};

export type TeamMember = {
  id: string;
  name: string;
  email: string;
  role?: string;
};

export type EventRegistration = Database['public']['Tables']['event_registrations']['Row'] & {
  team_members: TeamMember[];
};

export type EventWithRegistration = Event & {
  registration?: EventRegistration;
  isRegistered?: boolean;
};

export type CreateEventPayload = {
  title: string;
  theme?: string;
  description?: string;
  event_type: EventType;
  start_date: string;
  end_date: string;
  registration_deadline: string;
  is_paid: boolean;
  registration_fee: number;
  is_team_event: boolean;
  min_team_size: number;
  max_team_size: number;
  max_participants: number;
  settings: EventSettings;
};

export type UpdateEventPayload = Partial<CreateEventPayload>;

export type CreateRegistrationPayload = {
  event_id: string;
  email: string;
  full_name?: string;
  team_name?: string;
  team_members?: TeamMember[];
  college_name?: string;
  course?: string;
  graduation_year?: number;
  skills?: string[];
  github_url?: string;
  linkedin_url?: string;
  portfolio_url?: string;
  why_join?: string;
};