import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';
import './Home.css';

const Home = () => {
  const [stats, setStats] = useState([
    {
      title: '总飞行次数',
      value: '0',
      icon: '✈️',
      color: '#4361ee',
      description: '加载中...',
      trend: 'up',
      percentage: 0
    },
    {
      title: '发现问题数',
      value: '0',
      icon: '🔍',
      color: '#3a0ca3',
      description: '加载中...',
      trend: 'down',
      percentage: 0
    },
    {
      title: '覆盖面积',
      value: '0 km²',
      icon: '🗺️',
      color: '#f72585',
      description: '加载中...',
      trend: 'up',
      percentage: 0
    },
    {
      title: '飞行时长',
      value: '0 小时',
      icon: '⏰',
      color: '#4cc9f0',
      description: '加载中...',
      trend: 'up',
      percentage: 0
    }
  ]);

  // 快速操作
  const quickActions = [
    {
      title: '日志录入',
      description: '记录飞行任务、问题发现和处理情况',
      link: '/logs',
      icon: '📝',
      color: '#4361ee',
      gradient: 'linear-gradient(135deg, #4361ee, #3a0ca3)'
    },
    {
      title: '数据分析',
      description: '查看飞行趋势、问题分布和绩效统计',
      link: '/analysis',
      icon: '📊',
      color: '#3a0ca3',
      gradient: 'linear-gradient(135deg, #3a0ca3, #7209b7)'
    },
    {
      title: '报表导出',
      description: '生成Word格式的日报、月报',
      link: '/analysis',
      icon: '📄',
      color: '#f72585',
      gradient: 'linear-gradient(135deg, #f72585, #b5179e)'
    },
    {
      title: '系统设置',
      description: '管理用户权限和基础字典配置',
      link: '/settings',
      icon: '⚙️',
      color: '#4cc9f0',
      gradient: 'linear-gradient(135deg, #4cc9f0, #4361ee)'
    }
  ];

  // 最近活动
  const recentActivities = [
    {
      type: 'success',
      title: '日志录入成功',
      description: '已成功录入一条新的飞行日志',
      time: '2小时前',
      icon: '✓'
    },
    {
      type: 'info',
      title: '系统更新',
      description: '系统已更新至最新版本',
      time: '昨天',
      icon: 'ℹ'
    },
    {
      type: 'warning',
      title: '问题待处理',
      description: '有3个问题需要处理',
      time: '3天前',
      icon: '!'
    },
    {
      type: 'success',
      title: '任务完成',
      description: '成功完成了一项飞行任务',
      time: '4天前',
      icon: '✓'
    }
  ];

  const { user } = useAuth();

  // 加载真实数据
  useEffect(() => {
    const loadStats = async () => {
      try {
        // 模拟数据加载延迟
        await new Promise(resolve => setTimeout(resolve, 500));
        // 模拟数据
        const data = {
          totalFlights: 128,
          totalIssues: 42,
          totalArea: 56.7,
          totalDuration: 3240
        };
        setStats([
          {
            title: '总飞行次数',
            value: data.totalFlights.toString(),
            icon: '✈️',
            color: '#4361ee',
            description: `本月飞行任务完成率 ${Math.round((data.totalFlights / (data.totalFlights + 1)) * 100)}%`,
            trend: 'up',
            percentage: Math.round(Math.random() * 30)
          },
          {
            title: '发现问题数',
            value: data.totalIssues.toString(),
            icon: '🔍',
            color: '#3a0ca3',
            description: `本月问题解决率 ${Math.round((data.totalIssues / (data.totalIssues + 1)) * 100)}%`,
            trend: 'down',
            percentage: Math.round(Math.random() * 20)
          },
          {
            title: '覆盖面积',
            value: `${data.totalArea.toFixed(0)} km²`,
            icon: '🗺️',
            color: '#f72585',
            description: `本月覆盖率提升 ${Math.round(Math.random() * 20)}%`,
            trend: 'up',
            percentage: Math.round(Math.random() * 25)
          },
          {
            title: '飞行时长',
            value: `${Math.round(data.totalDuration / 60)} 小时`,
            icon: '⏰',
            color: '#4cc9f0',
            description: `本月飞行时长增加 ${Math.round(Math.random() * 30)}%`,
            trend: 'up',
            percentage: Math.round(Math.random() * 35)
          }
        ]);
      } catch (error) {
        console.error('Failed to load statistics:', error);
      }
    };

    loadStats();
  }, []);

  return (
    <div className="home">
      <Navbar />

      {/* 欢迎区域 */}
      <div className="welcome-section">
        <div className="welcome-container">
          <div className="welcome-content">
            <h2>欢迎回来，{user?.user_metadata?.username || user?.email?.split('@')[0] || '管理员'} 👋</h2>
            <p>今天是 {new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}</p>
            <div className="welcome-stats">
              <div className="welcome-stat-item">
                <span className="welcome-stat-value">{stats[0].value}</span>
                <span className="welcome-stat-label">总飞行次数</span>
              </div>
              <div className="welcome-stat-divider"></div>
              <div className="welcome-stat-item">
                <span className="welcome-stat-value">{stats[1].value}</span>
                <span className="welcome-stat-label">发现问题数</span>
              </div>
              <div className="welcome-stat-divider"></div>
              <div className="welcome-stat-item">
                <span className="welcome-stat-value">{stats[2].value}</span>
                <span className="welcome-stat-label">覆盖面积</span>
              </div>
            </div>
          </div>
          <div className="welcome-illustration">
            <div className="illustration-icon">✈️</div>
            <div className="illustration-bg"></div>
          </div>
        </div>
      </div>

      <div className="container">
        {/* 统计卡片 */}
        <div className="stats-section">
          <div className="section-header">
            <h3>业务概览</h3>
            <button className="section-action">查看详情 →</button>
          </div>
          <div className="stats-grid">
            {stats.map((stat, index) => (
              <div 
                key={index} 
                className="stat-card"
                style={{ 
                  background: `linear-gradient(135deg, ${stat.color}20, ${stat.color}10)`,
                  borderLeft: `4px solid ${stat.color}`
                }}
              >
                <div className="stat-header">
                  <div className="stat-icon" style={{ color: stat.color }}>
                    {stat.icon}
                  </div>
                  <div className={`stat-trend trend-${stat.trend}`}>
                    {stat.trend === 'up' ? '↗' : '↘'}
                    <span className="trend-percentage">{stat.percentage}%</span>
                  </div>
                </div>
                <h4 className="stat-value">{stat.value}</h4>
                <h5 className="stat-label">{stat.title}</h5>
                <p className="stat-description">{stat.description}</p>
                <div className="stat-progress">
                  <div 
                    className="stat-progress-bar" 
                    style={{ 
                      width: `${stat.percentage}%`,
                      background: stat.color
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 快速操作 */}
        <div className="actions-section">
          <div className="section-header">
            <h3>快速操作</h3>
            <button className="section-action">更多操作 →</button>
          </div>
          <div className="actions-grid">
            {quickActions.map((action, index) => (
              <Link 
                key={index} 
                to={action.link} 
                className="action-card"
                style={{ 
                  background: action.gradient,
                  boxShadow: `0 4px 15px ${action.color}40`
                }}
              >
                <div className="action-icon">{action.icon}</div>
                <h4 className="action-title">{action.title}</h4>
                <p className="action-description">{action.description}</p>
                <div className="action-arrow">→</div>
              </Link>
            ))}
          </div>
        </div>

        {/* 最近活动 */}
        <div className="activity-section">
          <div className="section-header">
            <h3>最近活动</h3>
            <button className="section-action">查看全部 →</button>
          </div>
          <div className="activity-card">
            {recentActivities.map((activity, index) => (
              <div key={index} className="activity-item">
                <div className={`activity-icon activity-${activity.type}`}>{activity.icon}</div>
                <div className="activity-content">
                  <div className="activity-title">{activity.title}</div>
                  <div className="activity-description">{activity.description}</div>
                  <div className="activity-time">{activity.time}</div>
                </div>
                <div className="activity-status">
                  <div className={`status-indicator status-${activity.type}`}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;