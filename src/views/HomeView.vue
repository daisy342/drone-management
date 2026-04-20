<template>
  <div class="home">
    <div class="container">
      <h2>欢迎使用无人机业务管理系统</h2>
      <p>这是一个用于数字化沉淀工作数据和绩效考核辅助的系统。</p>
      <div class="card-container">
        <div class="card">
          <h3>日志录入</h3>
          <p>记录飞行任务、问题发现和处理情况</p>
          <router-link to="/logs" class="btn btn-primary">进入</router-link>
        </div>
        <div class="card">
          <h3>数据分析</h3>
          <p>查看飞行趋势、问题分布和绩效统计</p>
          <router-link to="/analysis" class="btn btn-primary">进入</router-link>
        </div>
        <div class="card">
          <h3>报表导出</h3>
          <p>生成Word格式的日报、月报</p>
          <router-link to="/analysis" class="btn btn-primary">进入</router-link>
        </div>
        <div class="card">
          <h3>系统设置</h3>
          <p>管理用户权限和基础字典配置</p>
          <router-link to="/settings" class="btn btn-primary">进入</router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Home view logic
</script>

<style scoped>
.home {
  padding: 2rem 0;
}

.card-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-top: 2rem;
}

.card {
  background-color: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.card:hover {
  transform: translateY(-5px);
}

.card h3 {
  margin-top: 0;
  color: #333;
}

.card p {
  color: #666;
  flex: 1;
}

.btn {
  display: inline-block;
  padding: 8px 16px;
  border-radius: 4px;
  text-align: center;
  font-weight: bold;
  text-decoration: none;
  transition: background-color 0.3s ease;
}

.btn-primary {
  background-color: #4CAF50;
  color: white;
}

.btn-primary:hover {
  background-color: #45a049;
  text-decoration: none;
}
</style>