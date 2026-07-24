-- Migration 009: POV demo video type + scene_direction field
-- Run in Supabase SQL Editor

ALTER TABLE marketing_jobs
  ADD COLUMN IF NOT EXISTS scene_direction TEXT;

-- Extend video_type CHECK to include ai_pov_demo
ALTER TABLE marketing_jobs
  DROP CONSTRAINT IF EXISTS marketing_jobs_video_type_check;

ALTER TABLE marketing_jobs
  ADD CONSTRAINT marketing_jobs_video_type_check
    CHECK (video_type IN ('text_overlay', 'ai_unboxing', 'ai_demo', 'ai_pov_demo', 'avatar_ad'));
