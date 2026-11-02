// Decorative generic helicopter: no claim of model or technical accuracy.
export default function FlightAccent() {
  return (
    <svg
      className="login-flight"
      viewBox="0 0 360 150"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 125C65 125 44 60 108 60s50 65 113 65h127"
        stroke="#a6c6cb"
        strokeWidth="2"
        strokeDasharray="4 7"
      />
      <circle cx="12" cy="125" r="5" fill="#087F8C" />
      <g
        stroke="#102A43"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path
          d="M177 37h122m-61 0v15m-25 0h39c17 0 38 14 41 29h-67c-13 0-21-8-26-16l-34-9-9-20h-13l4 28 45 14"
          fill="#e7f5f4"
        />
        <path d="M250 54v16h37m-77 11-5 15m59-15 5 15m-75 0h91l9-6" />
        <path d="M230 61v12m-6-6h12" stroke="#087F8C" />
      </g>
    </svg>
  );
}
