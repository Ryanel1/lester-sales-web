type IconProps = { className?: string };

export function ArrowUpRightIcon({ className }: IconProps) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 20 20">
      <path d="M6 14 14 6M8 6h6v6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" />
    </svg>
  );
}

export function ArrowRightIcon({ className }: IconProps) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 20 20">
      <path d="M4 10h12m-4-4 4 4-4 4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" />
    </svg>
  );
}

export function FileIcon({ className }: IconProps) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 20 20">
      <path d="M6.25 2.75h5l3.5 3.5v11H6.25a1 1 0 0 1-1-1V3.75a1 1 0 0 1 1-1Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.4" />
      <path d="M11.25 2.75v3.5h3.5M8 10h4.5M8 13h4.5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
    </svg>
  );
}
