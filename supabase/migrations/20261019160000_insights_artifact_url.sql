ALTER TABLE pm.client_ai_weekly_insights
  ADD COLUMN IF NOT EXISTS artifact_url text;

COMMENT ON COLUMN pm.client_ai_weekly_insights.artifact_url IS
  'Published Claude Dashboard artifact URL for browser-based performance audits';
