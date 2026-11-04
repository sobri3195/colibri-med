export default function AsyncState({
  loading,
  error,
  reload,
  updated,
  inline = false,
}: {
  updated?: string;
  inline?: boolean;
  loading: boolean;
  error: string;
  reload: () => void;
}) {
  return (
    <>
      <div
        className={
          inline ? "async-indicator async-indicator-inline" : "async-indicator"
        }
        role="status"
        aria-live="polite"
      >
        <span style={{ visibility: loading ? "visible" : "hidden" }}>
          {updated ? "Memperbarui…" : "Memuat data…"}
        </span>
      </div>
      {error && (
        <div role="alert" className="error">
          {error} <button onClick={reload}>Coba lagi</button>
        </div>
      )}
    </>
  );
}
