-- Sub-categories for knowledge base (child rows in kb_categories + article tagging).

ALTER TABLE pm.kb_categories
  ADD COLUMN IF NOT EXISTS parent_id uuid
    REFERENCES pm.kb_categories(id) ON DELETE CASCADE;

ALTER TABLE pm.kb_articles
  ADD COLUMN IF NOT EXISTS subcategory_id uuid
    REFERENCES pm.kb_categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS kb_categories_parent_id_idx
  ON pm.kb_categories (parent_id);

CREATE INDEX IF NOT EXISTS kb_articles_subcategory_id_idx
  ON pm.kb_articles (subcategory_id);
