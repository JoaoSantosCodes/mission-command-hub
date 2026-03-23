/** Mascote pixel art (ficheiro em `public/mascot-architecture-agents-hub.png`). */
const MASCOT_PATH = "/mascot-architecture-agents-hub.png";

const sizePx = {
  sm: "h-7 w-7",
  md: "h-9 w-9",
} as const;

type HubMascotProps = {
  size?: keyof typeof sizePx;
  className?: string;
};

export function HubMascot({ size = "md", className = "" }: HubMascotProps) {
  return (
    <span
      className={`inline-flex shrink-0 items-end justify-center overflow-hidden rounded-md bg-black ring-1 ring-border ${sizePx[size]} ${className}`}
    >
      <img
        src={MASCOT_PATH}
        width={64}
        height={64}
        alt=""
        decoding="async"
        className="hub-mascot-img max-h-full max-w-full object-contain object-bottom"
      />
    </span>
  );
}
