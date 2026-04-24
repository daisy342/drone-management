import { Document, Paragraph, TextRun, HeadingLevel, AlignmentType, Packer, Table, TableCell, TableRow, WidthType, BorderStyle } from 'docx';
import { getOverallStatistics, getFlightTrend, getIssueTrend, getIssueDistribution, getBaseStatistics } from './analysis';
import { Log, getLog } from './logs';

// 导出巡查报告为Word
export const exportLogToWord = async (log: Log) => {
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        // 标题
        new Paragraph({
          text: log.reportNumber || '巡查报告',
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
        }),

        // 基本信息
        new Paragraph({
          children: [
            new TextRun({ text: '报告编号：', bold: true }),
            new TextRun(log.reportNumber || '-'),
          ],
          spacing: { after: 200 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: '巡查日期：', bold: true }),
            new TextRun(log.date || '-'),
          ],
          spacing: { after: 200 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: '星期：', bold: true }),
            new TextRun(log.weekday || '-'),
          ],
          spacing: { after: 200 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: '巡查区域：', bold: true }),
            new TextRun(`${log.provinceName || ''} ${log.cityName || ''} ${log.districtName || ''}`),
          ],
          spacing: { after: 200 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: '天气情况：', bold: true }),
            new TextRun(`${log.weather || '-'} ${log.temperature ? log.temperature + '°C' : ''}`),
          ],
          spacing: { after: 200 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: '巡查人员：', bold: true }),
            new TextRun(log.inspectors?.join(', ') || '-'),
          ],
          spacing: { after: 200 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: '飞行时长：', bold: true }),
            new TextRun(`${log.flightDuration || 0} 分钟`),
          ],
          spacing: { after: 200 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: '覆盖面积：', bold: true }),
            new TextRun(`${log.coverageArea || 0} 平方公里`),
          ],
          spacing: { after: 400 },
        }),

        // 分隔线
        new Paragraph({
          text: '',
          border: {
            bottom: {
              color: '999999',
              space: 1,
              style: BorderStyle.SINGLE,
              size: 6,
            },
          },
          spacing: { after: 400 },
        }),

        // 问题列表
        new Paragraph({
          text: '发现问题',
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 200 },
        }),

        // 问题表格
        ...(log.issues && log.issues.length > 0
          ? [
              createIssuesTable(log.issues),
              new Paragraph({ text: '', spacing: { after: 400 } }),
            ]
          : [new Paragraph({ text: '本次巡查未发现任何问题。', spacing: { after: 400 } })]
        ),

        // 分析结论
        new Paragraph({
          text: '分析结论',
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 200 },
        }),
        new Paragraph({
          text: log.analysisConclusion || '本次巡查工作按计划完成，未发现重大问题。',
          spacing: { after: 400 },
        }),

        // 签章区域
        new Paragraph({
          text: '',
          spacing: { before: 600 },
        }),
        new Paragraph({
          text: '巡查人员签字：________________',
          alignment: AlignmentType.RIGHT,
          spacing: { after: 200 },
        }),
        new Paragraph({
          text: `日期：${new Date().toISOString().split('T')[0]}`,
          alignment: AlignmentType.RIGHT,
        }),
      ],
    }],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);

  // Safari 兼容性处理：使用 window.open
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  if (isSafari) {
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }

  // 其他浏览器使用标准下载方式
  const link = document.createElement('a');
  link.href = url;
  link.download = `${log.reportNumber || '巡查报告'}_${log.date}.docx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// 创建问题表格
const createIssuesTable = (issues: Log['issues']) => {
  const headerRow = new TableRow({
    children: [
      createTableCell('序号', true),
      createTableCell('问题描述', true),
      createTableCell('位置', true),
      createTableCell('详细地址', true),
      createTableCell('污染类型', true),
      createTableCell('严重程度', true),
      createTableCell('状态', true),
    ],
  });

  const dataRows = issues.map((issue, index) =>
    new TableRow({
      children: [
        createTableCell(String(index + 1)),
        createTableCell(issue.description || '-'),
        createTableCell(issue.location || '-'),
        createTableCell(issue.detailedAddress || '-'),
        createTableCell(issue.pollutionTypeName || issue.pollutionTypeId || '-'),
        createTableCell(getSeverityText(issue.severity)),
        createTableCell(issue.status === 'closed' ? '已关闭' : '待处理'),
      ],
    })
  );

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...dataRows],
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
      left: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
      right: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
    },
  });
};

// 创建表格单元格
const createTableCell = (text: string, isHeader = false) => {
  return new TableCell({
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text,
            bold: isHeader,
            size: 22,
          }),
        ],
        alignment: AlignmentType.CENTER,
      }),
    ],
    shading: isHeader ? { fill: 'F0F0F0' } : undefined,
    verticalAlign: 'center',
  });
};

// 获取严重程度文本
const getSeverityText = (severity: string) => {
  switch (severity) {
    case 'low':
      return '低';
    case 'medium':
      return '中';
    case 'high':
      return '高';
    default:
      return '-';
  }
};

// 导出月度分析报告
export const exportMonthlyReportToWord = async (year: number, month: number) => {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = `${year}-${String(month).padStart(2, '0')}-31`;

  // 获取统计数据
  const stats = await getOverallStatistics(startDate, endDate);
  const flightTrend = await getFlightTrend('day', startDate, endDate);
  const issueTrend = await getIssueTrend('day', startDate, endDate);
  const issueDistribution = await getIssueDistribution(startDate, endDate);
  const baseStats = await getBaseStatistics(startDate, endDate);

  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        // 标题
        new Paragraph({
          text: `${year}年${month}月巡查工作报告`,
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
        }),

        // 报告日期
        new Paragraph({
          text: `报告生成日期：${new Date().toISOString().split('T')[0]}`,
          alignment: AlignmentType.RIGHT,
          spacing: { after: 400 },
        }),

        // 一、总体情况
        new Paragraph({
          text: '一、总体情况',
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 200 },
        }),
        new Paragraph({
          text: `本月共完成巡查任务 ${stats.totalFlights} 次，累计飞行时长 ${stats.totalDuration.toFixed(2)} 分钟，` +
                `覆盖巡查区域 ${stats.totalArea.toFixed(2)} 平方公里，发现问题 ${stats.totalIssues} 个。` +
                `平均每次巡查时长 ${stats.averageDuration.toFixed(2)} 分钟，问题发生率 ${stats.issueRate.toFixed(2)}%。`,
          spacing: { after: 300 },
        }),

        // 二、基地统计
        new Paragraph({
          text: '二、基地统计',
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 200 },
        }),
        createBaseStatisticsTable(baseStats),
        new Paragraph({ text: '', spacing: { after: 300 } }),

        // 三、问题分布
        new Paragraph({
          text: '三、问题分布',
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 200 },
        }),
        new Paragraph({
          text: `本月共发现问题 ${stats.totalIssues} 个，其中高优先级问题 ${issueDistribution.find(i => i.severity === 'high')?.count || 0} 个，` +
                `中优先级问题 ${issueDistribution.find(i => i.severity === 'medium')?.count || 0} 个，` +
                `低优先级问题 ${issueDistribution.find(i => i.severity === 'low')?.count || 0} 个。`,
          spacing: { after: 300 },
        }),

        // 四、飞行趋势
        new Paragraph({
          text: '四、飞行趋势',
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 200 },
        }),
        new Paragraph({
          text: `本月飞行任务最高峰出现在 ${getPeakDay(flightTrend)}，最低谷出现在 ${getLowestDay(flightTrend)}。`,
          spacing: { after: 300 },
        }),

        // 五、问题趋势
        new Paragraph({
          text: '五、问题发现趋势',
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 200 },
        }),
        new Paragraph({
          text: `本月问题发现趋势呈现${getTrendDescription(issueTrend)}。`,
          spacing: { after: 300 },
        }),

        // 六、工作建议
        new Paragraph({
          text: '六、工作建议',
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 200 },
        }),
        new Paragraph({
          text: '1. 继续保持当前巡查力度，重点关注高发区域；',
          spacing: { after: 100 },
        }),
        new Paragraph({
          text: '2. 对发现问题及时跟进处理，确保整改到位；',
          spacing: { after: 100 },
        }),
        new Paragraph({
          text: '3. 加强巡查人员培训，提高问题发现能力；',
          spacing: { after: 100 },
        }),
        new Paragraph({
          text: '4. 优化巡查路线，提高巡查效率。',
          spacing: { after: 400 },
        }),

        // 签章
        new Paragraph({
          text: '审核人签字：________________',
          alignment: AlignmentType.RIGHT,
          spacing: { before: 600, after: 200 },
        }),
        new Paragraph({
          text: `日期：${new Date().toISOString().split('T')[0]}`,
          alignment: AlignmentType.RIGHT,
        }),
      ],
    }],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);

  // Safari 兼容性处理：使用 window.open
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  if (isSafari) {
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }

  // 其他浏览器使用标准下载方式
  const link = document.createElement('a');
  link.href = url;
  link.download = `${year}年${month}月巡查工作报告.docx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// 创建基地统计表格
