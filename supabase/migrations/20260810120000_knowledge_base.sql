-- Internal knowledge base (wiki) for PM team.

CREATE TABLE pm.kb_categories (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE pm.kb_articles (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id uuid REFERENCES pm.kb_categories(id) ON DELETE CASCADE,
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  content jsonb NOT NULL DEFAULT '[]'::jsonb,
  excerpt text,
  is_published boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES pm.team_members(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES pm.team_members(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE pm.kb_article_versions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  article_id uuid NOT NULL REFERENCES pm.kb_articles(id) ON DELETE CASCADE,
  content jsonb NOT NULL,
  title text NOT NULL,
  changed_by uuid REFERENCES pm.team_members(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX kb_articles_category_id_idx ON pm.kb_articles (category_id);
CREATE INDEX kb_articles_updated_at_idx ON pm.kb_articles (updated_at DESC);
CREATE INDEX kb_article_versions_article_id_idx ON pm.kb_article_versions (article_id);

INSERT INTO pm.kb_categories (name, slug, sort_order) VALUES
  ('Client Onboarding', 'client-onboarding', 1),
  ('Monthly Management', 'monthly-management', 2),
  ('Reporting', 'reporting', 3),
  ('Employee Onboarding', 'employee-onboarding', 4);

ALTER TABLE pm.kb_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm.kb_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm.kb_article_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team members can read kb_categories"
  ON pm.kb_categories FOR SELECT
  USING (pm.is_team_member());

CREATE POLICY "admins can manage kb_categories"
  ON pm.kb_categories FOR ALL
  USING (pm.is_admin())
  WITH CHECK (pm.is_admin());

CREATE POLICY "kb editors can manage kb_categories"
  ON pm.kb_categories FOR ALL
  USING (
    lower(auth.jwt() ->> 'email') IN (
      'max@smarterleads.ca', 'alex@smarterleads.ca'
    )
  )
  WITH CHECK (
    lower(auth.jwt() ->> 'email') IN (
      'max@smarterleads.ca', 'alex@smarterleads.ca'
    )
  );

CREATE POLICY "team members can read kb_articles"
  ON pm.kb_articles FOR SELECT
  USING (pm.is_team_member() AND is_published = true);

CREATE POLICY "kb editors can read all kb_articles"
  ON pm.kb_articles FOR SELECT
  USING (
    lower(auth.jwt() ->> 'email') IN (
      'max@smarterleads.ca', 'alex@smarterleads.ca'
    )
  );

CREATE POLICY "editors can manage kb_articles"
  ON pm.kb_articles FOR ALL
  USING (
    lower(auth.jwt() ->> 'email') IN (
      'max@smarterleads.ca', 'alex@smarterleads.ca'
    )
  )
  WITH CHECK (
    lower(auth.jwt() ->> 'email') IN (
      'max@smarterleads.ca', 'alex@smarterleads.ca'
    )
  );

CREATE POLICY "team members can read kb_versions"
  ON pm.kb_article_versions FOR SELECT
  USING (pm.is_team_member());

CREATE POLICY "editors can insert kb_versions"
  ON pm.kb_article_versions FOR INSERT
  WITH CHECK (
    lower(auth.jwt() ->> 'email') IN (
      'max@smarterleads.ca', 'alex@smarterleads.ca'
    )
  );

GRANT ALL ON pm.kb_categories TO authenticated, service_role;
GRANT ALL ON pm.kb_articles TO authenticated, service_role;
GRANT ALL ON pm.kb_article_versions TO authenticated, service_role;

CREATE TRIGGER trg_pm_kb_categories_updated_at
  BEFORE UPDATE ON pm.kb_categories
  FOR EACH ROW EXECUTE FUNCTION pm.set_updated_at();

CREATE TRIGGER trg_pm_kb_articles_updated_at
  BEFORE UPDATE ON pm.kb_articles
  FOR EACH ROW EXECUTE FUNCTION pm.set_updated_at();
