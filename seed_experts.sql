-- Seed Data for Experts
INSERT INTO experts (
  name, title, gender, about, avatar_url, experience_years, 
  qualifications, languages, expertise, specializations, awards, 
  work_experience, price_per_session, session_duration_mins, 
  is_active, is_featured, rating, review_count
) VALUES 
(
  'Dr. Lekha Murali', 'Counselling Psychologist', 'female', 
  'I am a passionate and dedicated Counselling Psychologist. I strongly believe that positive mental and emotional health is a prerequisite to happiness and success. My goal is to empower youths to overcome their problems and focus continuously on self-improvement.', 
  '#e879a0', 16, 
  '["M.Phil (Clinical Psychology)", "M.Sc (Psychology)", "B.A (Psychology)"]'::jsonb, 
  '["Telugu", "English", "Hindi", "Tamil", "Kannada"]'::jsonb, 
  '["Anxiety", "Depression", "Stress", "Relationships"]'::jsonb, 
  '["CBT", "REBT", "Client Centered", "Psychoanalysis"]'::jsonb, 
  '["Best Psychologist Award 2021", "Community Service Excellence"]'::jsonb, 
  '["Senior Psychologist at Mind Wellness Clinic (2018-Present)", "Clinical Psychologist at Apollo Hospitals (2012-2018)", "Counselor at University Health Center (2008-2012)"]'::jsonb, 
  0, 45, true, true, 4.88, 315
),
(
  'Mr. Utkarsh Yadav', 'Clinical Psychologist', 'male', 
  'I specialize in helping young adults navigate career transitions and build self-esteem. My approach is practical and goal-oriented. We will work as a team to uncover your strengths and build resilience for the challenges you face in college and beyond.', 
  '#6366f1', 6, 
  '["M.A (Clinical Psychology)", "PG Diploma in Counseling"]'::jsonb, 
  '["English", "Hindi", "Marathi"]'::jsonb, 
  '["Career", "Self Esteem", "Adjustment Issues"]'::jsonb, 
  '["CBT", "ACT", "Solution Focused"]'::jsonb, 
  '["Young Achiever Award 2022"]'::jsonb, 
  '["Clinical Psychologist at Student Success Center (2020-Present)", "Counseling Assistant at Mental Health Foundation (2018-2020)"]'::jsonb, 
  0, 45, true, true, 4.90, 28
),
(
  'Mrs. Sheetal Chauhan', 'Counselling Psychologist', 'female', 
  'Creating a safe, non-judgmental space is my priority. I help individuals understand their relationship patterns and develop healthier ways of connecting with others. Whether it is family dynamics or romantic relationships, we will work through it together.', 
  '#ec4899', 9, 
  '["M.Sc (Counseling Psychology)", "Certified Family Therapist"]'::jsonb, 
  '["English", "Hindi"]'::jsonb, 
  '["Relationship", "Family Conflict", "Stress"]'::jsonb, 
  '["Family Therapy", "Couples Therapy", "Humanistic"]'::jsonb, 
  '[]'::jsonb, 
  '["Lead Counselor at Harmony Family Clinic (2019-Present)", "Student Counselor at Delhi University (2015-2019)"]'::jsonb, 
  0, 45, true, true, 4.95, 254
),
(
  'Dr. Rahul Sharma', 'Psychiatrist', 'male', 
  'I provide comprehensive psychiatric evaluation and medication management, combined with therapeutic support. I believe in a holistic approach, often collaborating with psychologists to ensure you get the most complete care possible for complex mental health conditions.', 
  '#3b82f6', 12, 
  '["MD (Psychiatry)", "MBBS"]'::jsonb, 
  '["English", "Hindi", "Punjabi"]'::jsonb, 
  '["Severe Depression", "Bipolar Disorder", "ADHD"]'::jsonb, 
  '["Psychopharmacology", "CBT"]'::jsonb, 
  '["Excellence in Psychiatric Care 2020"]'::jsonb, 
  '["Consultant Psychiatrist at City Hospital (2016-Present)", "Resident Psychiatrist at AIIMS (2012-2016)"]'::jsonb, 
  0, 45, true, false, 4.75, 189
),
(
  'Ms. Priya Nair', 'Trauma Specialist', 'female', 
  'Healing from trauma requires time, patience, and specialized care. I use evidence-based approaches like EMDR to help your brain reprocess difficult memories so they no longer control your present life. You deserve to feel safe in your own body.', 
  '#8b5cf6', 8, 
  '["M.A (Clinical Psychology)", "EMDR Certified Practitioner"]'::jsonb, 
  '["English", "Malayalam"]'::jsonb, 
  '["PTSD", "Childhood Trauma", "Grief"]'::jsonb, 
  '["EMDR", "Trauma-Informed Care", "Somatic Experiencing"]'::jsonb, 
  '[]'::jsonb, 
  '["Trauma Specialist at Healing Paths Center (2018-Present)", "Crisis Counselor at Women''s Help Network (2016-2018)"]'::jsonb, 
  0, 45, true, true, 4.98, 112
);

-- Seed availability slots (Mon-Fri) for all the inserted experts
DO $$ 
DECLARE
    expert RECORD;
    day INT;
BEGIN
    FOR expert IN SELECT id FROM experts LOOP
        FOR day IN 1..5 LOOP
            INSERT INTO expert_availability (expert_id, day_of_week, start_time, end_time) VALUES
                (expert.id, day, '10:00:00', '11:00:00'),
                (expert.id, day, '12:00:00', '13:00:00'),
                (expert.id, day, '15:00:00', '16:00:00'),
                (expert.id, day, '17:00:00', '18:00:00');
        END LOOP;
    END LOOP;
END $$;
