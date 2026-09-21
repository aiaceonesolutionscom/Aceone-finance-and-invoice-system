import { PageHeader } from "@/components/layout/header";
import { SearchBox } from "@/components/layout/search-box";
import { Pagination } from "@/components/layout/pagination";
import { ServiceForm } from "@/components/services/service-form";
import { ServiceTable } from "@/components/services/service-table";
import { listServicesPaginated } from "@/lib/db/queries/services";
import { paginationParams, totalPages as computeTotalPages } from "@/lib/pagination";

export default async function ServicesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q, page } = await searchParams;
  const { page: currentPage, limit, offset } = paginationParams(page);
  const { rows: services, total } = await listServicesPaginated(q, { limit, offset });

  return (
    <div>
      <PageHeader
        title="Services"
        description="Your service catalog — names only, no rates or categories."
      />
      <div className="space-y-6">
        <ServiceForm />
        <SearchBox action="/services" defaultValue={q} placeholder="Search services..." />
        <ServiceTable services={services} />
        <Pagination basePath="/services" currentPage={currentPage} totalPages={computeTotalPages(total)} extraParams={{ q }} />
      </div>
    </div>
  );
}
