// ============================================
// MitrAI - Study Rooms Page
// Browse & create study rooms
// ============================================

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import LoadingSkeleton from '@/components/LoadingSkeleton';

interface StudyRoom {
  id: string;
  name: string;
  topic: string;
  description: string;
  circleId: string;
  creatorId: string;
  maxMembers: number;
  status: string;
  createdAt: string;
}

interface Circle {
  id: string;
  name: string;
  emoji: string;
  color: string;
}

export default function RoomsPage() {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<StudyRoom[]>([]);
  const [myRooms, setMyRooms] = useState<StudyRoom[]>([]);
  const [circles, setCircles] = useState<Circle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [tab, setTab] = useState<'all' | 'mine'>('all');

  // Create form
  const [roomName, setRoomName] = useState('');
  const [roomTopic, setRoomTopic] = useState('');
  const [roomDesc, setRoomDesc] = useState('');
  const [roomMax, setRoomMax] = useState(5);
  const [roomCircle, setRoomCircle] = useState('');
  const [creating, setCreating] = useState(false);

  const loadRooms = useCallback(async () => {
    if (!user) return;
    try {
      const [allRes, myRes, circlesRes] = await Promise.all([
        fetch('/api/rooms'),
        fetch(`/api/rooms?filter=mine&userId=${user.id}`),
        fetch(`/api/circles?userId=${user.id}`),
      ]);
      const allData = await allRes.json();
      const myData = await myRes.json();
      const circlesData = await circlesRes.json();
      if (allData.success) setRooms(allData.data.rooms || []);
      if (myData.success) setMyRooms(myData.data.rooms || []);
      if (circlesData.success) setCircles(circlesData.data.circles || []);
    } catch (err) {
      console.error('loadRooms:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  const handleCreate = async () => {
    if (!user || !roomName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: roomName,
          topic: roomTopic,
          description: roomDesc,
          creatorId: user.id,
          creatorName: user.email?.split('@')[0] || 'Student',
          maxMembers: roomMax,
          circleId: roomCircle || '',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowCreate(false);
        setRoomName('');
        setRoomTopic('');
        setRoomDesc('');
        setRoomMax(5);
        setRoomCircle('');
        await loadRooms();
      }
    } catch (err) {
      console.error('createRoom:', err);
    } finally {
      setCreating(false);
    }
  };

  if (loading) return <LoadingSkeleton />;

  const displayRooms = tab === 'mine' ? myRooms : rooms;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold dark:text-white">📚 Study Rooms</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Collaborate in small groups and study together
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/dashboard"
            className="text-sm text-indigo-600 hover:underline dark:text-indigo-400"
          >
            ← Dashboard
          </Link>
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700"
          >
            + Create Room
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b dark:border-gray-700 pb-2">
        <button
          onClick={() => setTab('all')}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg ${
            tab === 'all'
              ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
          }`}
        >
          All Rooms ({rooms.length})
        </button>
        <button
          onClick={() => setTab('mine')}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg ${
            tab === 'mine'
              ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
          }`}
        >
          My Rooms ({myRooms.length})
        </button>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl p-6 w-full max-w-md space-y-4">
            <h2 className="text-xl font-bold">Create Study Room</h2>
            <input
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="Room Name (e.g., DSA Practice)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-white placeholder-gray-400"
            />
            <input
              value={roomTopic}
              onChange={(e) => setRoomTopic(e.target.value)}
              placeholder="Topic (e.g., Arrays & Linked Lists)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-white placeholder-gray-400"
            />
            <textarea
              value={roomDesc}
              onChange={(e) => setRoomDesc(e.target.value)}
              placeholder="Description (optional)"
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-white placeholder-gray-400"
            />
            <div className="flex items-center gap-3">
              <label className="text-sm text-gray-700 dark:text-gray-300">Max Members:</label>
              <select
                value={roomMax}
                onChange={(e) => setRoomMax(Number(e.target.value))}
                className="px-3 py-1.5 border border-gray-300 rounded-lg bg-white text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                {[2, 3, 4, 5, 6, 8, 10].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-700 dark:text-gray-300 mb-1 block">Circle (optional):</label>
              <select
                value={roomCircle}
                onChange={(e) => setRoomCircle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
              >
                <option value="">No circle</option>
                {circles.map((c) => (
                  <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleCreate}
                disabled={creating || !roomName.trim()}
                className="flex-1 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium"
              >
                {creating ? 'Creating...' : 'Create Room'}
              </button>
              <button
                onClick={() => setShowCreate(false)}
                className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Room List */}
      {displayRooms.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-4xl mb-3">📂</p>
          <p>No rooms yet. Be the first to create one!</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {displayRooms.map((room) => (
            <Link
              key={room.id}
              href={`/rooms/${room.id}`}
              className="block rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-lg transition-all dark:bg-gray-800"
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-bold text-lg dark:text-white">{room.name}</h3>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    room.status === 'active'
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                  }`}
                >
                  {room.status}
                </span>
              </div>
              {room.topic && (
                <p className="text-sm text-indigo-600 dark:text-indigo-400 mb-1">
                  📋 {room.topic}
                </p>
              )}
              {room.description && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                  {room.description}
                </p>
              )}
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>Max {room.maxMembers} members</span>
                <span>{new Date(room.createdAt).toLocaleDateString()}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
