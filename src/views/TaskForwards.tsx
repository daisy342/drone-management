import React, { useState, useEffect, useMemo, useRef } from 'react';
import { TaskForward, TaskForwardStatus, TaskPriority, getTaskForwards, createTaskForward, updateTaskForward, deleteTaskForward, updateTaskStatus, getTaskStatistics, statusDisplayText, priorityDisplayText, generateDefaultTemplate } from '../services/taskForward';
import { Log, getLogs } from '../services/logs';
import { getDictionaryItems, DictionaryItem } from '../services/dictionary';
import { getAllUsers } from '../services/userManagement';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';
import DatePicker from '../components/DatePicker';
import DateRangePicker from '../components/DateRangePicker';
import Select from '../components/CustomSelect';
import { showToast } from '../components/Toast';
import InputWithClear from '../components/InputWithClear';
import '../styles/unified-controls.css';
import './TaskForwards.css';

// 状态下拉选项
const statusOptions = [
  { value: 'pending', label: '待发送' },
  { value: 'received', label: '已接收' },
  { value: 'processing', label: '处理中' },
  { value: 'resolved', label: '已解决' },
  { value: 'closed', label: '已关闭' }
];

// 优先级下拉选项
const priorityOptions = [
  { value: 'high', label: '高' },
  { value: 'medium', label: '中' },
  { value: 'low', label: '低' }
];

