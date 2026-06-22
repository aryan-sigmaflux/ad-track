"use client";

import Link from "next/link";
import { Users } from "lucide-react";
import { clientToSlug, OTHERS_SLUG, type ClientCategory } from "@/lib/filters";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function CategoriesButton({ categories }: { categories: ClientCategory[] }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" size="sm" className="rounded-full">
            <Users className="size-4" strokeWidth={1.5} />
            <span className="hidden sm:inline">Clients</span>
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-56">
        {categories.length === 0 ? (
          <DropdownMenuItem disabled>No clients yet</DropdownMenuItem>
        ) : (
          categories.map((cat) => (
            <DropdownMenuItem
              key={cat.client ?? OTHERS_SLUG}
              render={
                <Link href={`/clients/${clientToSlug(cat.client)}`}>
                  <span className="truncate">{cat.label}</span>
                  <span className="ml-auto pl-2 text-xs text-muted-foreground">{cat.count}</span>
                </Link>
              }
            />
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
