import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { cn, getAssetUrl } from "@/lib/utils";

interface NivasaLogoProps {
  className?: string;
  imgClassName?: string;
  alt?: string;
  iconOnly?: boolean;
}

/**
 * Renders the correct Nivasa logo based on the active theme.
 * - Light mode → /nivasa-logo-light-v2.png (or nivasa-brand-v2.png if iconOnly)
 * - Dark  mode → /nivasa-logo-dark-v2.png (or nivasa-icon-neon.jpg if iconOnly)
 *
 * Uses a mounted guard so it never flashes the wrong logo during SSR/hydration.
 */
export function NivasaLogo({ className, imgClassName, alt = "Nivasa Logo", iconOnly = false }: NivasaLogoProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // While not yet mounted fall back to light logo to avoid layout shift
  let src = "";
  if (iconOnly) {
    src = mounted && resolvedTheme === "dark"
      ? getAssetUrl("nivasa-icon-neon.jpg")
      : getAssetUrl("nivasa-brand-v2.png");
  } else {
    src = mounted && resolvedTheme === "dark"
      ? getAssetUrl("nivasa-logo-dark-v2.png")
      : getAssetUrl("nivasa-logo-light-v2.png");
  }

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
