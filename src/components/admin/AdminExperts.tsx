'use client';

import { useState, useEffect, useCallback } from 'react';

interface Expert {
  id: string;
  name: string;
  title: string;
  is_active: boolean;
  price_per_session: number;
  session_duration_mins: number;
  about?: string;
  qualifications?: string[];
  languages?: string[];
  expertise?: string[];
  specializations?: string[];
  work_experience?: string[];
  awards?: string[];
  avatar_url?: string;
}

export default function AdminExperts({ adminKey }: { adminKey: string }) {
  const [experts, setExperts] = useState<Expert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [isEditing, setIsEditing] = useState(false);
  const [editExpert, setEditExpert] = useState<Partial<Expert>>({});
  const [actionMsg, setActionMsg] = useState('');

  const fetchExperts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/experts?adminKey=${encodeURIComponent(adminKey)}&all=true`);
      const { data, error, success } = await res.json();
      if (!success) throw new Error(error);
      setExperts(data || []);
    } catch {
      setError('Failed to fetch experts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExperts();
  }, [fetchExperts]);

  const handleSave = async () => {
    setActionMsg('');
    try {
      const url = editExpert.id 
        ? `/api/experts/${editExpert.id}?adminKey=${encodeURIComponent(adminKey)}`
        : `/api/experts?adminKey=${encodeURIComponent(adminKey)}`;
      
      const method = editExpert.id ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editExpert),
      });

      const data = await res.json();
      if (data.success) {
        setActionMsg('Saved successfully!');
        setIsEditing(false);
        fetchExperts();
      } else {
        setActionMsg(data.error || 'Failed to save');
      }
    } catch {
      setActionMsg('Network error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to deactivate this expert?')) return;
    try {
      const res = await fetch(`/api/experts/${id}?adminKey=${encodeURIComponent(adminKey)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setActionMsg('Expert deactivated');
        fetchExperts();
      } else {
        setActionMsg(data.error || 'Failed to delete');
      }
    } catch {
      setActionMsg('Network error');
    }
  };

  return (
    <section className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-[var(--foreground)]">Experts Management ({experts.length})</h2>
        <button 
          onClick={() => {
            setEditExpert({
              name: '', title: 'Counselling Psychologist', price_per_session: 0, session_duration_mins: 45
            });
            setIsEditing(true);
          }} 
          className="btn-primary text-xs py-1.5 px-3"
        >
          + Add Expert
        </button>
      </div>

      {actionMsg && <p className="text-xs text-amber-400 mb-2">{actionMsg}</p>}

      {isEditing ? (
        <div className="card p-4 space-y-3 mb-4 border border-[var(--primary)]/30 max-h-[70vh] overflow-y-auto custom-scrollbar">
          <h3 className="text-xs font-bold text-[var(--primary)]">{editExpert.id ? 'Edit Expert' : 'New Expert'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-[var(--muted)]">Name</label>
              <input type="text" value={editExpert.name || ''} onChange={e => setEditExpert({...editExpert, name: e.target.value})} className="input-field text-xs py-1.5" />
            </div>
            <div>
              <label className="text-[10px] text-[var(--muted)]">Title</label>
              <input type="text" value={editExpert.title || ''} onChange={e => setEditExpert({...editExpert, title: e.target.value})} className="input-field text-xs py-1.5" />
            </div>
            <div>
              <label className="text-[10px] text-[var(--muted)]">Price per session (₹)</label>
              <input type="number" value={editExpert.price_per_session || 0} onChange={e => setEditExpert({...editExpert, price_per_session: Number(e.target.value)})} className="input-field text-xs py-1.5" />
            </div>
            <div>
              <label className="text-[10px] text-[var(--muted)]">Duration (mins)</label>
              <input type="number" value={editExpert.session_duration_mins || 45} onChange={e => setEditExpert({...editExpert, session_duration_mins: Number(e.target.value)})} className="input-field text-xs py-1.5" />
            </div>
            
            <div className="md:col-span-2">
              <label className="text-[10px] text-[var(--muted)]">About The Expert</label>
              <textarea value={editExpert.about || ''} onChange={e => setEditExpert({...editExpert, about: e.target.value})} className="input-field text-xs py-1.5 min-h-[60px]" placeholder="Detailed description..." />
            </div>
            
            <div>
              <label className="text-[10px] text-[var(--muted)]">Platform Avatar URL / Color Hash</label>
              <input type="text" value={editExpert.avatar_url || ''} onChange={e => setEditExpert({...editExpert, avatar_url: e.target.value})} className="input-field text-xs py-1.5" placeholder="#hex or https://..." />
            </div>
            
            <div>
              <label className="text-[10px] text-[var(--muted)]">Qualifications (comma separated)</label>
              <input type="text" value={editExpert.qualifications?.join(', ') || ''} onChange={e => setEditExpert({...editExpert, qualifications: e.target.value.split(',').map(s=>s.trim()).filter(Boolean)})} className="input-field text-xs py-1.5" placeholder="MSc Psychology, Ph.D..." />
            </div>
            
            <div>
              <label className="text-[10px] text-[var(--muted)]">Languages (comma separated)</label>
              <input type="text" value={editExpert.languages?.join(', ') || ''} onChange={e => setEditExpert({...editExpert, languages: e.target.value.split(',').map(s=>s.trim()).filter(Boolean)})} className="input-field text-xs py-1.5" placeholder="English, Hindi, Telugu..." />
            </div>
            
            <div>
              <label className="text-[10px] text-[var(--muted)]">Expertise / Tags (comma separated)</label>
              <input type="text" value={editExpert.expertise?.join(', ') || ''} onChange={e => setEditExpert({...editExpert, expertise: e.target.value.split(',').map(s=>s.trim()).filter(Boolean)})} className="input-field text-xs py-1.5" placeholder="Anxiety, Stress, Career..." />
            </div>
            
            <div className="md:col-span-2">
              <label className="text-[10px] text-[var(--muted)]">Specializations (comma separated)</label>
              <input type="text" value={editExpert.specializations?.join(', ') || ''} onChange={e => setEditExpert({...editExpert, specializations: e.target.value.split(',').map(s=>s.trim()).filter(Boolean)})} className="input-field text-xs py-1.5" placeholder="CBT, Humanistic Therapy..." />
            </div>
            
            <div className="md:col-span-2">
              <label className="text-[10px] text-[var(--muted)]">Work Experience (newline separated)</label>
              <textarea value={editExpert.work_experience?.join('\n') || ''} onChange={e => setEditExpert({...editExpert, work_experience: e.target.value.split('\n').filter(Boolean)})} className="input-field text-xs py-1.5 min-h-[60px]" placeholder="Therapist at Clinic XYZ (2020-2023)..." />
            </div>

            <div className="md:col-span-2">
              <label className="text-[10px] text-[var(--muted)]">Awards & Recognitions (newline separated)</label>
              <textarea value={editExpert.awards?.join('\n') || ''} onChange={e => setEditExpert({...editExpert, awards: e.target.value.split('\n').filter(Boolean)})} className="input-field text-xs py-1.5 min-h-[60px]" placeholder="Best Counselor 2022..." />
            </div>
          </div>
          
          <div className="flex justify-end gap-2 mt-4 pt-2 border-t border-[var(--border)]">
            <button onClick={() => setIsEditing(false)} className="btn-secondary text-xs px-4 py-1.5">Cancel</button>
            <button onClick={handleSave} className="btn-primary text-xs px-4 py-1.5">Save Profile</button>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          {loading ? (
            <p className="text-xs text-[var(--muted)] py-4 text-center">Loading experts...</p>
          ) : error ? (
            <p className="text-xs text-red-400 py-4 text-center">{error}</p>
          ) : (
            <table className="w-full text-xs bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden">
              <thead>
                <tr className="text-left text-[var(--muted)] border-b border-[var(--border)] bg-black/10">
                  <th className="py-2.5 px-3">Name</th>
                  <th className="py-2.5 px-3">Title</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {experts.map(exp => (
                  <tr key={exp.id} className="border-b border-[var(--border)]/50 hover:bg-white/[0.02]">
                    <td className="py-2 px-3 font-medium text-[var(--foreground)]">{exp.name}</td>
                    <td className="py-2 px-3 text-[var(--muted)]">{exp.title}</td>
                    <td className="py-2 px-3">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] ${exp.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {exp.is_active ? 'Active' : 'Hidden'}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right space-x-2">
                      <button onClick={() => { setEditExpert(exp); setIsEditing(true); }} className="text-[var(--primary)] hover:underline">Edit</button>
                      {exp.is_active && (
                        <button onClick={() => handleDelete(exp.id)} className="text-red-400 hover:underline">Hide</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </section>
  );
}
