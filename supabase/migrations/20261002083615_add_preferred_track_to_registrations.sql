ALTER TABLE public.hackathon_registrations
  ADD COLUMN preferred_track text NOT NULL;

ALTER TABLE public.hackathon_registrations
  ADD CONSTRAINT hackathon_registrations_preferred_track_check
  CHECK (preferred_track IN ('GenAI', 'Agentic AI', 'Open Innovation'));
