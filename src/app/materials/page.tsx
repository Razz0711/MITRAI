// ============================================
// MitrAI - Study Materials Page
// ============================================

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { StudyMaterial, MaterialType } from '@/lib/types';
import LoadingSkeleton from '@/components/LoadingSkeleton';

const DEPARTMENTS = [
  'CSE', 'AI', 'Mechanical', 'Civil', 'Electrical', 'Electronics',
  'Chemical', 'Integrated M.Sc. Mathematics', 'Integrated M.Sc. Physics',
  'Integrated M.Sc. Chemistry', 'B.Tech Physics', 'Mathematics & Computing',
];

const MATERIAL_TYPES: { value: MaterialType; label: string }[] = [
  { value: 'question-paper', label: 'Question Paper' },
  { value: 'notes', label: 'Notes' },
  { value: 'assignment', label: 'Assignment' },
  { value: 'reference', label: 'Reference Material' },
  { value: 'other', label: 'Other' },
];

const YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year'];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getTypeColor(type: MaterialType): string {
  const colors: Record<MaterialType, string> = {
    'question-paper': 'bg-red-500/20 text-red-400',
    'notes': 'bg-blue-500/20 text-blue-400',
    'assignment': 'bg-yellow-500/20 text-yellow-400',
    'reference': 'bg-green-500/20 text-green-400',
    'other': 'bg-gray-500/20 text-gray-400',
  };
  return colors[type] || colors.other;
}

function getTypeIcon(type: MaterialType): string {
  const icons: Record<MaterialType, string> = {
    'question-paper': '📝',
    'notes': '📒',
    'assignment': '📋',
    'reference': '📚',
    'other': '📄',
  };
  return icons[type] || '📄';
}

