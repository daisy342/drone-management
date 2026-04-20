import React, { useState } from 'react';
import { initializeDatabase } from '../utils/database';

const DatabaseSetup: React.FC = () => {
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [setupMessage, setSetupMessage] = useState('');
  const [setupError, setSetupError] = useState('');

  const handleSetup = async () => {
    setIsSettingUp(true);
    setSetupMessage('');
    setSetupError('');

    try {
      // 这里我们只是调用初始化函数，它会输出创建表的SQL命令
      await initializeDatabase();
      setSetupMessage('数据库检查完成！请按照控制台中的说明创建表。');
    } catch (err: any) {
      setSetupError(err.message || '初始化过程中出现错误');
    } finally {
      setIsSettingUp(false);
    }
  };

  return (
    <div className="database-setup container">
      <h2>数据库设置</h2>
      <p>点击下面的按钮开始检查数据库表结构。如果发现缺少表，将在浏览器控制台中显示创建表所需的SQL命令。</p>

      <div className="form-group">
        <button
          className="btn btn-primary"
          onClick={handleSetup}
          disabled={isSettingUp}
        >
          {isSettingUp ? (
            <>
              <span className="loading"></span>
              正在检查...
            </>
          ) : (
            '检查并初始化数据库'
          )}
        </button>
      </div>

      {setupMessage && (
        <div className="success-message">
          {setupMessage}
        </div>
      )}

      {setupError && (
        <div className="error-message">
          {setupError}
        </div>
      )}

      <div className="instructions">
        <h3>操作说明：</h3>
        <ol>
          <li>点击上面的按钮检查数据库状态</li>
          <li>打开浏览器开发者工具（F12）查看控制台输出</li>
          <li>复制控制台中显示的SQL命令</li>
          <li>登录到 <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer">Supabase Dashboard</a></li>
          <li>进入你的项目，点击 "SQL 编辑器" 选项卡</li>
          <li>粘贴SQL命令并执行</li>
        </ol>
      </div>
    </div>
  );
};

export default DatabaseSetup;