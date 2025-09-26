'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { DateRangePicker, type DateRange } from '@/components/DatePicker';
import { addMonths } from 'date-fns';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/Toggle';
import { RiAddLine, RiSubtractLine, RiPushpin2Line, RiUser3Line, RiMagicLine, RiEdit2Line, RiCoinsLine } from '@remixicon/react';
import { SearchInput } from '@/components/SearchInput';

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
  const categoryOptions = React.useMemo(() => ['Fixkosten','Lohn','Standard','Manuell','Simulation'] as const, []);
  const [categories, setCategories] = React.useState<string[]>([...categoryOptions]);
  const [isCatOpen, setIsCatOpen] = React.useState(false);
  const [directions, setDirections] = React.useState<string[]>(['incoming','outgoing']);
  const [query, setQuery] = React.useState('');
  const categoriesLabel = React.useMemo(() => {
    const total = categoryOptions.length;
    const count = categories.length;
    if (count === total) return 'Alle Kategorien';
    if (count === 0) return 'Keine Kategorie';
    return `${count} ausgewählt`;
  }, [categories, categoryOptions]);
  const renderCategoryIcon = (k: string) => {
    switch (k) {
      case 'Fixkosten':
        return <RiPushpin2Line className="h-4 w-4 text-blue-600" />;
      case 'Lohn':
        return <RiUser3Line className="h-4 w-4 text-amber-600" />;
      case 'Simulation':
        return <RiMagicLine className="h-4 w-4 text-purple-600" />;
      case 'Manuell':
        return <RiEdit2Line className="h-4 w-4 text-gray-600" />;
      default:
        return <RiCoinsLine className="h-4 w-4 text-slate-600" />;
    }
  };
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
      <div className="p-6 pt-0 flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-6 flex-wrap">
        <div>
          <label className="text-xs font-medium text-gray-900 dark:text-gray-50 leading-none">Zeitraum</label>
          <div className="mt-2 w-60 h-9">
            <DateRangePicker value={dateRange} onChange={setDateRange} className="w-60" presets={presets} />
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-900 dark:text-gray-50 leading-none">Suche</label>
          <div className="mt-2">
            <SearchInput
              value={query}
              onChange={(v) => {
                setQuery(v);
                const ev = new CustomEvent('planning:search', { detail: v });
                window.dispatchEvent(ev);
              }}
              placeholder="Volltext"
              debounceMs={300}
            />
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-900 dark:text-gray-50 leading-none">Kategorien</label>
          <div className="mt-2">
            <DropdownMenu open={isCatOpen} onOpenChange={handleCatOpenChange}>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className={
                    `peer inline-flex items-center gap-x-2 rounded-md border h-9 px-3 text-sm shadow-xs outline-hidden transition-all ` +
                    `bg-white dark:bg-gray-950 border-gray-300 dark:border-gray-800 text-gray-700 dark:text-gray-300 ` +
                    `hover:bg-gray-50 dark:hover:bg-gray-900/60`
                  }
                >
                  {categoriesLabel}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Filter</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem
                  checked={categories.length === categoryOptions.length}
                  onSelect={(e)=> e.preventDefault()}
                  onCheckedChange={(v)=> {
                    if (v) setCategories([...categoryOptions]);
                    else setCategories([]);
                  }}
                >
                  Alle
                </DropdownMenuCheckboxItem>
                <DropdownMenuSeparator />
                {categoryOptions.map((k) => (
                  <DropdownMenuCheckboxItem
                    key={k}
                    checked={categories.includes(k)}
                    onSelect={(e) => e.preventDefault()}
                    onCheckedChange={(v) => {
                      setCategories((prev) => v ? Array.from(new Set([...prev,k])) : prev.filter(x=>x!==k));
                    }}
                    className="flex items-center gap-2"
                  >
                    <span className="inline-flex items-center gap-2">
                      {renderCategoryIcon(k)}
                      <span>{k}</span>
                    </span>
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-900 dark:text-gray-50 leading-none">Richtung</label>
          <div className="mt-2">
            <ToggleGroup type="multiple" className="gap-2" value={directions} onValueChange={(v) => {
              setDirections(v);
              const ev = new CustomEvent('planning:direction', { detail: v });
              window.dispatchEvent(ev);
            }}>
              <ToggleGroupItem
                value="incoming"
                aria-label="Einnahmen"
                className="data-[state=on]:bg-emerald-100 data-[state=on]:text-emerald-700"
              >
                <RiAddLine className="size-4 shrink-0" />
              </ToggleGroupItem>
              <ToggleGroupItem
                value="outgoing"
                aria-label="Ausgaben"
                className="data-[state=on]:bg-rose-100 data-[state=on]:text-rose-700"
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


