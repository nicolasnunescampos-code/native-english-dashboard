-- Migration script: add_thumbnail_to_materials.sql
-- Run this in your Supabase SQL Editor

ALTER TABLE public.materials
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
