import React, { useState, useEffect, useRef } from 'react';
import { Log, createLog, getLogs, updateLog, deleteLog, ReportStatus, reviewLog, archiveLog, getReviewHistory, uploadIssuePhoto } from '../services/logs';
import { getDictionaryItems } from '../services/dictionary';
import { initializeDatabase } from '../utils/database';
import { useAuth } from '../contexts/AuthContext';
import { exportLogToWord } from '../services/wordExport';
import Select from '../components/CustomSelect';
import Cascader from '../components/Cascader';
import DatePicker from '../components/DatePicker';
import DateRangePicker from '../components/DateRangePicker';
import MapPicker from '../components/MapPicker';
import { addWatermarkToImage, generateLogWatermark, WatermarkOptions } from '../utils/watermark';
import Navbar from '../components/Navbar';
import { showToast } from '../components/Toast';
import '../styles/unified-controls.css';
import './Logs.css';

// 天气选项
const weatherOptions = [
  { value: '晴', label: '晴' },
  { value: '阴', label: '阴' },
  { value: '多云', label: '多云' },
  { value: '小雨', label: '小雨' },
  { value: '中雨', label: '中雨' },
  { value: '大雨', label: '大雨' },
  { value: '雪', label: '雪' },
  { value: '雾', label: '雾' },
  { value: '霾', label: '霾' }
];

// 严重程度选项
const severityOptions = [
  { value: '', label: '请选择严重程度', color: '#999' },
  { value: 'high', label: '高', color: '#F44336' },
  { value: 'medium', label: '中', color: '#FF9800' },
  { value: 'low', label: '低', color: '#4CAF50' }
];

// 状态下拉选项
const statusOptions = [
  { value: 'draft', label: '草稿' },
  { value: 'pending', label: '待审核' },
  { value: 'approved', label: '已通过' },
  { value: 'rejected', label: '已驳回' }
];

// 生成报告编号
const generateReportNumber = (date: string): string => {
  const year = date.substring(0, 4);
  const month = date.substring(5, 7);
  const day = date.substring(8, 10);
  const random = Math.floor(Math.random() * 900) + 100;
  return `FXBG-${year}${month}${day}-${random}`;
};

// 获取星期几
const getWeekday = (dateString: string): string => {
  const date = new Date(dateString);
  const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
  return weekdays[date.getDay()];
};

// 获取污染源类型子级（级联数据格式）
const getChildPollutionTypes = (parentId: string, allTypes: any[]): { code: string; name: string; children?: any[] }[] => {
  if (!parentId) {
    return allTypes
      .filter(item => !item.extra_data?.parent_id || item.extra_data?.parent_id === '')
      .map(item => ({
        code: item.id,
        name: item.name,
        children: getChildPollutionTypes(item.id, allTypes).length > 0
          ? getChildPollutionTypes(item.id, allTypes)
          : undefined
      }));
  }

  return allTypes
    .filter(item => item.extra_data?.parent_id === parentId)
    .map(item => ({
      code: item.id,
      name: item.name,
      children: getChildPollutionTypes(item.id, allTypes).length > 0
        ? getChildPollutionTypes(item.id, allTypes)
        : undefined
    }));
};

// 搜索污染源类型（外部函数 - 用于非React环境）
const _searchPollutionTypes = (keyword: string, allTypes: any[]): { code: string; name: string; children?: any[] }[] => {
  const results: { code: string; name: string; children?: any[] }[] = [];

  const search = (types: any[]) => {
    for (const type of types) {
      if (type.name.toLowerCase().includes(keyword.toLowerCase())) {
        results.push({
          code: type.id,
          name: type.name,
          children: getChildPollutionTypes(type.id, allTypes).length > 0
            ? getChildPollutionTypes(type.id, allTypes)
            : undefined
        });
      }
    }
  };

  search(allTypes);
  return results;
};

