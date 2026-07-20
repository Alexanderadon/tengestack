export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="16" fill="var(--c-accent)" />
      <path
        d="M17 16h30v7H17zM17 27.5h30v7H17zM28.5 34.5h7V50a3.5 3.5 0 0 1-7 0z"
        fill="var(--c-accent-text)"
      />
    </svg>
  );
}
