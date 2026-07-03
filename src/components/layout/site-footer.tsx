import Link from "next/link";

import { GitHubIcon, LinkedInIcon } from "@/components/shared/social-icons";
import { APP_NAME } from "@/constants";

const AUTHOR_NAME = "Ayush Kumar Singh";
const GITHUB_URL = "https://github.com/Ayushkumarsingh09";
const LINKEDIN_URL = "https://www.linkedin.com/in/ayush-kumar-singh-a95170256/";

export function SiteFooter() {
  return (
    <footer className="border-border/70 bg-background/60 border-t">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm sm:flex-row">
        <p className="text-muted-foreground">
          © {new Date().getFullYear()} {APP_NAME}. Built for the House of Edtech Full
          Stack assignment.
        </p>
        <div className="text-muted-foreground flex items-center gap-4">
          <span>
            Crafted by <span className="text-foreground font-medium">{AUTHOR_NAME}</span>
          </span>
          <Link
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground flex items-center gap-1.5 transition-colors"
            aria-label="GitHub profile"
          >
            <GitHubIcon className="size-4" />
            GitHub
          </Link>
          <Link
            href={LINKEDIN_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground flex items-center gap-1.5 transition-colors"
            aria-label="LinkedIn profile"
          >
            <LinkedInIcon className="size-4" />
            LinkedIn
          </Link>
        </div>
      </div>
    </footer>
  );
}
