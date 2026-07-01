import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Megaphone, Pin } from "lucide-react";
import { getNotices } from "@/lib/notices.functions";
import { PageHeader, Card, EmptyState, Spinner } from "@/components/app/ui";

export const Route = createFileRoute("/_authenticated/notices")({
  component: NoticeBoard,
});

function NoticeBoard() {
  const listFn = useServerFn(getNotices);
  const { data: notices, isLoading } = useQuery({ queryKey: ["notices"], queryFn: () => listFn() });

  return (
    <div>
      <PageHeader title="Notice Board" description="Announcements from your society committee." />
      {isLoading ? (
        <Spinner />
      ) : (notices?.length ?? 0) === 0 ? (
        <EmptyState icon={Megaphone} title="No notices yet" description="Society announcements will appear here." />
      ) : (
        <div className="space-y-4">
          {notices!.map((n) => (
            <Card key={n.id} className={n.isImportant ? "border-primary/40 bg-accent/30" : ""}>
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-semibold text-foreground">{n.title}</h3>
                {n.isImportant && (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                    <Pin className="h-3 w-3" /> Important
                  </span>
                )}
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-foreground/90">{n.body}</p>
              <p className="mt-3 text-xs text-muted-foreground">{new Date(n.createdAt).toLocaleString()}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
