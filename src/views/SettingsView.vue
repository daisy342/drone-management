<template>
  <div class="settings">
    <div class="container">
      <h2>系统设置</h2>
      <div class="card">
        <h3>用户管理</h3>
        <table>
          <thead>
            <tr>
              <th>用户名</th>
              <th>角色</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in users" :key="user.id">
              <td>{{ user.username }}</td>
              <td>{{ user.role }}</td>
              <td>
                <button class="btn btn-secondary">编辑</button>
                <button class="btn btn-danger">删除</button>
              </td>
            </tr>
          </tbody>
        </table>
        <button class="btn btn-primary" style="margin-top: 1rem;">添加用户</button>
      </div>
      <div class="card" style="margin-top: 2rem;">
        <h3>基础字典配置</h3>
        <div class="tab-container">
          <div class="tabs">
            <button 
              v-for="tab in tabs" 
              :key="tab"
              :class="['tab-button', { active: activeTab === tab }]"
              @click="activeTab = tab"
            >
              {{ tab }}
            </button>
          </div>
          <div class="tab-content">
            <div v-if="activeTab === '基地'">
              <div class="dictionary-item" v-for="(item, index) in bases" :key="index">
                <input type="text" v-model="item.name" placeholder="基地名称">
                <button class="btn btn-danger" @click="removeItem('bases', index)">删除</button>
              </div>
              <button class="btn btn-secondary" @click="addItem('bases')">添加基地</button>
            </div>
            <div v-if="activeTab === '航线'">
              <div class="dictionary-item" v-for="(item, index) in routes" :key="index">
                <input type="text" v-model="item.name" placeholder="航线名称">
                <button class="btn btn-danger" @click="removeItem('routes', index)">删除</button>
              </div>
              <button class="btn btn-secondary" @click="addItem('routes')">添加航线</button>
            </div>
            <div v-if="activeTab === '责任区'">
              <div class="dictionary-item" v-for="(item, index) in areas" :key="index">
                <input type="text" v-model="item.name" placeholder="责任区名称">
                <button class="btn btn-danger" @click="removeItem('areas', index)">删除</button>
              </div>
              <button class="btn btn-secondary" @click="addItem('areas')">添加责任区</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const users = ref([
  { id: 1, username: 'admin', role: '管理员' },
  { id: 2, username: 'user1', role: '普通员工' },
  { id: 3, username: 'user2', role: '普通员工' }
])

const tabs = ['基地', '航线', '责任区']
const activeTab = ref('基地')

const bases = ref([
  { name: '基地1' },
  { name: '基地2' },
  { name: '基地3' }
])

const routes = ref([
  { name: '航线1' },
  { name: '航线2' },
  { name: '航线3' }
])

const areas = ref([
  { name: '区域1' },
  { name: '区域2' },
  { name: '区域3' }
])

const addItem = (type: string) => {
  if (type === 'bases') {
    bases.value.push({ name: '' })
  } else if (type === 'routes') {
    routes.value.push({ name: '' })
  } else if (type === 'areas') {
    areas.value.push({ name: '' })
  }
}

const removeItem = (type: string, index: number) => {
  if (type === 'bases') {
    bases.value.splice(index, 1)
  } else if (type === 'routes') {
    routes.value.splice(index, 1)
  } else if (type === 'areas') {
    areas.value.splice(index, 1)
  }
}
</script>

<style scoped>
.settings {
  padding: 2rem 0;
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

.tab-container {
  margin-top: 1rem;
}

.tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.tab-button {
  padding: 0.5rem 1rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  background-color: #f5f5f5;
  cursor: pointer;
  transition: all 0.3s ease;
}

.tab-button.active {
  background-color: #4CAF50;
  color: white;
  border-color: #4CAF50;
}

.dictionary-item {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.dictionary-item input {
  flex: 1;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
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

@media (max-width: 768px) {
  .tabs {
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