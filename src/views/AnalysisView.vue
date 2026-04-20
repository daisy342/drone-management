<template>
  <div class="analysis">
    <div class="container">
      <h2>数据分析</h2>
      <div class="card-container">
        <div class="card">
          <h3>飞行趋势</h3>
          <div class="chart-container">
            <!-- 这里将使用ECharts绘制趋势图 -->
            <div id="trendChart" style="width: 100%; height: 300px;"></div>
          </div>
        </div>
        <div class="card">
          <h3>问题分布</h3>
          <div class="chart-container">
            <!-- 这里将使用ECharts绘制饼图 -->
            <div id="problemChart" style="width: 100%; height: 300px;"></div>
          </div>
        </div>
      </div>
      <div class="card" style="margin-top: 2rem;">
        <h3>绩效统计</h3>
        <table>
          <thead>
            <tr>
              <th>基地</th>
              <th>飞行次数</th>
              <th>发现问题数</th>
              <th>覆盖率</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in performanceData" :key="item.base">
              <td>{{ item.base }}</td>
              <td>{{ item.flightCount }}</td>
              <td>{{ item.problemCount }}</td>
              <td>{{ item.coverage }}%</td>
            </tr>
          </tbody>
        </table>
        <div class="export-buttons">
          <button class="btn btn-primary">导出日报</button>
          <button class="btn btn-primary">导出月报</button>
          <button class="btn btn-primary">导出Excel</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const performanceData = ref([
  { base: '基地1', flightCount: 120, problemCount: 45, coverage: 85 },
  { base: '基地2', flightCount: 98, problemCount: 32, coverage: 78 },
  { base: '基地3', flightCount: 105, problemCount: 38, coverage: 82 }
])

onMounted(() => {
  // 这里将初始化ECharts图表
  console.log('初始化图表')
  // 实际项目中，这里会引入ECharts并绘制图表
})
</script>

<style scoped>
.analysis {
  padding: 2rem 0;
}

.card-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 1.5rem;
  margin-top: 2rem;
}

.card {
  background-color: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.card h3 {
  margin-top: 0;
  color: #333;
  margin-bottom: 1rem;
}

.chart-container {
  margin-top: 1rem;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 1rem;
}

th, td {
  padding: 0.75rem;
  text-align: left;
  border-bottom: 1px solid #ddd;
}

th {
  background-color: #f2f2f2;
  font-weight: bold;
}

.export-buttons {
  margin-top: 1rem;
  display: flex;
  gap: 1rem;
}

button {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  transition: background-color 0.3s ease;
}

.btn-primary {
  background-color: #4CAF50;
  color: white;
}

button:hover {
  opacity: 0.9;
}

@media (max-width: 768px) {
  .card-container {
    grid-template-columns: 1fr;
  }
  
  .export-buttons {
    flex-direction: column;
  }
  
  table {
    font-size: 0.9rem;
  }
  
  th, td {
    padding: 0.5rem;
  }
}
</style>