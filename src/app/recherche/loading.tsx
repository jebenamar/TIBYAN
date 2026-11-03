export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-10" aria-busy="true">
      <div className="skeleton mb-6 h-10 w-72" />
      <div className="skeleton h-32 rounded-2xl" />
      <div className="mt-8 space-y-3">{Array.from({ length: 5 }, (_, i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}</div>
    </div>
  );
}
