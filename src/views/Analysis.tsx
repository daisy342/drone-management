import { useState, useEffect } from 'react';
import { exportAnalysisReport } from '../services/analysis';
import Navbar from '../components/Navbar';
import './Analysis.css';

const Analysis = () => {
  const [statistics, setStatistics] = useState<any>(null);
  const [flightTrend, setFlightTrend] = useState<any[]>([]);
  const [issueTrend, setIssueTrend] = useState<any[]>([]);
  const [issueDistribution, setIssueDistribution] = useState<any[]>([]);
  const [baseStatistics, setBaseStatistics] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [selectedPeriod, setSelectedPeriod] = useState<'day' | 'week' | 'month' | 'year'>('month');

  // 加载数据
  useEffect(() => {
    loadData();
  }, [dateRange, selectedPeriod]);

  // 加载分析数据
  const loadData = async () => {
    setIsLoading(true);
    try {
      // 模拟数据加载
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 模拟数据
      const stats = {
        totalFlights: 128,
        totalDuration: 3240,
        totalArea: 56.7,
        totalIssues: 42,
        averageDuration: 25.31,
        issueRate: 32.81
      };
      
      const flight = [
        { date: '01', value: 12 },
        { date: '02', value: 15 },
        { date: '03', value: 10 },
        { date: '04', value: 18 },
        { date: '05', value: 14 },
        { date: '06', value: 20 },
        { date: '07', value: 16 }
      ];
      
      const issue = [
        { date: '01', value: 3 },
        { date: '02', value: 5 },
        { date: '03', value: 2 },
        { date: '04', value: 6 },
        { date: '05', value: 4 },
        { date: '06', value: 7 },
        { date: '07', value: 5 }
      ];
      
      const distribution = [
        { severity: 'low', count: 20, percentage: 47.62 },
        { severity: 'medium', count: 15, percentage: 35.71 },
        { severity: 'high', count: 7, percentage: 16.67 }
      ];
      
      const baseStats = [
        { baseName: '基地A', totalFlights: 50, totalDuration: 1200, totalArea: 20.5, totalIssues: 15 },
        { baseName: '基地B', totalFlights: 40, totalDuration: 1000, totalArea: 15.2, totalIssues: 12 },
        { baseName: '基地C', totalFlights: 38, totalDuration: 1040, totalArea: 21.0, totalIssues: 15 }
      ];

      setStatistics(stats);
      setFlightTrend(flight);
      setIssueTrend(issue);
      setIssueDistribution(distribution);
      setBaseStatistics(baseStats);
    } catch (err: any) {
      setError(err.message || '加载分析数据失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 处理日期范围变化
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setDateRange(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // 处理周期变化
  const handlePeriodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedPeriod(e.target.value as 'day' | 'week' | 'month' | 'year');
  };

  // 导出报告
  const handleExportReport = async () => {
    try {
      await exportAnalysisReport(dateRange.startDate, dateRange.endDate);
    } catch (err: any) {
      setError(err.message || '导出报告失败');
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

      {/* 欢迎区域 */}
      <div className="welcome-section">
        <div className="welcome-container">
          <div className="welcome-content">
            <h2>数据分析 📊</h2>
            <p>深入分析飞行数据，优化运营效率</p>
          </div>
        </div>
      </div>

      <div className="container">
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {/* 筛选条件 */}
        <div className="filter-container">
          <div className="section-header">
            <h3>筛选条件</h3>
          </div>
          <div className="filter-row">
            <div className="form-group">
              <label htmlFor="startDate">开始日期</label>
              <input 
                type="date" 
                id="startDate" 
                name="startDate" 
                value={dateRange.startDate} 
                onChange={handleDateChange} 
              />
            </div>
            <div className="form-group">
              <label htmlFor="endDate">结束日期</label>
              <input 
                type="date" 
                id="endDate" 
                name="endDate" 
                value={dateRange.endDate} 
                onChange={handleDateChange} 
              />
            </div>
            <div className="form-group">
              <label htmlFor="period">统计周期</label>
              <select 
                id="period" 
                name="period" 
                value={selectedPeriod} 
                onChange={handlePeriodChange}
              >
                <option value="day">按日</option>
                <option value="week">按周</option>
                <option value="month">按月</option>
                <option value="year">按年</option>
              </select>
            </div>
            <div className="form-group">
              <label>操作</label>
              <button 
                className="btn btn-primary"
                onClick={handleExportReport}
              >
                导出报告
              </button>
            </div>
          </div>
        </div>

        {/* 统计卡片 */}
        {isLoading ? (
          <div className="loading-container">
            <span className="loading"></span>
            <span className="loading-text">加载中...</span>
          </div>
        ) : (
          <>
            <div className="section-header">
              <h3>统计概览</h3>
            </div>
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

            {/* 趋势图表 */}
            <div className="section-header">
              <h3>趋势分析</h3>
            </div>
            <div className="charts-container">
              <div className="chart-card">
                <div className="chart-header">
                  <h4>飞行趋势</h4>
                </div>
                <div className="chart-content">
                  {flightTrend.length > 0 ? (
                    <div className="trend-chart">
                      {flightTrend.map((item, index) => (
                        <div key={index} className="trend-item">
                          <div className="trend-date">{item.date}</div>
                          <div className="trend-bar-container">
                            <div 
                              className="trend-bar" 
                              style={{ 
                                height: `${(item.value / Math.max(...flightTrend.map(i => i.value))) * 100}%`,
                                backgroundColor: '#4361ee'
                              }}
                            ></div>
                          </div>
                          <div className="trend-value">{item.value}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="no-data">暂无数据</p>
                  )}
                </div>
              </div>

              <div className="chart-card">
                <div className="chart-header">
                  <h4>问题趋势</h4>
                </div>
                <div className="chart-content">
                  {issueTrend.length > 0 ? (
                    <div className="trend-chart">
                      {issueTrend.map((item, index) => (
                        <div key={index} className="trend-item">
                          <div className="trend-date">{item.date}</div>
                          <div className="trend-bar-container">
                            <div 
                              className="trend-bar" 
                              style={{ 
                                height: `${(item.value / Math.max(...issueTrend.map(i => i.value))) * 100}%`,
                                backgroundColor: '#f72585'
                              }}
                            ></div>
                          </div>
                          <div className="trend-value">{item.value}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="no-data">暂无数据</p>
                  )}
                </div>
              </div>
            </div>

            {/* 问题分布 */}
            <div className="section-header">
              <h3>问题分布</h3>
            </div>
            <div className="chart-card">
              <div className="chart-content">
                {issueDistribution.length > 0 ? (
                  <div className="distribution-chart">
                    {issueDistribution.map((item, index) => {
                      let color = '';
                      switch (item.severity) {
                        case 'low':
                          color = '#4cc9f0';
                          break;
                        case 'medium':
                          color = '#4361ee';
                          break;
                        case 'high':
                          color = '#f72585';
                          break;
                        default:
                          color = '#9E9E9E';
                      }
                      return (
                        <div key={index} className="distribution-item">
                          <div className="distribution-label">
                            <span 
                              className="distribution-color" 
                              style={{ backgroundColor: color }}
                            ></span>
                            {item.severity === 'low' ? '低' : item.severity === 'medium' ? '中' : '高'}
                          </div>
                          <div className="distribution-bar-container">
                            <div 
                              className="distribution-bar" 
                              style={{ 
                                width: `${item.percentage}%`,
                                backgroundColor: color
                              }}
                            ></div>
                          </div>
                          <div className="distribution-value">
                            {item.count} ({item.percentage.toFixed(1)}%)
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="no-data">暂无数据</p>
                )}
              </div>
            </div>

            {/* 基地统计 */}
            <div className="section-header">
              <h3>基地统计</h3>
            </div>
            <div className="chart-card">
              <div className="chart-content">
                {baseStatistics.length > 0 ? (
                  <table className="base-table">
                    <thead>
                      <tr>
                        <th>基地名称</th>
                        <th>飞行次数</th>
                        <th>飞行时长（分钟）</th>
                        <th>覆盖面积（平方公里）</th>
                        <th>发现问题数</th>
                      </tr>
                    </thead>
                    <tbody>
                      {baseStatistics.map((base, index) => (
                        <tr key={index}>
                          <td>{base.baseName}</td>
                          <td>{base.totalFlights}</td>
                          <td>{base.totalDuration.toFixed(2)}</td>
                          <td>{base.totalArea.toFixed(2)}</td>
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
          </>
        )}
      </div>
    </div>
  );
};

export default Analysis;