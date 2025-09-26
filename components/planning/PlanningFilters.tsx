'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { DateRangePicker, type DateRange } from '@/components/DatePicker';
import { addMonths } from 'date-fns';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/Toggle';
import { RiAddLine, RiSubtractLine } from '@remixicon/react';

export default function PlanningFilters() {
  // Default: 6 Monate ab morgen
  const tomorrow = React.useMemo(() => {
    const t = new Date(); t.setDate(t.getDate() + 1); t.setHours(0,0,0,0); return t;
  }, []);
  const defaultRange: DateRange = React.useMemo(() => ({ from: tomorrow, to: addMonths(tomorrow, 6) }), [tomorrow]);
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(defaultRange);
  // emit custom event so page can pick up range changes
  React.useEffect(() => {
    if (!dateRange?.from || !dateRange?.to) return;
    const ev = new CustomEvent('planning:date-range', { detail: dateRange });
    window.dispatchEvent(ev);
  }, [dateRange]);
  const presets = React.useMemo(() => ([
    { label: '6 Monate', dateRange: { from: tomorrow, to: addMonths(tomorrow, 6) } },
    { label: '9 Monate', dateRange: { from: tomorrow, to: addMonths(tomorrow, 9) } },
    { label: '12 Monate', dateRange: { from: tomorrow, to: addMonths(tomorrow, 12) } },
  ]), [tomorrow]);
  const [categories, setCategories] = React.useState<string[]>(['Fixkosten','Lohn','Standard','Manual','Simulation']);
  const [isCatOpen, setIsCatOpen] = React.useState(false);
  const [directions, setDirections] = React.useState<string[]>(['incoming','outgoing']);
  // handler: keep menu open while toggling; dispatch filter once when closing
  const handleCatOpenChange = (open: boolean) => {
    if (!open) {
      const ev = new CustomEvent('planning:categories', { detail: categories });
      window.dispatchEvent(ev);
    }
    setIsCatOpen(open);
  };
  return (
    <Card className="mx-auto">
      <div className="p-6 pt-0 flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-6">
        <div>
          <label className="text-xs font-medium text-gray-900 dark:text-gray-50">Zeitraum</label>
          <div className="mt-2 w-60">
            <DateRangePicker value={dateRange} onChange={setDateRange} className="w-60" presets={presets} />
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-900 dark:text-gray-50">Kategorien</label>
          <div className="mt-2">
            <DropdownMenu open={isCatOpen} onOpenChange={handleCatOpenChange}>
              <DropdownMenuTrigger asChild>
                <Button className="bg-[#CEFF65] text-[#02403D] hover:bg-[#C2F95A] border border-[#CEFF65]">Kategorien wählen</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Filter</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {['Fixkosten','Lohn','Standard','Manual','Simulation'].map((k) => (
                  <DropdownMenuCheckboxItem
                    key={k}
                    checked={categories.includes(k)}
                    onSelect={(e) => e.preventDefault()}
                    onCheckedChange={(v) => {
                      setCategories((prev) => v ? Array.from(new Set([...prev,k])) : prev.filter(x=>x!==k));
                    }}
                  >
                    {k}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-900 dark:text-gray-50">Richtung</label>
          <div className="mt-2">
            <ToggleGroup type="multiple" value={directions} onValueChange={(v) => {
              setDirections(v);
              const ev = new CustomEvent('planning:direction', { detail: v });
              window.dispatchEvent(ev);
            }}>
              <ToggleGroupItem
                value="incoming"
                aria-label="Einnahmen"
                className="data-[state=on]:bg-emerald-100 data-[state=on]:text-emerald-700 data-[state=on]:border-emerald-200"
              >
                <RiAddLine className="size-4 shrink-0" />
              </ToggleGroupItem>
              <ToggleGroupItem
                value="outgoing"
                aria-label="Ausgaben"
                className="data-[state=on]:bg-rose-100 data-[state=on]:text-rose-700 data-[state=on]:border-rose-200"
              >
                <RiSubtractLine className="size-4 shrink-0" />
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>
      </div>
    </Card>
  );
}


