<template>
  <div id="app">
    <header class="header">
      <h1>无人机业务管理系统</h1>
      <nav class="nav">
        <ul>
          <li>
            <router-link to="/">首页</router-link>
          </li>
          <li>
            <router-link to="/logs">日志管理</router-link>
          </li>
          <li>
            <router-link to="/analysis">数据分析</router-link>
          </li>
          <li>
            <router-link to="/settings">系统设置</router-link>
          </li>
          <li>
            <router-link to="/login">登录</router-link>
          </li>
        </ul>
      </nav>
    </header>
    <main class="main">
      <router-view></router-view>
    </main>
    <footer class="footer">
      <p>&copy; 2026 无人机业务管理系统</p>
    </footer>
  </div>
</template>

<script setup lang="ts">
// App component logic
</script>

<style scoped>
#app {
  font-family: Arial, sans-serif;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.header {
  background-color: #333;
  color: white;
  padding: 1rem 0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.header h1 {
  text-align: center;
  margin: 0 0 1rem 0;
}

.nav ul {
  display: flex;
  justify-content: center;
  list-style: none;
  margin: 0;
  padding: 0;
}

.nav li {
  margin: 0 1rem;
}

.nav a {
  color: white;
  text-decoration: none;
  font-weight: bold;
  transition: color 0.3s ease;
}

.nav a:hover {
  color: #4CAF50;
}

.main {
  flex: 1;
  background-color: #f5f5f5;
}

.footer {
  background-color: #333;
  color: white;
  text-align: center;
  padding: 1rem 0;
  margin-top: 2rem;
}

@media (max-width: 768px) {
  .nav ul {
    flex-direction: column;
    align-items: center;
  }
  
  .nav li {
    margin: 0.5rem 0;
  }
}
</style>