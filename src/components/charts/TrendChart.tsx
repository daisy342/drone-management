import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

interface TrendData {
  date: string;
  value: number;
}

interface TrendChartProps {
  data: TrendData[];
  title?: string;
  color?: string;
  type?: 'line' | 'bar';
}

const TrendChart = ({ data, title = '', color = '#4CAF50', type = 'line' }: TrendChartProps) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    // 初始化图表
    chartInstance.current = echarts.init(chartRef.current);

    const option: echarts.EChartsOption = {
      grid: {
        top: 30,
        left: 50,
        right: 20,
        bottom: 30
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: '#e0e0e0',
        borderWidth: 1,
        textStyle: {
          color: '#333'
        },
        formatter: (params: any) => {
          const item = params[0];
          return `<div style="font-weight:600">${item.name}</div>
                  <div style="color:${color}">${item.value}</div>`;
        }
      },
      xAxis: {
        type: 'category',
        data: data.map(item => item.date.slice(-2)),
        axisLine: { lineStyle: { color: '#e0e0e0' } },
        axisLabel: { color: '#888', fontSize: 11 },
        axisTick: { show: false }
      },
      yAxis: {
        type: 'value',
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: '#888', fontSize: 11 },
        splitLine: { lineStyle: { color: '#f0f0f0', type: 'dashed' } }
      },
      series: [
        {
          name: title,
          type: type,
          data: data.map(item => item.value),
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          lineStyle: type === 'line' ? {
            width: 3,
            color: color
          } : undefined,
          areaStyle: type === 'line' ? {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: color + '40' },
              { offset: 1, color: color + '00' }
            ])
          } : undefined,
          barWidth: '60%',
          itemStyle: type === 'bar' ? {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: color },
              { offset: 1, color: color + '80' }
            ]),
            borderRadius: [4, 4, 0, 0]
          } : undefined
        }
      ]
    };

    chartInstance.current.setOption(option);

    // 响应式
    const handleResize = () => {
      chartInstance.current?.resize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chartInstance.current?.dispose();
    };
  }, [data, title, color, type]);

  return <div ref={chartRef} style={{ width: '100%', height: '100%' }} />;
};

export default TrendChart;
