import { useState, useEffect } from 'react';
import {
  getOverallStatistics,
  getFlightTrend,
  getIssueTrend,
  getIssueDistribution,
  getBaseStatistics,
  exportAnalysisReport,
  Statistics,
  TrendData,
  IssueDistribution,
  BaseStatistics
} from '../services/analysis';
import { getAnnualPlanProgress, AnnualPlanProgress } from '../services/annualPlan';
import { getInspectorStatistics, InspectorStatistics } from '../services/inspectorStats';
import Select from '../components/CustomSelect';
import DatePicker from '../components/DatePicker';
import DateRangePicker from '../components/DateRangePicker';
import MonthPicker from '../components/MonthPicker';
import YearPicker from '../components/YearPicker';
import Navbar from '../components/Navbar';
import TrendChart from '../components/charts/TrendChart';
import DistributionChart from '../components/charts/DistributionChart';
import '../styles/unified-controls.css';
import './Analysis.css';

const Analysis = () => {
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [flightTrend, setFlightTrend] = useState<TrendData[]>([]);
  const [issueTrend, setIssueTrend] = useState<TrendData[]>([]);
  const [issueDistribution, setIssueDistribution] = useState<IssueDistribution[]>([]);
  const [baseStatistics, setBaseStatistics] = useState<BaseStatistics[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 设置默认日期范围为最近30天
  const getDefaultDateRange = () => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 30);
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };
  };

  // 根据周期类型管理不同的日期状态
  const [selectedPeriod, setSelectedPeriod] = useState<'day' | 'week' | 'month' | 'year'>('month');
  const [dayDate, setDayDate] = useState(() => new Date().toISOString().split('T')[0]); // 按日：当日
  const [monthDate, setMonthDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`; // 按月：当月
  });
  const [yearDate, setYearDate] = useState(() => new Date().getFullYear().toString()); // 按年：当年
  const [dateRange, setDateRange] = useState(getDefaultDateRange()); // 按周：日期范围

  const currentYear = new Date().getFullYear();
  const [annualPlanProgress, setAnnualPlanProgress] = useState<AnnualPlanProgress[]>([]);
  const [inspectorStats, setInspectorStats] = useState<InspectorStatistics[]>([]);

  // 根据当前选中的周期类型计算实际的日期范围
  const getEffectiveDateRange = () => {
    switch (selectedPeriod) {
      case 'day':
        return { startDate: dayDate, endDate: dayDate };
      case 'month':
        return { startDate: `${monthDate}-01`, endDate: `${monthDate}-${getLastDayOfMonth(monthDate)}` };
      case 'year':
        return { startDate: `${yearDate}-01-01`, endDate: `${yearDate}-12-31` };
      case 'week':
      default:
        return dateRange;
    }
  };

  // 获取某月最后一天
  const getLastDayOfMonth = (monthStr: string): string => {
    const [year, month] = monthStr.split('-').map(Number);
    return new Date(year, month, 0).getDate().toString().padStart(2, '0');
  };

  // 加载数据
  useEffect(() => {
    loadData();
  }, [dateRange, selectedPeriod, dayDate, monthDate, yearDate]);

  // 加载分析数据
  const loadData = async () => {
    setIsLoading(true);
    const effectiveRange = getEffectiveDateRange();

    // 并行加载所有数据
    const loadPromises = [
      // 1. 加载总体统计数据
      (async () => {
        try {
          const stats = await getOverallStatistics(
            effectiveRange.startDate || undefined,
            effectiveRange.endDate || undefined
          );
          setStatistics(stats);
        } catch (err: any) {
          console.error('统计数据加载失败:', err);
        }
      })(),

      // 2. 加载飞行趋势数据
      (async () => {
        try {
          const trend = await getFlightTrend(
            selectedPeriod,
            effectiveRange.startDate || undefined,
            effectiveRange.endDate || undefined
          );
          setFlightTrend(trend);
        } catch (err: any) {
          console.error('飞行趋势加载失败:', err);
          setFlightTrend([]);
        }
      })(),

      // 3. 加载问题趋势数据
      (async () => {
        try {
          const trend = await getIssueTrend(
            selectedPeriod,
            effectiveRange.startDate || undefined,
            effectiveRange.endDate || undefined
          );
          setIssueTrend(trend);
        } catch (err: any) {
          console.error('问题趋势加载失败:', err);
          setIssueTrend([]);
        }
      })(),

      // 4. 加载问题分布数据
      (async () => {
        try {
          const distribution = await getIssueDistribution(
            effectiveRange.startDate || undefined,
            effectiveRange.endDate || undefined
          );
          setIssueDistribution(distribution);
        } catch (err: any) {
          console.error('问题分布加载失败:', err);
          setIssueDistribution([]);
        }
      })(),

      // 5. 加载基站统计数据
      (async () => {
        try {
          const baseStats = await getBaseStatistics(
            effectiveRange.startDate || undefined,
            effectiveRange.endDate || undefined
          );
          setBaseStatistics(baseStats);
        } catch (err: any) {
          console.error('基站统计加载失败:', err);
          setBaseStatistics([]);
        }
      })(),

      // 6. 加载年度计划进度
      (async () => {
        try {
          const planProgress = await getAnnualPlanProgress(currentYear);
          setAnnualPlanProgress(planProgress);
        } catch (err) {
          console.log('年度计划数据加载失败:', err);
          setAnnualPlanProgress([]);
        }
      })(),

      // 7. 加载人员巡查统计
      (async () => {
        try {
          const stats = await getInspectorStatistics(
            effectiveRange.startDate || undefined,
            effectiveRange.endDate || undefined
          );
          setInspectorStats(stats.filter(s => s.totalInspections > 0));
        } catch (err) {
          console.log('人员统计加载失败:', err);
          setInspectorStats([]);
        }
      })()
    ];

    try {
      await Promise.all(loadPromises);
    } catch (err: any) {
      console.error('加载数据失败:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // 处理日期范围变化
  const handleDateRangeChange = (startDate: string, endDate: string) => {
    setDateRange({ startDate, endDate });
  };

  // 处理周期类型变化
  const handlePeriodChange = (option: any) => {
    const period = (option?.value || 'month') as 'day' | 'week' | 'month' | 'year';
    setSelectedPeriod(period);
  };

  // 处理单日选择
  const handleDayChange = (date: string) => {
    setDayDate(date);
  };

  // 处理单月选择
  const handleMonthChange = (month: string) => {
    setMonthDate(month);
  };

  // 处理单年选择
  const handleYearChange = (year: string) => {
    setYearDate(year);
  };

  // 导出报告
  const handleExportReport = async () => {
    const effectiveRange = getEffectiveDateRange();
    try {
      await exportAnalysisReport(effectiveRange.startDate, effectiveRange.endDate);
    } catch (err: any) {
      console.error('导出报告失败:', err);
    }
  };

  // 渲染统计卡片
  const renderStatCard = (title: string, value: string | number, unit: string, color: string) => (
    <div className="stat-card" style={{ borderLeft: `4px solid ${color}` }}>
      <h4 className="stat-title">{title}</h4>
      <div className="stat-value">
        {value}
        <span className="stat-unit">{unit}</span>
      </div>
    </div>
  );

  return (
    <div className="analysis">
      <Navbar />

      <div className="analysis-container">
        {/* 顶部筛选栏 - 紧凑布局 */}
        <div className="analysis-header">
          <div className="header-title">
            <h2>数据分析</h2>
            <p>深入分析飞行数据，优化运营效率</p>
          </div>
          <div className="filter-bar-inline">
            <div className="filter-item" style={{ minWidth: '320px' }}>
              {selectedPeriod === 'day' && (
                <DatePicker
                  value={dayDate}
                  onChange={handleDayChange}
                  placeholder="请选择日期"
                />
              )}
              {selectedPeriod === 'week' && (
                <DateRangePicker
                  startDate={dateRange.startDate}
                  endDate={dateRange.endDate}
                  onChange={handleDateRangeChange}
                  placeholder="请选择日期范围"
                />
              )}
              {selectedPeriod === 'month' && (
                <MonthPicker
                  value={monthDate}
                  onChange={handleMonthChange}
                  placeholder="请选择月份"
                />
              )}
              {selectedPeriod === 'year' && (
                <YearPicker
                  value={yearDate}
                  onChange={handleYearChange}
                  placeholder="请选择年份"
                />
              )}
            </div>
            <div className="filter-item">
              <Select
                value={{ value: selectedPeriod, label: selectedPeriod === 'day' ? '按日' : selectedPeriod === 'week' ? '按周' : selectedPeriod === 'month' ? '按月' : '按年' }}
                onChange={handlePeriodChange}
                options={[
                  { value: 'day', label: '按日' },
                  { value: 'week', label: '按周' },
                  { value: 'month', label: '按月' },
                  { value: 'year', label: '按年' }
                ]}
                isClearable={false}
              />
            </div>
            <button className="btn btn-primary btn-sm" onClick={handleExportReport}>
              导出
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="loading-container">
            <span className="loading"></span>
            <span className="loading-text">加载中...</span>
          </div>
        ) : (
          <div className="analysis-content">
            {/* 统计卡片 */}
            <div className="stats-grid">
              {statistics && (
                <>
                  {renderStatCard('总飞行次数', statistics.totalFlights, '次', '#4361ee')}
                  {renderStatCard('总飞行时长', statistics.totalDuration.toFixed(2), '分钟', '#3a0ca3')}
                  {renderStatCard('总覆盖面积', statistics.totalArea.toFixed(2), '平方公里', '#f72585')}
                  {renderStatCard('总发现问题数', statistics.totalIssues, '个', '#4cc9f0')}
                  {renderStatCard('平均飞行时长', statistics.averageDuration.toFixed(2), '分钟/次', '#4361ee')}
                  {renderStatCard('问题发生率', statistics.issueRate.toFixed(2), '%', '#3a0ca3')}
                </>
              )}
            </div>

            {/* 第一行：趋势分析 + 问题分布 */}
            <div className="dashboard-row">
              <div className="dashboard-col-3">
                <div className="panel">
                  <div className="panel-header">
                    <h4>飞行趋势</h4>
                  </div>
                  <div className="panel-body chart-panel">
                    {flightTrend.length > 0 ? (
                      <TrendChart
                        data={flightTrend.slice(-7)}
                        title="飞行次数"
                        color="#4CAF50"
                        type="line"
                      />
                    ) : (
                      <p className="no-data">暂无数据</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="dashboard-col-3">
                <div className="panel">
                  <div className="panel-header">
                    <h4>问题趋势</h4>
                  </div>
                  <div className="panel-body chart-panel">
                    {issueTrend.length > 0 ? (
                      <TrendChart
                        data={issueTrend.slice(-7)}
                        title="问题数量"
                        color="#FF9800"
                        type="bar"
                      />
                    ) : (
                      <p className="no-data">暂无数据</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="dashboard-col-3">
                <div className="panel">
                  <div className="panel-header">
                    <h4>问题分布</h4>
                  </div>
                  <div className="panel-body chart-panel">
                    {issueDistribution.length > 0 ? (
                      <DistributionChart data={issueDistribution} />
                    ) : (
                      <p className="no-data">暂无数据</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 第二行：年度计划 + 人员统计 + 基站统计 */}
            <div className="dashboard-row">
              <div className="dashboard-col-3">
                <div className="panel">
                  <div className="panel-header">
                    <h4>年度计划进度 ({currentYear})</h4>
                  </div>
                  <div className="panel-body">
                    {annualPlanProgress.length > 0 ? (
                      <div className="plan-list">
                        {annualPlanProgress.map((plan, index) => (
                          <div key={index} className="plan-item">
                            <div className="plan-name">{plan.baseName || '全部基站'}</div>
                            <div className="plan-metrics">
                              <div className="plan-metric">
                                <span className="metric-label">巡查</span>
                                <div className="mini-progress">
                                  <div className="mini-bar" style={{ width: `${Math.min(plan.inspectionProgress, 100)}%` }} />
                                </div>
                                <span className="metric-value">{plan.actualInspections}/{plan.targetInspections}</span>
                              </div>
                              <div className="plan-metric">
                                <span className="metric-label">面积</span>
                                <div className="mini-progress">
                                  <div className="mini-bar" style={{ width: `${Math.min(plan.areaProgress, 100)}%` }} />
                                </div>
                                <span className="metric-value">{plan.actualArea.toFixed(0)}/{plan.targetArea.toFixed(0)}km²</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="no-data">暂无数据</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="dashboard-col-3">
                <div className="panel">
                  <div className="panel-header">
                    <h4>人员巡查统计</h4>
                  </div>
                  <div className="panel-body">
                    {inspectorStats.length > 0 ? (
                      <table className="compact-table">
                        <thead>
                          <tr>
                            <th>姓名</th>
                            <th>次数</th>
                            <th>时长</th>
                            <th>问题</th>
                          </tr>
                        </thead>
                        <tbody>
                          {inspectorStats.slice(0, 6).map((inspector, index) => (
                            <tr key={index}>
                              <td>{inspector.userName}</td>
                              <td>{inspector.totalInspections}</td>
                              <td>{inspector.totalDuration.toFixed(0)}min</td>
                              <td>{inspector.totalIssues}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p className="no-data">暂无数据</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="dashboard-col-3">
                <div className="panel">
                  <div className="panel-header">
                    <h4>基站统计</h4>
                  </div>
                  <div className="panel-body">
                    {baseStatistics.length > 0 ? (
                      <table className="compact-table">
                        <thead>
                          <tr>
                            <th>基站</th>
                            <th>次数</th>
                            <th>时长</th>
                            <th>问题</th>
                          </tr>
                        </thead>
                        <tbody>
                          {baseStatistics.map((base, index) => (
                            <tr key={index}>
                              <td>{base.baseName}</td>
                              <td>{base.totalFlights}</td>
                              <td>{base.totalDuration.toFixed(0)}min</td>
                              <td>{base.totalIssues}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p className="no-data">暂无数据</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Analysis;
