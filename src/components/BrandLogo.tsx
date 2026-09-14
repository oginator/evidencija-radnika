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
      className={`${height} w-auto max-w-[7.5rem] object-contain object-left sm:max-w-none`}
    />
  );

  if (!plated) return image;

  return (
    <div className="inline-flex max-w-full items-center justify-center rounded-2xl bg-white px-4 py-2.5 shadow-lg shadow-slate-900/10 sm:px-5 sm:py-3">
      {image}
    </div>
  );
}
