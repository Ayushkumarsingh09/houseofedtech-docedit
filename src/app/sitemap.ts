import type { MetadataRoute } from "next";

import { getEnv } from "@/config/env";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getEnv().NEXT_PUBLIC_APP_URL;
  return [
    { url: baseUrl, lastModified: new Date(), changeFrequency: "monthly", priority: 1 },
    {
      url: `${baseUrl}/login`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/signup`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.5,
    },
  ];
}
