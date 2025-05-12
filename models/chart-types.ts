/**
 * Type definitions for chart data and options used in the Analysis module
 */

export interface MonthlyDataPoint {
  date: string;
  income: number;
  expenses: number;
  balance: number;
}

export interface CategoryDataPoint {
  name: string;
  value: number;
}

export interface CashFlowDataPoint {
  date: string;
  balance: number;
}

export interface DateRange {
  start: Date;
  end: Date;
  label: string;
}

export interface ChartTooltipParams {
  name: string;
  value: number;
  percent?: number;
  seriesName?: string;
  seriesIndex?: number;
  dataIndex?: number;
}

// Chart configuration interfaces
export interface ChartOptions {
  title?: {
    text: string;
    left?: string;
  };
  tooltip?: {
    trigger: 'axis' | 'item';
    formatter?: string | Function;
  };
  legend?: {
    data?: string[];
    orient?: 'horizontal' | 'vertical';
    left?: string;
    bottom?: string;
  };
  grid?: {
    left?: string;
    right?: string;
    bottom?: string;
    top?: string;
    containLabel?: boolean;
  };
  xAxis?: {
    type: 'category' | 'value';
    data?: string[];
    axisLabel?: {
      interval?: number;
      rotate?: number;
      formatter?: string | Function;
    };
  };
  yAxis?: {
    type: 'value' | 'category';
    axisLabel?: {
      formatter?: string | Function;
    };
  };
  series: Array<{
    name?: string;
    type: 'bar' | 'line' | 'pie';
    stack?: string;
    radius?: string | string[];
    center?: string[];
    data: any[];
    areaStyle?: any;
    lineStyle?: {
      width?: number;
      color?: string;
    };
    itemStyle?: {
      color?: string | Function;
    };
    emphasis?: {
      focus?: string;
      itemStyle?: {
        shadowBlur?: number;
        shadowOffsetX?: number;
        shadowColor?: string;
      };
    };
    symbol?: string;
    symbolSize?: number;
  }>;
} 