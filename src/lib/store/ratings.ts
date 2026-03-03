// ============================================
// MitrAI - Professor Ratings Store
// Multi-factor anonymous professor ratings
// ============================================

import { supabase } from './core';

export interface Professor {
  id: string;
  name: string;
  department: string;
  designation: string;
  createdAt: string;
}

export interface ProfessorRating {
  id: string;
  professorId: string;
  userId: string;
  teaching: number;
  grading: number;
  friendliness: number;
  material: number;
  comment: string;
  batchYear: string;
  department: string;
  createdAt: string;
}

export interface ProfessorWithStats {
  id: string;
  name: string;
  department: string;
  designation: string;
  avgTeaching: number;
  avgGrading: number;
  avgFriendliness: number;
  avgMaterial: number;
  avgOverall: number;
  totalRatings: number;
  batchBreakdown: Record<string, number>;
}

// ── helpers ──
function mapProf(r: Record<string, unknown>): Professor {
  return { id: r.id as string, name: r.name as string, department: r.department as string, designation: (r.designation || '') as string, createdAt: r.created_at as string };
}

function mapRating(r: Record<string, unknown>): ProfessorRating {
  return {
    id: r.id as string, professorId: r.professor_id as string, userId: r.user_id as string,
    teaching: r.teaching as number, grading: r.grading as number,
    friendliness: r.friendliness as number, material: r.material as number,
    comment: (r.comment || '') as string, batchYear: (r.batch_year || '') as string,
    department: (r.department || '') as string, createdAt: r.created_at as string,
  };
}

// ── Professors ──

export async function getProfessorsByDepartment(department: string): Promise<Professor[]> {
  const { data, error } = await supabase.from('professors').select('*').ilike('department', department).order('name');
  if (error) { console.error('getProfessorsByDepartment:', error); return []; }
  return (data || []).map(mapProf);
}

export async function searchProfessors(query: string): Promise<Professor[]> {
  const { data, error } = await supabase.from('professors').select('*').ilike('name', `%${query}%`).order('name').limit(30);
  if (error) { console.error('searchProfessors:', error); return []; }
  return (data || []).map(mapProf);
}

export async function createProfessor(name: string, department: string, designation?: string): Promise<Professor | null> {
  const { data, error } = await supabase
    .from('professors')
    .upsert({ name: name.trim(), department: department.trim(), designation: (designation || '').trim() }, { onConflict: 'name,department' })
    .select().single();
  if (error) { console.error('createProfessor:', error); return null; }
  return mapProf(data);
}

// ── Ratings ──

export async function getRatingsForProfessor(professorId: string): Promise<ProfessorRating[]> {
  const { data, error } = await supabase.from('professor_ratings').select('*').eq('professor_id', professorId).order('created_at', { ascending: false });
  if (error) { console.error('getRatingsForProfessor:', error); return []; }
  return (data || []).map(mapRating);
}

export async function submitRating(opts: {
  professorId: string; userId: string;
  teaching: number; grading: number; friendliness: number; material: number;
  comment: string; batchYear: string; department: string;
}): Promise<ProfessorRating | null> {
  const { data, error } = await supabase
    .from('professor_ratings')
    .upsert({
      professor_id: opts.professorId, user_id: opts.userId,
      teaching: opts.teaching, grading: opts.grading,
      friendliness: opts.friendliness, material: opts.material,
      comment: opts.comment, batch_year: opts.batchYear, department: opts.department,
    }, { onConflict: 'user_id,professor_id' })
    .select().single();
  if (error) { console.error('submitRating:', error); return null; }
  return mapRating(data);
}

export async function getUserRatingForProfessor(userId: string, professorId: string): Promise<ProfessorRating | null> {
  const { data, error } = await supabase.from('professor_ratings').select('*').eq('user_id', userId).eq('professor_id', professorId).single();
  if (error || !data) return null;
  return mapRating(data);
}

// ── Auto-seed data ──

