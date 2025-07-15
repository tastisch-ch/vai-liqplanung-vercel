import { KontostandChart } from '@/app/components/chart/KontostandChart';
import { getBalanceHistory } from '@/lib/services/daily-balance';
import { DailyBalanceSnapshot } from '@/models/types';

export default async function DashboardPage() {
  // Get balance history for the last 30 days
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);
  
  const balances = await getBalanceHistory(startDate, endDate);
  
  const chartData = balances.map((balance: DailyBalanceSnapshot) => ({
    date: balance.date.toISOString().split('T')[0],
    balance: balance.balance
  }));

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <KontostandChart data={chartData} />
    </div>
  );
} 