const Logs: React.FC = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<Log[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingLog, setEditingLog] = useState<Log | null>(null);
  const [pollutionTypes, setPollutionTypes] = useState<any[]>([]);
  const [coverageAreas, setCoverageAreas] = useState<any[]>([]);
  const [baseStations, setBaseStations] = useState<any[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);
  const [showMapModal, setShowMapModal] = useState(false);
  const [currentIssueIndex, setCurrentIssueIndex] = useState<number>(-1);
  const [submitAction, setSubmitAction] = useState<'draft' | 'submit' | null>(null);
  const [formError, setFormError] = useState(''); // 表单抽屉内的错误
  const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({}); // 记录错误字段
  const firstErrorRef = useRef<HTMLDivElement | null>(null); // 引用第一个错误字段

  // 使用 useMemo 缓存污染源类型相关函数
  const getChildPollutionTypes = React.useCallback((parentId: string): { code: string; name: string; children?: { code: string; name: string; children?: any[] }[] }[] => {
    if (!parentId) {
      return pollutionTypes
        .filter(item => !item.extra_data?.parent_id || item.extra_data?.parent_id === '')
        .map(item => ({
          code: item.id,
          name: item.name,
          children: getChildPollutionTypes(item.id).length > 0
            ? getChildPollutionTypes(item.id)
            : undefined
        }));
    }

    return pollutionTypes
      .filter(item => item.extra_data?.parent_id === parentId)
      .map(item => ({
        code: item.id,
        name: item.name,
        children: getChildPollutionTypes(item.id).length > 0
          ? getChildPollutionTypes(item.id)
          : undefined
      }));
  }, [pollutionTypes]);

  const searchPollutionTypes = React.useCallback((keyword: string): { code: string; name: string; children?: any[] }[] => {
    const results: { code: string; name: string; children?: any[] }[] = [];

    const search = (types: any[]) => {
      for (const type of types) {
        if (type.name.toLowerCase().includes(keyword.toLowerCase())) {
          results.push({
            code: type.id,
            name: type.name,
            children: getChildPollutionTypes(type.id).length > 0
              ? getChildPollutionTypes(type.id)
              : undefined
          });
        }
      }
    };

    search(pollutionTypes);
    return results;
  }, [pollutionTypes, getChildPollutionTypes]);

  // 审核相关状态
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewingLog, setReviewingLog] = useState<Log | null>(null);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject'>('approve');
  const [reviewComment, setReviewComment] = useState('');
  const [reviewModalError, setReviewModalError] = useState('');
  const [showReviewHistory, setShowReviewHistory] = useState(false);
  const [reviewHistory, setReviewHistory] = useState<any[]>([]);

  // 详情弹窗状态
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailLog, setDetailLog] = useState<Log | null>(null);

  // 图片预览状态
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // 筛选状态
  const [filters, setFilters] = useState<{
    startDate: string;
    endDate: string;
    status: '' | ReportStatus;
    keyword: string;
  }>({
    startDate: '',
    endDate: '',
    status: '',
    keyword: ''
  });

  // 处理日期范围变化
  const handleDateRangeChange = (startDate: string, endDate: string) => {
    setFilters(prev => ({
      ...prev,
      startDate,
      endDate
    }));
  };

  // 表单状态 - 新的报告结构
  const [form, setForm] = useState<{
    reportNumber: string;
    date: string;
    weekday: string;
    coverageAreaId: string;
    coverageAreaName: string;
    baseId: string;
    baseName: string;
    routeId: string;
    routeName: string;
    weather: string;
    temperature: number | undefined;
    inspectors: string[];
    relatedLogId: string;
    flightDuration: number;
    coverageArea: number;
    issues: {
      id: string;
      description: string;
      location: string;
      detailedAddress: string;
      longitude: number;
      latitude: number;
      pollutionTypeId: string;
      pollutionTypeName: string;
      severity: 'low' | 'medium' | 'high' | '';
      status: 'open' | 'closed';
      photos: string[];
      screenshots: string[];      // 问题截图
      reportTo: string;           // 上报对象
      reportResult: string;       // 上报结果
      reportDate: string;         // 上报日期
      remarks: string;
    }[];
    photos: string[];
    analysisConclusion: string;
    autoGenerateAnalysis: boolean;
    status: ReportStatus;
    isDraft: boolean;
  }>({
    reportNumber: '',
    date: new Date().toISOString().split('T')[0],
    weekday: getWeekday(new Date().toISOString().split('T')[0]),
    coverageAreaId: '',
    coverageAreaName: '',
    baseId: '',
    baseName: '',
    routeId: '',
    routeName: '',
    weather: '',
    temperature: undefined,
    inspectors: [],
    relatedLogId: '',
    flightDuration: 0,
    coverageArea: 0,
    issues: [{
      id: Date.now().toString(),
      description: '',
      location: '',
      detailedAddress: '',
      longitude: 0,
      latitude: 0,
      pollutionTypeId: '',
      pollutionTypeName: '',
      severity: '' as 'low' | 'medium' | 'high' | '',
      status: 'open',
      photos: [],
      screenshots: [],
      reportTo: '',
      reportResult: '',
      reportDate: '',
      remarks: ''
    }],
    photos: [],
    analysisConclusion: '',
    autoGenerateAnalysis: true,
    status: 'draft',
    isDraft: true
  });

  // 加载数据
  useEffect(() => {
    const initializeAndLoadData = async () => {
      try {
        await initializeDatabase();
        await loadData();
        await loadPollutionTypes();
        await loadCoverageAreas();
        await loadBaseStations();
        await loadRoutes();
      } catch (err: any) {
        const errorMsg = err.message || '初始化数据库失败';
        setError(errorMsg);
        showToast('error', errorMsg);
      }
    };

    initializeAndLoadData();
  }, []);

  // 加载污染源类型
  const loadPollutionTypes = async () => {
    try {
      const data = await getDictionaryItems('pollution_type');
      setPollutionTypes(data);
    } catch (err) {
      console.error('Error loading pollution types:', err);
    }
  };

  // 加载覆盖范围
  const loadCoverageAreas = async () => {
    try {
      const data = await getDictionaryItems('coverage_area');
      setCoverageAreas(data);
    } catch (err) {
      console.error('Error loading coverage areas:', err);
    }
  };

  // 加载基站（按覆盖区域筛选）
  const loadBaseStations = async (coverageAreaId?: string) => {
    try {
      const data = await getDictionaryItems('base_station');
      // 如果指定了覆盖区域，筛选关联的基站
      if (coverageAreaId) {
        const filtered = data.filter((item: any) =>
          item.extra_data?.area_id === coverageAreaId
        );
        setBaseStations(filtered);
      } else {
        setBaseStations(data);
      }
    } catch (err) {
      console.error('Error loading base stations:', err);
    }
  };

  // 加载航线（按基站筛选）
  const loadRoutes = async (baseId?: string) => {
    try {
      const data = await getDictionaryItems('route');
      // 如果指定了基站，筛选关联的航线
      if (baseId) {
        const filtered = data.filter((item: any) =>
          item.extra_data?.base_station_id === baseId
        );
        setRoutes(filtered);
      } else {
        setRoutes(data);
      }
    } catch (err) {
      console.error('Error loading routes:', err);
    }
  };

  // 加载日志数据
  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await getLogs({
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
        status: filters.status || undefined,
      });
      setLogs(data);
    } catch (err: any) {
      const errorMsg = err.message || '加载日志失败';
      setError(errorMsg);
      showToast('error', errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // 处理筛选变化
  const handleFilterChange = (key: keyof typeof filters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // 应用筛选
  const applyFilters = () => {
    loadData();
  };

  // 重置筛选
  const resetFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      status: '',
      keyword: ''
    });
    loadData();
  };

  // 自动生成分析结论
  const generateAnalysisConclusion = () => {
    if (!form.autoGenerateAnalysis) return form.analysisConclusion;

    const areaName = form.coverageAreaName || '巡查区域';
    const issueCount = form.issues.length;

    // 统计问题类型
    const typeCount: Record<string, number> = {};
    form.issues.forEach(issue => {
      if (issue.pollutionTypeName) {
        typeCount[issue.pollutionTypeName] = (typeCount[issue.pollutionTypeName] || 0) + 1;
      }
    });

    let typeSummary = '';
    const typeEntries = Object.entries(typeCount);
    if (typeEntries.length > 0) {
      typeSummary = '其中' + typeEntries.map(([type, count]) => `${type}${count}处`).join('、') + '。';
    }

    // 统计主要问题区域
    const locationCount: Record<string, number> = {};
    form.issues.forEach(issue => {
      if (issue.location) {
        locationCount[issue.location] = (locationCount[issue.location] || 0) + 1;
      }
    });

    let locationSummary = '';
    const maxLocation = Object.entries(locationCount).sort((a, b) => b[1] - a[1])[0];
    if (maxLocation) {
      locationSummary = `主要问题集中在${maxLocation[0]}，建议加强该区域的巡查频次。`;
    }

    return `本次巡查覆盖${areaName}，发现环境问题${issueCount}处。${typeSummary}${locationSummary}`;
  };

  // 处理表单输入变化
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: name === 'flightDuration' || name === 'coverageArea' || name === 'temperature'
        ? (value === '' ? undefined : parseFloat(value))
        : value
    }));
  };

  // 处理日期变化（自动生成报告编号和星期）
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    setForm(prev => ({
      ...prev,
      date: newDate,
      weekday: getWeekday(newDate),
      reportNumber: generateReportNumber(newDate)
    }));
  };

  // 处理区域级联选择
  const handleRegionChange = (_code: string, path: { code: string; name: string }[]) => {
    const province = path.find(p => p.code.endsWith('0000'));
    const city = path.find(p => p.code.endsWith('00') && !p.code.endsWith('0000'));
    const district = path.find(p => !p.code.endsWith('00'));

    setForm(prev => ({
      ...prev,
      provinceCode: province?.code || '',
      provinceName: province?.name || '',
      cityCode: city?.code || '',
      cityName: city?.name || '',
      districtCode: district?.code || '',
      districtName: district?.name || ''
    }));
  };

  // 处理问题列表变化
  const handleIssueChange = (index: number, field: string, value: any) => {
    setForm(prev => {
      const newIssues = [...prev.issues];
      newIssues[index] = { ...newIssues[index], [field]: value };
      return { ...prev, issues: newIssues };
    });
  };

  // 批量更新问题字段
  const handleIssueChanges = (index: number, updates: Record<string, any>) => {
    setForm(prev => {
      const newIssues = [...prev.issues];
      newIssues[index] = { ...newIssues[index], ...updates };
      return { ...prev, issues: newIssues };
    });
  };

  // 添加问题
  const addIssue = () => {
    setForm(prev => ({
      ...prev,
      issues: [...prev.issues, {
        id: Date.now().toString(),
        description: '',
        location: '',
        detailedAddress: '',
        longitude: 0,
        latitude: 0,
        pollutionTypeId: '',
        pollutionTypeName: '',
        severity: '' as 'low' | 'medium' | 'high' | '',
        status: 'open',
        photos: [],
        screenshots: [],
        reportTo: '',
        reportResult: '',
        reportDate: '',
        remarks: ''
      }]
    }));
  };

  // 删除问题
  const removeIssue = (index: number) => {
    const newIssues = form.issues.filter((_, i) => i !== index);
    setForm(prev => ({ ...prev, issues: newIssues }));
  };

  // 打开地图选择
  const openMapModal = (issueIndex: number) => {
    setCurrentIssueIndex(issueIndex);
    setShowMapModal(true);
  };

  // 处理地图选点
  const handleMapSelect = (location: string, detailedAddress: string, longitude: number, latitude: number) => {
    if (currentIssueIndex >= 0) {
      handleIssueChange(currentIssueIndex, 'location', location);
      handleIssueChange(currentIssueIndex, 'detailedAddress', detailedAddress);
      handleIssueChange(currentIssueIndex, 'longitude', longitude);
      handleIssueChange(currentIssueIndex, 'latitude', latitude);
    }
    setShowMapModal(false);
    setCurrentIssueIndex(-1);
  };

  // 处理照片上传（问题级别）- 显示loading状态，后台异步上传
  const handleIssuePhotoUpload = async (issueIndex: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // 检查是否超过10张限制
    const currentPhotos = form.issues[issueIndex].photos || [];
    const totalPhotos = currentPhotos.length + files.length;
    if (totalPhotos > 10) {
      const errorMsg = `关联照片最多支持10张，当前已有${currentPhotos.length}张，本次最多可选择${10 - currentPhotos.length}张`;
      setError(errorMsg);
      showToast('error', errorMsg);
      e.target.value = '';
      return;
    }

    // 使用Data URL作为临时预览（更稳定，不会被提前释放）
    const localPreviews: string[] = [];
    const fileMap: Map<string, File> = new Map();
    for (const file of files) {
      // 创建Data URL而不是Blob URL，避免生命周期问题
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      localPreviews.push(dataUrl);
      fileMap.set(dataUrl, file);
    }

    // 先更新UI显示本地预览
    handleIssueChange(issueIndex, 'photos', [...currentPhotos, ...localPreviews]);
    e.target.value = '';

    // 后台异步处理上传
    setIsLoading(true);
    try {
      const watermarkText = generateLogWatermark(
        form.reportNumber || '巡查报告',
        user?.fullName || '巡查人员'
      );
      const watermarkOptions: WatermarkOptions = {
        text: watermarkText,
        position: 'bottomRight',
        opacity: 0.6,
        fontSize: 14,
        color: '#FFFFFF',
        padding: 15,
      };

      // 并行处理所有文件
      const uploadPromises = localPreviews.map(async (localUrl, index) => {
        const file = fileMap.get(localUrl)!;
        try {
          console.log('Processing file:', index, file.name, file.size);
          // 添加水印并压缩
          const watermarkedFile = await addWatermarkToImage(file, watermarkOptions, 1600, 1600, 0.75);
          console.log('Compressed file:', watermarkedFile.size, 'ratio:', (watermarkedFile.size / file.size * 100).toFixed(1) + '%');
          // 上传
          const issueId = form.issues[issueIndex].id || Date.now().toString();
          const uniqueId = `${Date.now()}_${index}_${Math.random().toString(36).substring(2, 9)}`;
          const photoUrl = await uploadIssuePhoto(issueId, watermarkedFile, uniqueId);
          console.log('Uploaded:', photoUrl);
          return { localUrl, photoUrl, success: true };
        } catch (err) {
          console.error('Upload failed for file:', file.name, err);
          return { localUrl, photoUrl: '', success: false };
        }
      });

      const results = await Promise.all(uploadPromises);
      // 更新为实际上传的URL
      const finalPhotos = [...form.issues[issueIndex].photos];
      for (const result of results) {
        const idx = finalPhotos.indexOf(result.localUrl);
        if (idx !== -1) {
          if (result.success) {
            finalPhotos[idx] = result.photoUrl;
          } else {
            // 上传失败，移除该预览
            finalPhotos.splice(idx, 1);
          }
        }
      }
      handleIssueChange(issueIndex, 'photos', finalPhotos);

      // 检查是否有上传失败的
      const failedCount = results.filter(r => !r.success).length;
      if (failedCount > 0) {
        showToast('error', `${failedCount}张照片上传失败，请重新上传`);
      }
    } catch (err: any) {
      const errorMsg = err.message || '上传照片失败';
      setError(errorMsg);
      showToast('error', errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // 删除问题照片
  const removeIssuePhoto = (issueIndex: number, photoIndex: number) => {
    const newPhotos = form.issues[issueIndex].photos.filter((_, i) => i !== photoIndex);
    handleIssueChange(issueIndex, 'photos', newPhotos);
  };

  // 处理问题截图上传 - 添加水印并上传到存储
  const handleIssueScreenshotUpload = async (issueIndex: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // 检查是否超过10张限制
    const currentScreenshots = form.issues[issueIndex].screenshots || [];
    const totalScreenshots = currentScreenshots.length + files.length;
    if (totalScreenshots > 10) {
      const errorMsg = `问题截图最多支持10张，当前已有${currentScreenshots.length}张，本次最多可选择${10 - currentScreenshots.length}张`;
      setError(errorMsg);
      showToast('error', errorMsg);
      e.target.value = ''; // 清空选择
      return;
    }

    setIsLoading(true);
    try {
      const uploadedScreenshots: string[] = [];
      const issue = form.issues[issueIndex];
      const watermarkText = `${issue.location || '未知位置'} | ${form.date || new Date().toISOString().split('T')[0]}`;
      const watermarkOptions: WatermarkOptions = {
        text: watermarkText,
        position: 'bottomLeft',
        opacity: 0.7,
        fontSize: 12,
        color: '#FFFFFF',
        padding: 10,
      };

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        // 添加水印
        const watermarkedFile = await addWatermarkToImage(file, watermarkOptions);
        // 上传到 Supabase Storage - 使用唯一文件名避免冲突
        const issueId = form.issues[issueIndex].id || Date.now().toString();
        const uniqueId = `${Date.now()}_${i}_${Math.random().toString(36).substring(2, 9)}`;
        const screenshotUrl = await uploadIssuePhoto(issueId, watermarkedFile, uniqueId);
        uploadedScreenshots.push(screenshotUrl);
      }
      handleIssueChange(issueIndex, 'screenshots', [...currentScreenshots, ...uploadedScreenshots]);
    } catch (err: any) {
      const errorMsg = err.message || '上传截图失败';
      setError(errorMsg);
      showToast('error', errorMsg);
    } finally {
      setIsLoading(false);
      e.target.value = ''; // 清空选择
    }
  };

  // 删除问题截图
  const removeIssueScreenshot = (issueIndex: number, screenshotIndex: number) => {
    const newScreenshots = form.issues[issueIndex].screenshots?.filter((_, i) => i !== screenshotIndex) || [];
    handleIssueChange(issueIndex, 'screenshots', newScreenshots);
  };

  // 提交表单（提交审核）
  const handleSubmit = async (e: React.FormEvent, asDraft: boolean = false) => {
    e.preventDefault();
    setIsLoading(true);
    setFieldErrors({}); // 清除之前的错误状态

    // 非草稿提交时验证必填项
    if (!asDraft) {
      const newFieldErrors: Record<string, boolean> = {};
      let firstErrorField: string | null = null;

      // 检查基础必填字段
      const requiredFields = [
        { field: 'reportNumber', label: '报告编号' },
        { field: 'date', label: '巡查日期' },
        { field: 'weekday', label: '巡查星期' },
      ];

      for (const { field, label } of requiredFields) {
        if (!form[field as keyof typeof form]) {
          newFieldErrors[field] = true;
          if (!firstErrorField) firstErrorField = field;
        }
      }

      // 检查巡查区域
      if (!form.coverageAreaId) {
        newFieldErrors['region'] = true;
        if (!firstErrorField) firstErrorField = 'region';
      }

      // 检查巡查基站（必填）
      if (!form.baseId) {
        newFieldErrors['base'] = true;
        if (!firstErrorField) firstErrorField = 'base';
      }

      // 如果添加了问题点位，验证问题点位的必填项
      if (form.issues.length > 0) {
        for (let i = 0; i < form.issues.length; i++) {
          const issue = form.issues[i];
          if (!issue.location) {
            newFieldErrors[`issue-${i}-location`] = true;
            if (!firstErrorField) firstErrorField = `issue-${i}-location`;
          }
          if (!issue.pollutionTypeId) {
            newFieldErrors[`issue-${i}-type`] = true;
            if (!firstErrorField) firstErrorField = `issue-${i}-type`;
          }
          if (!issue.severity) {
            newFieldErrors[`issue-${i}-severity`] = true;
            if (!firstErrorField) firstErrorField = `issue-${i}-severity`;
          }
        }
      }

      // 如果有错误，显示错误并滚动到第一个错误字段
      if (firstErrorField) {
        setFieldErrors(newFieldErrors);
        showToast('error', '请填写所有必填项');
        setIsLoading(false);
        // 延迟滚动，等待错误状态渲染
        setTimeout(() => {
          const errorElement = document.querySelector(`[data-error-field="${firstErrorField}"]`);
          if (errorElement) {
            errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
        return;
      }
    }

    try {
      setSubmitAction(asDraft ? 'draft' : 'submit');
      const finalAnalysis = asDraft ? form.analysisConclusion : generateAnalysisConclusion();

      const logData = {
        ...form,
        analysisConclusion: finalAnalysis,
        isDraft: asDraft,
        status: asDraft ? 'draft' : 'pending' as ReportStatus,
        temperature: form.temperature === undefined ? undefined : Number(form.temperature)
      };

      if (editingLog) {
        await updateLog(editingLog.id!, logData);
      } else {
        await createLog(logData);
      }
      loadData();
      setShowForm(false);
      resetForm();
    } catch (err: any) {
      const errorMsg = err.message || '保存报告失败';
      showToast('error', errorMsg);
    } finally {
      setIsLoading(false);
      setSubmitAction(null);
    }
  };

  // 保存草稿
  const handleSaveDraft = async (e: React.FormEvent) => {
    await handleSubmit(e, true);
  };

  // 重置表单
  const resetForm = () => {
    const today = new Date().toISOString().split('T')[0];
    setForm({
      reportNumber: generateReportNumber(today),
      date: today,
      weekday: getWeekday(today),
      coverageAreaId: '',
      coverageAreaName: '',
      baseId: '',
      baseName: '',
      routeId: '',
      routeName: '',
      weather: '',
      temperature: undefined,
      inspectors: [],
      relatedLogId: '',
      flightDuration: 0,
      coverageArea: 0,
      issues: [{
        id: Date.now().toString(),
        description: '',
        location: '',
        detailedAddress: '',
        longitude: 0,
        latitude: 0,
        pollutionTypeId: '',
        pollutionTypeName: '',
        severity: '' as 'low' | 'medium' | 'high' | '',
        status: 'open',
        photos: [],
        screenshots: [],
        reportTo: '',
        reportResult: '',
        reportDate: '',
        remarks: ''
      }],
      photos: [],
      analysisConclusion: '',
      autoGenerateAnalysis: true,
      status: 'draft',
      isDraft: true
    });
    setEditingLog(null);
  };

  // 编辑日志
  const handleEdit = (log: Log) => {
    setEditingLog(log);
    setForm({
      reportNumber: log.reportNumber || '',
      date: log.date,
      weekday: log.weekday || getWeekday(log.date),
      coverageAreaId: log.coverageAreaId || '',
      coverageAreaName: log.coverageAreaName || '',
      baseId: log.baseId || '',
      baseName: log.baseName || '',
      routeId: log.routeId || '',
      routeName: log.routeName || '',
      weather: log.weather || '',
      temperature: log.temperature ?? undefined,
      inspectors: log.inspectors || [],
      relatedLogId: log.relatedLogId || '',
      flightDuration: log.flightDuration || 0,
      coverageArea: log.coverageArea || 0,
      issues: log.issues.map(issue => ({
        id: issue.id || Date.now().toString(),
        description: issue.description,
        location: issue.location,
        detailedAddress: issue.detailedAddress || '',
        longitude: issue.longitude || 0,
        latitude: issue.latitude || 0,
        pollutionTypeId: issue.pollutionTypeId || '',
        pollutionTypeName: issue.pollutionTypeName || '',
        severity: (issue.severity || '') as 'low' | 'medium' | 'high' | '',
        status: issue.status as 'open' | 'closed',
        photos: issue.photos || [],
        screenshots: issue.screenshots || [],
        reportTo: issue.reportTo || '',
        reportResult: issue.reportResult || '',
        reportDate: issue.reportDate || '',
        remarks: issue.remarks || ''
      })),
      photos: (log.photos || []) as string[],
      analysisConclusion: log.analysisConclusion || '',
      autoGenerateAnalysis: log.autoGenerateAnalysis ?? true,
      status: log.status,
      isDraft: log.isDraft
    });
    setShowForm(true);
  };

  // 打开详情弹窗
  const openDetailModal = (log: Log) => {
    setDetailLog(log);
    setShowDetailModal(true);
  };

  const closeDetailModal = () => {
    setShowDetailModal(false);
    setDetailLog(null);
    setPreviewImage(null);
  };

  // 打开图片预览
  const openImagePreview = (imageUrl: string) => {
    setPreviewImage(imageUrl);
  };

  const closeImagePreview = () => {
    setPreviewImage(null);
  };

  // 打开审核弹窗
  const openReviewModal = (log: Log, action: 'approve' | 'reject') => {
    setReviewingLog(log);
    setReviewAction(action);
    setReviewComment('');
    setReviewModalError('');
    setShowReviewModal(true);
  };

  // 处理审核
  const handleReview = async () => {
    if (!reviewingLog?.id) return;

    setIsLoading(true);
    try {
      // 获取当前用户ID（这里需要从AuthContext获取，暂时用空字符串）
      // const currentUserId = ''; // 已替换为 user?.id
      if (!user?.id) {
        setReviewModalError('请先登录');
        setIsLoading(false);
        return;
      }
      await reviewLog(reviewingLog.id, reviewAction, user.id, reviewComment);
      setShowReviewModal(false);
      setReviewingLog(null);
      setReviewComment('');
      setReviewModalError('');
      loadData();
    } catch (err: any) {
      const errorMsg = err.message || '审核失败';
      setReviewModalError(errorMsg);
      showToast('error', errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // 查看审核历史
  const viewReviewHistory = async (logId: string) => {
    try {
      const history = await getReviewHistory(logId);
      setReviewHistory(history);
      setShowReviewHistory(true);
    } catch (err: any) {
      const errorMsg = err.message || '获取审核历史失败';
      setError(errorMsg);
      showToast('error', errorMsg);
    }
  };

  // 归档报告
  const handleArchive = async (log: Log) => {
    if (!confirm('确定要归档这条报告吗？归档后将无法修改。')) return;

    setIsLoading(true);
    try {
      if (!user?.id) {
        setError('请先登录');
        setIsLoading(false);
        return;
      }
      await archiveLog(log.id!, user.id);
      loadData();
    } catch (err: any) {
      const errorMsg = err.message || '归档失败';
      setError(errorMsg);
      showToast('error', errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // 导出Word
  const handleExportToWord = async (log: Log) => {
    setIsLoading(true);
    try {
      await exportLogToWord(log);
    } catch (err: any) {
      const errorMsg = err.message || '导出失败';
      setError(errorMsg);
      showToast('error', errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // 删除日志
  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这条报告吗？')) return;

    setIsLoading(true);
    try {
      await deleteLog(id);
      loadData();
    } catch (err: any) {
      const errorMsg = err.message || '删除报告失败';
      setError(errorMsg);
      showToast('error', errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="logs">
      <Navbar />

      {/* 主内容 */}
      <div className="main-content">
        <div className="container">
          {/* 筛选栏 */}
          <div className="filter-bar">
            <div className="filter-row">
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
                <label>关键词</label>
                <input
                  type="text"
                  className="filter-input"
                  value={filters.keyword}
                  onChange={(e) => handleFilterChange('keyword', e.target.value)}
                  placeholder="报告编号/区域"
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
            <button
              className="btn btn-primary"
              onClick={() => {
                resetForm();
                setForm(prev => ({
                  ...prev,
                  reportNumber: generateReportNumber(prev.date)
                }));
                setShowForm(true);
              }}
            >
              录入报告
            </button>
          </div>

          {/* 报告表单抽屉 */}
          {showForm && (
            <>
              <div className="drawer-overlay" onClick={() => {
                setShowForm(false);
                resetForm();
              }} />
              <div className="drawer report-drawer">
                <div className="drawer-header">
                  <h3>{editingLog ? '编辑报告' : '录入报告'}</h3>
                  <button
                    type="button"
                    className="drawer-close"
                    onClick={() => {
                      setShowForm(false);
                      resetForm();
                    }}
                  >
                    ✕
                  </button>
                </div>
                <div className="drawer-body">
                  <form>
                    {/* 基础信息区域 */}
                    <div className="form-section">
                      <h4 className="section-title">基础信息</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="form-group" data-error-field="reportNumber">
                          <label htmlFor="reportNumber">报告编号<span className="required-mark">*</span></label>
                          <input
                            type="text"
                            id="reportNumber"
                            name="reportNumber"
                            value={form.reportNumber}
                            readOnly
                            className={`readonly-input ${fieldErrors['reportNumber'] ? 'error-field' : ''}`}
                          />
                        </div>
                        <div className="form-group" data-error-field="date">
                          <label htmlFor="date">巡查日期<span className="required-mark">*</span></label>
                          <DatePicker
                            value={form.date}
                            onChange={(date) => {
                              handleDateChange({ target: { value: date } } as React.ChangeEvent<HTMLInputElement>);
                            }}
                            placeholder="请选择巡查日期"
                            required
                            className={fieldErrors['date'] ? 'error-field' : ''}
                          />
                        </div>
                        <div className="form-group" data-error-field="weekday">
                          <label htmlFor="weekday">巡查星期<span className="required-mark">*</span></label>
                          <input
                            type="text"
                            id="weekday"
                            name="weekday"
                            value={form.weekday}
                            readOnly
                            className={`readonly-input ${fieldErrors['weekday'] ? 'error-field' : ''}`}
                          />
                        </div>
                        <div className="form-group" data-error-field="region">
                          <label htmlFor="region">巡查区域<span className="required-mark">*</span></label>
                          <Select
                            value={form.coverageAreaId
                              ? { value: form.coverageAreaId, label: coverageAreas.find(a => a.id === form.coverageAreaId)?.name || '' }
                              : null}
                            onChange={(option: any) => {
                              const areaId = option?.value || '';
                              const area = coverageAreas.find(a => a.id === areaId);
                              setForm(prev => ({
                                ...prev,
                                coverageAreaId: areaId,
                                coverageAreaName: area?.name || '',
                                // 清空下级选项
                                baseId: '',
                                baseName: '',
                                routeId: '',
                                routeName: ''
                              }));
                              // 加载该区域的基站
                              loadBaseStations(areaId);
                            }}
                            options={coverageAreas.map(area => ({ value: area.id, label: area.name }))}
                            placeholder="请选择巡查区域"
                            isClearable={true}
                            isSearchable={true}
                          />
                        </div>
                        <div className="form-group" data-error-field="base">
                          <label htmlFor="base">巡查基站<span className="required-mark">*</span></label>
                          <Select
                            id="base"
                            value={form.baseId
                              ? { value: form.baseId, label: baseStations.find(b => b.id === form.baseId)?.name || '' }
                              : null}
                            onChange={(option: any) => {
                              const baseId = option?.value || '';
                              const base = baseStations.find(b => b.id === baseId);
                              setForm(prev => ({
                                ...prev,
                                baseId: baseId,
                                baseName: base?.name || '',
                                // 清空下级选项
                                routeId: '',
                                routeName: ''
                              }));
                              // 加载该基站的航线
                              loadRoutes(baseId);
                            }}
                            options={baseStations.map(base => ({ value: base.id, label: base.name }))}
                            placeholder="请选择巡查基站"
                            isClearable={true}
                            isSearchable={true}
                            isDisabled={!form.coverageAreaId}
                          />
                        </div>
                        <div className="form-group" data-error-field="route">
                          <label htmlFor="route">巡查航线</label>
                          <Select
                            id="route"
                            value={form.routeId
                              ? { value: form.routeId, label: routes.find(r => r.id === form.routeId)?.name || '' }
                              : null}
                            onChange={(option: any) => {
                              const routeId = option?.value || '';
                              const route = routes.find(r => r.id === routeId);
                              setForm(prev => ({
                                ...prev,
                                routeId: routeId,
                                routeName: route?.name || ''
                              }));
                            }}
                            options={routes.map(route => ({ value: route.id, label: route.name }))}
                            placeholder="请选择巡查航线"
                            isClearable={true}
                            isSearchable={true}
                            isDisabled={!form.baseId}
                          />
                        </div>
                        <div className="form-group">
                          <label htmlFor="weather">天气情况</label>
                          <Select
                            id="weather"
                            value={form.weather ? { value: form.weather, label: form.weather } : null}
                            onChange={(option: any) => {
                              setForm(prev => ({ ...prev, weather: option?.value || '' }));
                            }}
                            options={weatherOptions}
                            placeholder="请选择天气"
                            isClearable={true}
                            isSearchable={true}
                            required
                          />
                        </div>
                        <div className="form-group">
                          <label htmlFor="temperature">温度（℃）</label>
                          <input
                            type="number"
                            id="temperature"
                            name="temperature"
                            value={form.temperature}
                            onChange={handleChange}
                            min="-30"
                            max="50"
                          />
                        </div>
                        <div className="form-group">
                          <label htmlFor="inspectors">巡检人员</label>
                          <input
                            type="text"
                            id="inspectors"
                            name="inspectors"
                            value={form.inspectors?.join('；') || ''}
                            onChange={(e) => {
                              const value = e.target.value;
                              // 支持中文分号、英文分号、逗号分隔
                              const inspectors = value.split(/[；;,]+/).map(s => s.trim()).filter(Boolean);
                              setForm(prev => ({ ...prev, inspectors }));
                            }}
                            placeholder="多个人员用分号分隔，如：张三；李四；王五"
                          />
                        </div>
                        <div className="form-group">
                          <label htmlFor="flightDuration">飞行时长（分钟）</label>
                          <input
                            type="number"
                            id="flightDuration"
                            name="flightDuration"
                            value={form.flightDuration}
                            onChange={handleChange}
                            required
                            min="0"
                          />
                        </div>
                        <div className="form-group">
                          <label htmlFor="coverageArea">覆盖面积（平方公里）</label>
                          <input
                            type="number"
                            id="coverageArea"
                            name="coverageArea"
                            value={form.coverageArea}
                            onChange={handleChange}
                            required
                            min="0"
                            step="0.01"
                          />
                        </div>
                      </div>
                    </div>

                    {/* 问题明细区域 */}
                    <div className="form-section">
                      <h4 className="section-title">问题明细</h4>
                      {form.issues.map((issue, index) => (
                        <div key={`${issue.id}-${index}`} className="issue-item detailed-issue">
                          <div className="issue-header">
                            <span className="issue-number">问题 {index + 1}</span>
                            <button
                              type="button"
                              className="btn btn-danger btn-sm"
                              onClick={() => removeIssue(index)}
                            >
                              删除
                            </button>
                          </div>

                          {/* 定位信息显示 */}
                          <div className="form-group location-display-group" data-error-field={`issue-${index}-location`}>
                            <label>定位信息<span className="required-mark">*</span></label>
                            {issue.location ? (
                              <div
                                className="location-display clickable"
                                onClick={() => openMapModal(index)}
                                title="点击修改位置"
                              >
                                <div className="location-main">📍 {issue.location}</div>
                                {issue.detailedAddress && (
                                  <div className="location-detail-text">
                                    {issue.detailedAddress}
                                  </div>
                                )}
                                <div className="location-edit-hint">点击修改位置</div>
                              </div>
                            ) : (
                              <button
                                type="button"
                                className={`btn btn-secondary location-btn ${fieldErrors[`issue-${index}-location`] ? 'error-field' : ''}`}
                                onClick={() => openMapModal(index)}
                              >
                                点击选择地图位置
                              </button>
                            )}
                          </div>

                          {/* 问题类型和严重程度 */}
                          <div className="grid grid-cols-2 gap-4">
                            <div className="form-group" data-error-field={`issue-${index}-type`}>
                              <label htmlFor={`issue-${index}-type`}>问题类型<span className="required-mark">*</span></label>
                              <div className={fieldErrors[`issue-${index}-type`] ? 'error-field-wrapper' : ''}>
                                <Cascader
                                  value={issue.pollutionTypeId}
                                  onChange={(code, path) => {
                                    // 使用批量更新避免连续调用handleIssueChange导致的问题
                                    handleIssueChanges(index, {
                                      pollutionTypeId: code,
                                      pollutionTypeName: path.map(p => p.name).join(' / ')
                                    });
                                    // 根据问题类型的严重程度默认值自动带入严重程度
                                    const selectedType = pollutionTypes.find(p => p.id === code);
                                    const defaultSeverity = selectedType?.extra_data?.severity;
                                    if (defaultSeverity === '高') {
                                      handleIssueChange(index, 'severity', 'high');
                                    } else if (defaultSeverity === '中') {
                                      handleIssueChange(index, 'severity', 'medium');
                                    } else if (defaultSeverity === '低') {
                                      handleIssueChange(index, 'severity', 'low');
                                    } else {
                                      handleIssueChange(index, 'severity', '');
                                    }
                                  }}
                                  placeholder="请选择问题类型"
                                  searchPlaceholder="搜索问题类型..."
                                  getData={getChildPollutionTypes}
                                  searchRegions={searchPollutionTypes}
                                  allowSelectAnyLevel={true}
                                />
                              </div>
                            </div>
                            <div className="form-group" data-error-field={`issue-${index}-severity`}>
                              <label htmlFor={`issue-${index}-severity`}>严重程度<span className="required-mark">*</span></label>
                              <div className={fieldErrors[`issue-${index}-severity`] ? 'error-field-wrapper' : ''}>
                                <Select
                                  id={`issue-${index}-severity`}
                                  value={issue.severity ? { value: issue.severity, label: severityOptions.find(s => s.value === issue.severity)?.label || '一般' } : null}
                                  onChange={(option: any) => handleIssueChange(index, 'severity', option?.value || '')}
                                  options={severityOptions}
                                  isClearable={false}
                                  isSearchable={false}
                                  placeholder="请选择严重程度"
                                />
                              </div>
                            </div>
                          </div>

                          {/* 问题描述单独占一行 */}
                          <div className="form-group">
                            <label htmlFor={`issue-${index}-description`}>问题描述</label>
                            <textarea
                              id={`issue-${index}-description`}
                              value={issue.description}
                              onChange={(e) => handleIssueChange(index, 'description', e.target.value)}
                              required
                              rows={3}
                              placeholder="详细描述问题情况..."
                            />
                          </div>

                          {/* 问题照片上传 */}
                          <div className="form-group">
                            <label>关联照片</label>
                            <div className="photo-wall">
                              {issue.photos?.map((photo, photoIndex) => (
                                <div key={photoIndex} className="photo-wall-item">
                                  <img src={photo} alt={`Photo ${photoIndex + 1}`} />
                                  <div className="photo-wall-overlay">
                                    <button
                                      type="button"
                                      className="photo-wall-preview-btn"
                                      onClick={() => setPreviewImage(photo)}
                                      title="预览"
                                    >
                                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="11" cy="11" r="8"></circle>
                                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                                        <line x1="11" y1="8" x2="11" y2="14"></line>
                                        <line x1="8" y1="11" x2="14" y2="11"></line>
                                      </svg>
                                    </button>
                                    <button
                                      type="button"
                                      className="photo-wall-delete-btn"
                                      onClick={() => removeIssuePhoto(index, photoIndex)}
                                      title="删除"
                                    >
                                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="3 6 5 6 21 6"></polyline>
                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                        <line x1="10" y1="11" x2="10" y2="17"></line>
                                        <line x1="14" y1="11" x2="14" y2="17"></line>
                                      </svg>
                                    </button>
                                  </div>
                                </div>
                              ))}
                              {(!issue.photos || issue.photos.length < 10) && (
                                <label className="photo-wall-upload">
                                  <input
                                    type="file"
                                    multiple
                                    accept="image/*"
                                    onChange={(e) => handleIssuePhotoUpload(index, e)}
                                    style={{ display: 'none' }}
                                  />
                                  <div className="photo-wall-upload-content">
                                    <span className="photo-wall-plus">+</span>
                                    <span className="photo-wall-hint">
                                      {issue.photos?.length || 0}/10
                                    </span>
                                  </div>
                                </label>
                              )}
                            </div>
                          </div>

                          {/* 问题截图上传 */}
                          <div className="form-group">
                            <label>问题截图</label>
                            <div className="photo-wall">
                              {issue.screenshots?.map((screenshot, screenshotIndex) => (
                                <div key={screenshotIndex} className="photo-wall-item">
                                  <img src={screenshot} alt={`Screenshot ${screenshotIndex + 1}`} />
                                  <div className="photo-wall-overlay">
                                    <button
                                      type="button"
                                      className="photo-wall-preview-btn"
                                      onClick={() => setPreviewImage(screenshot)}
                                      title="预览"
                                    >
                                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="11" cy="11" r="8"/>
                                        <path d="M21 21l-4.35-4.35"/>
                                        <path d="M11 8v6M8 11h6"/>
                                      </svg>
                                    </button>
                                    <button
                                      type="button"
                                      className="photo-wall-delete-btn"
                                      onClick={() => removeIssueScreenshot(index, screenshotIndex)}
                                      title="删除"
                                    >
                                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                                        <path d="M10 11v6M14 11v6"/>
                                      </svg>
                                    </button>
                                  </div>
                                </div>
                              ))}
                              {(!issue.screenshots || issue.screenshots.length < 10) && (
                                <label className="photo-wall-upload">
                                  <input
                                    type="file"
                                    multiple
                                    accept="image/*"
                                    onChange={(e) => handleIssueScreenshotUpload(index, e)}
                                    style={{ display: 'none' }}
                                  />
                                  <div className="photo-wall-upload-content">
                                    <span className="photo-wall-plus">+</span>
                                    <span className="photo-wall-hint">
                                      {issue.screenshots?.length || 0}/10
                                    </span>
                                  </div>
                                </label>
                              )}
                            </div>
                          </div>

                          {/* 上报情况 */}
                          <div className="form-group">
                            <label htmlFor={`issue-${index}-reportTo`}>上报对象</label>
                            <input
                              type="text"
                              id={`issue-${index}-reportTo`}
                              value={issue.reportTo}
                              onChange={(e) => handleIssueChange(index, 'reportTo', e.target.value)}
                              placeholder="输入上报对象（如：环保局、城管局等）"
                            />
                          </div>

                          <div className="form-group">
                            <label htmlFor={`issue-${index}-reportResult`}>上报结果</label>
                            <textarea
                              id={`issue-${index}-reportResult`}
                              value={issue.reportResult}
                              onChange={(e) => handleIssueChange(index, 'reportResult', e.target.value)}
                              rows={2}
                              placeholder="输入上报处理结果..."
                            />
                          </div>

                          <div className="form-group">
                            <label htmlFor={`issue-${index}-reportDate`}>上报日期</label>
                            <input
                              type="date"
                              id={`issue-${index}-reportDate`}
                              value={issue.reportDate}
                              onChange={(e) => handleIssueChange(index, 'reportDate', e.target.value)}
                            />
                          </div>

                          <div className="form-group">
                            <label htmlFor={`issue-${index}-remarks`}>整改建议</label>
                            <textarea
                              id={`issue-${index}-remarks`}
                              value={issue.remarks}
                              onChange={(e) => handleIssueChange(index, 'remarks', e.target.value)}
                              rows={2}
                              placeholder="输入整改建议（可选）..."
                            />
                          </div>
                        </div>
                      ))}
                      <button
                        type="button"
                        className="btn btn-secondary add-issue-btn"
                        onClick={addIssue}
                      >
                        + 添加问题点位
                      </button>
                    </div>

                    {/* 分析结论区域 */}
                    <div className="form-section">
                      <h4 className="section-title">分析结论</h4>
                      <div className="form-group">
                        <label className="checkbox-label">
                          <input
                            type="checkbox"
                            checked={form.autoGenerateAnalysis}
                            onChange={(e) => setForm(prev => ({ ...prev, autoGenerateAnalysis: e.target.checked }))}
                          />
                          自动生成分析结论
                        </label>
                        <textarea
                          value={form.autoGenerateAnalysis ? generateAnalysisConclusion() : form.analysisConclusion}
                          onChange={(e) => setForm(prev => ({ ...prev, analysisConclusion: e.target.value }))}
                          rows={4}
                          placeholder="输入分析结论..."
                          readOnly={form.autoGenerateAnalysis}
                          className={form.autoGenerateAnalysis ? 'readonly-textarea' : ''}
                        />
                      </div>
                    </div>

                    {/* 表单按钮 */}
                    <div className="drawer-footer">
                      <div className="form-buttons">
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => {
                            setShowForm(false);
                            resetForm();
                          }}
                        >
                          取消
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={handleSaveDraft}
                          disabled={isLoading}
                        >
                          {isLoading && submitAction === 'draft' ? (
                            <>
                              <span className="loading"></span>
                              保存中...
                            </>
                          ) : (
                            '保存草稿'
                          )}
                        </button>
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={(e) => handleSubmit(e, false)}
                          disabled={isLoading}
                        >
                          {isLoading && submitAction === 'submit' ? (
                            <>
                              <span className="loading"></span>
                              提交中...
                            </>
                          ) : (
                            '提交审核'
                          )}
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            </>
          )}

          {/* 地图选择弹窗 */}
          {showMapModal && (
            <div className="modal-overlay" onClick={() => setShowMapModal(false)}>
              <div className="modal map-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                  <h4>选择位置</h4>
                  <button className="modal-close" onClick={() => setShowMapModal(false)}>✕</button>
                </div>
                <div className="modal-body map-modal-body">
                  <MapPicker
                    onSelect={handleMapSelect}
                    onCancel={() => setShowMapModal(false)}
                    initialLocation={
                      currentIssueIndex >= 0 && form.issues[currentIssueIndex]?.longitude
                        ? {
                            longitude: form.issues[currentIssueIndex].longitude,
                            latitude: form.issues[currentIssueIndex].latitude
                          }
                        : undefined
                    }
                    initialAddress={
                      currentIssueIndex >= 0
                        ? form.issues[currentIssueIndex]?.detailedAddress || form.issues[currentIssueIndex]?.location
                        : undefined
                    }
                  />
                </div>
              </div>
            </div>
          )}

          {/* 审核弹窗 */}
          {showReviewModal && reviewingLog && (
            <div className="modal-overlay" onClick={() => setShowReviewModal(false)}>
              <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                  <h4>
                    {reviewAction === 'approve' ? '审核通过' : '审核驳回'}
                  </h4>
                  <button className="modal-close" onClick={() => setShowReviewModal(false)}>✕</button>
                </div>
                <div className="modal-body">
                  {reviewModalError && (
                    <div className="error-message" style={{ marginBottom: '16px' }}>
                      {reviewModalError}
                    </div>
                  )}
                  <div className="form-group">
                    <label>报告编号</label>
                    <input type="text" value={reviewingLog.reportNumber || '-'} readOnly className="readonly-input" />
                  </div>
                  <div className="form-group">
                    <label>审核意见</label>
                    <textarea
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      rows={4}
                      placeholder={`请输入${reviewAction === 'approve' ? '通过' : '驳回'}意见...`}
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button className="btn btn-secondary" onClick={() => setShowReviewModal(false)}>取消</button>
                  <button
                    className={`btn ${reviewAction === 'approve' ? 'btn-success' : 'btn-danger'}`}
                    onClick={handleReview}
                    disabled={isLoading}
                  >
                    {isLoading ? '处理中...' : (reviewAction === 'approve' ? '确认通过' : '确认驳回')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 审核历史弹窗 */}
          {showReviewHistory && (
            <div className="modal-overlay" onClick={() => setShowReviewHistory(false)}>
              <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                  <h4>审核历史</h4>
                  <button className="modal-close" onClick={() => setShowReviewHistory(false)}>✕</button>
                </div>
                <div className="modal-body">
                  {reviewHistory.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-state-text">暂无审核记录</div>
                    </div>
                  ) : (
                    <div className="review-history-list">
                      {reviewHistory.map((record) => (
                        <div key={record.id} className="review-history-item">
                          <div className="review-history-header">
                            <span className={`tag tag-${
                              record.action === 'approve' ? 'success' :
                              record.action === 'reject' ? 'danger' :
                              record.action === 'submit' ? 'info' : 'secondary'
                            }`}>
                              {record.action === 'approve' ? '通过' :
                               record.action === 'reject' ? '驳回' :
                               record.action === 'submit' ? '提交' : '其他'}
                            </span>
                            <span className="review-time">{new Date(record.created_at).toLocaleString()}</span>
                          </div>
                          {record.from_status && record.to_status && (
                            <div className="review-status-change">
                              状态变更: {record.from_status === 'draft' ? '草稿' :
                                        record.from_status === 'pending' ? '待审核' :
                                        record.from_status === 'approved' ? '已通过' :
                                        record.from_status === 'rejected' ? '已驳回' :
                                        record.from_status} → {record.to_status === 'draft' ? '草稿' :
                                                               record.to_status === 'pending' ? '待审核' :
                                                               record.to_status === 'approved' ? '已通过' :
                                                               record.to_status === 'rejected' ? '已驳回' :
                                                               record.to_status}
                            </div>
                          )}
                          {record.reviewer && (
                            <div className="review-reviewer">
                              操作人: {record.reviewer.full_name || record.reviewer.username}
                            </div>
                          )}
                          {record.comment && (
                            <div className="review-comment">{record.comment}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="modal-footer">
                  <button className="btn btn-secondary" onClick={() => setShowReviewHistory(false)}>关闭</button>
                </div>
              </div>
            </div>
          )}

          {/* 详情弹窗 */}
          {showDetailModal && detailLog && (
            <div className="modal-overlay" onClick={closeDetailModal}>
              <div className="modal detail-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                  <h4>报告详情 - {detailLog.reportNumber || detailLog.report_number}</h4>
                  <button className="modal-close" onClick={closeDetailModal}>✕</button>
                </div>
                <div className="modal-body detail-modal-body">
                  {/* 基础信息 */}
                  <div className="detail-section">
                    <h5>基础信息</h5>
                    <div className="detail-grid">
                      {/* 必填字段始终显示 */}
                      <div><label>报告编号:</label><span>{detailLog.reportNumber || detailLog.report_number || '-'}</span></div>
                      <div><label>巡检日期:</label><span>{detailLog.date || '-'}</span></div>
                      <div><label>巡查星期:</label><span>{detailLog.weekday || '-'}</span></div>
                      <div><label>巡查区域:</label><span>{detailLog.coverageAreaName || detailLog.coverage_area_name || detailLog.provinceName || '-'}</span></div>
                      <div><label>巡查基站:</label><span>{detailLog.baseName || detailLog.base_name || '-'}</span></div>
                      <div><label>巡查航线:</label><span>{detailLog.routeName || detailLog.route_name || '-'}</span></div>
                      <div><label>飞行时长:</label><span>{detailLog.flightDuration || detailLog.flight_duration || 0} 分钟</span></div>
                      <div><label>覆盖面积:</label><span>{detailLog.coverageArea || detailLog.coverage_area || 0} km²</span></div>
                      {/* 非必填字段有值时才显示 */}
                      {detailLog.weather && (
                        <div><label>天气情况:</label><span>{detailLog.weather}{detailLog.temperature ? ` ${detailLog.temperature}°C` : ''}</span></div>
                      )}
                      {detailLog.temperature !== undefined && detailLog.temperature !== null && !detailLog.weather && (
                        <div><label>温度:</label><span>{detailLog.temperature}°C</span></div>
                      )}
                      {detailLog.inspectors?.length > 0 && (
                        <div><label>巡检人员:</label><span>{detailLog.inspectors.join(', ')}</span></div>
                      )}
                    </div>
                  </div>

                  {/* 问题明细 */}
                  <div className="detail-section">
                    <h5>问题明细 ({detailLog.issues?.length || 0} 个)</h5>
                    {detailLog.issues?.map((issue, index) => (
                      <div key={index} className="detail-issue-item">
                        <div className="issue-header">
                          <span className="issue-number">问题 {index + 1}</span>
                          {issue.severity && (
                            <span className={`tag tag-${issue.severity}`}>
                              {issue.severity === 'high' ? '严重' : issue.severity === 'medium' ? '一般' : '轻微'}
                            </span>
                          )}
                        </div>
                        {/* 必填字段始终显示 */}
                        <p><strong>定位信息:</strong> {issue.location || '-'}</p>
                        {issue.detailedAddress && (
                          <p><strong>详细地址:</strong> {issue.detailedAddress}</p>
                        )}
                        <p><strong>问题类型:</strong> {issue.pollutionTypeName || '-'}</p>
                        <p><strong>严重程度:</strong> {issue.severity === 'high' ? '严重' : issue.severity === 'medium' ? '一般' : issue.severity === 'low' ? '轻微' : '-'}</p>
                        {/* 非必填字段有值时才显示 */}
                        {issue.description && (
                          <p><strong>问题描述:</strong> {issue.description}</p>
                        )}
                        {issue.photos?.length > 0 && (
                          <div className="issue-photos">
                            {issue.photos.map((photo, pidx) => (
                              <img key={pidx} src={photo} alt={`问题照片${pidx + 1}`} onClick={() => setPreviewImage(photo)} style={{ cursor: 'pointer' }} />
                            ))}
                          </div>
                        )}
                        {issue.screenshots && issue.screenshots.length > 0 && (
                          <div className="issue-screenshots">
                            <p><strong>问题截图:</strong></p>
                            <div className="issue-photos">
                              {issue.screenshots?.map((screenshot, sidx) => (
                                <img key={sidx} src={screenshot} alt={`问题截图${sidx + 1}`} onClick={() => setPreviewImage(screenshot)} style={{ cursor: 'pointer' }} />
                              ))}
                            </div>
                          </div>
                        )}
                        {issue.reportTo && (
                          <p><strong>上报对象:</strong> {issue.reportTo}</p>
                        )}
                        {issue.reportResult && (
                          <p><strong>上报结果:</strong> {issue.reportResult}</p>
                        )}
                        {issue.reportDate && (
                          <p><strong>上报日期:</strong> {issue.reportDate}</p>
                        )}
                        {issue.remarks && (
                          <p><strong>整改建议:</strong> {issue.remarks}</p>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* 分析结论 */}
                  {(detailLog.analysisConclusion || detailLog.analysis_conclusion) && (
                    <div className="detail-section">
                      <h5>分析结论</h5>
                      <p>{detailLog.analysisConclusion || detailLog.analysis_conclusion}</p>
                    </div>
                  )}
                </div>
                <div className="modal-footer">
                  <button className="btn btn-secondary" onClick={closeDetailModal}>关闭</button>
                </div>
              </div>
            </div>
          )}

          {/* 图片预览弹窗 */}
          {previewImage && (
            <div className="image-preview-overlay" onClick={closeImagePreview}>
              <div className="image-preview-container" onClick={(e) => e.stopPropagation()}>
                <button className="image-preview-close" onClick={closeImagePreview}>✕</button>
                <img src={previewImage} alt="预览" className="image-preview-img" />
              </div>
            </div>
          )}

          {/* 报告列表 */}
          <div className="table-container">
            <h3>报告列表</h3>
            {isLoading && !showForm ? (
              <div className="loading-container">
                <span className="loading"></span>
                <span className="loading-text">加载中...</span>
              </div>
            ) : logs.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📋</div>
                <div className="empty-state-text">暂无数据</div>
              </div>
            ) : (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>报告编号</th>
                      <th>日期</th>
                      <th>星期</th>
                      <th>巡查区域</th>
                      <th>问题数量</th>
                      <th>状态</th>
                      <th>创建时间</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map(log => (
                      <tr key={log.id}>
                        <td>{log.reportNumber || '-'}</td>
                        <td>{log.date}</td>
                        <td>{log.weekday || '-'}</td>
                        <td>{log.coverageAreaName || log.coverage_area_name || [log.provinceName, log.cityName, log.districtName].filter(Boolean).join('/') || '-'}</td>
                        <td>{log.issues.length}</td>
                        <td>
                          <span className={`tag tag-${log.status === 'draft' ? 'secondary' : log.status === 'pending' ? 'warning' : log.status === 'approved' ? 'success' : 'danger'}`}>
                            {log.status === 'draft' ? '草稿' : log.status === 'pending' ? '待审核' : log.status === 'approved' ? '已通过' : '已驳回'}
                          </span>
                        </td>
                        <td>{log.created_at ? new Date(log.created_at).toLocaleString() : '-'}</td>
                        <td>
                          <div className="btn-group">
                            {/* 草稿状态：编辑、删除、详情 */}
                            {log.status === 'draft' && (
                              <>
                                <button
                                  className="btn btn-info"
                                  onClick={() => openDetailModal(log)}
                                >
                                  详情
                                </button>
                                <button
                                  className="btn btn-primary"
                                  onClick={() => handleEdit(log)}
                                >
                                  编辑
                                </button>
                                <button
                                  className="btn btn-danger"
                                  onClick={() => handleDelete(log.id!)}
                                >
                                  删除
                                </button>
                              </>
                            )}
                            {/* 待审核状态：详情、审核操作 */}
                            {log.status === 'pending' && (
                              <>
                                <button
                                  className="btn btn-info"
                                  onClick={() => openDetailModal(log)}
                                >
                                  详情
                                </button>
                                <button
                                  className="btn btn-success"
                                  onClick={() => openReviewModal(log, 'approve')}
                                >
                                  通过
                                </button>
                                <button
                                  className="btn btn-danger"
                                  onClick={() => openReviewModal(log, 'reject')}
                                >
                                  驳回
                                </button>
                                <button
                                  className="btn btn-secondary"
                                  onClick={() => viewReviewHistory(log.id!)}
                                >
                                  历史
                                </button>
                              </>
                            )}
                            {/* 已通过状态：详情、导出Word、历史 */}
                            {log.status === 'approved' && (
                              <>
                                <button
                                  className="btn btn-info"
                                  onClick={() => openDetailModal(log)}
                                >
                                  详情
                                </button>
                                <button
                                  className="btn btn-success"
                                  onClick={() => handleExportToWord(log)}
                                >
                                  导出Word
                                </button>
                                <button
                                  className="btn btn-secondary"
                                  onClick={() => viewReviewHistory(log.id!)}
                                >
                                  历史
                                </button>
                              </>
                            )}
                            {/* 已驳回状态：详情、查看历史、删除 */}
                            {log.status === 'rejected' && (
                              <>
                                <button
                                  className="btn btn-info"
                                  onClick={() => openDetailModal(log)}
                                >
                                  详情
                                </button>
                                <button
                                  className="btn btn-primary"
                                  onClick={() => handleEdit(log)}
                                >
                                  查看
                                </button>
                                <button
                                  className="btn btn-secondary"
                                  onClick={() => viewReviewHistory(log.id!)}
                                >
                                  历史
                                </button>
                                <button
                                  className="btn btn-danger"
                                  onClick={() => handleDelete(log.id!)}
                                >
                                  删除
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Logs;
