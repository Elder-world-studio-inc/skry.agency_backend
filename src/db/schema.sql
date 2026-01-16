-- Skry Ad Cam Independent Schema
-- Purpose: Complete decoupling from Admin Engine

CREATE SCHEMA IF NOT EXISTS skry_ad_cam;

-- Users table isolated for Skry
CREATE TABLE IF NOT EXISTS skry_ad_cam.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Ad Scans table with metadata support
CREATE TABLE IF NOT EXISTS skry_ad_cam.ad_scans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES skry_ad_cam.users(id),
    image_url TEXT NOT NULL,
    platform TEXT, -- e.g., 'Facebook', 'TikTok', 'Instagram'
    format TEXT,   -- e.g., 'Video', 'Static', 'Carousel'
    hook_type TEXT, -- e.g., 'Problem/Solution', 'Direct Offer'
    visual_style TEXT, -- e.g., 'UGC', 'High Production'
    analysis_result JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Metadata Tags for categorization
CREATE TABLE IF NOT EXISTS skry_ad_cam.metadata_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL, -- 'platform', 'format', 'hook_type', 'visual_style'
    value TEXT NOT NULL,
    label TEXT NOT NULL,
    UNIQUE(category, value)
);

-- Seed initial tags
INSERT INTO skry_ad_cam.metadata_tags (category, value, label) VALUES
('platform', 'facebook', 'Facebook'),
('platform', 'tiktok', 'TikTok'),
('platform', 'instagram', 'Instagram'),
('format', 'video', 'Video'),
('format', 'static', 'Static'),
('format', 'carousel', 'Carousel'),
('hook_type', 'problem_solution', 'Problem/Solution'),
('hook_type', 'testimonial', 'Testimonial'),
('hook_type', 'direct_offer', 'Direct Offer'),
('visual_style', 'ugc', 'UGC (User Generated)'),
('visual_style', 'professional', 'Professional Production')
ON CONFLICT (category, value) DO NOTHING;
