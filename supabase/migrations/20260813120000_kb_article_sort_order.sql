-- Manual sort order for knowledge base articles (scoped per category + sub-category).

ALTER TABLE pm.kb_articles
  ADD COLUMN IF NOT EXISTS sort_order int NOT NULL DEFAULT 0;

WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY category_id, subcategory_id
      ORDER BY updated_at DESC, title ASC
    ) - 1 AS new_order
  FROM pm.kb_articles
)
UPDATE pm.kb_articles AS a
SET sort_order = ranked.new_order
FROM ranked
WHERE a.id = ranked.id;

CREATE INDEX IF NOT EXISTS kb_articles_category_sub_sort_idx
  ON pm.kb_articles (category_id, subcategory_id, sort_order);
