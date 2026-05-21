-- Migration: add video_url column to exercises table.
-- Run this once in Supabase → SQL Editor.

alter table exercises
  add column if not exists video_url text;
