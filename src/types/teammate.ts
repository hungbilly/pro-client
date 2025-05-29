
export interface Teammate {
  id?: string;
  user_id?: string;
  company_id?: string;
  name: string;
  email: string;
  phone?: string;
  role?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface JobTeammate {
  id: string;
  job_id: string;
  teammate_id?: string;
  teammate_email: string;
  teammate_name?: string;
  calendar_event_id?: string;
  invitation_status: 'pending' | 'sent' | 'accepted' | 'declined' | 'error';
  invited_at?: string;
  responded_at?: string;
  created_at: string;
  updated_at: string;
  teammates?: Teammate;
}

export interface TeammateCalendarResponse {
  id: string;
  job_teammate_id: string;
  calendar_event_id: string;
  response_status: 'accepted' | 'declined' | 'tentative';
  response_comment?: string;
  responded_at: string;
  created_at: string;
}
