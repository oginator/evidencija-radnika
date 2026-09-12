export function BrandLogo({
  size = "md",
  plated = false,
}: {
  size?: "sm" | "md" | "lg" | "xl";
  plated?: boolean;
}) {
  const height =
    size === "xl"
      ? "h-20"
      : size === "lg"
        ? "h-16"
        : size === "md"
          ? "h-10"
          : "h-8";

  const image = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/lux-logo.jpg"
      alt="LUX ceramica"
      className={`${height} w-auto max-w-full object-contain object-left`}
    />
  );

  if (!plated) return image;

  return (
    <div className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 shadow-lg shadow-slate-900/10">
      {image}
    </div>
  );
}
