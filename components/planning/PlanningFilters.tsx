'use client';

import { ReactNode } from 'react';
import {
  Grid,
  Flex,
  TabGroup,
  TabList,
  Tab,
  DateRangePicker,
  MultiSelect,
  MultiSelectItem,
  TextInput,
  Select,
  SelectItem,
} from '@tremor/react';
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
    <div className="bg-white rounded-2xl border border-gray-100 shadow-lg hover:shadow-2xl hover:border-emerald-200 p-6 relative z-30 overflow-visible">
      <Flex className="mb-4 items-center">
        <div className="inline-flex items-center gap-2">
          <span className="p-2 rounded-lg bg-blue-100">
            <svg className="w-4 h-4 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 4h18M3 10h18M3 16h18"/></svg>
          </span>
          <span className="text-sm text-gray-600">Filter</span>
        </div>
        <div className="ml-auto">
          <button onClick={onNewTransaction} className="inline-flex items-center justify-center text-sm font-medium ring-offset-background h-9 px-3 py-2 bg-vaios-primary text-white rounded-md hover:bg-vaios-primary/90 transition-colors">
            Neue Transaktion
          </button>
        </div>
      </Flex>

      <Grid numItemsSm={1} numItemsLg={3} className="gap-4">
        <div>
          <TabGroup index={["monthly","quarterly","yearly"].indexOf(activeTab)} onIndexChange={(i)=>onTabChange(["monthly","quarterly","yearly"][i] as Props['activeTab'])}>
            <TabList>
              <Tab>3 Monate</Tab>
              <Tab>9 Monate</Tab>
              <Tab>1 Jahr</Tab>
            </TabList>
          </TabGroup>
        </div>
        <div className="relative z-40">
          <DateRangePicker
            className="w-full"
            value={{ from: startDate as any, to: endDate as any }}
            onValueChange={(v: { from?: Date|string; to?: Date|string }) => {
              if (v?.from) onDateRangeChange(new Date(v.from), endDate);
              if (v?.to) onDateRangeChange(startDate, new Date(v.to));
            }}
            enableSelect={false}
            placeholder="Zeitraum wählen"
            color="emerald"
          />
        </div>
        <div className="relative z-30">
          <TextInput
            className="w-full"
            value={searchText}
            onValueChange={onSearch as any}
            placeholder="Beschreibung suchen"
            icon={SearchIcon as any}
          />
        </div>
      </Grid>

      <Grid numItemsSm={1} numItemsLg={3} className="gap-4 mt-4">
        <div className="relative z-40">
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
        <Flex justifyContent="start" alignItems="center" className="gap-6">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <Switch checked={showIncoming} onCheckedChange={onToggleIncoming as any} />
            Eingehend
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <Switch checked={showOutgoing} onCheckedChange={onToggleOutgoing as any} />
            Ausgehend
          </label>
        </Flex>
        <div>
          <Select className="w-full" value={sortOption} onValueChange={(v: any)=>onSortChange(v)}>
            <SelectItem value="date-asc">Datum ↑</SelectItem>
            <SelectItem value="date-desc">Datum ↓</SelectItem>
            <SelectItem value="amount-asc">Betrag ↑</SelectItem>
            <SelectItem value="amount-desc">Betrag ↓</SelectItem>
          </Select>
        </div>
      </Grid>
    </div>
  );
}


