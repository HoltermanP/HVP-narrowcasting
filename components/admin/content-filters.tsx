"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import {
  CONTENT_TYPE_LABELS,
  CONTENT_STATUS_LABELS,
  CONTENT_TYPES,
} from "@/lib/content";
import type { ContentStatus } from "@prisma/client";

const ALL = "all";

export function ContentFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const setParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === ALL) params.delete(key);
    else params.set(key, value);
    router.replace(`${pathname}?${params.toString()}`);
  };

  const hasFilters =
    searchParams.has("type") ||
    searchParams.has("status") ||
    searchParams.has("period");

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={searchParams.get("type") ?? ALL}
        onValueChange={(v) => setParam("type", v)}
      >
        <SelectTrigger className="w-44 bg-white">
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Alle types</SelectItem>
          {CONTENT_TYPES.map((type) => (
            <SelectItem key={type} value={type}>
              {CONTENT_TYPE_LABELS[type]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={searchParams.get("status") ?? ALL}
        onValueChange={(v) => setParam("status", v)}
      >
        <SelectTrigger className="w-44 bg-white">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Alle statussen</SelectItem>
          {(Object.keys(CONTENT_STATUS_LABELS) as ContentStatus[]).map(
            (status) => (
              <SelectItem key={status} value={status}>
                {CONTENT_STATUS_LABELS[status]}
              </SelectItem>
            )
          )}
        </SelectContent>
      </Select>

      <Select
        value={searchParams.get("period") ?? ALL}
        onValueChange={(v) => setParam("period", v)}
      >
        <SelectTrigger className="w-48 bg-white">
          <SelectValue placeholder="Publicatieperiode" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Alle periodes</SelectItem>
          <SelectItem value="current">Nu actief</SelectItem>
          <SelectItem value="upcoming">Toekomstig</SelectItem>
          <SelectItem value="expired">Verlopen</SelectItem>
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.replace(pathname)}
        >
          <X className="h-4 w-4" />
          Wis filters
        </Button>
      )}
    </div>
  );
}
