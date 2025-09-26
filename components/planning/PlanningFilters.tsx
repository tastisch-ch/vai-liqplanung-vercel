'use client';

import { ReactNode } from 'react';
import { Flex, TabGroup, TabList, Tab, MultiSelect, MultiSelectItem, TextInput, Select, SelectItem, Switch as TremorSwitch, Button } from '@tremor/react';
import { DateRangePicker as TremorDatePicker } from '@/components/DatePicker';
import { de } from 'date-fns/locale';

type Props = {
  activeTab: 'monthly' | 'quarterly' | 'yearly';
  onTabChange: (tab: 'monthly' | 'quarterly' | 'yearly') => void;
  startDate: Date;
  endDate: Date;
  onDateRangeChange: (from?: Date, to?: Date) => void;
  searchText: string;
  onSearch: (v: string) => void;
  selectedCategories: string[]; // ["Fixkosten","Lohn",...]
  onCategoriesChange: (vals: string[]) => void;
  showIncoming: boolean;
  onToggleIncoming: (v: boolean) => void;
  showOutgoing: boolean;
  onToggleOutgoing: (v: boolean) => void;
  sortOption: 'date-asc' | 'date-desc' | 'amount-asc' | 'amount-desc';
  onSortChange: (v: 'date-asc' | 'date-desc' | 'amount-asc' | 'amount-desc') => void;
  onNewTransaction: () => void;
  icon?: ReactNode;
};

function SearchIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

export default function PlanningFilters(props: Props) {
  const {
    activeTab,
    onTabChange,
    startDate,
    endDate,
    onDateRangeChange,
    searchText,
    onSearch,
    selectedCategories,
    onCategoriesChange,
    showIncoming,
    onToggleIncoming,
    showOutgoing,
    onToggleOutgoing,
    sortOption,
    onSortChange,
    onNewTransaction,
  } = props;

  return (
    <div className="relative rounded-tremor-default border border-tremor-border bg-tremor-background shadow-tremor-input dark:border-dark-tremor-border dark:bg-dark-tremor-background dark:shadow-dark-tremor-input z-30 overflow-visible pb-20 md:h-52">
      <div className="border-b border-tremor-border p-4 sm:p-6 dark:border-dark-tremor-border">
        <TabGroup index={(['monthly','quarterly','yearly'] as const).indexOf(activeTab)} onIndexChange={(i)=> onTabChange((['monthly','quarterly','yearly'] as const)[i])}>
          <TabList className="w-full overflow-x-auto">
            <Tab>3 Monate</Tab>
            <Tab>9 Monate</Tab>
            <Tab>1 Jahr</Tab>
          </TabList>
        </TabGroup>
      </div>

      <div className="grid grid-cols-1 gap-4 border-b border-tremor-border p-4 sm:p-6 sm:grid-cols-2 md:grid-cols-4 dark:border-dark-tremor-border">
        <div className="w-full">
          <label className="text-tremor-default font-medium text-tremor-content-strong dark:text-dark-tremor-content-strong">Zeitraum</label>
          <div className="mt-2 relative z-40">
            <TremorDatePicker
              className="w-full border-tremor-border dark:border-dark-tremor-border"
              value={{ from: startDate, to: endDate }}
              onChange={(r)=> onDateRangeChange(r?.from, r?.to)}
              enableYearNavigation
              toDate={new Date()}
              placeholder="Zeitraum wählen"
              translations={{ cancel: 'Abbrechen', apply: 'Übernehmen', range: 'Zeiträume' }}
              locale={de}
              presets={[
                { label: 'Heute', dateRange: { from: new Date(), to: new Date() } },
                { label: 'Letzte 7 Tage', dateRange: { from: new Date(new Date().setDate(new Date().getDate() - 6)), to: new Date() } },
                { label: 'Letzte 30 Tage', dateRange: { from: new Date(new Date().setDate(new Date().getDate() - 29)), to: new Date() } },
                { label: 'Monat bis heute', dateRange: { from: new Date(new Date().getFullYear(), new Date().getMonth(), 1), to: new Date() } },
                { label: 'Jahr bis heute', dateRange: { from: new Date(new Date().getFullYear(), 0, 1), to: new Date() } },
              ]}
            />
          </div>
        </div>
        <div className="w-full">
          <label className="text-tremor-default font-medium text-tremor-content-strong dark:text-dark-tremor-content-strong">Kategorien</label>
          <div className="mt-2 relative z-40">
            <MultiSelect
              className="w-full border-tremor-border dark:border-dark-tremor-border"
              placeholder="Kategorien filtern"
              value={selectedCategories}
              onValueChange={(vals: string[]) => onCategoriesChange(vals)}
              color="emerald"
            >
              <MultiSelectItem value="Fixkosten">Fixkosten</MultiSelectItem>
              <MultiSelectItem value="Lohn">Lohn</MultiSelectItem>
              <MultiSelectItem value="Standard">Standard</MultiSelectItem>
              <MultiSelectItem value="Manual">Manuell</MultiSelectItem>
              <MultiSelectItem value="Simulation">Simulation</MultiSelectItem>
            </MultiSelect>
          </div>
        </div>
        <div className="w-full">
          <label className="text-tremor-default font-medium text-tremor-content-strong dark:text-dark-tremor-content-strong">Beschreibung</label>
          <div className="mt-2 relative z-30">
            <TextInput
              className="w-full border-tremor-border dark:border-dark-tremor-border"
              value={searchText}
              onValueChange={onSearch as any}
              placeholder="Beschreibung suchen"
              icon={SearchIcon as any}
            />
          </div>
        </div>
        <div className="w-full">
          <label className="text-tremor-default font-medium text-tremor-content-strong dark:text-dark-tremor-content-strong">Sortierung</label>
          <div className="mt-2">
            <Select className="w-full" value={sortOption} onValueChange={(v: any)=>onSortChange(v)}>
              <SelectItem value="date-asc">Datum ↑</SelectItem>
              <SelectItem value="date-desc">Datum ↓</SelectItem>
              <SelectItem value="amount-asc">Betrag ↑</SelectItem>
              <SelectItem value="amount-desc">Betrag ↓</SelectItem>
            </Select>
          </div>
        </div>
      </div>

      <div className="p-6 pt-4">
        <Flex justifyContent="start" alignItems="center" className="gap-6">
          <label className="flex items-center gap-2 text-tremor-default text-tremor-content dark:text-dark-tremor-content">
            <TremorSwitch checked={showIncoming} onChange={onToggleIncoming as any} />
            Eingehend
          </label>
          <label className="flex items-center gap-2 text-tremor-default text-tremor-content dark:text-dark-tremor-content">
            <TremorSwitch checked={showOutgoing} onChange={onToggleOutgoing as any} />
            Ausgehend
          </label>
          <div className="ml-auto">
            <Button onClick={onNewTransaction}>Neue Transaktion</Button>
          </div>
        </Flex>
      </div>
      <div className="absolute inset-x-0 bottom-0 -mb-1 h-14 rounded-b-tremor-default bg-gradient-to-t from-tremor-background via-tremor-background to-transparent dark:from-gray-950 dark:via-gray-950 dark:to-transparent" />
    </div>
  );
}


