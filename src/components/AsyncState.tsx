export default function AsyncState({
  loading,
  error,
  reload,
}: {
  loading: boolean;
  error: string;
  reload: () => void;
}) {
  return (
    <>
      {loading && <p role="status">Memuat data…</p>}
      {error && (
        <div role="alert" className="error">
          {error} <button onClick={reload}>Coba lagi</button>
        </div>
      )}
    </>
  );
}
