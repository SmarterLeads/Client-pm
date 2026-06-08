-- Expand pm.interaction_type for new UI options and migrate legacy rows.
-- Postgres cannot drop enum values; unused legacy values remain on the type.

ALTER TYPE pm.interaction_type ADD VALUE IF NOT EXISTS 'check_in';
ALTER TYPE pm.interaction_type ADD VALUE IF NOT EXISTS 'report';
ALTER TYPE pm.interaction_type ADD VALUE IF NOT EXISTS 'quote';

UPDATE pm.interactions SET type = 'meeting' WHERE type = 'demo';
UPDATE pm.interactions SET type = 'check_in' WHERE type = 'note';
UPDATE pm.interactions SET type = 'check_in' WHERE type = 'call';
UPDATE pm.interactions SET type = 'check_in' WHERE type = 'email';
