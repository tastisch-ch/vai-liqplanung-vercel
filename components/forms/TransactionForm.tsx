'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectItem } from '@tremor/react';

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
  date: new Date().toISOString().split('T')[0],
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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Transaktion bearbeiten' : 'Neue Transaktion'}</DialogTitle>
          <DialogDescription>
            Geben Sie die Details für die {initialData ? 'zu bearbeitende' : 'neue'} Transaktion ein. Alle Felder sind erforderlich, außer der Simulationsstatus.
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
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="direction">Richtung</Label>
            <Select
              className="w-full"
              value={formData.direction}
              onValueChange={(value: any) => 
                setFormData({ ...formData, direction: value as 'Incoming' | 'Outgoing' })
              }
            >
              <SelectItem value="Incoming">Eingehend</SelectItem>
              <SelectItem value="Outgoing">Ausgehend</SelectItem>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="details">Details</Label>
            <Input
              id="details"
              value={formData.details}
              onChange={(e) => setFormData({ ...formData, details: e.target.value })}
              required
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
            <Button type="submit" className="bg-vaios-primary text-white hover:bg-vaios-primary/90">
              {initialData ? 'Speichern' : 'Transaktion hinzufügen'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
} 