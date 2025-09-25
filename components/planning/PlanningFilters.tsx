'use client';

import { ReactNode } from 'react';
import { Grid, Flex, TabGroup, TabList, Tab, MultiSelect, MultiSelectItem, TextInput, Select, SelectItem } from '@tremor/react';
import { DateRangePicker as TremorDatePicker } from '@/components/DatePicker';
import { de } from 'date-fns/locale';
import { Switch } from '@/components/ui/switch';

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
    <div className="bg-white rounded-2xl border border-gray-100 shadow-lg hover:shadow-2xl hover:border-emerald-200 relative z-30 overflow-visible">
      <div className="grid grid-cols-1 gap-4 border-b border-gray-200 p-6 sm:grid-cols-2 md:grid-cols-4">
        <div className="w-full">
          <label className="text-tremor-default font-medium text-gray-900">Zeitraum</label>
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
          <label className="text-tremor-default font-medium text-gray-900">Kategorien</label>
          <div className="mt-2 relative z-40">
            <MultiSelect
              className="w-full"
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
          <label className="text-tremor-default font-medium text-gray-900">Beschreibung</label>
          <div className="mt-2 relative z-30">
            <TextInput
              className="w-full"
              value={searchText}
              onValueChange={onSearch as any}
              placeholder="Beschreibung suchen"
              icon={SearchIcon as any}
            />
          </div>
        </div>
        <div className="w-full">
          <label className="text-tremor-default font-medium text-gray-900">Sortierung</label>
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
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <Switch checked={showIncoming} onCheckedChange={onToggleIncoming as any} />
            Eingehend
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <Switch checked={showOutgoing} onCheckedChange={onToggleOutgoing as any} />
            Ausgehend
          </label>
          <div className="ml-auto">
            <button onClick={onNewTransaction} className="inline-flex items-center justify-center text-sm font-medium ring-offset-background h-9 px-3 py-2 bg-vaios-primary text-white rounded-md hover:bg-vaios-primary/90 transition-colors">
              Neue Transaktion
            </button>
          </div>
        </Flex>
      </div>

      <div className="absolute inset-x-0 bottom-0 -mb-1 h-10 rounded-b-2xl bg-gradient-to-t from-white via-white to-transparent" />
    </div>
  );
}


