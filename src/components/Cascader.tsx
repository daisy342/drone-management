import React, { useState, useEffect, useRef, useMemo } from 'react';
import './Cascader.css';
import '../styles/unified-controls.css';

interface Region {
  code: string;
  name: string;
  children?: Region[];
}

interface CascaderProps {
  value: string;
  onChange: (value: string, path: { code: string; name: string }[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  getData: (code: string) => Region[];
  searchRegions?: (keyword: string) => Region[];
  allowSelectAnyLevel?: boolean; // 是否允许选择任意层级（默认为false，只允许选择叶子节点）
}

export const Cascader: React.FC<CascaderProps> = ({
  value,
  onChange,
  placeholder = '请选择',
  searchPlaceholder = '搜索省市区...',
  getData,
  searchRegions,
  allowSelectAnyLevel = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPath, setSelectedPath] = useState<{ code: string; name: string }[]>([]);
  const [currentLevel, setCurrentLevel] = useState(0);
  const [currentOptions, setCurrentOptions] = useState<Region[]>([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState<Region[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const getDataRef = useRef(getData);
  getDataRef.current = getData;

  // 缓存 getData('') 的结果，用于监听数据变化
  const rootData = React.useMemo(() => getData(''), [getData]);

  // 根据 value 初始化选中路径 - 在 value 或数据变化时执行
  useEffect(() => {
    if (value && rootData.length > 0) {
      // 尝试从 value 反推路径
      const path: { code: string; name: string }[] = [];

      // 简化的路径查找逻辑
      const findPath = (code: string, regions: Region[]): boolean => {
        for (const region of regions) {
          if (region.code === code) {
            path.unshift({ code: region.code, name: region.name });
            return true;
          }
          if (region.children) {
            if (findPath(code, region.children)) {
              path.unshift({ code: region.code, name: region.name });
              return true;
            }
          }
        }
        return false;
      };

      // 从根级别开始查找
      const found = findPath(value, rootData);
      if (found) {
        setSelectedPath(path);
      }
    } else if (!value) {
      // value 为空时重置选中路径
      setSelectedPath([]);
    }
  }, [value, rootData]);

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 打开时初始化选项
  useEffect(() => {
    if (isOpen) {
      if (selectedPath.length > 0) {
        // 如果有已选路径，显示当前层级的选项
        const parentCode = selectedPath[currentLevel - 1]?.code || '';
        setCurrentOptions(getData(parentCode));
      } else {
        // 否则显示根级选项
        setCurrentOptions(getData(''));
        setCurrentLevel(0);
      }
    }
  }, [isOpen, selectedPath, currentLevel, getData]);

  // 搜索功能
  useEffect(() => {
    if (searchKeyword && searchRegions) {
      const results = searchRegions(searchKeyword);
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  }, [searchKeyword, searchRegions]);

  const handleToggle = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setCurrentLevel(0);
      setCurrentOptions(getData(''));
      setSearchKeyword('');
      setSearchResults([]);
    }
  };

  const handleSelect = (region: Region) => {
    const newPath = [...selectedPath.slice(0, currentLevel), { code: region.code, name: region.name }];
    setSelectedPath(newPath);

    if (region.children && region.children.length > 0) {
      if (allowSelectAnyLevel) {
        // 允许选择任意层级时，触发 onChange 并进入下级
        onChange(region.code, newPath);
      }
      // 有子级，进入下一级
      setCurrentLevel(currentLevel + 1);
      setCurrentOptions(region.children);
      setSearchKeyword('');
      setSearchResults([]);
    } else {
      // 无子级，完成选择
      onChange(region.code, newPath);
      setIsOpen(false);
    }
  };

  const handleSelectCurrent = (region: Region) => {
    // 选择当前项（无论是否有子级）
    const newPath = [...selectedPath.slice(0, currentLevel), { code: region.code, name: region.name }];
    setSelectedPath(newPath);
    onChange(region.code, newPath);
    setIsOpen(false);
  };

  const handlePathClick = (index: number) => {
    setCurrentLevel(index);
    const parentCode = index > 0 ? selectedPath[index - 1].code : '';
    setCurrentOptions(getData(parentCode));
    setSelectedPath(selectedPath.slice(0, index));
    setSearchKeyword('');
    setSearchResults([]);
  };

  const handleSearchSelect = (region: Region) => {
    // 从搜索结果中选择时，需要构建完整路径
    const path: { code: string; name: string }[] = [];

    const findPath = (code: string, regions: Region[]): boolean => {
      for (const r of regions) {
        if (r.code === code) {
          path.unshift({ code: r.code, name: r.name });
          return true;
        }
        if (r.children) {
          if (findPath(code, r.children)) {
            path.unshift({ code: r.code, name: r.name });
            return true;
          }
        }
      }
      return false;
    };

    findPath(region.code, getData(''));
    if (path.length > 0) {
      setSelectedPath(path);

      // 如果有子级，展开下一级让用户继续选择
      if (region.children && region.children.length > 0) {
        setCurrentLevel(path.length);
        setCurrentOptions(region.children);
        setSearchKeyword('');
        setSearchResults([]);
      } else {
        // 无子级，完成选择
        onChange(region.code, path);
        setIsOpen(false);
      }
    }
  };

  const displayText = selectedPath.length > 0
    ? selectedPath.map(p => p.name).join(' / ')
    : placeholder;

  return (
    <div className="cascader" ref={containerRef}>
      <div
        className={`cascader-trigger ${isOpen ? 'open' : ''}`}
        onClick={handleToggle}
      >
        <span className={selectedPath.length ? 'cascader-value' : 'cascader-placeholder'}>
          {displayText}
        </span>
        <span className="cascader-arrow">
          <svg width="12" height="8" viewBox="0 0 12 8" fill="none">
            <path
              d="M1 1.5L6 6.5L11 1.5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </div>

      {isOpen && (
        <div className="cascader-dropdown">
          {/* 搜索框 */}
          {searchRegions && (
            <div className="cascader-search">
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder={searchPlaceholder}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #e0e0e0',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
            </div>
          )}

          {/* 已选路径导航 */}
          {selectedPath.length > 0 && !searchKeyword && (
            <div className="cascader-path">
              {selectedPath.map((item, index) => (
                <React.Fragment key={item.code}>
                  <button
                    type="button"
                    className={`cascader-path-item ${index === currentLevel ? 'active' : ''}`}
                    onClick={() => handlePathClick(index)}
                  >
                    {item.name}
                  </button>
                  {index < selectedPath.length - 1 && (
                    <span className="cascader-path-separator">/</span>
                  )}
                </React.Fragment>
              ))}
            </div>
          )}

          {/* 搜索结果 */}
          {searchKeyword && searchResults.length > 0 ? (
            <div className="cascader-options">
              {searchResults.map((region) => {
                // 构建搜索结果的完整路径用于显示
                const displayPath: string[] = [];
                const findDisplayPath = (code: string, regions: Region[]): boolean => {
                  for (const r of regions) {
                    if (r.code === code) {
                      displayPath.unshift(r.name);
                      return true;
                    }
                    if (r.children) {
                      if (findDisplayPath(code, r.children)) {
                        displayPath.unshift(r.name);
                        return true;
                      }
                    }
                  }
                  return false;
                };
                findDisplayPath(region.code, getData(''));

                return (
                  <button
                    key={region.code}
                    type="button"
                    className={`cascader-option ${region.children && region.children.length > 0 ? 'has-children' : ''}`}
                    onClick={() => handleSearchSelect(region)}
                  >
                    <span className="cascader-option-text">
                      {displayPath.join(' / ')}
                    </span>
                    {region.children && region.children.length > 0 && (
                      <span className="cascader-option-arrow">›</span>
                    )}
                  </button>
                );
              })}
            </div>
          ) : searchKeyword && searchResults.length === 0 ? (
            <div className="cascader-options">
              <div style={{ padding: '12px', textAlign: 'center', color: '#999' }}>
                无搜索结果
              </div>
            </div>
          ) : (
            /* 选项列表 */
            <div className="cascader-options">
              {currentOptions.map((region) => (
                <button
                  key={region.code}
                  type="button"
                  className={`cascader-option ${selectedPath[currentLevel]?.code === region.code ? 'selected' : ''} ${region.children ? 'has-children' : ''}`}
                  onClick={(e) => {
                    if (allowSelectAnyLevel) {
                      // 允许选择任意层级时，Ctrl/Cmd + 点击选择当前项，否则进入下级
                      if (e.ctrlKey || e.metaKey) {
                        handleSelectCurrent(region);
                      } else {
                        handleSelect(region);
                      }
                    } else {
                      // 只允许选择叶子节点时，直接进入下级或无子级时选择
                      handleSelect(region);
                    }
                  }}
                >
                  <span className="cascader-option-text">{region.name}</span>
                  {region.children && region.children.length > 0 && allowSelectAnyLevel && (
                    <>
                      <span
                        className="cascader-option-select-current"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectCurrent(region);
                        }}
                      >
                        选择
                      </span>
                      <span className="cascader-option-arrow">›</span>
                    </>
                  )}
                  {region.children && region.children.length > 0 && !allowSelectAnyLevel && (
                    <span className="cascader-option-arrow">›</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Cascader;
