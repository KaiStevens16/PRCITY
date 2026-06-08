export default function MainLoading() {
  return (
    <div className="animate-pulse space-y-8" aria-busy aria-label="Loading page">
      <div className="h-28 rounded-2xl bg-muted/40" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="h-32 rounded-xl bg-muted/35 md:col-span-2" />
        <div className="h-32 rounded-xl bg-muted/35" />
        <div className="h-32 rounded-xl bg-muted/35" />
      </div>
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="h-56 rounded-xl bg-muted/30 lg:col-span-3" />
        <div className="h-56 rounded-xl bg-muted/30 lg:col-span-2" />
      </div>
      <div className="h-40 rounded-xl bg-muted/25" />
    </div>
  );
}
