import {
  ArrowRight,
  GitBranch,
  History,
  Lock,
  RadioTower,
  ShieldCheck,
  Sparkles,
  Users,
  Wifi,
  WifiOff,
  Zap,
} from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const FEATURES = [
  {
    icon: WifiOff,
    title: "Local-first, always",
    description:
      "Every keystroke lands in IndexedDB first. Create, edit, rename, and browse history with zero network round-trips — the UI never blocks on connectivity.",
  },
  {
    icon: RadioTower,
    title: "Custom sync engine",
    description:
      "A hand-built background sync engine — durable outbox, exponential backoff, batch push/pull, and idempotent operations — reconciles state the moment you're back online.",
  },
  {
    icon: GitBranch,
    title: "Deterministic conflict resolution",
    description:
      "A from-scratch operational-transform engine rebases concurrent inserts, deletes, and replacements against each other with zero data loss — no CRDT library required.",
  },
  {
    icon: History,
    title: "Git-like version history",
    description:
      "Automatic and manual snapshots form a full timeline. Preview, diff, and roll back to any point without disturbing collaborators' live session.",
  },
  {
    icon: Users,
    title: "Owner / Editor / Viewer roles",
    description:
      "Granular, server-enforced authorization on every document. Viewers can read and stay in sync — they can never push a mutation.",
  },
  {
    icon: Sparkles,
    title: "AI-assisted writing",
    description:
      "Summarize, continue, or tighten your prose with one command. Works even without an API key via deterministic local fallbacks.",
  },
];

const SECURITY_POINTS = [
  "Strict ORM-scoped tenant isolation — every document query is authorized by ownership or collaborator membership before it ever touches Prisma.",
  "Zod-validated, size-capped sync payloads prevent malformed or massive batches from ever reaching the merge engine.",
  "HttpOnly, SameSite cookies with short-lived access tokens and rotating refresh tokens — never exposed to client JavaScript.",
  "Rate limiting, a strict Content-Security-Policy, and full security headers ship on every response.",
];

