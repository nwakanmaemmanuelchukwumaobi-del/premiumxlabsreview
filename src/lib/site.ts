export const WHATSAPP_URL =
  "https://wa.me/2349034340796?text=" +
  encodeURIComponent("Hi premiumxlabs, I'd like to know more about your services.");
export const CONTACT_EMAIL = "premuimxlabs@gmail.com";
export const LOCATION = "Abuja, Nigeria";

export const MARKETING_SERVICES = [
  { title: "Campaign Planning & Launches", desc: "Strategy, timelines and execution for campaigns that move the needle." },
  { title: "Ads", desc: "Paid campaigns on Meta, Google and TikTok, built to bring real customers." },
  { title: "Social Media Management", desc: "Consistent content, community and growth across your channels." },
  { title: "AI Video Content", desc: "Scroll-stopping videos produced faster with AI-assisted workflows." },
  { title: "Branding", desc: "Names, logos and visual identities that make you look established." },
  { title: "New Business Launch Support", desc: "Everything you need to open your doors with momentum." },
];
export const DIGITAL_SERVICES = [
  { title: "Websites", desc: "Fast, modern websites designed to turn visitors into enquiries." },
  { title: "Software", desc: "Custom tools that fit how your business actually works." },
  { title: "Mobile Apps", desc: "iOS and Android apps your customers will enjoy using." },
  { title: "AI Automation", desc: "Automate repetitive tasks and respond to customers 24/7." },
];
export const ALL_SERVICES = [...MARKETING_SERVICES, ...DIGITAL_SERVICES].map((s) => s.title);
