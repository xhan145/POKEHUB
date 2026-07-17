function IconSvg({ children, ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={24}
      height={24}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="square"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export function IconArcade(props: React.SVGProps<SVGSVGElement>) {
  return (
    <IconSvg {...props}>
      <circle cx="12" cy="6" r="3" />
      <path d="M12 9v6" />
      <rect x="4" y="15" width="16" height="5" />
    </IconSvg>
  );
}

export function IconBox(props: React.SVGProps<SVGSVGElement>) {
  return (
    <IconSvg {...props}>
      <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" />
      <path d="M4 7.5l8 4.5 8-4.5" />
      <path d="M12 12v9" />
    </IconSvg>
  );
}

export function IconCard(props: React.SVGProps<SVGSVGElement>) {
  return (
    <IconSvg {...props}>
      <rect x="6" y="3" width="12" height="18" />
      <path d="M9 7h6" />
      <path d="M9 17h6" />
    </IconSvg>
  );
}

export function IconRadar(props: React.SVGProps<SVGSVGElement>) {
  return (
    <IconSvg {...props}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1" />
      <path d="M12 12l6-6" />
    </IconSvg>
  );
}

export function IconFolder(props: React.SVGProps<SVGSVGElement>) {
  return (
    <IconSvg {...props}>
      <path d="M3 6h6l2 3h10v11H3V6z" />
    </IconSvg>
  );
}

export function IconSatellite(props: React.SVGProps<SVGSVGElement>) {
  return (
    <IconSvg {...props}>
      <path d="M4 10a10 10 0 0 0 10 10" />
      <path d="M9 15l6-6" />
      <circle cx="18" cy="5" r="2" />
    </IconSvg>
  );
}

export function IconGear(props: React.SVGProps<SVGSVGElement>) {
  return (
    <IconSvg {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v4M12 18v4M2 12h4M18 12h4M5 5l2.8 2.8M16.2 16.2L19 19M19 5l-2.8 2.8M7.8 16.2L5 19" />
    </IconSvg>
  );
}

export function IconConstellation(props: React.SVGProps<SVGSVGElement>) {
  return (
    <IconSvg {...props}>
      <path d="M4 6l6 4 5-3 5 5" />
      <circle cx="4" cy="6" r="1.4" />
      <circle cx="10" cy="10" r="1.4" />
      <circle cx="15" cy="7" r="1.4" />
      <circle cx="20" cy="12" r="1.4" />
      <circle cx="8" cy="18" r="1.4" />
    </IconSvg>
  );
}

export function IconMore(props: React.SVGProps<SVGSVGElement>) {
  return (
    <IconSvg {...props}>
      <circle cx="5" cy="12" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="19" cy="12" r="1.5" />
    </IconSvg>
  );
}

export function IconCalendar(props: React.SVGProps<SVGSVGElement>) {
  return (
    <IconSvg {...props}>
      <rect x="3" y="5" width="18" height="16" />
      <path d="M3 9h18M8 3v4M16 3v4" />
      <circle cx="12" cy="15" r="1.4" />
    </IconSvg>
  );
}
