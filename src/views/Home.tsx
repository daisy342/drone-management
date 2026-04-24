import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';
import { getLogStatistics, getLogs, Log, Issue } from '../services/logs';
import { getTaskForwards, TaskForward } from '../services/taskForward';
import './Home.css';

// 活动数据类型
type ActivityType = 'issue_found' | 'log_submitted' | 'log_reviewed' | 'task_forwarded' | 'task_resolved' | 'normal_inspection';

interface ActivityItem {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  time: string;
  link: string;
  priority?: 'high' | 'medium' | 'low';
  status?: string;
  // 额外信息用于显示
  pollutionType?: string;
  location?: string;
  reportNumber?: string;
}

const Home = () => {
  const [stats, setStats] = useState([
    { title: '飞行次数', value: '0', icon: 'flight', color: '#4361ee', trend: 'up' as 'up' | 'down', change: '+0%' },
    { title: '发现问题', value: '0', icon: 'issue', color: '#f72585', trend: 'up' as 'up' | 'down', change: '+0%' },
    { title: '覆盖面积', value: '0', unit: 'km²', icon: 'area', color: '#4cc9f0', trend: 'up' as 'up' | 'down', change: '+0%' },
    { title: '飞行时长', value: '0', unit: 'h', icon: 'time', color: '#7209b7', trend: 'up' as 'up' | 'down', change: '+0%' }
  ]);

  // 活动数据状态 - 使用新的ActivityItem
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(true);

  const { user } = useAuth();

  // 辅助函数：格式化时间
  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    if (diffDays === 1) return '昨天';
    if (diffDays < 7) return `${diffDays}天前`;
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  };

  // 获取显示的用户名
  const getDisplayUsername = () => {
    if (!user) return '管理员';
    return user.user_metadata?.username || user.email?.split('@')[0] || '管理员';
  };

  // 快速操作
  const quickActions = [
    { title: '日志录入', link: '/logs', icon: '📝', color: '#4361ee', desc: '记录巡查' },
    { title: '数据分析', link: '/analysis', icon: '📊', color: '#3a0ca3', desc: '趋势统计' },
    { title: '报表导出', link: '/analysis', icon: '📄', color: '#f72585', desc: '生成报告' },
    { title: '系统设置', link: '/settings', icon: '⚙️', color: '#4cc9f0', desc: '权限配置' }
  ];

  // 加载统计数据
  useEffect(() => {
    const loadStats = async () => {
      try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        const endOfMonth = now.toISOString().split('T')[0];
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];

        const [currentMonthData, lastMonthData] = await Promise.all([
          getLogStatistics(startOfMonth, endOfMonth),
          getLogStatistics(startOfLastMonth, endOfLastMonth)
        ]);

        const calcChange = (current: number, last: number) => {
          if (last === 0) return '+100%';
          const change = ((current - last) / last) * 100;
          return `${change >= 0 ? '+' : ''}${Math.abs(Math.round(change))}%`;
        };

        setStats([
          { title: '飞行次数', value: currentMonthData.totalFlights.toString(), icon: 'flight', color: '#4361ee', trend: currentMonthData.totalFlights >= lastMonthData.totalFlights ? 'up' : 'down', change: calcChange(currentMonthData.totalFlights, lastMonthData.totalFlights) },
          { title: '发现问题', value: currentMonthData.totalIssues.toString(), icon: 'issue', color: '#f72585', trend: currentMonthData.totalIssues >= lastMonthData.totalIssues ? 'up' : 'down', change: calcChange(currentMonthData.totalIssues, lastMonthData.totalIssues) },
          { title: '覆盖面积', value: currentMonthData.totalArea.toFixed(1), unit: 'km²', icon: 'area', color: '#4cc9f0', trend: currentMonthData.totalArea >= lastMonthData.totalArea ? 'up' : 'down', change: calcChange(currentMonthData.totalArea, lastMonthData.totalArea) },
          { title: '飞行时长', value: Math.round(currentMonthData.totalDuration / 60).toString(), unit: 'h', icon: 'time', color: '#7209b7', trend: currentMonthData.totalDuration >= lastMonthData.totalDuration ? 'up' : 'down', change: calcChange(currentMonthData.totalDuration, lastMonthData.totalDuration) }
        ]);
      } catch (error) {
        console.error('加载统计数据失败:', error);
      }
    };

    loadStats();
  }, []);

  // 加载活动数据 - 综合时间线混合型
  useEffect(() => {
    const loadActivities = async () => {
      try {
        setLoadingActivities(true);

        const allActivities: ActivityItem[] = [];

        // 1. 获取日志数据，提取问题和提交记录
        const logs = await getLogs();

        logs.forEach((log: Log) => {
          // 添加日志提交活动
          if (log.status === 'pending' || log.status === 'approved') {
            allActivities.push({
              id: `log-${log.id}`,
              type: log.status === 'pending' ? 'log_submitted' : 'log_reviewed',
              title: log.status === 'pending' ? '巡查报告已提交' : '巡查报告已审核',
              description: `报告编号：${log.reportNumber || '未知'}${log.status === 'approved' ? '，已通过审核' : '，等待审核'}`,
              time: log.submitted_at || log.created_at || log.date,
              link: `/logs?id=${log.id}`,
              reportNumber: log.reportNumber
            });
          }

          // 提取问题发现活动
          log.issues?.forEach((issue: Issue) => {
            allActivities.push({
              id: `issue-${issue.id || Date.now()}`,
              type: 'issue_found',
              title: `发现${issue.pollutionTypeName || '环境问题'}`,
              description: `${issue.location}${issue.detailedAddress ? `（${issue.detailedAddress}）` : ''}：${issue.description?.substring(0, 30)}${issue.description?.length > 30 ? '...' : ''}`,
              time: log.date,
              link: `/logs?id=${log.id}`,
              priority: issue.severity || 'low',
              status: issue.status,
              pollutionType: issue.pollutionTypeName,
              location: issue.location
            });
          });

          // 如果没有问题，添加正常巡查记录
          if (!log.issues || log.issues.length === 0) {
            allActivities.push({
              id: `normal-${log.id}`,
              type: 'normal_inspection',
              title: '完成巡查任务',
              description: `覆盖区域巡查完成，飞行时长 ${Math.round(log.flightDuration / 60)} 分钟，未发现异常`,
              time: log.date,
              link: `/logs?id=${log.id}`
            });
          }
        });

        // 2. 获取任务转发数据
        const tasks = await getTaskForwards();
        tasks.forEach((task: TaskForward) => {
          // 任务转发活动
          if (task.status === 'pending') {
            allActivities.push({
              id: `forward-${task.id}`,
              type: 'task_forwarded',
              title: '问题已转发',
              description: `转发至 ${task.forward_to}${task.contact_person ? `（${task.contact_person}）` : ''}`,
              time: task.created_at || '',
              link: `/task-forwards`,
              priority: task.priority,
              status: task.status
            });
          }

          // 任务解决活动
          if (task.status === 'resolved') {
            allActivities.push({
              id: `resolved-${task.id}`,
              type: 'task_resolved',
              title: '问题已解决',
              description: `${task.forward_to} 已处理并反馈结果`,
              time: task.resolved_at || task.updated_at || '',
              link: `/task-forwards`,
              status: task.status
            });
          }
        });

        // 3. 按时间排序，取最近10条
        const sortedActivities = allActivities
          .filter(act => act.time) // 过滤掉没有时间的
          .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
          .slice(0, 10);

        setActivities(sortedActivities);

      } catch (error) {
        console.error('加载活动数据失败:', error);
      } finally {
        setLoadingActivities(false);
      }
    };

    loadActivities();
  }, []);

  // 获取活动图标（使用 SVG）
  const getActivityIcon = (type: ActivityType) => {
    const icons = {
      issue_found: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
          <path d="M12 9v4"/>
          <path d="M12 17h.01"/>
        </svg>
      ),
      log_submitted: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
          <polyline points="14,2 14,8 20,8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
          <polyline points="10,9 9,9 8,9"/>
        </svg>
      ),
      log_reviewed: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
          <polyline points="14,2 14,8 20,8"/>
          <path d="M9 15l2 2 4-4"/>
        </svg>
      ),
      task_forwarded: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="22" y1="2" x2="11" y2="13"/>
          <polygon points="22,2 15,22 11,13 2,9 22,2"/>
        </svg>
      ),
      task_resolved: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
          <polyline points="22,4 12,14.01 9,11.01"/>
        </svg>
      ),
      normal_inspection: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 16v-4"/>
          <path d="M12 8h.01"/>
        </svg>
      )
    };

    const styles = {
      issue_found: { color: '#f72585', bgColor: '#fef2f2' },
      log_submitted: { color: '#4361ee', bgColor: '#eef2ff' },
      log_reviewed: { color: '#4caf50', bgColor: '#f0fdf4' },
      task_forwarded: { color: '#ff9800', bgColor: '#fff7ed' },
      task_resolved: { color: '#4caf50', bgColor: '#f0fdf4' },
      normal_inspection: { color: '#4cc9f0', bgColor: '#f0f9ff' }
    };

    return {
      icon: icons[type],
      ...styles[type]
    };
  };

  // 获取优先级标签
  const getPriorityTag = (priority?: string) => {
    switch (priority) {
      case 'high':
        return { text: '高优', color: '#f44336', bgColor: '#fef2f2' };
      case 'medium':
        return { text: '中', color: '#ff9800', bgColor: '#fff7ed' };
      case 'low':
        return { text: '低', color: '#4caf50', bgColor: '#f0fdf4' };
      default:
        return null;
    }
  };

  // 获取状态标签
  const getStatusTag = (type: ActivityType, status?: string) => {
    if (type === 'issue_found') {
      if (status === 'open') return { text: '待处理', color: '#f44336' };
      if (status === 'closed') return { text: '已解决', color: '#4caf50' };
    }
    if (type === 'task_forwarded') {
      const statusMap: Record<string, string> = {
        'pending': '待发送',
        'received': '已接收',
        'processing': '处理中',
        'resolved': '已解决',
        'closed': '已关闭'
      };
      return status ? { text: statusMap[status] || status, color: '#ff9800' } : null;
    }
    return null;
  };

  return (
    <div className="home">
      <Navbar />

      {/* 欢迎区域 */}
      <div className="welcome-section">
        <div className="welcome-content">
          <div className="welcome-avatar">{getDisplayUsername().charAt(0).toUpperCase()}</div>
          <div className="welcome-text">
            <h2>欢迎回来，{getDisplayUsername()}</h2>
            <p>{new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}</p>
          </div>
        </div>
      </div>

      <div className="home-container">
        {/* 业务概览 - 紧凑卡片 */}
        <div className="overview-section">
          {stats.map((stat, index) => (
            <div key={index} className="overview-card" style={{ '--border-color': stat.color } as React.CSSProperties}>
              <div className="overview-left">
                <div className="overview-icon" style={{ background: `linear-gradient(135deg, ${stat.color}20, ${stat.color}08)`, color: stat.color }}>
                  {stat.icon === 'flight' && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 12h20" strokeOpacity="0.3"/>
                      <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12s4.477 10 10 10 10-4.477 10-10z" strokeOpacity="0.2"/>
                      <path d="M14.5 2.5c-2 3-2 7-2 9.5s0 6.5 2 9.5"/>
                      <path d="M9.5 2.5c2 3 2 7 2 9.5s0 6.5-2 9.5"/>
                      <path d="M2 12h20" strokeWidth="1.5"/>
                      <path d="M17 9l5-3-5-1" fill="currentColor" fillOpacity="0.2"/>
                      <path d="M17 9l5-3-5-1"/>
                    </svg>
                  )}
                  {stat.icon === 'issue' && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                      <path d="M12 9v4" strokeWidth="2"/>
                      <path d="M12 17h.01" strokeWidth="2"/>
                      <circle cx="12" cy="17" r="1" fill="currentColor"/>
                    </svg>
                  )}
                  {stat.icon === 'area' && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3V6z"/>
                      <path d="M9 3v15"/>
                      <path d="M15 6v15"/>
                      <circle cx="12" cy="12" r="2" fill="currentColor" fillOpacity="0.2"/>
                      <path d="M12 10v4M10 12h4" strokeWidth="1"/>
                    </svg>
                  )}
                  {stat.icon === 'time' && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="9" strokeOpacity="0.3"/>
                      <path d="M12 12l3-3" strokeOpacity="0.4"/>
                      <circle cx="12" cy="12" r="10"/>
                      <path d="M12 6v6l3 3"/>
                      <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
                    </svg>
                  )}
                </div>
              </div>
              <div className="overview-right">
                <div className="overview-value" style={{ color: stat.color }}>
                  {stat.value}{stat.unit && <span className="overview-unit">{stat.unit}</span>}
                </div>
                <div className="overview-title">{stat.title}</div>
                <div className={`overview-trend ${stat.trend}`}>
                  {stat.trend === 'up' ? '↑' : '↓'} {stat.change}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 下方两列布局 */}
        <div className="home-grid">
          {/* 左侧 - 快速操作 */}
          <div className="home-left">
            <div className="section-title">
              <span>快速操作</span>
            </div>
            <div className="quick-actions">
              {quickActions.map((action, index) => (
                <Link key={index} to={action.link} className="quick-action-item" style={{ '--hover-color': action.color } as React.CSSProperties}>
                  <div className="quick-action-icon" style={{ background: `${action.color}15`, color: action.color }}>
                    {action.icon}
                  </div>
                  <div className="quick-action-content">
                    <div className="quick-action-title">{action.title}</div>
                    <div className="quick-action-desc">{action.desc}</div>
                  </div>
                  <div className="quick-action-arrow">→</div>
                </Link>
              ))}
            </div>
          </div>

          {/* 右侧 - 最近活动（综合时间线混合型） */}
          <div className="home-right">
            <div className="section-title">
              <span>最近活动</span>
              <Link to="/logs" className="section-more">查看全部</Link>
            </div>
            <div className="activity-list timeline-activities">
              {loadingActivities ? (
                <div className="activity-loading">加载中...</div>
              ) : activities.length === 0 ? (
                <div className="activity-empty">
                  <div className="empty-icon">📭</div>
                  <div className="empty-text">暂无活动记录</div>
                  <Link to="/logs" className="empty-action">去录入巡查</Link>
                </div>
              ) : (
                activities.slice(0, 5).map((activity) => {
                  const { icon, color, bgColor } = getActivityIcon(activity.type);
                  const priorityTag = getPriorityTag(activity.priority);
                  const statusTag = getStatusTag(activity.type, activity.status);

                  return (
                    <Link key={activity.id} to={activity.link} className="activity-row timeline-row">
                      <div
                        className="activity-icon-wrapper"
                        style={{
                          backgroundColor: bgColor,
                          color: color
                        }}
                      >
                        {icon}
                      </div>
                      <div className="timeline-content">
                        <div className="timeline-header">
                          <span className="timeline-title">{activity.title}</span>
                          <span className="timeline-time">{formatTime(activity.time)}</span>
                        </div>
                        <div className="timeline-description">{activity.description}</div>
                        <div className="timeline-tags">
                          {priorityTag && (
                            <span
                              className="timeline-tag priority"
                              style={{
                                color: priorityTag.color,
                                backgroundColor: priorityTag.bgColor
                              }}
                            >
                              {priorityTag.text}
                            </span>
                          )}
                          {statusTag && (
                            <span
                              className="timeline-tag status"
                              style={{ color: statusTag.color }}
                            >
                              {statusTag.text}
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
