CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE session_status AS ENUM ('started', 'in_progress', 'completed', 'deleted');
CREATE TYPE item_block AS ENUM ('A', 'B', 'C', 'D');
CREATE TYPE reliability_level AS ENUM ('Alta', 'Moderada', 'Baixa');

CREATE TABLE respondents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  job_title text NOT NULL,
  department text NOT NULL,
  consent_text text NOT NULL,
  consent_version text NOT NULL,
  consented_at timestamptz NOT NULL,
  admin_access_allowed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE UNIQUE INDEX respondents_active_email_unique ON respondents (lower(email)) WHERE deleted_at IS NULL;

CREATE TABLE teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  respondent_id uuid NOT NULL REFERENCES respondents(id) ON DELETE CASCADE,
  status session_status NOT NULL DEFAULT 'started',
  resume_token_hash text NOT NULL,
  item_order jsonb NOT NULL,
  alternative_orders jsonb NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  last_saved_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE items (
  id text PRIMARY KEY,
  block item_block NOT NULL,
  context text,
  prompt text NOT NULL,
  alternatives jsonb,
  factor char(1),
  facet text,
  reversed boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  content_version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (factor IS NULL OR factor IN ('D', 'I', 'S', 'C'))
);

CREATE TABLE responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  item_id text NOT NULL REFERENCES items(id),
  answer jsonb NOT NULL,
  displayed_item_position integer NOT NULL,
  displayed_alternative_order jsonb,
  duration_ms integer NOT NULL CHECK (duration_ms >= 0),
  answered_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, item_id)
);

CREATE TABLE results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL UNIQUE REFERENCES sessions(id) ON DELETE CASCADE,
  model_version text NOT NULL,
  natural_scores jsonb NOT NULL,
  work_scores jsonb NOT NULL,
  facet_scores jsonb NOT NULL,
  natural_point jsonb NOT NULL,
  work_point jsonb NOT NULL,
  named_style text NOT NULL,
  adaptation_index numeric(5,2) NOT NULL CHECK (adaptation_index BETWEEN 0 AND 100),
  reliability reliability_level NOT NULL,
  validity_alerts jsonb NOT NULL DEFAULT '[]',
  pressure_scores jsonb,
  calculated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE text_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  block_key text NOT NULL,
  style text,
  factor char(1),
  intensity_band text,
  context text,
  content text NOT NULL,
  content_version integer NOT NULL DEFAULT 1,
  active boolean NOT NULL DEFAULT true,
  UNIQUE (block_key, style, factor, intensity_band, context, content_version)
);

CREATE TABLE configurations (
  key text NOT NULL,
  version text NOT NULL,
  value jsonb NOT NULL,
  active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (key, version)
);

CREATE TABLE admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE access_logs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  admin_id uuid REFERENCES admins(id),
  respondent_id uuid REFERENCES respondents(id) ON DELETE SET NULL,
  action text NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'
);

