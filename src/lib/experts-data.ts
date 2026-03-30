// ============================================
// MitrRAI - Mental Health Experts Directory
// Static data for therapist listing
// ============================================

export interface Expert {
  id: string;
  name: string;
  title: string;
  experience: string;
  qualifications: string[];
  rating: number;
  reviews: number;
  languages: string[];
  expertise: string[];
  specializations: string[];
  about: string;
  awards: string[];
  workExperience: string[];
  avatar: string; // gradient color fallback
  gender: 'male' | 'female';
  bookingUrl?: string;
}

export const EXPERTS: Expert[] = [
  {
    id: 'dr-lekha-murali',
    name: 'Dr. Lekha Murali',
    title: 'Counselling Psychologist',
    experience: '16 Years of Exp',
    qualifications: ['M.Sc', 'Ph.D', 'BSC in Psychology', 'Certificate in MS in Guidance and Counseling', 'MSC in Applied Psychology', 'PGDIPLOMA in Guidance and Counseling', 'PHD in Psychology'],
    rating: 4.7,
    reviews: 22,
    languages: ['English', 'Malayalam', 'Tamil'],
    expertise: ['Adjustment Disorder', 'Anger', 'Anxiety', 'Assertiveness', 'Body Image', 'Breakup', 'Depression', 'Stress Management', 'Self Esteem'],
    specializations: ['Accelerated Experiential Dynamic', 'Acceptance And Commitment Therapy', 'Adlerian Therapy', 'Anger Management Therapy', 'Attachment Therapy', 'Cognitive Behaviour Therapy'],
    about: 'As a psychologist, I feel that counselling can assist a person in developing a broader perspective to view problems and assess their inner resources appropriately. Since childhood, I have had a helping nature.',
    awards: ['Cognitive Behaviour Therapy at Psychosocial Rehabilitation Centre, 2009', 'Psychodiagnostics at Dr. Chandra Mohan - Chair Person, 2009'],
    workExperience: ['De-addiction Counsellor at Rebirth De-Addiction Centre (2008-2013)', 'Managing Director / Counsellor at Honey Naturopathy Hospitals Pvt Ltd (2013-2015)', 'Counsellor at SSSMC & RI (2015-2019)', 'Associate Regional Counseling Head at IMINDGO (2019-2020)', 'Clinical Counsellor at Davman Technology Services Pvt Ltd (2020-2024)', 'Online Counselling Platform (2024-present)'],
    avatar: '#e879a0',
    gender: 'female',
  },
  {
    id: 'mr-utkarsh-yadav',
    name: 'Mr. Utkarsh Yadav',
    title: 'Counselling Psychologist',
    experience: '3 Years of Exp',
    qualifications: ['MA', 'MBA'],
    rating: 4.7,
    reviews: 133,
    languages: ['English', 'Hindi'],
    expertise: ['Anxiety', 'Depression', 'Stress Management', 'Career Counseling', 'Relationship Issues', 'Self Esteem', 'Academic Pressure', 'Social Anxiety'],
    specializations: ['Cognitive Behaviour Therapy', 'Solution-Focused Brief Therapy', 'Motivational Interviewing', 'Mindfulness-Based Therapy'],
    about: 'A compassionate counselling psychologist dedicated to helping young adults navigate academic stress, career confusion, and emotional challenges with evidence-based therapeutic approaches.',
    awards: [],
    workExperience: ['Counselling Psychologist at Private Practice (2021-present)', 'Campus Counsellor at University Mental Health Center (2022-2023)'],
    avatar: '#6366f1',
    gender: 'male',
  },
  {
    id: 'mrs-sheetal-chauhan',
    name: 'Mrs. Sheetal Chauhan',
    title: 'Counselling Psychologist',
    experience: '4 Years of Exp',
    qualifications: ['MA in Psychology', 'Diploma in Counselling'],
    rating: 4.5,
    reviews: 87,
    languages: ['English', 'Hindi', 'Punjabi'],
    expertise: ['Anxiety', 'Depression', 'Relationship Issues', 'Family Therapy', 'Grief Counseling', 'Women Issues', 'Body Image', 'PTSD'],
    specializations: ['Person-Centered Therapy', 'Cognitive Behaviour Therapy', 'Narrative Therapy', 'Art Therapy'],
    about: 'A warm and empathetic counselling psychologist who believes in creating a safe, non-judgmental space for healing. Specializes in helping individuals navigate emotional challenges with compassion.',
    awards: ['Best Young Counsellor Award, 2023'],
    workExperience: ['Counselling Psychologist at District Mental Health Centre (2020-2022)', 'Therapist at Private Practice (2022-present)'],
    avatar: '#ec4899',
    gender: 'female',
  },
  {
    id: 'dr-rahul-sharma',
    name: 'Dr. Rahul Sharma',
    title: 'Clinical Psychologist',
    experience: '8 Years of Exp',
    qualifications: ['M.Phil in Clinical Psychology', 'Ph.D in Psychology', 'RCI Licensed'],
    rating: 4.8,
    reviews: 215,
    languages: ['English', 'Hindi'],
    expertise: ['OCD', 'Anxiety Disorders', 'Depression', 'Bipolar Disorder', 'ADHD', 'Personality Disorders', 'Trauma', 'Addiction'],
    specializations: ['Cognitive Behaviour Therapy', 'Dialectical Behavior Therapy', 'EMDR', 'Psychodynamic Therapy', 'Exposure and Response Prevention'],
    about: 'An RCI-licensed clinical psychologist with extensive experience in treating complex mental health conditions. Believes in an integrative approach combining evidence-based techniques with compassionate care.',
    awards: ['Best Paper Award at National Psychology Conference, 2020', 'Young Researcher Award, Indian Psychological Association, 2019'],
    workExperience: ['Clinical Psychologist at NIMHANS (2016-2019)', 'Senior Psychologist at Fortis Hospital (2019-2022)', 'Private Practice & Online Consultations (2022-present)'],
    avatar: '#3b82f6',
    gender: 'male',
  },
  {
    id: 'ms-priya-nair',
    name: 'Ms. Priya Nair',
    title: 'Counselling Psychologist',
    experience: '5 Years of Exp',
    qualifications: ['MA in Clinical Psychology', 'Certified CBT Practitioner'],
    rating: 4.6,
    reviews: 94,
    languages: ['English', 'Hindi', 'Malayalam'],
    expertise: ['Student Stress', 'Exam Anxiety', 'Social Anxiety', 'Self Confidence', 'Loneliness', 'Time Management', 'Career Guidance', 'Peer Pressure'],
    specializations: ['Cognitive Behaviour Therapy', 'Acceptance And Commitment Therapy', 'Mindfulness-Based Stress Reduction', 'Positive Psychology'],
    about: 'Specializes in working with college students and young professionals dealing with academic pressure, career anxiety, and identity exploration. Creates a warm and relatable therapeutic space.',
    awards: [],
    workExperience: ['Student Counsellor at IIT Delhi (2019-2021)', 'Therapist at MindPeers (2021-2023)', 'Independent Practice (2023-present)'],
    avatar: '#8b5cf6',
    gender: 'female',
  },
];

export function getExpertById(id: string): Expert | undefined {
  return EXPERTS.find(e => e.id === id);
}
