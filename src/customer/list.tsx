"use client";

import { CustomerWithMembership } from "@/customer/types";
import { useMemo, useState } from "react";
import SearchIcon from "@/components/icons/search";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { MembershipTranslation } from "@/assistance/consts";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import EyeIcon from "@/components/icons/eye";
import { X } from "lucide-react";
import Link from "next/link";
import { CUSTOMER } from "@/consts/routes";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  customers: CustomerWithMembership[];
}

export default function ListCustomers({ customers }: Props) {
  const [query, setQuery] = useState("");

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  };

  const customerFiltered = useMemo(() => {
    return customers.filter((customer) => {
      const fullName =
        `${customer.first_name} ${customer.last_name}`.toLowerCase();

      return fullName.includes(query.toLowerCase());
    });
  }, [customers, query]);
  const hasCustomers = customerFiltered.length > 0;

  return (
    <>
      <div className="bg-background sticky top-0 pb-1 mt-2 sm:mt-6">
        <Input
          autoComplete={"off"}
          className="py-2 pl-0 mb-0"
          componentLeft={<SearchIcon className="size-6 text-primary200" />}
          componentRight={
            query && (
              <Button
                className="h-6 w-6 p-0 hover:bg-transparent hover:text-primary text-primary200"
                size="icon"
                type="button"
                variant="ghost"
                onClick={() => setQuery("")}
              >
                <X className="h-4 w-4" />
              </Button>
            )
          }
          placeholder="Búsqueda de clientes"
          value={query}
          variant={"line"}
          onChange={onChange}
        />
      </div>
      <ul className="mt-6">
        {!hasCustomers && (
          <li className="text-center text-sm text-muted-foreground py-4">
            No se encontraron clientes con el nombre{" "}
            <span className="font-medium">{query}</span>
          </li>
        )}
        {hasCustomers &&
          customerFiltered.map((customer, index) => {
            const isLast = index === customers.length - 1;

            return (
              <li
                key={customer.id}
                className={cn(
                  "grid grid-cols-[1fr_auto] border-b-[0.5px] px-2 py-1 items-center",
                  isLast && "border-b-0"
                )}
              >
                <div className="grid grid-cols-1">
                  <span className="leading-6 text-sm font-medium">
                    {`${customer.first_name} ${customer.last_name}`}
                  </span>
                  <Label className="font-light text-xs leading-6">
                    {customer.membership_type
                      ? MembershipTranslation[customer.membership_type]
                      : "Sin membresía"}
                  </Label>
                </div>
                <Button className="size-6" size={"icon"} variant={"ghost"}>
                  <Link href={`${CUSTOMER}/${customer.id}`}>
                    <EyeIcon className="size-6" />
                  </Link>
                </Button>
              </li>
            );
          })}
      </ul>
    </>
  );
}

export function CustomerListLoading() {
  return (
    <>
      <div className="bg-background sticky top-0 pb-1 mt-6">
        <Input
          disabled
          autoComplete={"off"}
          className="py-2 pl-0 mb-0"
          componentLeft={<SearchIcon className="size-6 text-primary200" />}
          placeholder="Búsqueda de clientes"
          variant={"line"}
        />
      </div>
      <ul className="mt-6">
        {Array.from({ length: 10 }).map((_, index) => {
          const isLast = index === 9;

          return (
            <li
              key={index}
              className={cn(
                "grid grid-cols-[1fr_auto] border-b-[0.5px] px-2 py-1 items-center",
                isLast && "border-b-0"
              )}
            >
              <div className="grid grid-cols-1">
                <Skeleton className="h-5 w-3/4 sm:w-2/4 mb-2" />
                <Skeleton className="h-5 w-2/4 sm:w-1/4" />
              </div>
              <Skeleton className="h-6 w-6 rounded-full" />
            </li>
          );
        })}
      </ul>
    </>
  );
}
