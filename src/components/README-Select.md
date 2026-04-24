# 下拉框组件使用规范

## 概述

项目统一使用 `CustomSelect` 组件封装了 react-select，确保所有下拉框样式和交互行为一致。

## 导入方式

```tsx
import Select from '../components/CustomSelect';
```

## 基础用法

```tsx
<Select
  id="role"
  name="role"
  value={selectedOption}
  onChange={(option: any) => {
    setSelectedValue(option?.value || '');
  }}
  options={[
    { value: 'admin', label: '管理员' },
    { value: 'user', label: '普通用户' }
  ]}
  placeholder="选择角色"
  isClearable={false}
  isSearchable={false}
/>
```

## 支持的属性

CustomSelect 组件支持 react-select 的所有标准属性，包括但不限于：

- `value` - 当前选中的值
- `onChange` - 选择变更回调
- `options` - 下拉选项数组
- `placeholder` - 占位文本
- `isClearable` - 是否可清除选择
- `isSearchable` - 是否可搜索
- `isMulti` - 是否支持多选
- `isDisabled` - 是否禁用
- `required` - 是否必填
- `styles` - 自定义样式（会与默认样式合并）
- `height` - 组件高度，默认 '42px'

## 样式说明

CustomSelect 已内置以下样式：

1. **容器**：圆角边框、统一高度、hover 效果
2. **控制区**：pointer 光标、聚焦时边框变主题色
3. **值容器**：`pointerEvents: 'none'` 确保点击正常冒泡
4. **下拉箭头**：打开时旋转 180 度动画
5. **下拉菜单**：zIndex 9999 确保显示在抽屉之上
6. **选项**：hover 和选中状态的统一配色

## 注意事项

1. **不要直接使用 `react-select`**，统一通过 `CustomSelect` 导入
2. **不要重复设置以下属性**（已在 CustomSelect 中默认设置）：
   - `menuPortalTarget={document.body}`
   - `menuPosition="fixed"`
   - `closeMenuOnSelect={true}`
   - `blurInputOnSelect={true}`
3. **如需覆盖样式**，通过 `styles` 属性传递，会与默认样式合并

## 示例：自定义高度

```tsx
<Select
  height="36px"
  options={options}
  // ...其他属性
/>
```

## 示例：添加自定义样式

```tsx
<Select
  options={options}
  styles={{
    control: (base, state) => ({
      ...base,
      borderColor: 'red'  // 会与默认样式合并，仅覆盖 borderColor
    })
  }}
/>
```