export default function MaterialsPage() {
  const { user } = useAuth();
  const router = useRouter();

  // Upload form state
  const [showUpload, setShowUpload] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [department, setDepartment] = useState('');
  const [yearLevel, setYearLevel] = useState('');
  const [subject, setSubject] = useState('');
  const [materialType, setMaterialType] = useState<MaterialType>('notes');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');

  // List state
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDept, setFilterDept] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterYear, setFilterYear] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchMaterials = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterDept !== 'all') params.set('department', filterDept);
      if (filterType !== 'all') params.set('type', filterType);
      if (filterYear !== 'all') params.set('year', filterYear);
      if (searchQuery) params.set('search', searchQuery);

      const res = await fetch(`/api/materials?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setMaterials(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch materials:', err);
    } finally {
      setLoading(false);
    }
  }, [filterDept, filterType, filterYear, searchQuery]);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    fetchMaterials();
  }, [user, router, fetchMaterials]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !user) return;

    setUploading(true);
    setUploadError('');
    setUploadSuccess('');

    try {
      // Step 1: Get a signed upload URL from our API (uses service role key on server)
      const urlRes = await fetch('/api/materials/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name }),
      });
      const urlData = await urlRes.json();
      if (!urlData.success) {
        setUploadError(`Upload setup failed: ${urlData.error}`);
        return;
      }

      // Step 2: Upload file directly to Supabase via the signed URL
      // This bypasses Vercel's 4.5MB body limit entirely
      const uploadRes = await fetch(urlData.signedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
        body: file,
      });

      if (!uploadRes.ok) {
        const errText = await uploadRes.text();
        console.error('[Upload] Signed URL upload failed:', uploadRes.status, errText);
        setUploadError(`File upload failed (${uploadRes.status}): ${errText}`);
        return;
      }

      // Step 3: Save material metadata via API
      const res = await fetch('/api/materials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          department,
          yearLevel,
          subject,
          type: materialType,
          uploadedBy: user.name,
          uploadedByEmail: user.email,
          fileName: file.name,
          fileSize: file.size,
          storedFileName: urlData.storedName,
        }),
      });

      let data;
      try {
        data = await res.json();
      } catch (err) {
        console.error('parseUploadResponse:', err);
        setUploadError(`Server error (${res.status}): ${res.statusText}`);
        return;
      }

      if (data.success) {
        setUploadSuccess('Material uploaded successfully!');
        setTitle('');
        setDescription('');
        setDepartment('');
        setYearLevel('');
        setSubject('');
        setMaterialType('notes');
        setFile(null);
        const fileInput = document.getElementById('file-input') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
        fetchMaterials();
        setTimeout(() => {
          setShowUpload(false);
          setUploadSuccess('');
        }, 1500);
      } else {
        setUploadError(data.error || 'Upload failed');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[Upload] Error:', msg);
      setUploadError(`Upload failed: ${msg}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = (material: StudyMaterial) => {
    window.open(`/api/materials/${material.id}/download`, '_blank');
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[var(--background)] pt-20 pb-10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl font-semibold text-[var(--foreground)]">Study Materials</h1>
            <p className="text-xs text-[var(--muted)] mt-1">
              Share and download question papers, notes & study resources
            </p>
          </div>
          <button
            onClick={() => setShowUpload(!showUpload)}
            className="btn-primary text-xs py-2 px-4 flex items-center gap-2"
          >
            {showUpload ? '✕ Cancel' : '+ Upload Material'}
          </button>
        </div>

        {/* Upload Form */}
        {showUpload && (
          <div className="card p-5 mb-6 fade-in">
            <h2 className="text-sm font-semibold text-[var(--foreground)] mb-4">Upload Study Material</h2>
            <form onSubmit={handleUpload} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-[var(--muted)] mb-1">Title *</label>
                  <input
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="e.g. DSA Mid-Sem Paper 2024"
                    required
                    className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-xs text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[var(--muted)] mb-1">Subject *</label>
                  <input
                    type="text"
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    placeholder="e.g. Data Structures & Algorithms"
                    required
                    className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-xs text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-[var(--muted)] mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Brief description about the material..."
                  rows={2}
                  className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-xs text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)] resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-[var(--muted)] mb-1">Department *</label>
                  <select
                    value={department}
                    onChange={e => setDepartment(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-xs text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)]"
                  >
                    <option value="">Select department</option>
                    {DEPARTMENTS.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[var(--muted)] mb-1">Year</label>
                  <select
                    value={yearLevel}
                    onChange={e => setYearLevel(e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-xs text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)]"
                  >
                    <option value="">Any year</option>
                    {YEARS.map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[var(--muted)] mb-1">Type *</label>
                  <select
                    value={materialType}
                    onChange={e => setMaterialType(e.target.value as MaterialType)}
                    required
                    className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-xs text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)]"
                  >
                    {MATERIAL_TYPES.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs text-[var(--muted)] mb-1">File * (Max 10MB)</label>
                <input
                  id="file-input"
                  type="file"
                  onChange={e => setFile(e.target.files?.[0] || null)}
                  required
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.png,.jpg,.jpeg,.zip"
                  className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-xs text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)] file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:bg-[var(--primary)] file:text-white file:cursor-pointer"
                />
                <p className="text-[10px] text-[var(--muted)] mt-1">
                  Supported: PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, TXT, PNG, JPG, ZIP
                </p>
              </div>

              {uploadError && (
                <p className="text-xs text-[var(--error)]">{uploadError}</p>
              )}
              {uploadSuccess && (
                <p className="text-xs text-green-400">{uploadSuccess}</p>
              )}

              <button
                type="submit"
                disabled={uploading || !file || !title || !department || !subject}
                className="btn-primary text-xs py-2 px-6 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? 'Uploading...' : 'Upload Material'}
              </button>
            </form>
          </div>
        )}

        {/* Filters */}
        <div className="card p-4 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by title, subject..."
              className="px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-xs text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)]"
            />
            <select
              value={filterDept}
              onChange={e => setFilterDept(e.target.value)}
              className="px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-xs text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)]"
            >
              <option value="all">All Departments</option>
              {DEPARTMENTS.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-xs text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)]"
            >
              <option value="all">All Types</option>
              {MATERIAL_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <select
              value={filterYear}
              onChange={e => setFilterYear(e.target.value)}
              className="px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-xs text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)]"
            >
              <option value="all">All Years</option>
              {YEARS.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Materials List */}
        {loading ? (
          <LoadingSkeleton type="materials" count={4} label="Loading materials..." />
        ) : materials.length === 0 ? (
          <div className="card p-12 text-center">
            <p className="text-3xl mb-3">📚</p>
            <p className="text-sm text-[var(--foreground)] font-medium">No materials found</p>
            <p className="text-xs text-[var(--muted)] mt-1">
              {searchQuery || filterDept !== 'all' || filterType !== 'all' || filterYear !== 'all'
                ? 'Try adjusting your filters'
                : 'Be the first to upload study materials!'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-[var(--muted)]">{materials.length} material{materials.length !== 1 ? 's' : ''} found</p>
            {materials.map(material => (
              <div key={material.id} className="card p-4 hover:border-[var(--primary)]/30 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="text-sm">{getTypeIcon(material.type)}</span>
                      <h3 className="text-sm font-medium text-[var(--foreground)] truncate">
                        {material.title}
                      </h3>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${getTypeColor(material.type)}`}>
                        {MATERIAL_TYPES.find(t => t.value === material.type)?.label || material.type}
                      </span>
                    </div>

                    {material.description && (
                      <p className="text-xs text-[var(--muted)] mb-2 line-clamp-2">{material.description}</p>
                    )}

                    <div className="flex items-center gap-3 flex-wrap text-[10px] text-[var(--muted)]">
                      <span className="bg-[var(--surface-light)] px-2 py-0.5 rounded">{material.department}</span>
                      <span className="bg-[var(--surface-light)] px-2 py-0.5 rounded">{material.subject}</span>
                      {material.yearLevel && (
                        <span className="bg-[var(--surface-light)] px-2 py-0.5 rounded">{material.yearLevel}</span>
                      )}
                      <span>by {material.uploadedBy}</span>
                      <span>{formatDate(material.createdAt)}</span>
                      <span>{formatFileSize(material.fileSize)}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDownload(material)}
                    className="btn-ghost text-xs py-1.5 px-3 flex items-center gap-1 shrink-0"
                    title={`Download ${material.fileName}`}
                  >
                    ↓ Download
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
