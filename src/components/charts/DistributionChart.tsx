import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

interface DistributionData {
  severity: string;
  count: number;
  percentage: number;
}

interface DistributionChartProps {
  data: DistributionData[];
}

const DistributionChart = ({ data }: DistributionChartProps) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  // severity 映射
  const severityMap: Record<string, { label: string; color: string }> = {
    low: { label: '低风险', color: '#4cc9f0' },
    medium: { label: '中风险', color: '#4361ee' },
    high: { label: '高风险', color: '#f72585' }
  };

  useEffect(() => {
    if (!chartRef.current || data.length === 0) return;

    chartInstance.current = echarts.init(chartRef.current);

    const chartData = data.map(item => ({
      name: severityMap[item.severity]?.label || item.severity,
      value: item.count,
      percentage: item.percentage,
      itemStyle: {
        color: severityMap[item.severity]?.color || '#999'
      }
    }));

    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: '#e0e0e0',
        borderWidth: 1,
        textStyle: { color: '#333' },
        formatter: (params: any) => {
          return `<div style="font-weight:600">${params.name}</div>
                  <div>数量: ${params.value}个</div>
                  <div>占比: ${params.data.percentage.toFixed(1)}%</div>`;
        }
      },
      legend: {
        orient: 'vertical',
        right: '5%',
        top: 'center',
        itemWidth: 12,
        itemHeight: 12,
        textStyle: {
          color: '#666',
          fontSize: 12
        }
      },
      series: [
        {
          name: '问题分布',
          type: 'pie',
          radius: ['40%', '70%'],
          center: ['35%', '50%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 8,
            borderColor: '#fff',
            borderWidth: 2
          },
          label: {
            show: true,
            position: 'center',
            formatter: () => '问题分布',
            fontSize: 14,
            fontWeight: 'bold',
            color: '#333'
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 16,
              fontWeight: 'bold'
            },
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.2)'
            }
          },
          labelLine: { show: false },
          data: chartData
        }
      ]
    };

    chartInstance.current.setOption(option);

    const handleResize = () => {
      chartInstance.current?.resize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chartInstance.current?.dispose();
    };
  }, [data]);

  return <div ref={chartRef} style={{ width: '100%', height: '100%' }} />;
};

export default DistributionChart;
