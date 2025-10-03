'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { DateRangePicker, type DateRange } from '@/components/DatePicker';
import { addMonths, addDays, endOfMonth } from 'date-fns';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import * as Tooltip from '@radix-ui/react-tooltip';
import { ToggleGroup, ToggleGroupItem } from '@/components/Toggle';
import { RiAddLine, RiSubtractLine, RiPushpin2Line, RiUser3Line, RiMagicLine, RiEdit2Line, RiCoinsLine, RiRefreshLine } from '@remixicon/react';
import { SearchInput } from '@/components/SearchInput';

export default function PlanningFilters() {
  // Default: 6 Monate ab morgen (heute wird ignoriert)
  const tomorrow = React.useMemo(() => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(0,0,0,0); return d; }, []);
  const todayStart = React.useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);
  const defaultRange: DateRange = React.useMemo(() => ({ from: tomorrow, to: addMonths(tomorrow, 6) }), [tomorrow]);
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(defaultRange);
  
  // emit custom event so page can pick up range changes
  React.useEffect(() => {
    if (!dateRange?.from || !dateRange?.to) return;
    const ev = new CustomEvent('planning:date-range', { detail: dateRange });
    window.dispatchEvent(ev);
  }, [dateRange]);
  const presets = React.useMemo(() => {
    const nextPayroll = () => {
      const now = new Date();
      const thisMonth25 = new Date(now.getFullYear(), now.getMonth(), 25);
      thisMonth25.setHours(0,0,0,0);
      const to = now.getDate() <= 25 ? thisMonth25 : new Date(now.getFullYear(), now.getMonth() + 1, 25);
      to.setHours(0,0,0,0);
      return to;
    };
    return [
      { label: 'Nächste 7 Tage', dateRange: { from: tomorrow, to: addDays(tomorrow, 7) } },
      { label: '1 Monat', dateRange: { from: tomorrow, to: addMonths(tomorrow, 1) } },
      { label: '6 Monate', dateRange: { from: tomorrow, to: addMonths(tomorrow, 6) } },
      { label: '9 Monate', dateRange: { from: tomorrow, to: addMonths(tomorrow, 9) } },
      { label: '12 Monate', dateRange: { from: tomorrow, to: addMonths(tomorrow, 12) } },
      { label: 'Restlicher Monat', dateRange: { from: tomorrow, to: endOfMonth(tomorrow) } },
      { label: 'Heute → nächste Lohnzahlung (25.)', dateRange: { from: todayStart, to: nextPayroll() } },
    ];
  }, [tomorrow, todayStart]);
  const categoryOptions = React.useMemo(() => ['Fixkosten','Lohn','Standard','Manual','Simulation'] as const, []);
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
  const labelForCategory = (k: string) => (k === 'Manual' ? 'Manuell' : k);
  const resetFilters = () => {
    const newRange = { from: tomorrow, to: addMonths(tomorrow, 6) } as DateRange;
    setDateRange(newRange);
    const allCats = [...categoryOptions];
    setCategories(allCats);
    setIsCatOpen(false);
    window.dispatchEvent(new CustomEvent('planning:categories', { detail: allCats }));
    const both = ['incoming','outgoing'];
    setDirections(both);
    window.dispatchEvent(new CustomEvent('planning:direction', { detail: both }));
    setQuery('');
    window.dispatchEvent(new CustomEvent('planning:search', { detail: '' }));
    
  };
  const renderCategoryIcon = (k: string) => {
    switch (k) {
      case 'Fixkosten':
        return <RiPushpin2Line className="h-4 w-4 text-sky-600" />;
      case 'Lohn':
        return <RiUser3Line className="h-4 w-4 text-amber-600" />;
      case 'Simulation':
        return <RiMagicLine className="h-4 w-4 text-violet-600" />;
      case 'Manual':
        return <RiEdit2Line className="h-4 w-4 text-orange-600" />;
      default:
        return <RiCoinsLine className="h-4 w-4 text-stone-600" />;
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
      <div className="p-6 pt-0 grid grid-cols-1 sm:flex sm:flex-row sm:items-end gap-3 sm:gap-6">
        <div>
          <label className="text-xs font-medium text-gray-900 dark:text-gray-50 leading-none">Zeitraum</label>
          <div className="mt-2 w-full sm:w-60 h-9">
            <DateRangePicker value={dateRange} onChange={setDateRange} className="w-full sm:w-60" presets={presets} />
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-900 dark:text-gray-50 leading-none">Suche</label>
          <div className="mt-2 w-full">
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
                    `peer inline-flex items-center gap-x-2 rounded-md border h-9 px-3 text-sm shadow-xs outline-hidden transition-all w-60 ` +
                    `bg-white dark:bg-gray-950 border-gray-300 dark:border-gray-800 text-gray-700 dark:text-gray-300 ` +
                    `hover:bg-gray-50 dark:hover:bg-gray-900/60`
                  }
                >
                  {categoriesLabel}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-60">
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
                      <span>{labelForCategory(k)}</span>
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
                className="data-[state=on]:bg-emerald-100 data-[state=on]:text-emerald-700 cursor-pointer"
              >
                <RiAddLine className="size-4 shrink-0" />
              </ToggleGroupItem>
              <ToggleGroupItem
                value="outgoing"
                aria-label="Ausgaben"
                className="data-[state=on]:bg-rose-100 data-[state=on]:text-rose-700 cursor-pointer"
              >
                <RiSubtractLine className="size-4 shrink-0" />
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>
        <div className="sm:ml-auto">
          <div className="mt-2">
            <Tooltip.Provider delayDuration={100}>
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <Button variant="outline" className="h-9 w-9 p-0 inline-flex items-center justify-center" onClick={resetFilters} aria-label="Filter zurücksetzen">
                    <RiRefreshLine className="h-4 w-4" />
                  </Button>
                </Tooltip.Trigger>
                <Tooltip.Content sideOffset={6} className="rounded-md border bg-white px-2 py-1 text-xs shadow-md text-gray-700">
                  Filter zurücksetzen
                </Tooltip.Content>
              </Tooltip.Root>
            </Tooltip.Provider>
          </div>
        </div>
      </div>
    </Card>
  );
}


