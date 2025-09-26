'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card } from '@tremor/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import * as Popover from '@radix-ui/react-popover';
import { Calendar } from '@/components/Calendar';
import { format, parse, isValid } from 'date-fns';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { RiCalendar2Line, RiAddLine, RiSubtractLine } from '@remixicon/react';

interface TransactionFormData {
  date: string;
  amount: string | number;
  direction: 'Incoming' | 'Outgoing';
  details: string;
  is_simulation: boolean;
}

interface TransactionFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    date: string;
    amount: number;
    direction: 'Incoming' | 'Outgoing';
    details: string;
    is_simulation: boolean;
  }) => void;
  initialData?: TransactionFormData;
}

const defaultFormData: TransactionFormData = {
  // Default to tomorrow; Planung startet ab morgen
  date: (() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  })(),
  amount: '',
  direction: 'Outgoing',
  details: '',
  is_simulation: false,
};

export function TransactionForm({ isOpen, onClose, onSubmit, initialData }: TransactionFormProps) {
  const [formData, setFormData] = useState<TransactionFormData>(defaultFormData);

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData(defaultFormData);
    }
  }, [initialData, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      amount: Number(formData.amount),
      date: new Date(formData.date).toISOString(),
    });
  };

  const handleClose = () => {
    setFormData(defaultFormData);
    onClose();
  };

  const parsedDate = (() => {
    try {
      return formData.date ? new Date(formData.date) : null;
    } catch {
      return null;
    }
  })();
  const [dateOpen, setDateOpen] = useState(false);
  const [dateText, setDateText] = useState<string>(parsedDate ? format(parsedDate, 'dd.MM.yyyy') : '');
  const [dateError, setDateError] = useState(false);

  useEffect(() => {
    const d = (() => {
      try { return formData.date ? new Date(formData.date) : null; } catch { return null; }
    })();
    setDateText(d ? format(d, 'dd.MM.yyyy') : '');
    setDateError(false);
  }, [formData.date, isOpen]);

  const commitDateText = () => {
    const tryFormats = ['dd.MM.yyyy', 'd.M.yyyy', 'd.M.yy', 'yyyy-MM-dd'];
    let parsed: Date | null = null;
    for (const f of tryFormats) {
      const p = parse(dateText, f, new Date());
      if (isValid(p)) { parsed = p; break; }
    }
    if (!parsed) { setDateError(true); return; }
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    setFormData({ ...formData, date: `${y}-${m}-${day}` });
    setDateText(format(parsed, 'dd.MM.yyyy'));
    setDateError(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[560px] p-0 overflow-hidden">
        <Card className="shadow-none border-0 !p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-gray-50">
              {initialData ? 'Transaktion bearbeiten' : 'Neue Transaktion'}
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-500 dark:text-gray-400">
              Bitte Felder ausfüllen. Simulation ist optional.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2 mt-3">
            <Label htmlFor="date" className="text-xs font-medium text-gray-900 dark:text-gray-50 leading-none">Datum</Label>
            <Popover.Root open={dateOpen} onOpenChange={setDateOpen}>
              <div className="relative">
                <RiCalendar2Line className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <Popover.Trigger asChild>
                  <Input
                    id="date"
                    type="text"
                    placeholder="dd.mm.yyyy"
                    value={dateText}
                    onChange={(e) => { setDateText(e.target.value); setDateError(false); }}
                    onFocus={() => setDateOpen(true)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commitDateText(); setDateOpen(false); } }}
                    onBlur={() => commitDateText()}
                    className={`h-11 text-base pl-9 ${dateError ? 'ring-2 ring-red-200 border-red-500' : ''}`}
                  />
                </Popover.Trigger>
              </div>
              <Popover.Content sideOffset={8} className="z-50 rounded-md border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-800 dark:bg-gray-950">
                <Calendar
                  mode="single"
                  numberOfMonths={1}
                  weekStartsOn={1}
                  selected={parsedDate ?? undefined}
                  onSelect={(d: Date | undefined) => {
                    if (!d) return;
                    const y = d.getFullYear();
                    const m = String(d.getMonth() + 1).padStart(2, '0');
                    const day = String(d.getDate()).padStart(2, '0');
                    setFormData({ ...formData, date: `${y}-${m}-${day}` });
                    setDateText(format(d, 'dd.MM.yyyy'));
                    setDateError(false);
                    setDateOpen(false);
                  }}
                  className="rdp-tremor"
                />
              </Popover.Content>
            </Popover.Root>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount" className="text-xs font-medium text-gray-900 dark:text-gray-50 leading-none">Betrag</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                required
                className="h-11 text-base px-4"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-gray-900 dark:text-gray-50 leading-none">Richtung</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className={`peer inline-flex items-center gap-x-2 rounded-md border h-11 px-3 text-base shadow-xs outline-hidden transition-all w-full bg-white dark:bg-gray-950 border-gray-300 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900/60`}
                  >
                    {formData.direction === 'Incoming' ? (
                      <>
                        <RiAddLine className="h-4 w-4 text-emerald-600" />
                        <span>Eingehend</span>
                      </>
                    ) : (
                      <>
                        <RiSubtractLine className="h-4 w-4 text-rose-600" />
                        <span>Ausgehend</span>
                      </>
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56">
                  <DropdownMenuItem onClick={() => setFormData({ ...formData, direction: 'Incoming' })}>
                    <RiAddLine className="mr-2 h-4 w-4 text-emerald-600" /> Eingehend
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFormData({ ...formData, direction: 'Outgoing' })}>
                    <RiSubtractLine className="mr-2 h-4 w-4 text-rose-600" /> Ausgehend
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="details" className="text-xs font-medium text-gray-900 dark:text-gray-50 leading-none">Details</Label>
            <Input
              id="details"
              value={formData.details}
              onChange={(e) => setFormData({ ...formData, details: e.target.value })}
              required
              className="h-11 text-base px-4"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="simulation"
              checked={formData.is_simulation}
              onCheckedChange={(checked) => 
                setFormData({ ...formData, is_simulation: checked })
              }
            />
            <Label htmlFor="simulation" className="text-xs font-medium text-gray-900 dark:text-gray-50 leading-none">Als Simulation markieren</Label>
          </div>

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={handleClose}>
                Abbrechen
              </Button>
              <Button type="submit" className="bg-[#CEFF65] text-[#02403D] hover:bg-[#C2F95A] border border-[#CEFF65]">
                {initialData ? 'Speichern' : 'Transaktion hinzufügen'}
              </Button>
            </div>
          </form>
        </Card>
      </DialogContent>
    </Dialog>
  );
} 