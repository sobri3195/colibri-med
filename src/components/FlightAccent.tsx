// Decorative local illustration: no real aircraft model or live position implied.
export default function FlightAccent() {
  return (
    <svg
      className="login-flight"
      viewBox="0 0 520 250"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="302" cy="119" r="105" fill="currentColor" opacity=".06" />
      <circle
        cx="302"
        cy="119"
        r="82"
        stroke="currentColor"
        opacity=".15"
        strokeDasharray="3 9"
      />
      <path
        d="M25 210h470M55 225h106m259 0h45"
        stroke="currentColor"
        opacity=".2"
        strokeWidth="2"
      />
      <ellipse cx="294" cy="208" rx="145" ry="9" fill="#0B1F33" opacity=".12" />
      <g
        stroke="#102A43"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M235 55h229M350 55v32m-43 0h81" />
        <path d="m225 125-115-24-15-42H72l12 62 141 36" fill="#D9E2EC" />
        <path d="m85 101-30-4m17-11 22 30" />
        <path
          d="M246 96h105c39 0 77 27 94 58 5 10-5 22-22 23H259c-25 0-44-17-44-39 0-20 11-35 31-42Z"
          fill="#FFFFFF"
        />
        <path d="M351 99v44h84c-17-25-48-42-84-44Z" fill="#A7DADD" />
        <path d="M382 106v37m-31 0h-19v-38" />
        <path d="M222 152h214l-6 17H242" fill="#087F8C" stroke="#087F8C" />
        <path d="M278 101v48m39-48v48m-77-24h21m-10-10v21" stroke="#087F8C" />
        <path d="m263 177-10 20m133-20 12 20m-166 1h190l14-9" />
        <path d="M246 87h83l13 9h-102Z" fill="#D9E2EC" />
      </g>
      <g fill="currentColor" opacity=".6">
        <circle cx="39" cy="163" r="3" />
        <circle cx="474" cy="89" r="3" />
        <path d="M25 163h9m10 0h26m397-74h-16m28 0h13" stroke="currentColor" />
      </g>
    </svg>
  );
}
