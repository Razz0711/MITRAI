import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load env vars
dotenv.config({ path: resolve(process.cwd(), '.env.local') });
dotenv.config({ path: resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const experts = [
  {
    name: 'Dr. Lekha Murali',
    title: 'Counselling Psychologist',
    experience: '16 Years of Exp',
    languages: ['Telugu', 'English', 'Hindi', 'Tamil', 'Kannada'],
    rating: 4.88,
    reviews: '315',
    expertise: ['Anxiety', 'Depression', 'Stress', 'Relationships'],
    specializations: ['CBT', 'REBT', 'Client Centered', 'Psychoanalysis'],
    avatar: '#e879a0',
    about: 'I am a passionate and dedicated Counselling Psychologist. I strongly believe that positive mental and emotional health is a prerequisite to happiness and success. My goal is to empower youths to overcome their problems and focus continuously on self-improvement.',
    qualifications: ['M.Phil (Clinical Psychology)', 'M.Sc (Psychology)', 'B.A (Psychology)'],
    awards: ['Best Psychologist Award 2021', 'Community Service Excellence'],
    workExperience: [
      'Senior Psychologist at Mind Wellness Clinic (2018-Present)',
      'Clinical Psychologist at Apollo Hospitals (2012-2018)',
      'Counselor at University Health Center (2008-2012)'
    ]
  },
  {
    name: 'Mr. Utkarsh Yadav',
    title: 'Clinical Psychologist',
    experience: '6 Years of Exp',
    languages: ['English', 'Hindi', 'Marathi'],
    rating: 4.90,
    reviews: '28',
    expertise: ['Career', 'Self Esteem', 'Adjustment Issues'],
    specializations: ['CBT', 'ACT', 'Solution Focused'],
    avatar: '#6366f1',
    about: 'I specialize in helping young adults navigate career transitions and build self-esteem. My approach is practical and goal-oriented. We will work as a team to uncover your strengths and build resilience for the challenges you face in college and beyond.',
    qualifications: ['M.A (Clinical Psychology)', 'PG Diploma in Counseling'],
    awards: ['Young Achiever Award 2022'],
    workExperience: [
      'Clinical Psychologist at Student Success Center (2020-Present)',
      'Counseling Assistant at Mental Health Foundation (2018-2020)'
    ]
  },
  {
    name: 'Mrs. Sheetal Chauhan',
    title: 'Counselling Psychologist',
    experience: '9 Years of Exp',
    languages: ['English', 'Hindi'],
    rating: 4.95,
    reviews: '254',
    expertise: ['Relationship', 'Family Conflict', 'Stress'],
    specializations: ['Family Therapy', 'Couples Therapy', 'Humanistic'],
    avatar: '#ec4899',
    about: 'Creating a safe, non-judgmental space is my priority. I help individuals understand their relationship patterns and develop healthier ways of connecting with others. Whether it is family dynamics or romantic relationships, we will work through it together.',
    qualifications: ['M.Sc (Counseling Psychology)', 'Certified Family Therapist'],
    awards: [],
    workExperience: [
      'Lead Counselor at Harmony Family Clinic (2019-Present)',
      'Student Counselor at Delhi University (2015-2019)'
    ]
  },
  {
    name: 'Dr. Rahul Sharma',
    title: 'Psychiatrist',
    experience: '12 Years of Exp',
    languages: ['English', 'Hindi', 'Punjabi'],
    rating: 4.75,
    reviews: '189',
    expertise: ['Severe Depression', 'Bipolar Disorder', 'ADHD'],
    specializations: ['Psychopharmacology', 'CBT'],
    avatar: '#3b82f6',
    about: 'I provide comprehensive psychiatric evaluation and medication management, combined with therapeutic support. I believe in a holistic approach, often collaborating with psychologists to ensure you get the most complete care possible for complex mental health conditions.',
    qualifications: ['MD (Psychiatry)', 'MBBS'],
    awards: ['Excellence in Psychiatric Care 2020'],
    workExperience: [
      'Consultant Psychiatrist at City Hospital (2016-Present)',
      'Resident Psychiatrist at AIIMS (2012-2016)'
    ]
  },
  {
    name: 'Ms. Priya Nair',
    title: 'Trauma Specialist',
    experience: '8 Years of Exp',
    languages: ['English', 'Malayalam'],
    rating: 4.98,
    reviews: '112',
    expertise: ['PTSD', 'Childhood Trauma', 'Grief'],
    specializations: ['EMDR', 'Trauma-Informed Care', 'Somatic Experiencing'],
    avatar: '#8b5cf6',
    about: 'Healing from trauma requires time, patience, and specialized care. I use evidence-based approaches like EMDR to help your brain reprocess difficult memories so they no longer control your present life. You deserve to feel safe in your own body.',
    qualifications: ['M.A (Clinical Psychology)', 'EMDR Certified Practitioner'],
    awards: [],
    workExperience: [
      'Trauma Specialist at Healing Paths Center (2018-Present)',
      'Crisis Counselor at Women\'s Help Network (2016-2018)'
    ]
  }
];

async function seed() {
  console.log('Starting seed...');
  for (const exp of experts) {
    const { data: expertRecord, error: expertError } = await supabase
      .from('experts')
      .insert({
        name: exp.name,
        title: exp.title,
        gender: 'female',
        about: exp.about,
        avatar_url: exp.avatar,
        experience_years: parseInt(exp.experience.split(' ')[0]) || 5,
        qualifications: exp.qualifications,
        languages: exp.languages,
        expertise: exp.expertise,
        specializations: exp.specializations,
        awards: exp.awards,
        work_experience: exp.workExperience,
        price_per_session: 0,
        session_duration_mins: 45,
        is_active: true,
        is_featured: exp.rating > 4.8,
        rating: exp.rating,
        review_count: parseInt(exp.reviews),
      })
      .select('id')
      .single();

    if (expertError) {
      console.error('Failed to insert expert:', exp.name, expertError.message);
      continue;
    }

    if (expertRecord) {
      const defaultSlots = [];
      for (let day = 1; day <= 5; day++) {
        defaultSlots.push({ expert_id: expertRecord.id, day_of_week: day, start_time: '10:00', end_time: '11:00' });
        defaultSlots.push({ expert_id: expertRecord.id, day_of_week: day, start_time: '12:00', end_time: '13:00' });
        defaultSlots.push({ expert_id: expertRecord.id, day_of_week: day, start_time: '15:00', end_time: '16:00' });
        defaultSlots.push({ expert_id: expertRecord.id, day_of_week: day, start_time: '17:00', end_time: '18:00' });
      }
      const { error: slotError } = await supabase.from('expert_availability').insert(defaultSlots);
      if (slotError) console.error('Failed to insert slots for', exp.name, slotError.message);
    }
    console.log(`Successfully seeded ${exp.name}`);
  }
  console.log('Seed complete!');
}

seed();
