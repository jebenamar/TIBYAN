export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-10" aria-busy="true">
      <div className="skeleton mb-2 h-4 w-32" />
      <div className="skeleton mb-6 h-10 w-56" />
      <div className="skeleton h-64 rounded-[1.75rem]" />
      <div className="skeleton mt-6 h-12 rounded-2xl" />
      <div className="mt-6 space-y-3">
        {Array.from({ length: 6 }, (_, i) => <div key={i} className="skeleton h-5" style={{ width: `${92 - i * 7}%` }} />)}
      </div>
    </div>
  );
}
