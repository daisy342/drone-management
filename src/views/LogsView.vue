<template>
  <div class="logs">
    <div class="container">
      <h2>日志管理</h2>
      <div class="card">
        <h3>日志录入</h3>
        <form @submit.prevent="handleSubmit">
          <div class="form-row">
            <div class="form-group">
              <label for="date">日期</label>
              <input type="date" id="date" v-model="form.date" required>
            </div>
            <div class="form-group">
              <label for="time">时间</label>
              <input type="time" id="time" v-model="form.time" required>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="location">地点</label>
              <input type="text" id="location" v-model="form.location" required>
            </div>
            <div class="form-group">
              <label for="base">基地</label>
              <select id="base" v-model="form.base" required>
                <option value="">请选择基地</option>
                <option value="基地1">基地1</option>
                <option value="基地2">基地2</option>
                <option value="基地3">基地3</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label for="route">航线</label>
            <select id="route" v-model="form.route" required>
              <option value="">请选择航线</option>
              <option value="航线1">航线1</option>
              <option value="航线2">航线2</option>
              <option value="航线3">航线3</option>
            </select>
          </div>
          <div class="form-group">
            <label for="area">责任区</label>
            <select id="area" v-model="form.area" required>
              <option value="">请选择责任区</option>
              <option value="区域1">区域1</option>
              <option value="区域2">区域2</option>
              <option value="区域3">区域3</option>
            </select>
          </div>
          <div class="form-group">
            <label>问题明细</label>
            <div v-for="(problem, index) in form.problems" :key="index" class="problem-item">
              <input type="text" v-model="problem.description" placeholder="问题描述" required>
              <button type="button" class="btn btn-danger" @click="removeProblem(index)">删除</button>
            </div>
            <button type="button" class="btn btn-secondary" @click="addProblem">添加问题</button>
          </div>
          <div class="form-group">
            <label for="images">上传图片</label>
            <input type="file" id="images" multiple @change="handleImageUpload">
          </div>
          <button type="submit" class="btn btn-primary">提交</button>
        </form>
      </div>
      <div class="card" style="margin-top: 2rem;">
        <h3>日志列表</h3>
        <table>
          <thead>
            <tr>
              <th>日期</th>
              <th>时间</th>
              <th>地点</th>
              <th>基地</th>
              <th>问题数量</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="log in logs" :key="log.id">
              <td>{{ log.date }}</td>
              <td>{{ log.time }}</td>
              <td>{{ log.location }}</td>
              <td>{{ log.base }}</td>
              <td>{{ log.problems.length }}</td>
              <td>
                <button class="btn btn-secondary">查看</button>
                <button class="btn btn-danger">删除</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const form = ref({
  date: new Date().toISOString().split('T')[0],
  time: new Date().toTimeString().split(' ')[0],
  location: '',
  base: '',
  route: '',
  area: '',
  problems: [{ description: '' }]
})

const logs = ref([
  {
    id: 1,
    date: '2026-04-15',
    time: '09:00',
    location: '测试地点1',
    base: '基地1',
    problems: [{ description: '测试问题1' }, { description: '测试问题2' }]
  },
  {
    id: 2,
    date: '2026-04-14',
    time: '14:30',
    location: '测试地点2',
    base: '基地2',
    problems: [{ description: '测试问题3' }]
  }
])

const addProblem = () => {
  form.value.problems.push({ description: '' })
}

const removeProblem = (index: number) => {
  form.value.problems.splice(index, 1)
}

const handleImageUpload = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files) {
    console.log('上传的图片:', target.files)
    // 这里应该有实际的图片上传逻辑
  }
}

const handleSubmit = () => {
  console.log('提交的日志:', form.value)
  // 这里应该有实际的提交逻辑
  // 模拟提交成功
  logs.value.unshift({
    id: Date.now(),
    date: form.value.date,
    time: form.value.time,
    location: form.value.location,
    base: form.value.base,
    problems: [...form.value.problems]
  })
  // 重置表单
  form.value = {
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().split(' ')[0],
    location: '',
    base: '',
    route: '',
    area: '',
    problems: [{ description: '' }]
  }
}
</script>

<style scoped>
.logs {
  padding: 2rem 0;
}

.form-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}

.problem-item {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.problem-item input {
  flex: 1;
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

.btn-secondary {
  background-color: #6c757d;
  color: white;
}

.btn-danger {
  background-color: #dc3545;
  color: white;
}

button:hover {
  opacity: 0.9;
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

@media (max-width: 768px) {
  .form-row {
    grid-template-columns: 1fr;
  }
  
  table {
    font-size: 0.9rem;
  }
  
  th, td {
    padding: 0.5rem;
  }
}
</style>