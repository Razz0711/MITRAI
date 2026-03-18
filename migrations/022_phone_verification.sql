-- Migration: 022_phone_verification
-- Description: Adds unique phone tracking columns securely to the students table.

-- 1. Add new columns
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20) UNIQUE,
ADD COLUMN IF NOT EXISTS phone_verified_at TIMESTAMP WITH TIME ZONE;

-- 2. Create index on phone_number for faster unique lookups
CREATE INDEX IF NOT EXISTS idx_students_phone_number ON students(phone_number);
