import { Container } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/feedback";

export function ListLoading() {
  return (
    <Container>
      <div className="py-12" role="status" aria-label="불러오는 중">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="mt-4 h-4 w-1/2" />
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    </Container>
  );
}
