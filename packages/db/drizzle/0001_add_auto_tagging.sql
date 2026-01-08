-- Add auto-tagging support to scraping_jobs table
ALTER TABLE scraping_jobs 
ADD COLUMN auto_tagging BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE scraping_jobs 
ADD COLUMN user_id UUID REFERENCES "user"(id) ON DELETE SET NULL;
