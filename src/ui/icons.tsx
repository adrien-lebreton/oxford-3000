interface IconProps {
  size?: number;
}

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
});

export const IconHome = ({ size = 22 }: IconProps) => (
  <svg {...base(size)}>
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5.5 9.5V20a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V9.5" />
  </svg>
);

export const IconCards = ({ size = 22 }: IconProps) => (
  <svg {...base(size)}>
    <rect x="7" y="5" width="13" height="16" rx="2.5" />
    <path d="M4.5 17.5v-12A1.5 1.5 0 0 1 6 4h9" opacity="0.55" />
  </svg>
);

export const IconBook = ({ size = 22 }: IconProps) => (
  <svg {...base(size)}>
    <path d="M12 6.5C10.5 4.9 8.4 4 5.5 4H3v15h2.8c2.7 0 4.7.8 6.2 2.3 1.5-1.5 3.5-2.3 6.2-2.3H21V4h-2.5c-2.9 0-5 .9-6.5 2.5Z" />
    <path d="M12 6.5V21" />
  </svg>
);

export const IconGear = ({ size = 22 }: IconProps) => (
  <svg {...base(size)}>
    <circle cx="12" cy="12" r="3.2" />
    <path d="M19 12a7 7 0 0 0-.14-1.4l2-1.55-2-3.46-2.36.95a7 7 0 0 0-2.42-1.4L13.7 2.6h-3.4l-.38 2.54a7 7 0 0 0-2.42 1.4l-2.36-.95-2 3.46 2 1.55a7.1 7.1 0 0 0 0 2.8l-2 1.55 2 3.46 2.36-.95a7 7 0 0 0 2.42 1.4l.38 2.54h3.4l.38-2.54a7 7 0 0 0 2.42-1.4l2.36.95 2-3.46-2-1.55c.1-.45.14-.92.14-1.4Z" />
  </svg>
);

export const IconSpeaker = ({ size = 22 }: IconProps) => (
  <svg {...base(size)}>
    <path d="M11 5.5 6.5 9H3.5v6h3L11 18.5v-13Z" />
    <path d="M14.5 9.2a4 4 0 0 1 0 5.6" />
    <path d="M17.2 6.8a7.5 7.5 0 0 1 0 10.4" />
  </svg>
);

/** Le surligneur, marqueur des mots difficiles. */
export const IconHighlighter = ({ size = 22 }: IconProps) => (
  <svg {...base(size)}>
    <path d="m9.5 15.5-3-3 8.2-8.2a1.4 1.4 0 0 1 2 0l1 1a1.4 1.4 0 0 1 0 2L9.5 15.5Z" />
    <path d="M6.5 12.5 5 17l4.5-1.5" />
    <path d="M4 21h16" opacity="0.55" />
  </svg>
);

/** Liste à cocher : l'onglet de tri rapide. */
export const IconTriage = ({ size = 22 }: IconProps) => (
  <svg {...base(size)}>
    <path d="m3.5 5.5 1.7 1.7L8.3 4.1" />
    <path d="M11.5 6h9" />
    <path d="m3.5 12 1.7 1.7L8.3 10.6" />
    <path d="M11.5 12.5h9" />
    <path d="m3.5 18.5 1.7 1.7L8.3 17.1" />
    <path d="M11.5 19h9" />
  </svg>
);

export const IconCheck = ({ size = 22 }: IconProps) => (
  <svg {...base(size)}>
    <path d="m4.5 12.5 5 5L19.5 7" />
  </svg>
);

export const IconX = ({ size = 22 }: IconProps) => (
  <svg {...base(size)}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

export const IconSearch = ({ size = 20 }: IconProps) => (
  <svg {...base(size)}>
    <circle cx="10.5" cy="10.5" r="6.5" />
    <path d="m15.5 15.5 4.5 4.5" />
  </svg>
);
