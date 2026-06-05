import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface NivasaLogoProps {
  className?: string;
  imgClassName?: string;
  alt?: string;
}

/**
 * Renders the correct Nivasa logo based on the active theme.
 * - Light mode → /nivasa-logo-light.png
 * - Dark  mode → /nivasa-logo-dark.png
 *
 * Uses a mounted guard so it never flashes the wrong logo during SSR/hydration.
 */
export function NivasaLogo({ className, imgClassName, alt = "Nivasa Logo" }: NivasaLogoProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // While not yet mounted fall back to light logo to avoid layout shift
  const src =
    mounted && resolvedTheme === "dark"
      ? "/nivasa-logo-dark-v2.png"
      : "/nivasa-logo-light-v2.png";

  return (
    <div className={cn("flex items-center justify-center overflow-hidden", className)}>
      <img
        src={src}
        alt={alt}
        className={cn("h-full w-full object-contain transition-opacity duration-300", imgClassName)}
      />
    </div>
  );
}
