export default function TodayLoading() {
  return (
    <div className="animate-pulse space-y-6" aria-busy aria-label="Loading today">
      <div className="h-24 rounded-2xl bg-muted/40" />
      <div className="h-28 rounded-xl bg-muted/30" />
      <div className="space-y-4">
        <div className="h-40 rounded-xl bg-muted/25" />
        <div className="h-40 rounded-xl bg-muted/25" />
        <div className="h-40 rounded-xl bg-muted/25" />
      </div>
    </div>
  );
}
