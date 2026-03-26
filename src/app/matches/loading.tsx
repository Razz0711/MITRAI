import LoadingSkeleton from '@/components/LoadingSkeleton';

export default function MatchesLoading() {
  return (
    <div className="min-h-screen px-4 py-6 space-y-4 max-w-2xl mx-auto">
      <LoadingSkeleton type="cards" count={4} label="Loading matches..." />
    </div>
  );
}
