import Image from "next/image";

type LogoProps = {
  size?: number;
  className?: string;
  alt?: string;
  priority?: boolean;
};

/** Production NameGraph mark — network NG badge. */
export default function Logo({
  size = 34,
  className = "",
  alt = "NameGraph",
  priority = false,
}: LogoProps) {
  return (
    <Image
      src="/logo.png"
      width={size}
      height={size}
      alt={alt}
      priority={priority}
      className={`logo-mark ${className}`.trim()}
    />
  );
}
