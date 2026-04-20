import React, { useState, useEffect } from 'react';
import { Log, createLog, getLogs, updateLog, deleteLog } from '../services/logs';
import { getBases, getRoutes, getAreas } from '../services/dictionary';
import { initializeDatabase } from '../utils/database';
import Navbar from '../components/Navbar';
import './Logs.css';

const Logs: React.FC = () => {
  const [logs, setLogs] = useState<Log[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingLog, setEditingLog] = useState<Log | null>(null);
  const [bases, setBases] = useState<any[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);
  const [areas, setAreas] = useState<any[]>([]);
  const [selectedBase, setSelectedBase] = useState('');
  const [selectedRoute, setSelectedRoute] = useState('');
  
  // 表单状态
  const [form, setForm] = useState<{
    date: string;
    time: string;
    base_id: string;
    route_id: string;
    area_id: string;
    flight_duration: number;
    coverage_area: number;
    issues: { id: string; description: string; location: string; severity: 'low' | 'medium' | 'high'; status: 'open' | 'closed' }[];
    photos: string[];
  }>({
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().split(' ')[0],
    base_id: '',
    route_id: '',
    area_id: '',
    flight_duration: 0,
    coverage_area: 0,
    issues: [{ id: Date.now().toString(), description: '', location: '', severity: 'low', status: 'open' }],
    photos: []
  });

  // 加载数据
  useEffect(() => {
    const initializeAndLoadData = async () => {
      try {
        // 初始化数据库检查
        await initializeDatabase();
        await loadData();
      } catch (err: any) {
        setError(err.message || '初始化数据库失败');
      }
    };

    initializeAndLoadData();
  }, []);

  // 加载基地列表
  useEffect(() => {
    const loadBases = async () => {
      try {
        const data = await getBases();
        setBases(data);
      } catch (err) {
        console.error('Error loading bases:', err);
      }
    };
    loadBases();
  }, []);

  // 加载航线列表
  useEffect(() => {
    const loadRoutes = async () => {
      if (selectedBase) {
        try {
          const data = await getRoutes(selectedBase);
          setRoutes(data);
        } catch (err) {
          console.error('Error loading routes:', err);
        }
      } else {
        setRoutes([]);
      }
    };
    loadRoutes();
  }, [selectedBase]);

  // 加载责任区列表
  useEffect(() => {
    const loadAreas = async () => {
      if (selectedRoute) {
        try {
          const data = await getAreas(selectedRoute);
          setAreas(data);
        } catch (err) {
          console.error('Error loading areas:', err);
        }
      } else {
        setAreas([]);
      }
    };
    loadAreas();
  }, [selectedRoute]);

  // 加载日志数据
  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await getLogs();
      setLogs(data);
    } catch (err: any) {
      setError(err.message || '加载日志失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 处理表单输入变化
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: name === 'flight_duration' || name === 'coverage_area' ? parseFloat(value) : value
    }));

    // 更新关联的下拉列表
    if (name === 'base_id') {
      setSelectedBase(value);
      setForm(prev => ({ ...prev, route_id: '', area_id: '' }));
    } else if (name === 'route_id') {
      setSelectedRoute(value);
      setForm(prev => ({ ...prev, area_id: '' }));
    }
  };

  // 处理问题列表变化
  const handleIssueChange = (index: number, field: string, value: any) => {
    const newIssues = [...form.issues];
    newIssues[index] = { ...newIssues[index], [field]: value };
    setForm(prev => ({ ...prev, issues: newIssues }));
  };

  // 添加问题
  const addIssue = () => {
    setForm(prev => ({
      ...prev,
      issues: [...prev.issues, { id: Date.now().toString(), description: '', location: '', severity: 'low', status: 'open' }]
    }));
  };

  // 删除问题
  const removeIssue = (index: number) => {
    const newIssues = form.issues.filter((_, i) => i !== index);
    setForm(prev => ({ ...prev, issues: newIssues }));
  };

  // 处理照片上传
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsLoading(true);
    try {
      const uploadedPhotos = [...form.photos];
      for (const file of files) {
        // 这里需要先创建日志才能上传照片，所以暂时存储在本地
        // 实际实现时，应该先创建日志，然后上传照片
        uploadedPhotos.push(URL.createObjectURL(file));
      }
      setForm(prev => ({ ...prev, photos: uploadedPhotos }));
    } catch (err: any) {
      setError(err.message || '上传照片失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 删除照片
  const removePhoto = (index: number) => {
    const newPhotos = form.photos.filter((_, i) => i !== index);
    setForm(prev => ({ ...prev, photos: newPhotos }));
  };

  // 提交表单
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (editingLog) {
        // 更新日志
        await updateLog(editingLog.id!, {
          ...form,
          issues: form.issues
        });
      } else {
        // 创建日志
        await createLog({ 
          ...form, 
          status: 'pending',
          issues: form.issues
        });
      }
      loadData();
      setShowForm(false);
      resetForm();
    } catch (err: any) {
      setError(err.message || '保存日志失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 重置表单
  const resetForm = () => {
    setForm({
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().split(' ')[0],
      base_id: '',
      route_id: '',
      area_id: '',
      flight_duration: 0,
      coverage_area: 0,
      issues: [{ id: Date.now().toString(), description: '', location: '', severity: 'low', status: 'open' }],
      photos: []
    });
    setEditingLog(null);
    setSelectedBase('');
    setSelectedRoute('');
  };

  // 编辑日志
  const handleEdit = (log: Log) => {
    setEditingLog(log);
    setForm({
      date: log.date,
      time: log.time,
      base_id: log.base_id,
      route_id: log.route_id,
      area_id: log.area_id,
      flight_duration: log.flight_duration,
      coverage_area: log.coverage_area,
      issues: log.issues.map(issue => ({
        id: issue.id || Date.now().toString(),
        description: issue.description,
        location: issue.location,
        severity: issue.severity as 'low' | 'medium' | 'high',
        status: issue.status as 'open' | 'closed'
      })),
      photos: (log.photos || []) as string[]
    });
    setSelectedBase(log.base_id);
    setSelectedRoute(log.route_id);
    setShowForm(true);
  };

  // 删除日志
  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这条日志吗？')) return;

    setIsLoading(true);
    try {
      await deleteLog(id);
      loadData();
    } catch (err: any) {
      setError(err.message || '删除日志失败');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="logs">
      <Navbar />

      {/* 主内容 */}
      <div className="main-content">
        <div className="container">
          {/* 欢迎区域 */}
          <div className="welcome-section">
            <div className="welcome-content">
              <h1>日志管理</h1>
              <p>管理和跟踪所有飞行日志</p>
            </div>
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {/* 操作按钮 */}
          <div className="action-buttons">
            <button 
              className="btn btn-primary"
              onClick={() => setShowForm(true)}
            >
              录入日志
            </button>
          </div>

          {/* 日志表单抽屉 */}
          {showForm && (
            <>
              <div className="drawer-overlay" onClick={() => {
                setShowForm(false);
                resetForm();
              }} />
              <div className="drawer">
                <div className="drawer-header">
                  <h3>{editingLog ? '编辑日志' : '录入日志'}</h3>
                  <button
                    type="button"
                    className="drawer-close"
                    onClick={() => {
                      setShowForm(false);
                      resetForm();
                    }}
                  >
                    ✕
                  </button>
                </div>
                <div className="drawer-body">
                  <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="form-group">
                        <label htmlFor="date">日期</label>
                        <input 
                          type="date" 
                          id="date" 
                          name="date" 
                          value={form.date} 
                          onChange={handleChange} 
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="time">时间</label>
                        <input 
                          type="time" 
                          id="time" 
                          name="time" 
                          value={form.time} 
                          onChange={handleChange} 
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="base_id">基地</label>
                        <select 
                          id="base_id" 
                          name="base_id" 
                          value={form.base_id} 
                          onChange={handleChange} 
                          required
                        >
                          <option value="">请选择基地</option>
                          {bases.map(base => (
                            <option key={base.id} value={base.id}>{base.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group">
                        <label htmlFor="route_id">航线</label>
                        <select 
                          id="route_id" 
                          name="route_id" 
                          value={form.route_id} 
                          onChange={handleChange} 
                          required
                          disabled={!selectedBase}
                        >
                          <option value="">请选择航线</option>
                          {routes.map(route => (
                            <option key={route.id} value={route.id}>{route.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group">
                        <label htmlFor="area_id">责任区</label>
                        <select 
                          id="area_id" 
                          name="area_id" 
                          value={form.area_id} 
                          onChange={handleChange} 
                          required
                          disabled={!selectedRoute}
                        >
                          <option value="">请选择责任区</option>
                          {areas.map(area => (
                            <option key={area.id} value={area.id}>{area.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group">
                        <label htmlFor="flight_duration">飞行时长（分钟）</label>
                        <input 
                          type="number" 
                          id="flight_duration" 
                          name="flight_duration" 
                          value={form.flight_duration} 
                          onChange={handleChange} 
                          required
                          min="0"
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="coverage_area">覆盖面积（平方公里）</label>
                        <input 
                          type="number" 
                          id="coverage_area" 
                          name="coverage_area" 
                          value={form.coverage_area} 
                          onChange={handleChange} 
                          required
                          min="0"
                          step="0.01"
                        />
                      </div>
                    </div>

                    {/* 问题明细 */}
                    <div className="form-group">
                      <label>问题明细</label>
                      {form.issues.map((issue, index) => (
                        <div key={issue.id} className="issue-item">
                          <div className="grid grid-cols-3 gap-4">
                            <div className="form-group">
                              <label htmlFor={`issue-${index}-description`}>描述</label>
                              <input 
                                type="text" 
                                id={`issue-${index}-description`} 
                                value={issue.description} 
                                onChange={(e) => handleIssueChange(index, 'description', e.target.value)} 
                                required
                              />
                            </div>
                            <div className="form-group">
                              <label htmlFor={`issue-${index}-location`}>位置</label>
                              <input 
                                type="text" 
                                id={`issue-${index}-location`} 
                                value={issue.location} 
                                onChange={(e) => handleIssueChange(index, 'location', e.target.value)} 
                                required
                              />
                            </div>
                            <div className="form-group">
                              <label htmlFor={`issue-${index}-severity`}>严重程度</label>
                              <select 
                                id={`issue-${index}-severity`} 
                                value={issue.severity} 
                                onChange={(e) => handleIssueChange(index, 'severity', e.target.value)}
                              >
                                <option value="low">低</option>
                                <option value="medium">中</option>
                                <option value="high">高</option>
                              </select>
                            </div>
                          </div>
                          <button 
                            type="button" 
                            className="btn btn-danger"
                            onClick={() => removeIssue(index)}
                          >
                            删除
                          </button>
                        </div>
                      ))}
                      <button 
                        type="button" 
                        className="btn btn-secondary"
                        onClick={addIssue}
                      >
                        添加问题
                      </button>
                    </div>

                    {/* 照片上传 */}
                    <div className="form-group">
                      <label>照片</label>
                      <input 
                        type="file" 
                        multiple 
                        accept="image/*" 
                        onChange={handlePhotoUpload}
                      />
                      <div className="photos-preview">
                        {form.photos.map((photo, index) => (
                          <div key={index} className="photo-item">
                            <img src={photo} alt={`Photo ${index + 1}`} />
                            <button 
                              type="button" 
                              className="btn btn-danger"
                              onClick={() => removePhoto(index)}
                            >
                              删除
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 表单按钮 */}
                    <div className="drawer-footer">
                      <div className="form-buttons">
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => {
                            setShowForm(false);
                            resetForm();
                          }}
                        >
                          取消
                        </button>
                        <button
                          type="submit"
                          className="btn btn-primary"
                          disabled={isLoading}
                        >
                          {isLoading ? (
                            <>
                              <span className="loading"></span>
                              保存中...
                            </>
                          ) : (
                            '保存'
                          )}
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            </>
          )}

          {/* 日志列表 */}
          <div className="table-container">
            <h3>日志列表</h3>
            {isLoading && !showForm ? (
              <div className="loading-container">
                <span className="loading"></span>
                <span className="loading-text">加载中...</span>
              </div>
            ) : logs.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📋</div>
                <div className="empty-state-text">暂无数据</div>
              </div>
            ) : (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>日期</th>
                      <th>时间</th>
                      <th>基地</th>
                      <th>航线</th>
                      <th>责任区</th>
                      <th>飞行时长</th>
                      <th>覆盖面积</th>
                      <th>问题数量</th>
                      <th>状态</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map(log => (
                      <tr key={log.id}>
                        <td>{log.date}</td>
                        <td>{log.time}</td>
                        <td>{bases.find(b => b.id === log.base_id)?.name || log.base_id}</td>
                        <td>{routes.find(r => r.id === log.route_id)?.name || log.route_id}</td>
                        <td>{areas.find(a => a.id === log.area_id)?.name || log.area_id}</td>
                        <td>{log.flight_duration} 分钟</td>
                        <td>{log.coverage_area} 平方公里</td>
                        <td>{log.issues.length}</td>
                        <td>
                          <span className={`tag tag-${log.status === 'pending' ? 'warning' : log.status === 'reviewed' ? 'info' : 'success'}`}>
                            {log.status === 'pending' ? '待审核' : log.status === 'reviewed' ? '已审核' : '已归档'}
                          </span>
                        </td>
                        <td>
                          <div className="btn-group">
                            <button 
                              className="btn btn-primary"
                              onClick={() => handleEdit(log)}
                            >
                              编辑
                            </button>
                            <button 
                              className="btn btn-danger"
                              onClick={() => handleDelete(log.id!)}
                            >
                              删除
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Logs;