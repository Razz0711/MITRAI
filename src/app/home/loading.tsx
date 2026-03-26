import LoadingSkeleton from '@/components/LoadingSkeleton';

export default function HomeLoading() {
  return (
    <div className="min-h-screen px-4 py-6 space-y-4 max-w-2xl mx-auto">
      <LoadingSkeleton type="feed" count={4} label="Loading campus feed..." />
    </div>
  );
}
