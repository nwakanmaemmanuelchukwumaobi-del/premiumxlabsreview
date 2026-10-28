const SHARE_IMAGE = "https://premiumxlabs.com/og-image.png";

/** Shared brand preview; page-specific titles and descriptions stay on leaf routes. */
export function sharingMeta(path: string, title: string, description: string) {
  return [
    { property: "og:url", content: `https://premiumxlabs.com${path}` },
    { property: "og:image", content: SHARE_IMAGE },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },
    { property: "og:image:alt", content: "premiumxlabs — Find Out What's Holding Your Business Back. Get your free business audit." },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: SHARE_IMAGE },
  ];
}