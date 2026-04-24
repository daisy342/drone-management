import { Routes, Route, useLocation } from 'react-router-dom';
import Home from './views/Home';
import Login from './views/Login';
import YearPickerTest from './pages/YearPickerTest';
import { lazy, Suspense } from 'react';
import { ToastContainer } from './components/Toast';
import './App.css';

// 懒加载其他页面组件
const Logs = lazy(() => import('./views/Logs'));
const Analysis = lazy(() => import('./views/Analysis'));
const Settings = lazy(() => import('./views/Settings'));
const Users = lazy(() => import('./views/Users'));
const TaskForwards = lazy(() => import('./views/TaskForwards'));

// 加载状态组件
const PageLoading = () => (
  <div className="page-loading">
    <div className="loading-spinner"></div>
    <p>加载中...</p>
  </div>
);

function App() {
  const location = useLocation();
  // 暂时移除认证检查，方便测试
  // const { user, autoLogin } = useAuth();
  // const [isAutoLoginAttempted, setIsAutoLoginAttempted] = useState(false);

  const isLoginPage = location.pathname === '/login';

  // 暂时移除认证检查，方便测试
  // useEffect(() => {
  //   const attemptAutoLogin = async () => {
  //     if (user) {
  //       setIsAutoLoginAttempted(true);
  //       return;
  //     }

  //     await autoLogin();
  //     setIsAutoLoginAttempted(true);
  //   };

  //   if (!user && !isAutoLoginAttempted) {
  //     attemptAutoLogin();
  //   }
  // }, [user, autoLogin, isAutoLoginAttempted]);

  // 暂时移除认证检查，方便测试
  // if (!user && !isAutoLoginAttempted) {
  //   return (
  //     <div className="app">
  //       <div className="loading-screen">
  //         <div className="loading-spinner"></div>
  //         <p>正在自动登录...</p>
  //       </div>
  //     </div>
  //   );
  // }

  return (
    <div className="app">
      <ToastContainer />
      <main className={isLoginPage ? 'login-layout' : ''}>
        <Routes>
          {/* 暂时移除认证检查，方便测试 */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/logs" element={
            <Suspense fallback={<PageLoading />}>
              <Logs />
            </Suspense>
          } />
          <Route path="/analysis" element={
            <Suspense fallback={<PageLoading />}>
              <Analysis />
            </Suspense>
          } />
          <Route path="/settings" element={
            <Suspense fallback={<PageLoading />}>
              <Settings />
            </Suspense>
          } />
          <Route path="/users" element={
            <Suspense fallback={<PageLoading />}>
              <Users />
            </Suspense>
          } />
          <Route path="/task-forwards" element={
            <Suspense fallback={<PageLoading />}>
              <TaskForwards />
            </Suspense>
          } />
          <Route path="/year-picker-test" element={<YearPickerTest />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;