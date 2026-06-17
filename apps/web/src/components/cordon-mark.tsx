export function CordonMark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="2.5" y="2.5" width="19" height="19" rx="6.5" stroke="#ffffff" strokeOpacity="0.28" strokeWidth="1.25" />
      <path d="M12 3.5 V20.5" stroke="#8052ff" strokeWidth="1.5" />
      <circle cx="6.8" cy="8.6" r="1.35" fill="#ffffff" />
      <circle cx="17.2" cy="14.4" r="1.35" fill="#8052ff" />
    </svg>
  );
}
