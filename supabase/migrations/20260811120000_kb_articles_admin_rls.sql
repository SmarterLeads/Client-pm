-- Align kb_articles RLS with canManageKnowledgeBase (admins + kb editors).

CREATE POLICY "admins can read all kb_articles"
  ON pm.kb_articles FOR SELECT
  USING (pm.is_admin());

CREATE POLICY "admins can manage kb_articles"
  ON pm.kb_articles FOR ALL
  USING (pm.is_admin())
  WITH CHECK (pm.is_admin());

CREATE POLICY "admins can insert kb_versions"
  ON pm.kb_article_versions FOR INSERT
  WITH CHECK (pm.is_admin());
