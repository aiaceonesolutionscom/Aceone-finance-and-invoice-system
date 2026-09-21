import Link from "next/link";
import { Plus, Pencil, Receipt } from "lucide-react";
import { PageHeader } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DeleteCustomerButton } from "@/components/customers/delete-customer-button";
import { SearchBox } from "@/components/layout/search-box";
import { Pagination } from "@/components/layout/pagination";
import { listCustomers } from "@/lib/db/queries/customers";
import { formatMoney } from "@/lib/money";
import { paginationParams, totalPages as computeTotalPages } from "@/lib/pagination";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q, page } = await searchParams;
  const { page: currentPage, limit, offset } = paginationParams(page);
  const { rows: customers, total } = await listCustomers(q, { limit, offset });

  return (
    <div>
      <PageHeader
        title="Customers"
        actions={
          <Button render={<Link href="/customers/new" />}>
            <Plus className="size-4" />
            Add Customer
          </Button>
        }
      />

      <SearchBox action="/customers" defaultValue={q} placeholder="Search by name, company, email, phone..." />

      {customers.length === 0 ? (
        <div className="flex h-64 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
          {q ? "No customers match your search." : "No customers yet. Add your first customer to get started."}
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="text-right">Outstanding</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell>
                    <Link
                      href={`/customers/${customer.id}`}
                      className="font-medium underline-offset-2 hover:underline"
                    >
                      {customer.customerName}
                    </Link>
                  </TableCell>
                  <TableCell>{customer.companyName ?? "—"}</TableCell>
                  <TableCell>{customer.email ?? "—"}</TableCell>
                  <TableCell>{customer.phone ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    {customer.outstanding.gt(0) ? (
                      <span className="font-medium text-amber-700 dark:text-amber-400">
                        {formatMoney(customer.outstanding)}
                      </span>
                    ) : (
                      formatMoney(customer.outstanding)
                    )}
                  </TableCell>
                  <TableCell className="flex justify-end gap-1">
                    <Button
                      render={<Link href={`/customers/${customer.id}`} />}
                      variant="ghost"
                      size="icon"
                      aria-label={`View invoices for ${customer.customerName}`}
                      title="View invoices"
                    >
                      <Receipt className="size-4" />
                    </Button>
                    <Button
                      render={<Link href={`/customers/${customer.id}/edit`} />}
                      variant="ghost"
                      size="icon"
                      aria-label={`Edit ${customer.customerName}`}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <DeleteCustomerButton id={customer.id} name={customer.customerName} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Pagination basePath="/customers" currentPage={currentPage} totalPages={computeTotalPages(total)} extraParams={{ q }} />
    </div>
  );
}
