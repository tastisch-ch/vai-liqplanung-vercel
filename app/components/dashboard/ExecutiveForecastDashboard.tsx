'use client';

import { 
  Card, 
  AreaChart, 
  Title, 
  Text, 
  Metric,
  Flex,
  Badge,
  Grid,
  List,
  ListItem,
  Bold,
  Divider,
  Callout,
  DonutChart,
  BarList,
  Tracker,
  CategoryBar
} from '@tremor/react';
import { formatCHF } from '@/lib/currency';

interface Point { date: string; balance: number }
interface Props { isLoading: boolean; points: Point[] }

interface RiskAssessment {
  level: 'low' | 'medium' | 'high' | 'critical';
  score: number;
  factors: string[];
}

interface CashflowEvent {
  date: string;
  type: 'critical' | 'milestone' | 'opportunity';
  title: string;
  amount: number;
  description: string;
}

export function ExecutiveForecastDashboard({ isLoading, points }: Props) {
  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-80 bg-gray-200 rounded"></div>
        </div>
      </Card>
    );
  }

  if (!points || points.length === 0) {
    return (
      <Card className="p-6">
        <Callout title="Keine Prognosedaten" color="gray">
          Aktualisieren Sie den Kontostand für eine detaillierte Liquiditätsanalyse.
        </Callout>
      </Card>
    );
  }

  // Executive Analysis Logic
  const analyzeForManagement = () => {
    const currentBalance = points[0]?.balance || 0;
    const finalBalance = points[points.length - 1]?.balance || 0;
    const minBalance = Math.min(...points.map(p => p.balance));
    const maxBalance = Math.max(...points.map(p => p.balance));
    
    // Risk Assessment
    const riskFactors: string[] = [];
    let riskScore = 0;
    
    if (minBalance < 0) {
      riskFactors.push('Negative Cashflow erwartet');
      riskScore += 40;
    }
    
    if (minBalance < currentBalance * 0.1) {
      riskFactors.push('Kritisch niedrige Liquidität');
      riskScore += 30;
    }
    
    const volatility = maxBalance - minBalance;
    if (volatility > currentBalance * 0.8) {
      riskFactors.push('Hohe Cashflow-Volatilität');
      riskScore += 20;
    }
    
    if (finalBalance < currentBalance * 0.5) {
      riskFactors.push('Signifikanter Liquiditätsverlust');
      riskScore += 25;
    }
    
    const risk: RiskAssessment = {
      level: riskScore > 70 ? 'critical' : riskScore > 50 ? 'high' : riskScore > 25 ? 'medium' : 'low',
      score: riskScore,
      factors: riskFactors
    };
    
    // Key Events Timeline
    const events: CashflowEvent[] = [];
    
    // Find critical moments
    const negativePoint = points.find(p => p.balance < 0);
    if (negativePoint) {
      events.push({
        date: negativePoint.date,
        type: 'critical',
        title: 'Liquiditätsengpass',
        amount: negativePoint.balance,
        description: 'Kontostand wird negativ - sofortige Maßnahmen erforderlich'
      });
    }
    
    // Find lowest point
    const lowestPoint = points.reduce((min, p) => p.balance < min.balance ? p : min);
    if (lowestPoint.balance > 0 && lowestPoint.balance < currentBalance * 0.3) {
      events.push({
        date: lowestPoint.date,
        type: 'milestone',
        title: 'Liquiditäts-Minimum',
        amount: lowestPoint.balance,
        description: 'Niedrigster Kontostand der Periode'
      });
    }
    
    // Find recovery opportunities
    const recoveryPoint = points.find((p, i) => 
      i > 0 && points[i-1].balance < currentBalance * 0.5 && p.balance > currentBalance * 0.8
    );
    if (recoveryPoint) {
      events.push({
        date: recoveryPoint.date,
        type: 'opportunity',
        title: 'Liquiditäts-Erholung',
        amount: recoveryPoint.balance,
        description: 'Signifikante Verbesserung der Cashflow-Situation'
      });
    }
    
    return { risk, events };
  };

  const { risk, events } = analyzeForManagement();
  
  // Chart data preparation
  const chartData = points.map(p => {
    const date = new Date(p.date);
    const formattedDate = date.toLocaleDateString('de-CH', { 
      month: 'short', 
      day: 'numeric' 
    });
    
    return {
      date: formattedDate,
      'Kontostand': p.balance,
      'Sicherheitspuffer': Math.max(10000, points[0].balance * 0.2),
      'Kritische Schwelle': 0
    };
  });

  // KPI calculations
  const currentBalance = points[0]?.balance || 0;
  const finalBalance = points[points.length - 1]?.balance || 0;
  const changeAmount = finalBalance - currentBalance;
  const changePercent = currentBalance !== 0 ? (changeAmount / currentBalance) * 100 : 0;
  
  // Liquidity runway calculation
  const negativePoint = points.find(p => p.balance < 0);
  const daysToNegative = negativePoint ? 
    Math.ceil((new Date(negativePoint.date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 
    null;
  
  // Risk distribution for donut chart
  const riskDistribution = [
    { name: 'Sicher', value: Math.max(0, 100 - risk.score), color: 'emerald' },
    { name: 'Risiko', value: risk.score, color: risk.level === 'critical' ? 'red' : risk.level === 'high' ? 'orange' : 'yellow' }
  ];

  const valueFormatter = (number: number) => formatCHF(number);

  return (
    <div className="space-y-6">
      {/* Executive Summary Card */}
      <Card>
        <Flex justifyContent="between" alignItems="center">
          <div>
            <Title>Liquiditäts-Prognose</Title>
            <Text>Executive Dashboard für strategische Entscheidungen</Text>
          </div>
          <Badge 
            color={risk.level === 'critical' ? 'red' : risk.level === 'high' ? 'orange' : risk.level === 'medium' ? 'yellow' : 'emerald'}
            size="lg"
          >
            Risiko: {risk.level === 'critical' ? 'Kritisch' : risk.level === 'high' ? 'Hoch' : risk.level === 'medium' ? 'Mittel' : 'Niedrig'}
          </Badge>
        </Flex>
      </Card>

      {/* Key Metrics Grid */}
      <Grid numItemsSm={2} numItemsLg={4} className="gap-6">
        <Card>
          <Text>Aktueller Stand</Text>
          <Metric>{formatCHF(currentBalance)}</Metric>
          <CategoryBar
            values={[100]}
            colors={['emerald']}
            markerValue={75}
            className="mt-3"
          />
        </Card>
        
        <Card>
          <Text>Prognose Periodenende</Text>
          <Metric color={finalBalance >= 0 ? 'emerald' : 'red'}>
            {formatCHF(finalBalance)}
          </Metric>
          <Flex className="mt-3">
            <Text>
              <Bold color={changeAmount >= 0 ? 'emerald' : 'red'}>
                {changeAmount >= 0 ? '+' : ''}{changePercent.toFixed(1)}%
              </Bold>
            </Text>
          </Flex>
        </Card>
        
        <Card>
          <Text>Liquiditäts-Runway</Text>
          <Metric color={daysToNegative && daysToNegative < 30 ? 'red' : 'emerald'}>
            {daysToNegative ? `${daysToNegative} Tage` : '∞'}
          </Metric>
          <Text className="mt-1">
            {daysToNegative ? 'bis Unterdeckung' : 'Keine Unterdeckung erwartet'}
          </Text>
        </Card>
        
        <Card>
          <Text>Risiko-Score</Text>
          <Metric color={risk.level === 'critical' ? 'red' : risk.level === 'high' ? 'orange' : 'emerald'}>
            {risk.score}/100
          </Metric>
          <DonutChart
            data={riskDistribution}
            category="value"
            index="name"
            className="mt-3 h-20"
            showTooltip={false}
            showLabel={false}
          />
        </Card>
      </Grid>

      {/* Risk Assessment */}
      {risk.factors.length > 0 && (
        <Card>
          <Title>Risiko-Analyse</Title>
          <Text className="mb-4">Kritische Faktoren für Management-Aufmerksamkeit</Text>
          <List>
            {risk.factors.map((factor, index) => (
              <ListItem key={index}>
                <Flex justifyContent="between">
                  <Text>{factor}</Text>
                  <Badge color="red" size="xs">Handlungsbedarf</Badge>
                </Flex>
              </ListItem>
            ))}
          </List>
        </Card>
      )}

      {/* Timeline of Critical Events */}
      {events.length > 0 && (
        <Card>
          <Title>Kritische Termine</Title>
          <Text className="mb-4">Wichtige Cashflow-Ereignisse</Text>
          <div className="space-y-3">
            {events.map((event, index) => (
              <Callout
                key={index}
                title={event.title}
                color={event.type === 'critical' ? 'red' : event.type === 'opportunity' ? 'emerald' : 'yellow'}
              >
                <Flex justifyContent="between" className="mt-2">
                  <Text>{event.description}</Text>
                  <div className="text-right">
                    <Text>
                      <Bold>{new Date(event.date).toLocaleDateString('de-CH')}</Bold>
                    </Text>
                    <Text color={event.amount < 0 ? 'red' : 'emerald'}>
                      {formatCHF(event.amount)}
                    </Text>
                  </div>
                </Flex>
              </Callout>
            ))}
          </div>
        </Card>
      )}

      {/* Main Chart */}
      <Card>
        <Title>Liquiditätsverlauf</Title>
        <Text>Detaillierte Cashflow-Entwicklung mit Risikozonen</Text>
        <AreaChart
          className="mt-6 h-80"
          data={chartData}
          index="date"
          categories={['Kontostand', 'Sicherheitspuffer', 'Kritische Schwelle']}
          colors={['blue', 'yellow', 'red']}
          valueFormatter={valueFormatter}
          showLegend={true}
          showGridLines={true}
          yAxisWidth={100}
        />
      </Card>

      {/* Action Items */}
      <Card>
        <Title>Empfohlene Maßnahmen</Title>
        <Text className="mb-4">Basierend auf Liquiditätsanalyse</Text>
        <BarList
          data={[
            {
              name: risk.level === 'critical' ? 'Sofortige Kreditlinie aktivieren' : 'Cashflow-Monitoring verstärken',
              value: risk.level === 'critical' ? 100 : 70,
              color: risk.level === 'critical' ? 'red' : 'yellow'
            },
            {
              name: 'Zahlungseingänge beschleunigen',
              value: 85,
              color: 'blue'
            },
            {
              name: 'Ausgaben priorisieren',
              value: risk.score > 50 ? 90 : 60,
              color: risk.score > 50 ? 'orange' : 'emerald'
            },
            {
              name: 'Liquiditätsreserven aufbauen',
              value: 75,
              color: 'emerald'
            }
          ]}
          className="mt-4"
        />
      </Card>
    </div>
  );
}
