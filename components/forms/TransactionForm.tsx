'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-gray-50">
            {initialData ? 'Transaktion bearbeiten' : 'Neue Transaktion'}
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-500 dark:text-gray-400">
            Bitte Felder ausfüllen. Simulation ist optional.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="date">Datum</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
              className="h-11 text-base px-4"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="amount">Betrag</Label>
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
            <Label htmlFor="direction">Richtung</Label>
            <Select
              value={formData.direction}
              onValueChange={(value: 'Incoming' | 'Outgoing') => 
                setFormData({ ...formData, direction: value })
              }
            >
              <SelectTrigger className="w-full h-11 text-base">
                <SelectValue placeholder="Richtung auswählen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Incoming">Eingehend</SelectItem>
                <SelectItem value="Outgoing">Ausgehend</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="details">Details</Label>
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
            <Label htmlFor="simulation">Als Simulation markieren</Label>
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
      </DialogContent>
    </Dialog>
  );
} 