import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function AnalyticsSkeleton() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-20" />
            ))}
          </div>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-28" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-6 w-6 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-36" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-5 w-12" />
                </div>
                <Skeleton className="mt-2 h-3 w-40" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-5 w-16" />
              </div>
              <Skeleton className="mt-2 h-3 w-52" />
              <Skeleton className="mt-1 h-3 w-32" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