export default function LandingPage() {
  return (
    <>
      <section className="relative overflow-hidden px-6 pt-20 pb-24 sm:pt-28">
        <div
          aria-hidden
          className="from-primary/15 pointer-events-none absolute inset-x-0 top-0 -z-10 h-[600px] bg-gradient-to-b to-transparent"
        />
        <div className="mx-auto max-w-4xl text-center">
          <Badge variant="secondary" className="animate-fade-in mb-6">
            <Zap className="size-3" /> Offline-first · Deterministic sync · Version
            history
          </Badge>
          <h1 className="animate-slide-up text-4xl font-bold tracking-tight text-balance sm:text-6xl">
            Write anywhere. <span className="text-primary">Never lose a word.</span>
          </h1>
          <p className="text-muted-foreground animate-slide-up mx-auto mt-6 max-w-2xl text-lg text-balance [animation-delay:100ms]">
            Nimbus Docs is a local-first document editor with a hand-built background
            synchronization engine, deterministic conflict resolution, and Git-like
            version history — the distributed-systems problems most editors avoid, solved
            from scratch.
          </p>
          <div className="animate-slide-up mt-10 flex flex-wrap items-center justify-center gap-3 [animation-delay:200ms]">
            <Button size="lg" asChild>
              <Link href="/signup">
                Start writing free <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/login">I have an account</Link>
            </Button>
          </div>
          <div className="text-muted-foreground animate-slide-up mt-8 flex items-center justify-center gap-6 text-sm [animation-delay:300ms]">
            <span className="flex items-center gap-1.5">
              <Wifi className="text-success size-4" /> Works online
            </span>
            <span className="flex items-center gap-1.5">
              <WifiOff className="text-warning size-4" /> Works offline
            </span>
            <span className="flex items-center gap-1.5">
              <Lock className="size-4" /> Role-based access
            </span>
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-6xl px-6 py-20">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold tracking-tight">
            Built for real distributed-systems problems
          </h2>
          <p className="text-muted-foreground mx-auto mt-3 max-w-2xl">
            Not another to-do app — a genuine offline-sync engine with merge semantics you
            can reason about.
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <Card
              key={feature.title}
              className="hover:border-primary/40 transition-colors"
            >
              <CardHeader>
                <div className="bg-primary/10 text-primary mb-2 flex size-10 items-center justify-center rounded-lg">
                  <feature.icon className="size-5" />
                </div>
                <CardTitle>{feature.title}</CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <section id="architecture" className="bg-muted/40 border-y">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">
                Local storage is the source of truth
              </h2>
              <p className="text-muted-foreground mt-4">
                Every edit is written to Dexie (IndexedDB) synchronously, then diffed into
                fine-grained insert/delete/replace operations and queued in a durable
                outbox. The network is treated as an unreliable background channel: a
                leader-elected tab pushes pending operations with exponential backoff, and
                the server&apos;s operational-transform engine rebases them against
                everything that happened while you were away — before returning the
                reconciled document to every open tab via BroadcastChannel.
              </p>
              <ul className="text-muted-foreground mt-6 space-y-3 text-sm">
                <li>
                  → Zod-validated, size-capped sync payloads (defense against OOM attacks)
                </li>
                <li>→ Idempotent operation IDs make retried pushes perfectly safe</li>
                <li>
                  → Optimistic-locked document versioning with automatic retry on
                  contention
                </li>
                <li>
                  → Automatic snapshots every 25 operations feed the version timeline
                </li>
              </ul>
            </div>
            <Card className="bg-card/60 font-mono text-xs shadow-lg backdrop-blur">
              <CardContent className="space-y-2">
                <p className="text-muted-foreground">{"// operation envelope"}</p>
                <pre className="overflow-x-auto leading-relaxed whitespace-pre-wrap">{`{
  operationId, clientId, documentId,
  userId, type, payload,
  baseVersion, sequenceNumber,
  clientTimestamp, hash
}`}</pre>
                <p className="text-muted-foreground pt-2">{"// server reconciliation"}</p>
                <pre className="overflow-x-auto leading-relaxed whitespace-pre-wrap">{`transform(op, history)
  → rebase against concurrent edits
  → apply to document
  → bump version (optimistic lock)
  → persist immutable operation log`}</pre>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section id="security" className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <Card className="order-2 lg:order-1">
            <CardHeader>
              <div className="bg-destructive/10 text-destructive mb-2 flex size-10 items-center justify-center rounded-lg">
                <ShieldCheck className="size-5" />
              </div>
              <CardTitle>Defense in depth</CardTitle>
              <CardDescription>
                Security isn&apos;t bolted on — every layer assumes the one below it can
                fail.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm">
                {SECURITY_POINTS.map((point) => (
                  <li key={point} className="flex gap-2">
                    <ShieldCheck className="text-success mt-0.5 size-4 shrink-0" />
                    <span className="text-muted-foreground">{point}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
          <div className="order-1 lg:order-2">
            <h2 className="text-3xl font-bold tracking-tight">
              Tenant isolation, enforced at every layer
            </h2>
            <p className="text-muted-foreground mt-4">
              Row-level access is never assumed — every repository call re-derives the
              caller&apos;s role from the database before a single byte of document
              content is read or written. Viewers are structurally incapable of mutating a
              document: the authorization check happens before the sync engine even looks
              at the payload.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 py-20 text-center">
        <h2 className="text-3xl font-bold tracking-tight">
          Ready to write offline-first?
        </h2>
        <p className="text-muted-foreground mx-auto mt-3 max-w-xl">
          Create an account in seconds — no credit card, no setup.
        </p>
        <Button size="lg" className="mt-8" asChild>
          <Link href="/signup">
            Create your first document <ArrowRight className="size-4" />
          </Link>
        </Button>
      </section>
    </>
  );
}
