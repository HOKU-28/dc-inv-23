import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function SkeletonCard({ rows = 3 }: { rows?: number }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-4 w-1/2" />
      </CardHeader>
      <CardContent className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </CardContent>
    </Card>
  );
}

export function SkeletonForm({ fields = 4 }: { fields?: number }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-4 w-2/3" />
      </CardHeader>
      <CardContent className="space-y-4">
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
        <Skeleton className="h-10 w-full" />
      </CardContent>
    </Card>
  );
}

export function SkeletonTable({ columns = 5, rows = 4 }: { columns?: number; rows?: number }) {
  return (
    <div className="rounded-md border overflow-x-auto">
      <div className="min-w-[600px]">
        <div className="border-b bg-muted/50 px-4 py-3 grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
        <div className="divide-y">
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <div key={rowIndex} className="px-4 py-3 grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
              {Array.from({ length: columns }).map((_, colIndex) => (
                <Skeleton key={colIndex} className="h-4 w-full" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SkeletonList({ items = 4 }: { items?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: items }).map((_, i) => (
        <Skeleton key={i} className="h-20 w-full" />
      ))}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto max-w-md px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-md px-4 py-4 space-y-4">
        <Skeleton className="h-10 w-full" />
        <SkeletonCard rows={3} />
        <SkeletonCard rows={2} />
      </main>
    </div>
  );
}