const SEED_PROFESSORS: Record<string, { name: string; designation: string }[]> = {
  Mathematics: [
    { name: 'Dr. Jayesh M. Dhodiya', designation: 'HOD & Associate Professor' },
    { name: 'Dr. A. K. Shukla', designation: 'Professor' },
    { name: 'Dr. V. H. Pradhan', designation: 'Professor' },
    { name: 'Dr. Neeru Adlakha', designation: 'Professor' },
    { name: 'Dr. Sushil Kumar', designation: 'Professor' },
    { name: 'Dr. Ranjan Kumar Jana', designation: 'Associate Professor' },
    { name: 'Dr. Twinkle R. Singh', designation: 'Associate Professor' },
    { name: 'Dr. Ramakanta Meher', designation: 'Associate Professor' },
    { name: 'Indira P. Tripathi', designation: 'Assistant Professor' },
    { name: 'Dr. Shailesh Kumar Srivastava', designation: 'Assistant Professor' },
    { name: 'Dr. Raj Kamal Maurya', designation: 'Assistant Professor' },
    { name: 'Dr. Amit Sharma', designation: 'Assistant Professor' },
    { name: 'Dr. Sudeep Singh Sanga', designation: 'Assistant Professor' },
    { name: 'Dr. Saroj R. Yadav', designation: 'Assistant Professor' },
    { name: 'Dr. Sourav Gupta', designation: 'Assistant Professor' },
    { name: 'Dr. Shivam Bajpeyi', designation: 'Assistant Professor' },
  ],
};

async function seedDepartmentIfEmpty(department: string): Promise<void> {
  const seedList = SEED_PROFESSORS[department];
  if (!seedList) return;
  const rows = seedList.map(p => ({ name: p.name, department, designation: p.designation }));
  const { error } = await supabase.from('professors').upsert(rows, { onConflict: 'name,department' });
  if (error) console.error('seedDepartment:', error);
}

// ── Stats ──

export async function getProfessorsWithStats(department: string): Promise<ProfessorWithStats[]> {
  let profs = await getProfessorsByDepartment(department);
  if (profs.length === 0 && SEED_PROFESSORS[department]) {
    await seedDepartmentIfEmpty(department);
    profs = await getProfessorsByDepartment(department);
  }
  if (profs.length === 0) return [];
  return attachStats(profs);
}

export async function searchProfessorsWithStats(query: string): Promise<ProfessorWithStats[]> {
  const profs = await searchProfessors(query);
  if (profs.length === 0) return [];
  return attachStats(profs);
}

async function attachStats(profs: Professor[]): Promise<ProfessorWithStats[]> {
  const profIds = profs.map(p => p.id);
  const { data: allRatings, error } = await supabase
    .from('professor_ratings')
    .select('professor_id, teaching, grading, friendliness, material, batch_year')
    .in('professor_id', profIds);
  if (error) console.error('attachStats:', error);

  type StatBucket = { t: number; g: number; f: number; m: number; n: number; batches: Record<string, number> };
  const map: Record<string, StatBucket> = {};
  for (const r of (allRatings || [])) {
    const pid = r.professor_id as string;
    if (!map[pid]) map[pid] = { t: 0, g: 0, f: 0, m: 0, n: 0, batches: {} };
    map[pid].t += r.teaching as number;
    map[pid].g += r.grading as number;
    map[pid].f += r.friendliness as number;
    map[pid].m += r.material as number;
    map[pid].n++;
    const batch = (r.batch_year || 'Unknown') as string;
    map[pid].batches[batch] = (map[pid].batches[batch] || 0) + 1;
  }

  return profs.map(p => {
    const s = map[p.id] || { t: 0, g: 0, f: 0, m: 0, n: 0, batches: {} };
    const n = s.n || 1;
    const avg = (v: number) => Math.round((v / n) * 10) / 10;
    const aT = s.n ? avg(s.t) : 0, aG = s.n ? avg(s.g) : 0, aF = s.n ? avg(s.f) : 0, aM = s.n ? avg(s.m) : 0;
    return {
      id: p.id, name: p.name, department: p.department, designation: p.designation,
      avgTeaching: aT, avgGrading: aG, avgFriendliness: aF, avgMaterial: aM,
      avgOverall: s.n ? Math.round(((aT + aG + aF + aM) / 4) * 10) / 10 : 0,
      totalRatings: s.n, batchBreakdown: s.batches,
    };
  });
}
