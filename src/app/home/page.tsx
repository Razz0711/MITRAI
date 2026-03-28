// ============================================
// MitrrAi - Campus Feed (Home Page)
// Compose bar, tag picker, feed, filter sheet
// Zero seeded data — all from campus_posts table
// ============================================

'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type L from 'leaflet';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import Avatar from '@/components/Avatar';
import PostCard from '@/components/PostCard';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import { EmptyStatePreset } from '@/components/EmptyState';
import {
  Bell, X, Filter,
  MapPin,
  ChevronDown,
} from 'lucide-react';

/* ─── Map Picker Modal (Leaflet + GPS + Search) ─── */
interface SearchResult { display_name: string; lat: string; lon: string; }

function MapPickerModal({ onConfirm, onClose }: {
  onConfirm: (lat: number, lng: number) => void;
  onClose: () => void;
}) {
  const DEFAULT_LAT = 21.1648;
  const DEFAULT_LNG = 72.7868;

  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pinLat, setPinLat] = useState(DEFAULT_LAT);
  const [pinLng, setPinLng] = useState(DEFAULT_LNG);
  const [mapReady, setMapReady] = useState(false);
  const [detecting, setDetecting] = useState(true);
  const [gpsFound, setGpsFound] = useState(false);

  // Search state
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  // Move map + marker to a location with animation
  const flyTo = useCallback((lat: number, lng: number) => {
    setPinLat(lat);
    setPinLng(lng);
    if (leafletMap.current) leafletMap.current.flyTo([lat, lng], 17, { duration: 1.2 });
    if (markerRef.current) markerRef.current.setLatLng([lat, lng]);
  }, []);

  // GPS detection
  const detectLocation = useCallback(() => {
    if (!navigator.geolocation) { setDetecting(false); return; }
    setDetecting(true);
    setGpsFound(false);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        flyTo(pos.coords.latitude, pos.coords.longitude);
        setDetecting(false);
        setGpsFound(true);
      },
      () => {
        fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(5000) })
          .then(r => r.json())
          .then(data => { if (data.latitude && data.longitude) flyTo(data.latitude, data.longitude); })
          .catch(() => {})
          .finally(() => setDetecting(false));
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 30000 }
    );
  }, [flyTo]);

  // Search places via Nominatim
  const searchPlaces = useCallback((q: string) => {
    if (q.length < 2) { setResults([]); setShowResults(false); return; }
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&countrycodes=in`,
          { headers: { 'Accept-Language': 'en' } }
        );
        const data: SearchResult[] = await res.json();
        setResults(data);
        setShowResults(data.length > 0);
      } catch { setResults([]); }
      setSearching(false);
    }, 400); // debounce 400ms
  }, []);

  // Init Leaflet map
  useEffect(() => {
    if (!mapRef.current || leafletMap.current) return;
    let cancelled = false;

    (async () => {
      const Leaf = (await import('leaflet')).default;

      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
        await new Promise(r => setTimeout(r, 300));
      }
      if (cancelled || !mapRef.current) return;

      const map = Leaf.map(mapRef.current, {
        center: [DEFAULT_LAT, DEFAULT_LNG],
        zoom: 15,
        zoomControl: false,
        attributionControl: false,
      });

      Leaf.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

      const icon = Leaf.divIcon({
        html: '<div style="font-size:40px;filter:drop-shadow(0 3px 6px rgba(0,0,0,0.5));line-height:1">📍</div>',
        iconSize: [40, 40], iconAnchor: [20, 40], className: '',
      });

      const marker = Leaf.marker([DEFAULT_LAT, DEFAULT_LNG], { icon, draggable: true }).addTo(map);
      markerRef.current = marker;

      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        setPinLat(pos.lat); setPinLng(pos.lng);
      });
      map.on('click', (e: L.LeafletMouseEvent) => {
        marker.setLatLng(e.latlng);
        setPinLat(e.latlng.lat); setPinLng(e.latlng.lng);
      });

      Leaf.control.zoom({ position: 'bottomright' }).addTo(map);
      leafletMap.current = map;
      setMapReady(true);
      setTimeout(() => map.invalidateSize(), 300);
    })();

    return () => { cancelled = true; if (leafletMap.current) { leafletMap.current.remove(); leafletMap.current = null; } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Start GPS detection once map is ready
  useEffect(() => { if (mapReady) detectLocation(); }, [mapReady, detectLocation]);

  return (
    <div className="fixed inset-0 z-[99] flex flex-col" style={{ background: '#000' }}>
      {/* Header with close */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-black" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.5rem)' }}>
        <h2 className="text-white font-bold text-base">📍 Set Your Location</h2>
        <button onClick={onClose} className="text-white/50 hover:text-white text-2xl px-2">×</button>
      </div>

      {/* Search bar */}
      <div className="px-3 pb-2 bg-black relative z-[1001]">
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); searchPlaces(e.target.value); }}
            onFocus={() => results.length > 0 && setShowResults(true)}
            placeholder="Search for your college, hostel, area..."
            className="w-full py-2.5 pl-9 pr-9 rounded-xl text-sm text-white placeholder:text-white/40 outline-none"
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
          />
          {/* Search icon */}
          <svg className="absolute left-3 top-1/2 -translate-y-1/2" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          {/* Clear button */}
          {query && (
            <button onClick={() => { setQuery(''); setResults([]); setShowResults(false); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white text-sm">✕</button>
          )}
          {searching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
          )}
        </div>

        {/* Search results dropdown */}
        {showResults && results.length > 0 && (
          <div className="absolute left-3 right-3 top-full mt-1 rounded-xl overflow-hidden shadow-2xl" style={{ background: 'rgba(20,20,30,0.98)', border: '1px solid rgba(255,255,255,0.1)', maxHeight: '240px', overflowY: 'auto' }}>
            {results.map((r, i) => (
              <button
                key={i}
                onClick={() => {
                  flyTo(parseFloat(r.lat), parseFloat(r.lon));
                  setQuery(r.display_name.split(',').slice(0, 2).join(', '));
                  setShowResults(false);
                }}
                className="w-full text-left px-3 py-2.5 flex items-start gap-2 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
              >
                <span className="text-green-400 text-sm mt-0.5 shrink-0">📍</span>
                <span className="text-white/80 text-xs leading-relaxed line-clamp-2">{r.display_name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Map */}
      <div className="flex-1 relative" onClick={() => setShowResults(false)}>
        <div ref={mapRef} className="absolute inset-0" />

        {/* Loading overlay */}
        {!mapReady && (
          <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-black">
            <div className="text-center space-y-2">
              <div className="w-10 h-10 border-2 border-green-400 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-white/60 text-xs">Loading map...</p>
            </div>
          </div>
        )}

        {/* GPS detecting banner */}
        {mapReady && detecting && (
          <div className="absolute top-3 left-3 right-14 z-[999] flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}>
            <div className="w-4 h-4 border-2 border-green-400 border-t-transparent rounded-full animate-spin shrink-0" />
            <p className="text-white text-xs font-medium">Detecting GPS...</p>
          </div>
        )}

        {/* Coordinate pill */}
        {mapReady && !detecting && (
          <div className="absolute top-3 left-3 z-[999] px-3 py-1.5 rounded-full text-[11px] font-mono text-white" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
            {pinLat.toFixed(5)}°N, {pinLng.toFixed(5)}°E
          </div>
        )}

        {/* Locate Me button */}
        {mapReady && (
          <button
            onClick={detectLocation}
            disabled={detecting}
            className="absolute top-3 right-3 z-[999] w-10 h-10 rounded-full flex items-center justify-center shadow-lg disabled:opacity-50"
            style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.15)' }}
            title="Detect my location"
          >
            {detecting ? (
              <div className="w-5 h-5 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={gpsFound ? '#22c55e' : '#fff'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="4" />
                <line x1="12" y1="2" x2="12" y2="6" />
                <line x1="12" y1="18" x2="12" y2="22" />
                <line x1="2" y1="12" x2="6" y2="12" />
                <line x1="18" y1="12" x2="22" y2="12" />
              </svg>
            )}
          </button>
        )}
      </div>

      {/* Bottom: Status + Confirm */}
      <div className="px-4 py-3 border-t border-white/10 bg-black" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
        <p className="text-[11px] text-white/40 text-center mb-2">
          {detecting ? 'Detecting...' : gpsFound ? '✅ GPS location detected' : 'Drag pin, tap map, or search above'}
        </p>
        <button
          onClick={() => onConfirm(pinLat, pinLng)}
          className="w-full py-3.5 rounded-2xl font-bold text-white text-sm mb-2"
          style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)', boxShadow: '0 4px 20px rgba(34,197,94,0.3)' }}
        >
          ✅ Confirm Location
        </button>
        <button onClick={onClose} className="w-full py-2 text-xs text-white/40 hover:text-white/70 transition-colors">
          Cancel
        </button>
      </div>
    </div>
  );
}

/* ─── constants ─── */
const CATEGORIES = [
  { id: 'study', label: 'Study', emoji: '📚', sub: ['DSA', 'Math', 'Physics', 'Coding', 'Exam prep', 'Project', 'Other'] },
  { id: 'sports', label: 'Sports', emoji: '🏏', sub: ['Cricket', 'Football', 'BGMI', 'Chess', 'Badminton', 'Other'] },
  { id: 'hangout', label: 'Hangout', emoji: '☕', sub: ['Chai', 'Walk', 'Movie', 'Just chill', 'Roam campus', 'Other'] },
  { id: 'food', label: 'Food', emoji: '🍕', sub: ['Canteen', 'Food run', 'Maggi', 'Mess', 'Order food', 'Other'] },
  { id: 'creative', label: 'Creative', emoji: '🎨', sub: ['Music jam', 'Drawing', 'Photography', 'Video editing', 'Writing', 'Other'] },
  { id: 'fitness', label: 'Fitness', emoji: '💪', sub: ['Gym', 'Running', 'Yoga', 'Evening walk', 'Cycling', 'Other'] },
  { id: 'talk', label: 'Talk', emoji: '💬', sub: ['Vent out', 'Advice needed', 'Placement talk', 'Just listen', 'Other'] },
  { id: 'sos', label: 'SOS', emoji: '🆘', sub: [] },
];

const LOCATIONS = ['Anywhere', 'Library', 'Canteen', 'Hostel', 'Ground', 'Dept'];
const DISTANCES = ['Any', 'Nearby · 200m', '500m', 'Campus'];

interface FeedPost {
  id: string;
  userId: string;
  content: string;
  category: string;
  subcategory: string | null;
  location: string;
  lat: number | null;
  lng: number | null;
  isAnonymous: boolean;
  createdAt: string;
  userName?: string;
  userPhotoUrl?: string;
  reactions?: { imin: number; reply: number; connect: number };
  myReactions?: string[];
}

/* ─── helpers ─── */

function getFreshness(dateStr: string): 'fresh' | 'active' | 'older' {
  const diff = Date.now() - new Date(dateStr).getTime();
  if (diff < 15 * 60 * 1000) return 'fresh';
  if (diff < 2 * 60 * 60 * 1000) return 'active';
  return 'older';
}

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}



/* ─── main component ─── */
export default function CampusFeedPage() {
  const { user } = useAuth();

  // State
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [_totalPosts, setTotalPosts] = useState(0);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [studentName, setStudentName] = useState('');
  const [studentPhoto, setStudentPhoto] = useState('');

  // Compose state
  const [composeText, setComposeText] = useState('');
  const [composeAnon, setComposeAnon] = useState(false);
  const [composeCat, setComposeCat] = useState('');
  const [composeSub, setComposeSub] = useState('');
  const [showTagSheet, setShowTagSheet] = useState(false);
  const [posting, setPosting] = useState(false);

  // Location state
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [userLocation, setUserLocation] = useState('Campus');
  const [locationGranted, setLocationGranted] = useState<boolean | null>(null);
  const [showMapModal, setShowMapModal] = useState(false);
  const [showLocUpdateBanner, setShowLocUpdateBanner] = useState(false);
  const [newDetectedLat, setNewDetectedLat] = useState<number | null>(null);
  const [newDetectedLng, setNewDetectedLng] = useState<number | null>(null);

  // Filters (viewer side)
  const [filterCat, setFilterCat] = useState('all');
  const [filterLoc, setFilterLoc] = useState('anywhere');
  const [filterDist, setFilterDist] = useState('any');
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [tempFilterCat, setTempFilterCat] = useState('all');
  const [tempFilterLoc, setTempFilterLoc] = useState('anywhere');
  const [tempFilterDist, setTempFilterDist] = useState('any');

  // Post actions
  const [menuPostId, setMenuPostId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const feedRef = useRef<HTMLDivElement>(null);

  // ── Smart Location Logic ──────────────────────────────────────────────
  // On first visit: show Allow Location screen
  // On repeat visits: silently get GPS, compare with saved
  //   < 500m away → auto-grant (no prompt)
  //   > 500m away → subtle banner "Location changed?"
  useEffect(() => {
    if (!navigator.geolocation) { setLocationGranted(false); return; }

    const saved = localStorage.getItem('campus_loc');

    if (!saved) {
      // First time — check browser permission state
      const tryGet = () => navigator.geolocation.getCurrentPosition(
        () => { /* don't auto-grant — wait for user to tap Allow */ setLocationGranted(null); },
        () => { setLocationGranted(false); }
      );
      if (navigator.permissions) {
        navigator.permissions.query({ name: 'geolocation' }).then((r) => {
          if (r.state === 'denied') {
            setLocationGranted(false);
          } else {
            setLocationGranted(null); // show Allow Location screen
          }
        }).catch(() => setLocationGranted(null));
      } else {
        tryGet();
      }
      return;
    }

    // Repeat visit — load saved location immediately
    const { lat: savedLat, lng: savedLng } = JSON.parse(saved);
    setUserLat(savedLat);
    setUserLng(savedLng);
    setUserLocation('Campus');
    setLocationGranted(true);

    // Silently check current GPS in background
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const dist = haversineDistance(savedLat, savedLng, pos.coords.latitude, pos.coords.longitude);
        if (dist > 500) {
          // Moved > 500m — show subtle update banner
          setNewDetectedLat(pos.coords.latitude);
          setNewDetectedLng(pos.coords.longitude);
          setShowLocUpdateBanner(true);
        }
        // < 500m — stay quiet, user is same campus
      },
      () => { /* silent fail — keep using saved location */ },
      { timeout: 8000, maximumAge: 60000 }
    );
  }, []);

  // Fetch student info from profiles table
  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      try {
        const res = await fetch(`/api/students?id=${encodeURIComponent(user.id)}`);
        const d = await res.json();
        if (d.success && d.data) {
          const name = d.data.name || d.data.fullName || d.data.full_name || user.name || '';
          setStudentName(name);
          setStudentPhoto(d.data.photoUrl || d.data.photo_url || d.data.avatarUrl || d.data.avatar_url || '');
        } else {
          // Fallback to user object
          setStudentName(user.name || user.email?.split('@')[0] || '');
        }
      } catch {
        setStudentName(user.name || user.email?.split('@')[0] || '');
      }
    };
    fetchProfile();
  }, [user]);

  // Fetch feed (page 0 = fresh load, resets posts)
  const fetchFeed = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterCat !== 'all') params.set('category', filterCat);
      if (filterLoc !== 'anywhere') params.set('location', filterLoc);
      if (userLat) params.set('lat', String(userLat));
      if (userLng) params.set('lng', String(userLng));
      params.set('limit', '20');
      params.set('offset', '0');
      const res = await fetch(`/api/feed?${params}`);
      const d = await res.json();
      if (d.success) {
        setPosts(d.data.posts || []);
        setTotalPosts(d.data.total || 0);
        setHasMore((d.data.posts || []).length === 20);
        setPage(0);
      }
    } catch (e) { console.error('fetchFeed:', e); }
    setLoading(false);
  }, [filterCat, filterLoc, userLat, userLng]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const params = new URLSearchParams();
      if (filterCat !== 'all') params.set('category', filterCat);
      if (filterLoc !== 'anywhere') params.set('location', filterLoc);
      if (userLat) params.set('lat', String(userLat));
      if (userLng) params.set('lng', String(userLng));
      params.set('limit', '20');
      params.set('offset', String(nextPage * 20));
      const res = await fetch(`/api/feed?${params}`);
      const d = await res.json();
      if (d.success) {
        const newPosts = d.data.posts || [];
        setPosts(prev => [...prev, ...newPosts]);
        setHasMore(newPosts.length === 20);
        setPage(nextPage);
      }
    } catch (e) { console.error('loadMore:', e); }
    setLoadingMore(false);
  };

  useEffect(() => { if (user) fetchFeed(); }, [user, fetchFeed]);

  // Greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // Post action
  const handlePost = async () => {
    if (!composeText.trim() || !composeCat || posting) return;
    setPosting(true);
    try {
      const res = await fetch('/api/feed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: composeText.trim(),
          category: composeCat,
          subcategory: composeSub || null,
          location: userLocation,
          lat: userLat,
          lng: userLng,
          isAnonymous: composeAnon,
        }),
      });
      const d = await res.json();
      if (d.success) {
        setComposeText('');
        setComposeCat('');
        setComposeSub('');
        setComposeAnon(false);
        fetchFeed();
      }
    } catch (e) { console.error('handlePost:', e); }
    setPosting(false);
  };

  // React
  const handleReact = async (postId: string, type: string) => {
    try {
      const res = await fetch(`/api/feed/${postId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'react', type }),
      });
      const d = await res.json();
      if (d.success) {
        setPosts(prev => prev.map(p => {
          if (p.id !== postId) return p;
          return {
            ...p,
            reactions: d.counts,
            myReactions: d.active
              ? [...(p.myReactions || []), type]
              : (p.myReactions || []).filter((r: string) => r !== type),
          };
        }));
      }
    } catch (e) { console.error('handleReact:', e); }
  };

  // Delete
  const handleDelete = async (postId: string) => {
    try {
      const res = await fetch(`/api/feed/${postId}`, { method: 'DELETE' });
      const d = await res.json();
      if (d.success) {
        setPosts(prev => prev.filter(p => p.id !== postId));
        setDeleteConfirm(null);
        setMenuPostId(null);
      }
    } catch (e) { console.error('handleDelete:', e); }
  };

  // Apply filters
  const applyFilters = () => {
    setFilterCat(tempFilterCat);
    setFilterLoc(tempFilterLoc);
    setFilterDist(tempFilterDist);
    setShowFilterSheet(false);
  };

  const resetFilters = () => {
    setTempFilterCat('all');
    setTempFilterLoc('anywhere');
    setTempFilterDist('any');
  };

  const activeFilterCount = [filterCat !== 'all', filterLoc !== 'anywhere', filterDist !== 'any'].filter(Boolean).length;

  // Group posts
  const groupPosts = (posts: FeedPost[]) => {
    // SOS always at top
    const sos = posts.filter(p => p.category === 'sos');
    const rest = posts.filter(p => p.category !== 'sos');

    const fresh = rest.filter(p => getFreshness(p.createdAt) === 'fresh');
    const active = rest.filter(p => getFreshness(p.createdAt) === 'active');
    const older = rest.filter(p => getFreshness(p.createdAt) === 'older');

    // Distance filter client-side
    const filterByDist = (arr: FeedPost[]) => {
      if (filterDist === 'any' || !userLat || !userLng) return arr;
      const maxDist = filterDist === 'Nearby · 200m' ? 200 : filterDist === '500m' ? 500 : 5000;
      return arr.filter(p => {
        if (!p.lat || !p.lng) return true; // no location = show anyway
        return haversineDistance(userLat, userLng, p.lat, p.lng) <= maxDist;
      });
    };

    return {
      sos: filterByDist(sos),
      fresh: filterByDist(fresh),
      active: filterByDist(active),
      older: filterByDist(older),
    };
  };

  const grouped = useMemo(() => groupPosts(posts), [posts, filterDist, userLat, userLng]); // eslint-disable-line react-hooks/exhaustive-deps
  const todayCount = useMemo(() => {
    const today = new Date().toDateString();
    return posts.filter(p => new Date(p.createdAt).toDateString() === today).length;
  }, [posts]);

  const catInfo = CATEGORIES.find(c => c.id === composeCat);

  if (!user) return null;


  return (
    <div className="min-h-screen pb-4">


      {/* ── Map Confirm Modal ── */}
      {showMapModal && (
        <MapPickerModal
          onConfirm={(lat, lng) => {
            setUserLat(lat);
            setUserLng(lng);
            setUserLocation('Campus');
            setLocationGranted(true);
            setShowMapModal(false);
            localStorage.setItem('campus_loc', JSON.stringify({ lat, lng }));
          }}
          onClose={() => setShowMapModal(false)}
        />
      )}

      {/* ── 500m Location Update Banner ── */}
      {showLocUpdateBanner && newDetectedLat && newDetectedLng && (
        <div className="fixed bottom-20 left-4 right-4 z-50 rounded-2xl px-4 py-3 flex items-center gap-3 shadow-xl" style={{ background: 'rgba(30,30,40,0.95)', border: '1px solid rgba(34,197,94,0.3)', backdropFilter: 'blur(16px)' }}>
          <span className="text-xl">📍</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white leading-tight">You&apos;ve moved!</p>
            <p className="text-[11px] text-white/50">New location detected. Update?</p>
          </div>
          <button
            onClick={() => {
              setUserLat(newDetectedLat);
              setUserLng(newDetectedLng);
              localStorage.setItem('campus_loc', JSON.stringify({ lat: newDetectedLat, lng: newDetectedLng }));
              setShowLocUpdateBanner(false);
            }}
            className="px-3 py-1.5 rounded-xl text-xs font-bold text-white flex-shrink-0"
            style={{ background: 'rgba(34,197,94,0.2)', border: '1px solid rgba(34,197,94,0.4)' }}
          >
            Update
          </button>
          <button onClick={() => setShowLocUpdateBanner(false)} className="text-white/40 hover:text-white text-lg px-1">×</button>
        </div>
      )}

      {/* ── Location Gate Overlay ── */}
      {locationGranted !== true && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center px-6" style={{ background: 'var(--background)' }}>
            {/* Grant location screen */}
            <div className="card p-8 text-center space-y-5 max-w-sm w-full">
              <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center" style={{ animation: 'float 4s ease-in-out infinite' }}>
                <MapPin size={36} className="text-green-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[var(--foreground)] mb-2">Enable Location Access</h2>
                <p className="text-sm text-[var(--muted-strong)] leading-relaxed">
                  Campus Feed needs your location to show posts from your campus and nearby colleges.
                </p>
              </div>
              <div className="space-y-3">
                <button
                  onClick={() => setShowMapModal(true)}
                  className="w-full py-3 rounded-xl bg-green-500 text-white text-sm font-bold shadow-lg shadow-green-500/30 hover:bg-green-600 active:scale-[0.98] transition-all cursor-pointer"
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                  📍 Allow Location
                </button>
                <button
                  onClick={() => setLocationGranted(true)}
                  className="w-full py-2.5 rounded-xl text-[var(--muted-strong)] text-xs hover:text-[var(--foreground)] transition-colors cursor-pointer"
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                  Skip for now →
                </button>
                <p className="text-[10px] text-[var(--muted)] leading-relaxed">
                  Your location is only used to show nearby campus posts. We don&apos;t track or store your movement.
                </p>
              </div>
            </div>
        </div>
      )}

      {/* ─── Header ─── */}
      <div className="sticky top-0 z-40 px-4 py-3" style={{
        paddingTop: 'calc(env(safe-area-inset-top) + 0.75rem)',
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(20px) saturate(1.5)',
        WebkitBackdropFilter: 'blur(20px) saturate(1.5)',
        borderBottom: '1px solid var(--glass-border)',
      }}>
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <Link href="/me" className="shrink-0">
            <Avatar src={studentPhoto} name={studentName || '?'} size={36} className="w-9 h-9 border-2 border-[var(--primary)]/30" fallbackClassName="w-9 h-9 border-2 border-[var(--primary)]/30" />
          </Link>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-[var(--muted-strong)] leading-none">{getGreeting()}, {studentName.split(' ')[0] || 'there'}!</p>
            <h1 className="text-base font-bold text-[var(--foreground)] leading-tight">Campus Feed</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-green-500/15 text-green-400 border border-green-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
              {userLocation}
            </span>
            <Link href="/notifications" className="p-2 rounded-xl hover:bg-[var(--surface-light)] text-[var(--muted)] transition-colors">
              <Bell size={18} />
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-3 space-y-2 mt-3" ref={feedRef}>
        {/* ─── Compose Bar ─── */}
        <div className="card p-3 space-y-2.5">
          {/* Line 1: Input + Anon Toggle */}
          <div className="flex items-center gap-2.5">
            <input
              type="text"
              value={composeText}
              onChange={e => setComposeText(e.target.value.slice(0, 280))}
              placeholder="What do you want to do?"
              className="flex-1 bg-[var(--surface)] rounded-xl px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] border border-[var(--border)] focus:border-[var(--primary)] outline-none transition-colors"
            />
            <button
              onClick={() => setComposeAnon(!composeAnon)}
              className="shrink-0 flex items-center gap-1.5"
              title={composeAnon ? 'Posting anonymously' : 'Post with name'}
            >
              <span className="text-[11px] font-medium text-[var(--muted-strong)]">Anon</span>
              <div className={`relative w-9 h-5 rounded-full transition-all duration-300 ${composeAnon ? 'bg-purple-500' : 'bg-white/15'}`}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-300 ${composeAnon ? 'left-[18px]' : 'left-0.5'}`} />
              </div>
            </button>
          </div>

          {/* Line 2: Location + Category + Post */}
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium bg-[var(--surface)] text-[var(--muted-strong)] border border-[var(--border)]">
              <MapPin size={10} />
              {userLocation}
            </span>

            <button
              onClick={() => setShowTagSheet(true)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all ${composeCat ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30' : 'bg-[var(--surface)] text-[var(--muted)] border border-[var(--border)]'}`}
            >
              {composeCat ? (
                <>{catInfo?.emoji} {catInfo?.label}{composeSub ? ` · ${composeSub}` : ''}</>
              ) : (
                <><ChevronDown size={10} /> Tag post</>
              )}
            </button>

            <div className="flex-1" />

            <button
              onClick={handlePost}
              disabled={!composeText.trim() || !composeCat || posting}
              className="px-4 py-1.5 rounded-xl text-xs font-bold bg-green-500 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:bg-green-600 shadow-lg shadow-green-500/20"
            >
              {posting ? '...' : 'Post'}
            </button>
          </div>

          {composeText.length > 0 && (
            <div className="text-right text-[11px] text-[var(--muted-strong)]">{composeText.length}/280</div>
          )}
        </div>

        {/* ─── Feed Toolbar ─── */}
        <div className="flex items-center justify-between px-1">
          <span className="flex items-center gap-1.5 text-xs text-[var(--muted-strong)]">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
            <span className="font-semibold text-[var(--foreground)]">{todayCount}</span>
            {todayCount === 1 ? 'post happening now' : 'posts happening now'}
          </span>
          <button
            onClick={() => {
              setTempFilterCat(filterCat);
              setTempFilterLoc(filterLoc);
              setTempFilterDist(filterDist);
              setShowFilterSheet(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-[var(--surface)] text-[var(--muted)] border border-[var(--border)] hover:bg-[var(--surface-light)] transition-colors relative"
          >
            <Filter size={12} />
            Filter
            {activeFilterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-purple-500 text-white text-[8px] font-bold flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Active filter chips */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap gap-1.5 px-1">
            {filterCat !== 'all' && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-500/15 text-purple-400">
                {CATEGORIES.find(c => c.id === filterCat)?.emoji} {filterCat}
                <button onClick={() => setFilterCat('all')} className="hover:text-white"><X size={10} /></button>
              </span>
            )}
            {filterLoc !== 'anywhere' && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-500/15 text-green-400">
                📍 {filterLoc}
                <button onClick={() => setFilterLoc('anywhere')} className="hover:text-white"><X size={10} /></button>
              </span>
            )}
            {filterDist !== 'any' && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/15 text-amber-400">
                📏 {filterDist}
                <button onClick={() => setFilterDist('any')} className="hover:text-white"><X size={10} /></button>
              </span>
            )}
          </div>
        )}

        {/* ─── Loading ─── */}
        {loading && <LoadingSkeleton type="feed" count={3} label="Loading campus feed..." />}

        {/* ─── Empty State ─── */}
        {!loading && posts.length === 0 && (
          <EmptyStatePreset type="feed" action={
            <p className="text-xs text-[var(--muted)]">Tag your activity above and find people nearby! 👆</p>
          } />
        )}

        {/* ─── SOS Posts (always top) ─── */}
        {grouped.sos.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 px-1 pt-1">
              <div className="w-1 h-4 rounded-full bg-red-500" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-red-400">SOS</span>
              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-red-500/20 text-red-400 border border-red-500/20">{grouped.sos.length}</span>
              <span className="flex-1 h-px bg-red-500/10" />
            </div>
            {grouped.sos.map(post => <PostCard key={post.id} post={post} userLat={userLat} userLng={userLng} userId={user?.id || ''} onReact={handleReact} menuPostId={menuPostId} setMenuPostId={setMenuPostId} deleteConfirm={deleteConfirm} setDeleteConfirm={setDeleteConfirm} onDelete={handleDelete} isSos categories={CATEGORIES} />)}
          </div>
        )}

        {/* ─── Fresh Posts ─── */}
        {grouped.fresh.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 px-1 pt-1">
              <div className="w-1 h-4 rounded-full bg-green-500" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-green-400">Fresh</span>
              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-green-500/20 text-green-400 border border-green-500/20">{grouped.fresh.length}</span>
              <span className="flex-1 h-px bg-green-500/10" />
              <span className="text-[10px] text-[var(--muted)] font-medium">last 15 min</span>
            </div>
            {grouped.fresh.map((post, i) => <div key={post.id} className="stagger-card" style={{ animationDelay: `${i * 50}ms` }}><PostCard post={post} userLat={userLat} userLng={userLng} userId={user?.id || ''} onReact={handleReact} menuPostId={menuPostId} setMenuPostId={setMenuPostId} deleteConfirm={deleteConfirm} setDeleteConfirm={setDeleteConfirm} onDelete={handleDelete} categories={CATEGORIES} /></div>)}
          </div>
        )}

        {/* ─── Active Posts ─── */}
        {grouped.active.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 px-1 pt-1">
              <div className="w-1 h-4 rounded-full bg-blue-500" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-blue-400">Active</span>
              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/20">{grouped.active.length}</span>
              <span className="flex-1 h-px bg-blue-500/10" />
              <span className="text-[10px] text-[var(--muted)] font-medium">last 2 hrs</span>
            </div>
            {grouped.active.map((post, i) => <div key={post.id} className="stagger-card" style={{ animationDelay: `${i * 50}ms` }}><PostCard post={post} userLat={userLat} userLng={userLng} userId={user?.id || ''} onReact={handleReact} menuPostId={menuPostId} setMenuPostId={setMenuPostId} deleteConfirm={deleteConfirm} setDeleteConfirm={setDeleteConfirm} onDelete={handleDelete} categories={CATEGORIES} /></div>)}
          </div>
        )}

        {/* ─── Older Posts ─── */}
        {grouped.older.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 px-1 pt-1">
              <div className="w-1 h-4 rounded-full bg-white/20" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-[var(--muted-strong)]">Older</span>
              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-white/8 text-[var(--muted-strong)] border border-white/10">{grouped.older.length}</span>
              <span className="flex-1 h-px bg-white/5" />
            </div>
            {grouped.older.map((post, i) => <div key={post.id} className="stagger-card" style={{ animationDelay: `${i * 40}ms` }}><PostCard post={post} userLat={userLat} userLng={userLng} userId={user?.id || ''} onReact={handleReact} menuPostId={menuPostId} setMenuPostId={setMenuPostId} deleteConfirm={deleteConfirm} setDeleteConfirm={setDeleteConfirm} onDelete={handleDelete} isOlder categories={CATEGORIES} /></div>)}
          </div>
        )}

        {/* ─── Filtered empty state ─── */}
        {!loading && posts.length > 0 && grouped.sos.length === 0 && grouped.fresh.length === 0 && grouped.active.length === 0 && grouped.older.length === 0 && (
          <div className="card p-6 text-center space-y-2">
            <p className="text-2xl">🔍</p>
            <p className="text-sm font-semibold text-[var(--foreground)]">No posts match your filters</p>
            <p className="text-xs text-[var(--muted-strong)]">Try removing the distance or location filter</p>
          </div>
        )}

        {/* ─── Load More ─── */}
        {hasMore && !loading && (
          <div className="flex justify-center py-2">
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="px-6 py-2 rounded-xl text-xs font-semibold bg-[var(--surface)] border border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)] hover:border-[var(--primary)]/40 disabled:opacity-50 transition-all"
            >
              {loadingMore ? 'Loading...' : 'Load more posts'}
            </button>
          </div>
        )}
      </div>

      {/* ═══ Tag Post Sheet (purple theme) ═══ */}
      {showTagSheet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setShowTagSheet(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <div
            className="relative w-full max-w-lg rounded-t-3xl p-5 pb-8 space-y-5 slide-up"
            style={{ background: 'var(--surface-solid)', borderTop: '2px solid rgba(168,85,247,0.3)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="w-10 h-1 rounded-full bg-[var(--border)] mx-auto" />
            <div>
              <h3 className="text-lg font-bold text-[var(--foreground)]">Tag your post</h3>
              <p className="text-xs text-[var(--muted-strong)]">Select category — helps others find your post</p>
            </div>

            {/* Category grid */}
            <div className="grid grid-cols-4 gap-2.5">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => { setComposeCat(cat.id); setComposeSub(''); }}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border transition-all ${composeCat === cat.id ? 'bg-purple-500/15 border-purple-500/40 shadow-lg shadow-purple-500/10' : 'bg-[var(--surface)] border-[var(--border)] hover:border-purple-500/20'}`}
                >
                  <span className="text-2xl">{cat.emoji}</span>
                  <span className="text-[10px] font-semibold text-[var(--foreground)]">{cat.label}</span>
                </button>
              ))}
            </div>

            {/* Subcategory chips */}
            {composeCat && composeCat !== 'sos' && (
              <div>
                <h4 className="text-[11px] font-bold uppercase tracking-widest text-[var(--muted-strong)] mb-2">| WHAT SPECIFICALLY? ({CATEGORIES.find(c => c.id === composeCat)?.label.toUpperCase()})</h4>
                <div className="flex flex-wrap gap-1.5">
                  {CATEGORIES.find(c => c.id === composeCat)?.sub.map(s => (
                    <button
                      key={s}
                      onClick={() => setComposeSub(s)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${composeSub === s ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/30' : 'bg-[var(--surface)] text-[var(--foreground)] border border-[var(--border)] hover:border-purple-500/30'}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-2.5">
              <button
                onClick={() => { setComposeCat(''); setComposeSub(''); }}
                className="flex-1 py-2.5 rounded-xl border border-[var(--border)] text-sm text-[var(--muted)] font-medium"
              >
                Reset
              </button>
              {composeCat === 'sos' ? (
                <button
                  onClick={() => setShowTagSheet(false)}
                  className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold shadow-lg shadow-red-500/30"
                >
                  🆘 Post as SOS — urgent!
                </button>
              ) : (
                <button
                  onClick={() => setShowTagSheet(false)}
                  disabled={!composeCat}
                  className="flex-1 py-2.5 rounded-xl bg-purple-500 text-white text-sm font-bold disabled:opacity-40 shadow-lg shadow-purple-500/30"
                >
                  Done — tag as {catInfo?.label || ''}{composeSub ? ` · ${composeSub}` : ''}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══ Filter Sheet (green theme) ═══ */}
      {showFilterSheet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setShowFilterSheet(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <div
            className="relative w-full max-w-lg rounded-t-3xl p-5 pb-8 space-y-5 slide-up"
            style={{ background: 'var(--surface-solid)', borderTop: '2px solid rgba(34,197,94,0.3)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="w-10 h-1 rounded-full bg-[var(--border)] mx-auto" />
            <div>
              <h3 className="text-lg font-bold text-[var(--foreground)]">Filter Feed</h3>
              <p className="text-xs text-[var(--muted-strong)]">Choose what you want to see</p>
            </div>

            {/* Category */}
            <div>
              <h4 className="text-[11px] font-bold uppercase tracking-widest text-[var(--muted-strong)] mb-2">| CATEGORY</h4>
              <div className="flex flex-wrap gap-1.5">
                {[{ id: 'all', label: 'All' }, ...CATEGORIES].map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setTempFilterCat(cat.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${tempFilterCat === cat.id ? (cat.id === 'sos' ? 'bg-red-500 text-white' : 'bg-green-500 text-white shadow-lg shadow-green-500/20') : 'bg-[var(--surface)] text-[var(--foreground)] border border-[var(--border)]'}`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Location */}
            <div>
              <h4 className="text-[11px] font-bold uppercase tracking-widest text-[var(--muted-strong)] mb-2">| LOCATION</h4>
              <div className="flex flex-wrap gap-1.5">
                {LOCATIONS.map(loc => (
                  <button
                    key={loc}
                    onClick={() => setTempFilterLoc(loc.toLowerCase())}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${tempFilterLoc === loc.toLowerCase() ? 'bg-green-500 text-white shadow-lg shadow-green-500/20' : 'bg-[var(--surface)] text-[var(--foreground)] border border-[var(--border)]'}`}
                  >
                    {loc}
                  </button>
                ))}
              </div>
            </div>

            {/* Distance */}
            <div>
              <h4 className="text-[11px] font-bold uppercase tracking-widest text-[var(--muted-strong)] mb-2">| DISTANCE</h4>
              <div className="flex flex-wrap gap-1.5">
                {DISTANCES.map(d => (
                  <button
                    key={d}
                    onClick={() => setTempFilterDist(d.toLowerCase())}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${tempFilterDist === d.toLowerCase() ? 'bg-green-500 text-white shadow-lg shadow-green-500/20' : 'bg-[var(--surface)] text-[var(--foreground)] border border-[var(--border)]'}`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-2.5">
              <button onClick={resetFilters} className="flex-1 py-2.5 rounded-xl border border-[var(--border)] text-sm text-[var(--muted)] font-medium">Reset</button>
              <button onClick={applyFilters} className="flex-1 py-2.5 rounded-xl bg-green-500 text-white text-sm font-bold shadow-lg shadow-green-500/30">Apply filters</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Delete Confirm ═══ */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setDeleteConfirm(null)}>
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative card p-5 space-y-4 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold text-[var(--foreground)]">Delete post?</h3>
            <p className="text-sm text-[var(--muted-strong)]">This can&apos;t be undone.</p>
            <div className="flex gap-2.5">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2 rounded-xl border border-[var(--border)] text-sm text-[var(--muted)]">Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 py-2 rounded-xl bg-red-500 text-white text-sm font-bold">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


