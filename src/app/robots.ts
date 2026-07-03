import type { MetadataRoute } from "next";

import { getEnv } from "@/config/env";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getEnv().NEXT_PUBLIC_APP_URL;
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/dashboard", "/documents", "/settings"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
