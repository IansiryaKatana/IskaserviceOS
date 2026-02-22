import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, ChevronLeft, List } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const DOC_URL = "/docs/ISKA_SERVICE_OS_DOCUMENTATION_EVERYTHING.md";

/** Simple markdown-like renderer: # ## ### **bold** - list, paragraphs */
function renderDocContent(raw: string) {
  const lines = raw.split(/\r?\n/);
  const out: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed === "---") {
      out.push(<hr key={key++} className="my-6 border-border" />);
      i++;
      continue;
    }

    if (trimmed.startsWith("### ")) {
      out.push(
        <h3 key={key++} className="mt-6 mb-2 text-sm font-bold text-foreground">
          {trimmed.slice(4)}
        </h3>
      );
      i++;
      continue;
    }

    if (trimmed.startsWith("## ")) {
      out.push(
        <h2 key={key++} className="mt-8 mb-3 text-base font-bold text-foreground">
          {trimmed.slice(3)}
        </h2>
      );
      i++;
      continue;
    }

    if (trimmed.startsWith("# ")) {
      out.push(
        <h1 key={key++} className="mt-8 mb-4 text-lg font-bold text-foreground">
          {trimmed.slice(2)}
        </h1>
      );
      i++;
      continue;
    }

    if (trimmed.startsWith("- ")) {
      const listItems: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("- ")) {
        listItems.push(lines[i].trim().slice(2));
        i++;
      }
      out.push(
        <ul key={key++} className="mb-3 ml-4 list-disc space-y-1 text-sm text-muted-foreground">
          {listItems.map((item, j) => (
            <li key={j}>{inlineBold(item)}</li>
          ))}
        </ul>
      );
      continue;
    }

    if (trimmed === "") {
      i++;
      continue;
    }

    // Numbered list (1. 2. etc)
    if (/^\d+\.\s/.test(trimmed)) {
      const listItems: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
        listItems.push(lines[i].trim().replace(/^\d+\.\s/, ""));
        i++;
      }
      out.push(
        <ol key={key++} className="mb-3 ml-4 list-decimal space-y-1 text-sm text-muted-foreground">
          {listItems.map((item, j) => (
            <li key={j}>{inlineBold(item)}</li>
          ))}
        </ol>
      );
      continue;
    }

    out.push(
      <p key={key++} className="mb-2 text-sm text-muted-foreground">
        {inlineBold(trimmed)}
      </p>
    );
    i++;
  }

  return out;
}

function inlineBold(text: string) {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let idx = 0;
  while (remaining.length > 0) {
    const start = remaining.indexOf("**");
    if (start === -1) {
      parts.push(remaining);
      break;
    }
    const end = remaining.indexOf("**", start + 2);
    if (end === -1) {
      parts.push(remaining);
      break;
    }
    parts.push(remaining.slice(0, start));
    parts.push(
      <strong key={idx++} className="font-semibold text-foreground">
        {remaining.slice(start + 2, end)}
      </strong>
    );
    remaining = remaining.slice(end + 2);
  }
  return <>{parts}</>;
}

export default function Documentation() {
  const [search, setSearch] = useState("");
  const [raw, setRaw] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(DOC_URL)
      .then((r) => {
        if (!r.ok) throw new Error("Documentation not found.");
        return r.text();
      })
      .then(setRaw)
      .catch((err) => setError(err?.message ?? "Failed to load documentation."))
      .finally(() => setLoading(false));
  }, []);

  const content = useMemo(() => (raw ? renderDocContent(raw) : []), [raw]);
  const showContent = !search.trim() || raw.toLowerCase().includes(search.toLowerCase());

  return (
    <div className="min-h-screen bg-background font-body">
      <header className="sticky top-0 z-30 border-b border-border bg-card px-4 py-3 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/" className="text-muted-foreground hover:text-foreground">
                <ChevronLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              <h1 className="font-display text-lg font-bold text-foreground sm:text-xl">
                Iska Service OS — Documentation
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <List className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search in doc..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 text-sm"
              />
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/admin">Admin</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/platform">Platform</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
        {loading && (
          <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
            Loading documentation...
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-6 text-center">
            <p className="text-sm font-medium text-destructive">{error}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              File: <code className="rounded bg-muted px-1">{DOC_URL}</code> (in <code className="rounded bg-muted px-1">public/docs</code>).
            </p>
            <Button variant="outline" size="sm" className="mt-4" asChild>
              <Link to="/">Back to Home</Link>
            </Button>
          </div>
        )}

        {!loading && !error && raw && (
          <ScrollArea className="h-[calc(100vh-12rem)]">
            {search.trim() && !showContent && (
              <p className="mb-4 text-sm text-muted-foreground">No match for &quot;{search}&quot; in this document.</p>
            )}
            <article className="prose prose-sm dark:prose-invert max-w-none">
              {content}
            </article>
          </ScrollArea>
        )}
      </main>
    </div>
  );
}