const TaskForwards: React.FC = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<TaskForward[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [responsibleUnits, setResponsibleUnits] = useState<DictionaryItem[]>([]);
  const [users, setUsers] = useState<{id: string; full_name: string; username: string; contact_info?: string}[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // 模态框状态
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showStatisticsModal, setShowStatisticsModal] = useState(false);

  // 模态框错误状态
  const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({});
  const firstErrorRef = useRef<HTMLDivElement | null>(null);

  // 当前操作的任务
  const [currentTask, setCurrentTask] = useState<TaskForward | null>(null);
  const [selectedLog, setSelectedLog] = useState<Log | null>(null);

  // 筛选状态
  const [filters, setFilters] = useState<{
    status: TaskForwardStatus | '';
    priority: TaskPriority | '';
    startDate: string;
    endDate: string;
    keyword: string;
  }>({
    status: '',
    priority: '',
    startDate: '',
    endDate: '',
    keyword: ''
  });

  // 统计信息
  const [statistics, setStatistics] = useState<any>(null);

  // 创建表单状态
  const [createForm, setCreateForm] = useState<{
    report_id: string;
    forward_to: string;
    contact_person: string;
    contact_phone: string;
    template: string;
    photos: string[];
    screenshots: string[];
    priority: TaskPriority;
    due_date: string;
    selectedIssues: number[];
  }>({
    report_id: '',
    forward_to: '',
    contact_person: '',
    contact_phone: '',
    template: '',
    photos: [],
    screenshots: [],
    priority: 'medium',
    due_date: '',
    selectedIssues: []
  });

  // 状态更新表单
  const [statusForm, setStatusForm] = useState<{
    newStatus: TaskForwardStatus;
    notes: string;
  }>({
    newStatus: 'pending',
    notes: ''
  });

  // 状态流转选项
  const statusFlowOptions: Record<TaskForwardStatus, { next: TaskForwardStatus[]; label: string }> = {
    pending: { next: ['received'], label: '待发送' },
    received: { next: ['processing'], label: '已接收' },
    processing: { next: ['resolved'], label: '处理中' },
    resolved: { next: ['closed'], label: '已解决' },
    closed: { next: [], label: '已关闭' }
  };

  // 加载数据
  useEffect(() => {
    loadData();
    loadResponsibleUnits();
    loadLogs();
    loadUsers();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await getTaskForwards({
        status: filters.status || undefined,
        priority: filters.priority || undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
        keyword: filters.keyword || undefined
      });
      setTasks(data);
    } catch (err: any) {
      const errorMsg = err.message || '加载数据失败';
      setError(errorMsg);
      showToast('error', errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const loadResponsibleUnits = async () => {
    try {
      const units = await getDictionaryItems('responsible_unit');
      setResponsibleUnits(units);
    } catch (err) {
      console.error('加载责任单位失败:', err);
    }
  };

  const loadLogs = async () => {
    try {
      const data = await getLogs({ status: 'approved' });
      setLogs(data);
    } catch (err) {
      console.error('加载日志失败:', err);
    }
  };

  const loadUsers = async () => {
    try {
      const data = await getAllUsers();
      // 格式化用户数据
      const formattedUsers = data.map((user: any) => ({
        id: user.id,
        full_name: user.full_name || user.username || '',
        username: user.username || '',
        contact_info: user.contact_info || ''
      })).filter((u: any) => u.full_name);
      setUsers(formattedUsers);
    } catch (err) {
      console.error('加载用户失败:', err);
    }
  };

  // 处理筛选变化
  const handleFilterChange = (key: keyof typeof filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // 处理日期范围变化
  const handleDateRangeChange = (startDate: string, endDate: string) => {
    setFilters(prev => ({ ...prev, startDate, endDate }));
  };

  // 应用筛选
  const applyFilters = () => {
    loadData();
  };

  // 重置筛选
  const resetFilters = () => {
    setFilters({
      status: '',
      priority: '',
      startDate: '',
      endDate: '',
      keyword: ''
    });
    loadData();
  };

  // 打开创建模态框
  const openCreateModal = () => {
    setCreateForm({
      report_id: '',
      forward_to: '',
      contact_person: '',
      contact_phone: '',
      template: '',
      photos: [],
      screenshots: [],
      priority: 'medium',
      due_date: '',
      selectedIssues: []
    });
    setSelectedLog(null);
    setFieldErrors({});
    setShowCreateModal(true);
  };

  // 选择报告
  const handleSelectLog = (logId: string) => {
    if (!logId) {
      setSelectedLog(null);
      setCreateForm(prev => ({
        ...prev,
        report_id: '',
        template: ''
      }));
      return;
    }
    const log = logs.find(l => l.id === logId);
    if (log) {
      setSelectedLog(log);
      setCreateForm(prev => ({
        ...prev,
        report_id: logId,
        template: generateDefaultTemplate(log)
      }));
    }
  };

  // 选择责任单位
  const handleSelectUnit = (unitId: string) => {
    if (!unitId) {
      setCreateForm(prev => ({
        ...prev,
        forward_to: '',
        contact_phone: ''
      }));
      return;
    }
    const unit = responsibleUnits.find(u => u.id === unitId);
    if (unit) {
      setCreateForm(prev => ({
        ...prev,
        forward_to: unit.name,
        contact_phone: unit.extra_data?.phone || ''
      }));
    }
  };

  // 选择联系人
  const handleSelectContactPerson = (userId: string) => {
    if (!userId) {
      setCreateForm(prev => ({
        ...prev,
        contact_person: '',
        contact_phone: ''
      }));
      return;
    }
    const selectedUser = users.find(u => u.id === userId);
    if (selectedUser) {
      setCreateForm(prev => ({
        ...prev,
        contact_person: selectedUser.full_name,
        contact_phone: selectedUser.contact_info || ''
      }));
    }
  };

  // 切换问题选择
  const toggleIssueSelection = (index: number) => {
    setCreateForm(prev => {
      const newSelected = prev.selectedIssues.includes(index)
        ? prev.selectedIssues.filter(i => i !== index)
        : [...prev.selectedIssues, index];
      return { ...prev, selectedIssues: newSelected };
    });
  };

  // 切换照片选择
  const togglePhotoSelection = (photoUrl: string, type: 'photo' | 'screenshot') => {
    setCreateForm(prev => {
      if (type === 'photo') {
        const newPhotos = prev.photos.includes(photoUrl)
          ? prev.photos.filter(p => p !== photoUrl)
          : [...prev.photos, photoUrl];
        return { ...prev, photos: newPhotos };
      } else {
        const newScreenshots = prev.screenshots.includes(photoUrl)
          ? prev.screenshots.filter(s => s !== photoUrl)
          : [...prev.screenshots, photoUrl];
        return { ...prev, screenshots: newScreenshots };
      }
    });
  };

  // 创建转发任务
  const handleCreate = async () => {
    // 清除之前的错误状态
    setFieldErrors({});

    const newFieldErrors: Record<string, boolean> = {};
    let firstErrorField: string | null = null;

    // 验证必填字段
    if (!createForm.report_id) {
      newFieldErrors['report_id'] = true;
      if (!firstErrorField) firstErrorField = 'report_id';
    }
    if (!createForm.forward_to) {
      newFieldErrors['forward_to'] = true;
      if (!firstErrorField) firstErrorField = 'forward_to';
    }
    if (!createForm.contact_person.trim()) {
      newFieldErrors['contact_person'] = true;
      if (!firstErrorField) firstErrorField = 'contact_person';
    }
    if (!createForm.template.trim()) {
      newFieldErrors['template'] = true;
      if (!firstErrorField) firstErrorField = 'template';
    }

    // 如果有验证错误
    if (Object.keys(newFieldErrors).length > 0) {
      setFieldErrors(newFieldErrors);
      showToast('error', '请填写所有必填项');
      // 延迟滚动到首个错误字段
      setTimeout(() => {
        const errorElement = document.querySelector(`[data-error-field="${firstErrorField}"]`);
        if (errorElement) {
          errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
      return;
    }

    setIsLoading(true);
    try {
      await createTaskForward({
        report_id: createForm.report_id,
        forward_to: createForm.forward_to,
        contact_person: createForm.contact_person,
        contact_phone: createForm.contact_phone,
        template: createForm.template,
        photos: createForm.photos,
        screenshots: createForm.screenshots,
        status: 'pending',
        priority: createForm.priority,
        due_date: createForm.due_date || undefined,
        created_by: user?.id
      });
      setShowCreateModal(false);
      setFieldErrors({});
      loadData();
      showToast('success', '创建转发任务成功');
    } catch (err: any) {
      showToast('error', err.message || '创建失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 删除转发任务
  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个转发任务吗？')) return;

    setIsLoading(true);
    try {
      await deleteTaskForward(id);
      loadData();
    } catch (err: any) {
      const errorMsg = err.message || '删除失败';
      setError(errorMsg);
      showToast('error', errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // 打开状态更新模态框
  const openStatusModal = (task: TaskForward) => {
    setCurrentTask(task);
    setStatusForm({
      newStatus: task.status,
      notes: task.resolution_notes || ''
    });
    setShowStatusModal(true);
  };

  // 更新状态
  const handleUpdateStatus = async () => {
    if (!currentTask?.id) return;

    setIsLoading(true);
    try {
      await updateTaskStatus(currentTask.id, statusForm.newStatus, statusForm.notes);
      setShowStatusModal(false);
      loadData();
    } catch (err: any) {
      const errorMsg = err.message || '更新状态失败';
      showToast('error', errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // 查看详情
  const openDetailModal = async (taskId: string) => {
    try {
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        setCurrentTask(task);
        setShowDetailModal(true);
      }
    } catch (err: any) {
      const errorMsg = err.message || '加载详情失败';
      setError(errorMsg);
      showToast('error', errorMsg);
    }
  };

  // 打开统计模态框
  const openStatisticsModal = async () => {
    try {
      const stats = await getTaskStatistics(filters.startDate || undefined, filters.endDate || undefined);
      setStatistics(stats);
      setShowStatisticsModal(true);
    } catch (err: any) {
      const errorMsg = err.message || '加载统计失败';
      setError(errorMsg);
      showToast('error', errorMsg);
    }
  };

  // 获取可流转的状态选项
  const getAvailableStatusOptions = (currentStatus: TaskForwardStatus) => {
    const nextStatuses = statusFlowOptions[currentStatus]?.next || [];
    if (nextStatuses.length === 0) {
      // 如果没有可流转的下一状态（如已关闭），只显示当前状态且禁用选择
      return [{ value: currentStatus, label: statusDisplayText[currentStatus].text, isDisabled: true }];
    }
    return nextStatuses.map(status => ({
      value: status,
      label: statusDisplayText[status].text
    }));
  };

  // 格式化日期
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('zh-CN');
  };

  return (
    <div className="task-forwards">
      <Navbar />

      <div className="main-content">
        <div className="container">
          {/* 筛选栏 */}
          <div className="filter-bar">
            <div className="filter-row">
              <div className="filter-item">
                <label>状态</label>
                <Select
                  value={statusOptions.find(opt => opt.value === filters.status) || null}
                  onChange={(option) => handleFilterChange('status', option?.value || '')}
                  options={statusOptions}
                  placeholder="全部状态"
                  isClearable={true}
                  isSearchable={false}
                />
              </div>
              <div className="filter-item">
                <label>优先级</label>
                <Select
                  value={priorityOptions.find(opt => opt.value === filters.priority) || null}
                  onChange={(option) => handleFilterChange('priority', option?.value || '')}
                  options={priorityOptions}
                  placeholder="全部优先级"
                  isClearable={true}
                  isSearchable={false}
                />
              </div>
              <div className="filter-item" style={{ minWidth: '320px' }}>
                <label>日期范围</label>
                <DateRangePicker
                  startDate={filters.startDate}
                  endDate={filters.endDate}
                  onChange={handleDateRangeChange}
                  placeholder="请选择日期范围"
                />
              </div>
              <div className="filter-item">
                <label>关键词</label>
                <input
                  type="text"
                  className="filter-input"
                  value={filters.keyword}
                  onChange={(e) => handleFilterChange('keyword', e.target.value)}
                  placeholder="责任单位/联系人"
                />
              </div>
              <div className="filter-actions">
                <button className="btn btn-primary" onClick={applyFilters}>筛选</button>
                <button className="btn btn-secondary" onClick={resetFilters}>重置</button>
              </div>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="action-buttons">
            <button className="btn btn-primary" onClick={openCreateModal}>
              新建转发任务
            </button>
            <button className="btn btn-secondary" onClick={openStatisticsModal}>
              统计概览
            </button>
          </div>

          {/* 任务列表 */}
          <div className="table-container">
            <h3>转发任务列表</h3>
            {isLoading ? (
              <div className="loading-container">
                <span className="loading"></span>
                <span className="loading-text">加载中...</span>
              </div>
            ) : tasks.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📋</div>
                <div className="empty-state-text">暂无转发任务</div>
              </div>
            ) : (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>报告编号</th>
                      <th>责任单位</th>
                      <th>联系人</th>
                      <th>优先级</th>
                      <th>状态</th>
                      <th>处理期限</th>
                      <th>创建时间</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.map(task => {
                      const isOverdue = task.due_date &&
                        new Date(task.due_date) < new Date() &&
                        task.status !== 'resolved' &&
                        task.status !== 'closed';

                      return (
                        <tr key={task.id} className={isOverdue ? 'overdue' : ''}>
                          <td>{task.report?.reportNumber || '-'}</td>
                          <td>{task.forward_to}</td>
                          <td>{task.contact_person || '-'}</td>
                          <td>
                            <span
                              className="priority-tag"
                              style={{ backgroundColor: priorityDisplayText[task.priority].color }}
                            >
                              {priorityDisplayText[task.priority].text}
                            </span>
                          </td>
                          <td>
                            <span
                              className="status-tag"
                              style={{ backgroundColor: statusDisplayText[task.status].color }}
                            >
                              {statusDisplayText[task.status].text}
                            </span>
                          </td>
                          <td className={isOverdue ? 'overdue-date' : ''}>
                            {task.due_date || '-'}
                            {isOverdue && <span className="overdue-badge">已超期</span>}
                          </td>
                          <td>{formatDate(task.created_at || '')}</td>
                          <td>
                            <div className="btn-group">
                              <button
                                className="btn btn-primary btn-sm"
                                onClick={() => openDetailModal(task.id!)}
                              >
                                详情
                              </button>
                              {task.status !== 'closed' && (
                                <button
                                  className="btn btn-warning btn-sm"
                                  onClick={() => openStatusModal(task)}
                                >
                                  更新状态
                                </button>
                              )}
                              <button
                                className="btn btn-danger btn-sm"
                                onClick={() => handleDelete(task.id!)}
                              >
                                删除
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 创建转发任务模态框 */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal modal-large" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h4>新建转发任务</h4>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-section">
                <h5 className="section-title">基本信息</h5>
                <div className="form-row">
                  <div className="form-group" data-error-field="report_id">
                    <label>选择巡查报告<span className="required-mark">*</span></label>
                    <div className={fieldErrors['report_id'] ? 'error-field-wrapper' : ''}>
                      <Select
                        value={logs.find(log => log.id === createForm.report_id)
                          ? { value: createForm.report_id, label: `${logs.find(log => log.id === createForm.report_id)?.reportNumber} - ${logs.find(log => log.id === createForm.report_id)?.date}` }
                          : null}
                        onChange={(option) => handleSelectLog(option?.value || '')}
                        options={logs.map(log => ({ value: log.id!, label: `${log.reportNumber} - ${log.date}` }))}
                        placeholder="请选择报告"
                        isClearable={true}
                        isSearchable={true}
                      />
                    </div>
                  </div>
                  <div className="form-group" data-error-field="forward_to">
                    <label>责任单位<span className="required-mark">*</span></label>
                    <div className={fieldErrors['forward_to'] ? 'error-field-wrapper' : ''}>
                      <Select
                        value={createForm.forward_to
                          ? { value: responsibleUnits.find(u => u.name === createForm.forward_to)?.id || '', label: createForm.forward_to }
                          : null}
                        onChange={(option) => handleSelectUnit(option?.value || '')}
                        options={responsibleUnits.map(unit => ({ value: unit.id || '', label: unit.name }))}
                        placeholder="请选择单位"
                        isClearable={true}
                        isSearchable={true}
                      />
                    </div>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group" data-error-field="contact_person">
                    <label>联系人<span className="required-mark">*</span></label>
                    <div className={fieldErrors['contact_person'] ? 'error-field-wrapper' : ''}>
                      <Select
                        value={createForm.contact_person
                          ? { value: users.find(u => u.full_name === createForm.contact_person)?.id || '', label: createForm.contact_person }
                          : null}
                        onChange={(option) => handleSelectContactPerson(option?.value || '')}
                        options={users.map(user => ({ value: user.id, label: user.full_name }))}
                        placeholder="请选择联系人"
                        isClearable={true}
                        isSearchable={true}
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>联系电话</label>
                    <InputWithClear
                      value={createForm.contact_phone}
                      onChange={(value) => setCreateForm(prev => ({ ...prev, contact_phone: value }))}
                      placeholder="联系电话"
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>优先级</label>
                    <Select
                      value={priorityOptions.find(opt => opt.value === createForm.priority) || null}
                      onChange={(option) => setCreateForm(prev => ({ ...prev, priority: (option?.value as TaskPriority) || 'medium' }))}
                      options={priorityOptions}
                      placeholder="请选择优先级"
                      isClearable={false}
                      isSearchable={false}
                    />
                  </div>
                  <div className="form-group">
                    <label>处理期限</label>
                    <DatePicker
                      value={createForm.due_date}
                      onChange={(date) => setCreateForm(prev => ({ ...prev, due_date: date }))}
                      placeholder="请选择处理期限"
                    />
                  </div>
                </div>
              </div>

              {selectedLog && (
                <div className="form-section">
                  <h5 className="section-title">问题选择</h5>
                  <div className="issues-list">
                    {selectedLog.issues?.map((issue, index) => (
                      <div
                        key={index}
                        className={`issue-item ${createForm.selectedIssues.includes(index) ? 'selected' : ''}`}
                        onClick={() => toggleIssueSelection(index)}
                      >
                        <div className="issue-checkbox">
                          <input
                            type="checkbox"
                            checked={createForm.selectedIssues.includes(index)}
                            onChange={() => {}}
                          />
                        </div>
                        <div className="issue-content">
                          <div className="issue-type">{issue.pollutionTypeName || '未分类'}</div>
                          <div className="issue-desc">{issue.description}</div>
                          <div className="issue-location">📍 {issue.location || '-'}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* 关联照片 - 有数据时才显示 */}
                  {selectedLog.issues?.some(issue => issue.photos && issue.photos.length > 0) && (
                    <>
                      <h5 className="section-title">关联照片</h5>
                      <div className="photos-selection">
                        {selectedLog.issues?.map((issue, issueIndex) => (
                          <React.Fragment key={issueIndex}>
                            {issue.photos?.map((photo, photoIndex) => (
                              <div
                                key={`photo-${issueIndex}-${photoIndex}`}
                                className={`photo-select-item ${createForm.photos.includes(photo) ? 'selected' : ''}`}
                                onClick={() => togglePhotoSelection(photo, 'photo')}
                              >
                                <img src={photo} alt={`Photo ${photoIndex + 1}`} />
                                <div className="photo-overlay">
                                  <div className={`photo-checkbox ${createForm.photos.includes(photo) ? 'checked' : ''}`}>
                                    {createForm.photos.includes(photo) && (
                                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="20 6 9 17 4 12"></polyline>
                                      </svg>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </React.Fragment>
                        ))}
                      </div>
                    </>
                  )}

                  {/* 缺陷截图 - 有数据时才显示 */}
                  {selectedLog.issues?.some(issue => issue.screenshots && issue.screenshots.length > 0) && (
                    <>
                      <h5 className="section-title">缺陷截图</h5>
                      <div className="photos-selection">
                        {selectedLog.issues?.map((issue, issueIndex) => (
                          <React.Fragment key={issueIndex}>
                            {issue.screenshots?.map((screenshot, screenshotIndex) => (
                              <div
                                key={`screenshot-${issueIndex}-${screenshotIndex}`}
                                className={`photo-select-item screenshot ${createForm.screenshots.includes(screenshot) ? 'selected' : ''}`}
                                onClick={() => togglePhotoSelection(screenshot, 'screenshot')}
                              >
                                <img src={screenshot} alt={`Screenshot ${screenshotIndex + 1}`} />
                                <div className="photo-overlay">
                                  <div className={`photo-checkbox ${createForm.screenshots.includes(screenshot) ? 'checked' : ''}`}>
                                    {createForm.screenshots.includes(screenshot) && (
                                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="20 6 9 17 4 12"></polyline>
                                      </svg>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </React.Fragment>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              <div className="form-section">
                <h5 className="section-title">转发内容</h5>
                <div className="form-group" data-error-field="template">
                  <div className={fieldErrors['template'] ? 'error-field-wrapper' : ''}>
                    <textarea
                      className={`template-textarea ${fieldErrors['template'] ? 'error-field' : ''}`}
                      value={createForm.template}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, template: e.target.value }))}
                      rows={8}
                      placeholder="请输入转发内容..."
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>取消</button>
              <button className="btn btn-primary" onClick={handleCreate} disabled={isLoading}>
                {isLoading ? '创建中...' : '创建转发任务'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 详情模态框 */}
      {showDetailModal && currentTask && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal modal-large" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h4>任务详情</h4>
              <button className="modal-close" onClick={() => setShowDetailModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="detail-section">
                <div className="detail-row">
                  <span className="detail-label">报告编号：</span>
                  <span className="detail-value">{currentTask.report?.reportNumber || '-'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">责任单位：</span>
                  <span className="detail-value">{currentTask.forward_to}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">联系人：</span>
                  <span className="detail-value">{currentTask.contact_person || '-'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">联系电话：</span>
                  <span className="detail-value">{currentTask.contact_phone || '-'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">优先级：</span>
                  <span className="detail-value">
                    <span
                      className="priority-tag"
                      style={{ backgroundColor: priorityDisplayText[currentTask.priority].color }}
                    >
                      {priorityDisplayText[currentTask.priority].text}
                    </span>
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">当前状态：</span>
                  <span className="detail-value">
                    <span
                      className="status-tag"
                      style={{ backgroundColor: statusDisplayText[currentTask.status].color }}
                    >
                      {statusDisplayText[currentTask.status].text}
                    </span>
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">处理期限：</span>
                  <span className="detail-value">{currentTask.due_date || '-'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">创建时间：</span>
                  <span className="detail-value">{formatDate(currentTask.created_at || '')}</span>
                </div>
                {currentTask.received_at && (
                  <div className="detail-row">
                    <span className="detail-label">接收时间：</span>
                    <span className="detail-value">{formatDate(currentTask.received_at)}</span>
                  </div>
                )}
                {currentTask.resolved_at && (
                  <div className="detail-row">
                    <span className="detail-label">解决时间：</span>
                    <span className="detail-value">{formatDate(currentTask.resolved_at)}</span>
                  </div>
                )}
              </div>

              <div className="detail-section">
                <h5 className="section-title">转发内容</h5>
                <div className="template-content">
                  {currentTask.template}
                </div>
              </div>

              {currentTask.photos && currentTask.photos.length > 0 && (
                <div className="detail-section">
                  <h5 className="section-title">关联照片</h5>
                  <div className="photos-grid">
                    {currentTask.photos.map((photo, index) => (
                      <div key={index} className="photo-item">
                        <img src={photo} alt={`Photo ${index + 1}`} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {currentTask.screenshots && currentTask.screenshots.length > 0 && (
                <div className="detail-section">
                  <h5 className="section-title">缺陷截图</h5>
                  <div className="photos-grid">
                    {currentTask.screenshots.map((screenshot, index) => (
                      <div key={index} className="photo-item">
                        <img src={screenshot} alt={`Screenshot ${index + 1}`} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {currentTask.resolution_notes && (
                <div className="detail-section">
                  <h5 className="section-title">处理结果</h5>
                  <div className="resolution-content">
                    {currentTask.resolution_notes}
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowDetailModal(false)}>关闭</button>
            </div>
          </div>
        </div>
      )}

      {/* 状态更新模态框 */}
      {showStatusModal && currentTask && (
        <div className="modal-overlay" onClick={() => setShowStatusModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h4>更新任务状态</h4>
              <button className="modal-close" onClick={() => setShowStatusModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>当前状态</label>
                <input
                  type="text"
                  value={statusDisplayText[currentTask.status].text}
                  readOnly
                  className="readonly-input"
                />
              </div>
              <div className="form-group">
                <label>新状态</label>
                <Select
                  value={getAvailableStatusOptions(currentTask.status).find(opt => opt.value === statusForm.newStatus) || null}
                  onChange={(option) => setStatusForm(prev => ({ ...prev, newStatus: (option?.value as TaskForwardStatus) || currentTask.status }))}
                  options={getAvailableStatusOptions(currentTask.status)}
                  placeholder="请选择新状态"
                  isClearable={false}
                  isSearchable={false}
                />
              </div>
              {(statusForm.newStatus === 'resolved' || statusForm.newStatus === 'closed') && (
                <div className="form-group">
                  <label>处理结果说明</label>
                  <textarea
                    value={statusForm.notes}
                    onChange={(e) => setStatusForm(prev => ({ ...prev, notes: e.target.value }))}
                    rows={4}
                    placeholder="请输入处理结果说明..."
                  />
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowStatusModal(false)}>取消</button>
              <button className="btn btn-primary" onClick={handleUpdateStatus} disabled={isLoading}>
                {isLoading ? '更新中...' : '确认更新'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 统计模态框 */}
      {showStatisticsModal && statistics && (
        <div className="modal-overlay" onClick={() => setShowStatisticsModal(false)}>
          <div className="modal statistics-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h4>统计概览</h4>
              <button className="modal-close" onClick={() => setShowStatisticsModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="stats-overview">
                <div className="stat-card">
                  <div className="stat-icon">
                    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      <path d="M9 12h6M9 16h6" />
                    </svg>
                  </div>
                  <div className="stat-content">
                    <div className="stat-value">{statistics.total}</div>
                    <div className="stat-label">总任务数</div>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">
                    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                  </div>
                  <div className="stat-content">
                    <div className="stat-value">{statistics.completionRate}%</div>
                    <div className="stat-label">完成率</div>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">
                    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                  </div>
                  <div className="stat-content">
                    <div className="stat-value">{statistics.overdueCount}</div>
                    <div className="stat-label">超期任务</div>
                  </div>
                </div>
              </div>

              <div className="stats-section">
                <h5>
                  <span className="stats-section-icon">
                    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="20" x2="18" y2="10" />
                      <line x1="12" y1="20" x2="12" y2="4" />
                      <line x1="6" y1="20" x2="6" y2="14" />
                    </svg>
                  </span>
                  状态分布
                </h5>
                <div className="stats-bars">
                  {Object.entries(statistics.statusStats).map(([status, count]) => {
                    const countNum = count as number;
                    const percentage = statistics.total > 0 ? Math.round((countNum / statistics.total) * 100) : 0;
                    return (
                      <div key={status} className="stat-bar-item">
                        <div className="stat-bar-header">
                          <div className="stat-bar-label">
                            <span>{statusDisplayText[status as TaskForwardStatus].text}</span>
                            <span className="stat-bar-badge">{countNum}</span>
                          </div>
                          <span className="stat-bar-percentage">{percentage}%</span>
                        </div>
                        <div className="stat-bar">
                          <div
                            className="stat-bar-fill"
                            style={{
                              width: `${percentage}%`,
                              background: statusDisplayText[status as TaskForwardStatus].color
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="stats-section">
                <h5>
                  <span className="stats-section-icon">
                    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <circle cx="12" cy="12" r="6" />
                      <circle cx="12" cy="12" r="2" />
                    </svg>
                  </span>
                  优先级分布
                </h5>
                <div className="stats-bars">
                  {Object.entries(statistics.priorityStats).map(([priority, count]) => {
                    const countNum = count as number;
                    const percentage = statistics.total > 0 ? Math.round((countNum / statistics.total) * 100) : 0;
                    return (
                      <div key={priority} className="stat-bar-item">
                        <div className="stat-bar-header">
                          <div className="stat-bar-label">
                            <span>{priorityDisplayText[priority as TaskPriority].text}优先级</span>
                            <span className="stat-bar-badge">{countNum}</span>
                          </div>
                          <span className="stat-bar-percentage">{percentage}%</span>
                        </div>
                        <div className="stat-bar">
                          <div
                            className="stat-bar-fill"
                            style={{
                              width: `${percentage}%`,
                              background: priorityDisplayText[priority as TaskPriority].color
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowStatisticsModal(false)}>关闭</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskForwards;