const createBaseStatisticsTable = (baseStats: any[]) => {
  const headerRow = new TableRow({
    children: [
      createTableCell('基地名称', true),
      createTableCell('巡查次数', true),
      createTableCell('飞行时长(分钟)', true),
      createTableCell('覆盖面积(km²)', true),
      createTableCell('发现问题数', true),
    ],
  });

  const dataRows = baseStats.map((base) =>
    new TableRow({
      children: [
        createTableCell(base.baseName || '-'),
        createTableCell(String(base.totalFlights || 0)),
        createTableCell(String(base.totalDuration?.toFixed(2) || '0.00')),
        createTableCell(String(base.totalArea?.toFixed(2) || '0.00')),
        createTableCell(String(base.totalIssues || 0)),
      ],
    })
  );

  // 合计行
  const totalRow = new TableRow({
    children: [
      createTableCell('合计', true),
      createTableCell(String(baseStats.reduce((sum, b) => sum + (b.totalFlights || 0), 0)), true),
      createTableCell(String(baseStats.reduce((sum, b) => sum + (b.totalDuration || 0), 0).toFixed(2)), true),
      createTableCell(String(baseStats.reduce((sum, b) => sum + (b.totalArea || 0), 0).toFixed(2)), true),
      createTableCell(String(baseStats.reduce((sum, b) => sum + (b.totalIssues || 0), 0)), true),
    ],
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...dataRows, totalRow],
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
      left: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
      right: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
    },
  });
};

