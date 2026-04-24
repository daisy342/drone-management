        {/* 过滤器 */}
        <div className="dictionary-tabs" style={{ marginBottom: '16px', borderBottom: '1px solid #e0e0e0', padding: '16px' }}>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div className="form-group" style={{ marginBottom: 0, flex: '0 0 auto' }}>
              <input
                type="text"
                placeholder="用户名"
                value={operationLogsFilter.username}
                onChange={(e) => setOperationLogsFilter(prev => ({ ...prev, username: e.target.value }))}
                style={{ width: '150px' }}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0, flex: '0 0 auto' }}>
              <select
                value={operationLogsFilter.action_type}
                onChange={(e) => setOperationLogsFilter(prev => ({ ...prev, action_type: e.target.value as OperationType | '' }))}
                style={{ width: '140px', cursor: 'pointer' }}
              >
                <option value="">全部操作</option>
                {getActionTypeOptions().map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0, flex: '0 0 auto' }}>
              <select
                value={operationLogsFilter.target_type}
                onChange={(e) => setOperationLogsFilter(prev => ({ ...prev, target_type: e.target.value as TargetType | '' }))}
                style={{ width: '140px', cursor: 'pointer' }}
              >
                <option value="">全部目标</option>
                {getTargetTypeOptions().map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0, flex: '0 0 auto' }}>
              <input
                type="datetime-local"
                placeholder="开始时间"
                value={operationLogsFilter.start_date}
                onChange={(e) => setOperationLogsFilter(prev => ({ ...prev, start_date: e.target.value }))}
                style={{ width: '180px' }}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0, flex: '0 0 auto' }}>
              <input
                type="datetime-local"
                placeholder="结束时间"
                value={operationLogsFilter.end_date}
                onChange={(e) => setOperationLogsFilter(prev => ({ ...prev, end_date: e.target.value }))}
                style={{ width: '180px' }}
              />
            </div>
            <button
              className="btn btn-primary"
              onClick={loadOperationLogs}
              style={{ fontSize: '0.85rem', padding: '10px 18px', borderRadius: '6px', fontWeight: '500', height: '42px' }}
            >
              查询
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => {
                setOperationLogsFilter({ username: '', action_type: '', target_type: '', start_date: '', end_date: '' });
                setOperationLogsPage(1);
                loadOperationLogs();
              }}
              style={{ fontSize: '0.85rem', padding: '10px 18px', borderRadius: '6px', fontWeight: '500', height: '42px' }}
            >
              重置
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="loading-container">
            <span className="loading"></span>
            <span className="loading-text">加载中...</span>
          </div>
        ) : (
          <>
            <table>
              <thead>
                <tr>
                  <th>用户</th>
                  <th>操作类型</th>
                  <th>目标类型</th>
                  <th>目标名称</th>
                  <th>操作描述</th>
                  <th>操作时间</th>
                </tr>
              </thead>
              <tbody>
                {operationLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                      暂无操作日志
                    </td>
                  </tr>
                ) : (
                  operationLogs.map(log => (
                    <tr key={log.id}>
                      <td>{log.username}</td>
                      <td>
                        <span className={`tag tag-${
                          log.action_type === 'CREATE' ? 'success' :
                          log.action_type === 'UPDATE' ? 'info' :
                          log.action_type === 'DELETE' ? 'danger' :
                          log.action_type === 'LOGIN' ? 'primary' :
                          log.action_type === 'LOGOUT' ? 'secondary' :
                          log.action_type === 'RESET_PASSWORD' ? 'warning' : 'default'
                        }`}>
                          {getActionTypeOptions().find(opt => opt.value === log.action_type)?.label || log.action_type}
                        </span>
                      </td>
                      <td>{getTargetTypeOptions().find(opt => opt.value === log.target_type)?.label || log.target_type}</td>
                      <td>{log.target_name || '-'}</td>
                      <td>{log.description || '-'}</td>
                      <td>{new Date(log.created_at).toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* 分页 */}
            {operationLogsTotal > 0 && (
              <div style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e0e0e0' }}>
                <div style={{ fontSize: '0.85rem', color: '#666' }}>
                  共 {operationLogsTotal} 条记录
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <select
                    value={operationLogsPageSize}
                    onChange={(e) => {
                      setOperationLogsPageSize(Number(e.target.value));
                      setOperationLogsPage(1);
                    }}
                    style={{ padding: '6px 12px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.85rem' }}
                  >
                    <option value={10}>10条/页</option>
                    <option value={20}>20条/页</option>
                    <option value={50}>50条/页</option>
                    <option value={100}>100条/页</option>
                  </select>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setOperationLogsPage(p => Math.max(1, p - 1))}
                    disabled={operationLogsPage === 1}
                    style={{ fontSize: '0.8rem' }}
                  >
                    上一页
                  </button>
                  <span style={{ fontSize: '0.85rem', color: '#666' }}>
                    第 {operationLogsPage} 页 / 共 {Math.ceil(operationLogsTotal / operationLogsPageSize)} 页
                  </span>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setOperationLogsPage(p => Math.min(Math.ceil(operationLogsTotal / operationLogsPageSize), p + 1))}
                    disabled={operationLogsPage >= Math.ceil(operationLogsTotal / operationLogsPageSize)}
                    style={{ fontSize: '0.8rem' }}
                  >
                    下一页
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  };