// 获取峰值日期
const getPeakDay = (trend: any[]) => {
  if (trend.length === 0) return '-';
  const peak = trend.reduce((max, item) => item.value > max.value ? item : max, trend[0]);
  return peak.date;
};

// 获取低谷日期
const getLowestDay = (trend: any[]) => {
  if (trend.length === 0) return '-';
  const lowest = trend.reduce((min, item) => item.value < min.value ? item : min, trend[0]);
  return lowest.date;
};

// 获取趋势描述
const getTrendDescription = (trend: any[]) => {
  if (trend.length < 2) return '平稳';
  const first = trend[0]?.value || 0;
  const last = trend[trend.length - 1]?.value || 0;
  const avg = trend.reduce((sum, item) => sum + item.value, 0) / trend.length;

  if (last > avg * 1.2) return '上升趋势';
  if (last < avg * 0.8) return '下降趋势';
  return '相对平稳';
};

// 导出多份报告（批量导出）
export const exportLogsBatchToWord = async (logIds: string[]) => {
  // 获取所有日志数据
  const logs: Log[] = [];
  for (const id of logIds) {
    try {
      const log = await getLog(id);
      logs.push(log);
    } catch (err) {
      // 忽略单个日志获取失败
    }
  }

  if (logs.length === 0) {
    throw new Error('没有找到可导出的报告');
  }

  // 按日期排序
  logs.sort((a, b) => (a.date || '').localeCompare(b.date || ''));

  // 生成合并文档
  const children: (Paragraph | Table)[] = [];

  logs.forEach((log, index) => {
    // 添加分页符（除了第一页）
    if (index > 0) {
      children.push(new Paragraph({
        pageBreakBefore: true,
        text: '',
      }));
    }

    // 报告标题
    children.push(new Paragraph({
      text: log.reportNumber || '巡查报告',
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }));

    // 基本信息
    children.push(new Paragraph({
      children: [
        new TextRun({ text: '报告编号：', bold: true }),
        new TextRun(log.reportNumber || '-'),
      ],
      spacing: { after: 200 },
    }));
    children.push(new Paragraph({
      children: [
        new TextRun({ text: '巡查日期：', bold: true }),
        new TextRun(log.date || '-'),
      ],
      spacing: { after: 200 },
    }));
    children.push(new Paragraph({
      children: [
        new TextRun({ text: '巡查区域：', bold: true }),
        new TextRun(`${log.provinceName || ''} ${log.cityName || ''} ${log.districtName || ''}`),
      ],
      spacing: { after: 200 },
    }));
    children.push(new Paragraph({
      children: [
        new TextRun({ text: '飞行时长：', bold: true }),
        new TextRun(`${log.flightDuration || 0} 分钟`),
      ],
      spacing: { after: 200 },
    }));
    children.push(new Paragraph({
      children: [
        new TextRun({ text: '覆盖面积：', bold: true }),
        new TextRun(`${log.coverageArea || 0} 平方公里`),
      ],
      spacing: { after: 400 },
    }));

    // 问题列表
    children.push(new Paragraph({
      text: '发现问题',
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 200 },
    }));

    if (log.issues && log.issues.length > 0) {
      children.push(createIssuesTable(log.issues));
      children.push(new Paragraph({ text: '', spacing: { after: 400 } }));
    } else {
      children.push(new Paragraph({ text: '本次巡查未发现任何问题。', spacing: { after: 400 } }));
    }

    // 分析结论
    children.push(new Paragraph({
      text: '分析结论',
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 200 },
    }));
    children.push(new Paragraph({
      text: log.analysisConclusion || '本次巡查工作按计划完成，未发现重大问题。',
      spacing: { after: 400 },
    }));

    // 分隔线
    if (index < logs.length - 1) {
      children.push(new Paragraph({
        text: '',
        border: {
          bottom: {
            color: '999999',
            space: 1,
            style: BorderStyle.SINGLE,
            size: 6,
          },
        },
        spacing: { after: 400 },
      }));
    }
  });

  const doc = new Document({
    sections: [{
      properties: {},
      children,
    }],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);

  // Safari 兼容性处理：使用 window.open
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  if (isSafari) {
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }

  // 其他浏览器使用标准下载方式
  const link = document.createElement('a');
  link.href = url;
  link.download = `巡查报告汇总_${new Date().toISOString().split('T')[0]}.docx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
