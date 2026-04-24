import React, { useEffect, useRef, useState } from 'react';
import AMapLoader from '@amap/amap-jsapi-loader';
import './MapPicker.css';

interface MapPickerProps {
  onSelect: (location: string, detailedAddress: string, longitude: number, latitude: number) => void;
  onCancel: () => void;
  initialLocation?: { longitude: number; latitude: number };
  initialAddress?: string;
}

// 高德地图 API Key
const AMAP_KEY = '356dc75a40f0e83ea9684f6531b6e4b3';
// 高德地图安全密钥 - 用于 PlaceSearch 等搜索服务
const AMAP_SECRET_KEY = '1a164662022f25558c2f708f43dd7989';

// 声明全局 AMap
declare global {
  interface Window {
    AMap: any;
    _AMapSecurityConfig?: {
      securityJsCode: string;
      serviceHost?: string;
    };
  }
}

const MapPicker: React.FC<MapPickerProps> = ({ onSelect, onCancel, initialLocation, initialAddress }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 使用 initialAddress 初始化搜索关键词
  const [searchKeyword, setSearchKeyword] = useState(initialAddress || '');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [_isSearching, setIsSearching] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState(initialAddress || '');
  const [selectedLocation, setSelectedLocation] = useState({
    longitude: initialLocation?.longitude || 116.397428,
    latitude: initialLocation?.latitude || 39.90923
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [AMapLoaded, setAMapLoaded] = useState(false);

  // 当 initialAddress 或 initialLocation 变化时更新状态
  useEffect(() => {
    if (initialAddress) {
      setSearchKeyword(initialAddress);
      setSelectedAddress(initialAddress);
    }
    if (initialLocation) {
      setSelectedLocation({
        longitude: initialLocation.longitude,
        latitude: initialLocation.latitude
      });
      // 如果地图已加载，更新地图中心点和标记
      if (mapInstance.current) {
        mapInstance.current.setCenter([initialLocation.longitude, initialLocation.latitude]);
        updateMarker(initialLocation.longitude, initialLocation.latitude);
      }
    }
  }, [initialAddress, initialLocation]);

  // 初始化地图
  useEffect(() => {
    // 配置安全密钥 - 必须在加载地图之前设置
    window._AMapSecurityConfig = {
      securityJsCode: AMAP_SECRET_KEY
    };

    const initMap = async () => {
      try {
        setLoading(true);
        setError('');

        const AMap = await AMapLoader.load({
          key: AMAP_KEY,
          version: '2.0',
          plugins: ['AMap.PlaceSearch', 'AMap.Geocoder', 'AMap.AutoComplete', 'AMap.Marker']
        });

        setAMapLoaded(true);

        if (mapRef.current) {
          // 创建地图实例
          mapInstance.current = new AMap.Map(mapRef.current, {
            zoom: 13,
            center: [selectedLocation.longitude, selectedLocation.latitude],
            resizeEnable: true
          });

          // 添加点击事件
          mapInstance.current.on('click', (e: any) => {
            const lnglat = e.lnglat;
            const lng = lnglat.lng;
            const lat = lnglat.lat;

            // 立即更新位置状态
            setSelectedLocation({
              longitude: lng,
              latitude: lat
            });

            // 更新标记
            updateMarker(lng, lat);

            // 设置临时地址（经纬度），等逆地理编码完成后再更新
            setSelectedAddress(`${lng.toFixed(6)}, ${lat.toFixed(6)}`);

            // 进行逆地理编码获取详细地址
            reverseGeocode(lng, lat);
          });

          // 初始化标记
          updateMarker(selectedLocation.longitude, selectedLocation.latitude);

          // 如果有初始位置，进行逆地理编码
          if (initialLocation) {
            reverseGeocode(initialLocation.longitude, initialLocation.latitude);
          }
        }

        setLoading(false);
      } catch (err: any) {
        console.error('地图加载失败:', err);
        setError('地图加载失败: ' + (err.message || '请检查网络连接'));
        setLoading(false);
      }
    };

    initMap();

    // 清理函数
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      if (mapInstance.current) {
        mapInstance.current.destroy();
        mapInstance.current = null;
      }
    };
  }, []);

  // 更新标记位置
  const updateMarker = (longitude: number, latitude: number) => {
    if (!mapInstance.current || !window.AMap) return;

    // 移除旧标记
    if (markerRef.current) {
      mapInstance.current.remove(markerRef.current);
    }

    // 创建新标记
    markerRef.current = new window.AMap.Marker({
      position: [longitude, latitude],
      animation: 'AMAP_ANIMATION_DROP'
    });

    mapInstance.current.add(markerRef.current);
    mapInstance.current.setCenter([longitude, latitude]);
  };

  // 逆地理编码（坐标转地址）
  const reverseGeocode = (longitude: number, latitude: number) => {
    if (!window.AMap) return;

    try {
      const geocoder = new window.AMap.Geocoder({
        radius: 1000,
        extensions: 'all'
      });

      geocoder.getAddress([longitude, latitude], (status: string, result: any) => {
        if (status === 'complete' && result.info === 'OK') {
          const address = result.regeocode.formattedAddress;
          setSelectedAddress(address);
          // 同时更新搜索框显示
          setSearchKeyword(address);
        }
      });
    } catch (err) {
      console.error('逆地理编码失败:', err);
    }
  };

  // 搜索地点
  const handleSearch = () => {
    if (!searchKeyword.trim() || !window.AMap) return;

    setIsSearching(true);
    setLoading(true);
    try {
      const placeSearch = new window.AMap.PlaceSearch({
        pageSize: 10,
        pageIndex: 1,
        extensions: 'all'
      });

      placeSearch.search(searchKeyword, (status: string, result: any) => {
        setLoading(false);
        setIsSearching(false);
        if (status === 'complete' && result.info === 'OK') {
          setSearchResults(result.poiList.pois);
        } else {
          setSearchResults([]);
        }
      });
    } catch (err) {
      console.error('搜索失败:', err);
      setLoading(false);
      setIsSearching(false);
      setSearchResults([]);
    }
  };

  // 模糊搜索（AutoComplete）
  const handleFuzzySearch = (keyword: string) => {
    if (!keyword.trim() || !window.AMap) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      // 使用 AutoComplete 插件进行模糊搜索
      const autoComplete = new window.AMap.AutoComplete({
        city: '全国',
        input: 'map-search-input'
      });

      autoComplete.search(keyword, (status: string, result: any) => {
        setIsSearching(false);
        if (status === 'complete' && result.info === 'OK') {
          // AutoComplete 返回的是 tips，格式略有不同
          const tips = result.tips || [];
          // 过滤掉没有 location 的数据
          const validTips = tips.filter((tip: any) => tip.location);
          setSearchResults(validTips.map((tip: any) => ({
            name: tip.name,
            address: tip.district + (tip.address || ''),
            district: tip.district,
            location: tip.location
          })));
        } else {
          setSearchResults([]);
        }
      });
    } catch (err) {
      console.error('模糊搜索失败:', err);
      setIsSearching(false);
      // 如果 AutoComplete 失败，使用 PlaceSearch 作为备选
      if (keyword.trim().length >= 2) {
        handleSearch();
      }
    }
  };

  // 处理输入变化 - 带防抖
  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchKeyword(value);

    // 清除之前的定时器
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // 清空搜索
    if (!value.trim()) {
      setSearchResults([]);
      return;
    }

    // 延迟搜索，避免频繁请求
    searchTimeoutRef.current = setTimeout(() => {
      handleFuzzySearch(value);
    }, 300);
  };

  // 选择搜索结果
  const selectSearchResult = (poi: any) => {
    const location = poi.location;
    if (!location) return;

    // AutoComplete 返回的 location 可能是字符串 "lng,lat" 格式
    let lng, lat;
    if (typeof location === 'string') {
      const [lngStr, latStr] = location.split(',');
      lng = parseFloat(lngStr);
      lat = parseFloat(latStr);
    } else {
      lng = location.lng;
      lat = location.lat;
    }

    if (isNaN(lng) || isNaN(lat)) return;

    setSelectedLocation({
      longitude: lng,
      latitude: lat
    });
    setSelectedAddress(poi.address || poi.name);
    setSearchKeyword(poi.name || '');
    updateMarker(lng, lat);
    setSearchResults([]);
  };

  // 确认选择
  const handleConfirm = () => {
    // 使用选中的详细地址作为位置名称
    const locationName = selectedAddress || '未知位置';

    console.log('确认选择:', {
      locationName,
      selectedAddress,
      longitude: selectedLocation.longitude,
      latitude: selectedLocation.latitude
    });

    onSelect(
      locationName,
      selectedAddress,
      selectedLocation.longitude,
      selectedLocation.latitude
    );
  };

  // 获取当前位置
  useEffect(() => {
    // 如果没有初始位置，尝试获取当前位置
    if (!initialLocation) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { longitude, latitude } = position.coords;
            setSelectedLocation({ longitude, latitude });
            // 如果地图已加载，更新地图中心点
            if (mapInstance.current) {
              mapInstance.current.setCenter([longitude, latitude]);
              updateMarker(longitude, latitude);
              reverseGeocode(longitude, latitude);
            }
          },
          (error) => {
            console.log('获取当前位置失败:', error);
            // 使用默认位置（北京）
          }
        );
      }
    }
  }, [initialLocation]);

  // 定位到当前位置
  const handleLocateCurrentPosition = () => {
    console.log('点击我的位置按钮');

    if (!navigator.geolocation) {
      setError('您的浏览器不支持地理定位');
      return;
    }

    // 清除之前的错误状态，每次点击都重新尝试
    setLoading(true);
    setError('');

    // 添加短暂延迟，确保状态更新后再调用
    setTimeout(() => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('获取位置成功:', position);
          const { longitude, latitude } = position.coords;
          setSelectedLocation({ longitude, latitude });
          if (mapInstance.current) {
            mapInstance.current.setCenter([longitude, latitude]);
            updateMarker(longitude, latitude);
            reverseGeocode(longitude, latitude);
          }
          setLoading(false);
        },
        (error) => {
          console.error('获取位置失败:', error.code, error.message);

          if (error.code === 1) {
            // 权限被拒绝 - 可能是用户刚刚在系统设置中开启，需要提示刷新
            setError('定位权限被拒绝。\n\n如果您刚在系统设置中开启定位权限，请刷新页面后再试。');
          } else if (error.code === 2) {
            setError('无法获取位置信息，请检查设备定位是否开启');
          } else if (error.code === 3) {
            setError('获取位置超时，请重试');
          } else {
            setError('获取当前位置失败');
          }
          setLoading(false);
        },
        { enableHighAccuracy: false, timeout: 15000, maximumAge: 0 }
      );
    }, 100);
  };

  // 键盘事件处理
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="map-picker-container">
      {/* 搜索栏 */}
      <div className="map-search-bar">
        <div className="search-input-wrapper">
          <input
            id="map-search-input"
            type="text"
            value={searchKeyword}
            onChange={handleSearchInputChange}
            onKeyPress={handleKeyPress}
            placeholder="搜索地点（如：天安门、国贸）..."
          />
          <button onClick={handleSearch} className="search-btn" disabled={loading}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="M21 21l-4.35-4.35"></path>
            </svg>
            <span>搜索</span>
          </button>
        </div>
        {searchResults.length > 0 && (
          <div className="search-results">
            {searchResults.map((poi, index) => (
              <div
                key={index}
                className="search-result-item"
                onClick={() => selectSearchResult(poi)}
              >
                <div className="result-name">{poi.name}</div>
                <div className="result-address">{poi.address || poi.district}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 地图容器 */}
      <div className="map-wrapper">
        {loading && (
          <div className="map-loading">
            <div className="loading-spinner"></div>
            <span>正在加载地图...</span>
          </div>
        )}
        {error && (
          <div className="map-error">
            <div className="error-icon">⚠️</div>
            <p>{error}</p>
            <div className="error-actions">
              {error.includes('定位权限') && (
                <>
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      // 清除错误状态，让用户可以重试
                      setError('');
                      // 直接重新尝试获取位置
                      handleLocateCurrentPosition();
                    }}
                  >
                    重试
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      // 根据不同浏览器给出不同的指引
                      const ua = navigator.userAgent.toLowerCase();
                      let message = '';
                      if (ua.includes('chrome')) {
                        message = 'Chrome浏览器设置位置权限的方法：\n\n1. 点击地址栏右侧的 🔒 或 ⚠️ 图标\n2. 找到"位置"或"位置信息"选项\n3. 选择"允许"\n\n或者：\n设置 > 隐私和安全 > 网站设置 > 位置';
                      } else if (ua.includes('safari')) {
                        message = 'Safari浏览器设置位置权限的方法：\n\n1. 点击屏幕顶部菜单栏的 Safari > 设置\n2. 选择"网站"标签\n3. 左侧选择"位置"\n4. 找到本网站并选择"允许"';
                      } else if (ua.includes('firefox')) {
                        message = 'Firefox浏览器设置位置权限的方法：\n\n1. 点击地址栏左侧的 🛡️ 图标\n2. 找到"权限" > "访问你的位置"\n3. 取消勾选"使用默认"，选择"允许"';
                      } else if (ua.includes('edge')) {
                        message = 'Edge浏览器设置位置权限的方法：\n\n1. 点击地址栏右侧的 🔒 图标\n2. 找到"位置"选项\n3. 选择"允许"\n\n或者：\n设置 > Cookie和网站权限 > 位置';
                      } else {
                        message = '设置位置权限的方法：\n\n1. 在浏览器地址栏附近查找 🔒、⚠️ 或 🛡️ 图标\n2. 点击后找到"位置"或"位置信息"选项\n3. 选择"允许"或"总是允许"\n\n或者在浏览器设置中搜索"位置"或"定位"进行设置。';
                      }
                      alert(message);
                    }}
                  >
                    设置权限
                  </button>
                </>
              )}
              <button
                className="btn btn-secondary"
                onClick={() => setError('')}
              >
                关闭
              </button>
            </div>
          </div>
        )}
        <div ref={mapRef} className="map-container"></div>
        {/* 我的位置按钮 */}
        <button
          className="my-location-btn"
          onClick={handleLocateCurrentPosition}
          title="定位到我的位置"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M12 2v4M12 18v4M2 12h4M18 12h4"></path>
          </svg>
          <span>我的位置</span>
        </button>
      </div>

      {/* 底部信息栏 */}
      <div className="map-footer">
        <div className="selected-info">
          <div className="info-row">
            <span className="info-label">选中位置：</span>
            <span className="info-value">{selectedAddress || '点击地图选择位置'}</span>
          </div>
          <div className="info-row">
            <span className="info-label">经纬度：</span>
            <span className="info-value coords">
              {selectedLocation.longitude.toFixed(6)}, {selectedLocation.latitude.toFixed(6)}
            </span>
          </div>
        </div>
        <div className="map-actions">
          <button className="btn btn-secondary" onClick={onCancel}>取消</button>
          <button
            className="btn btn-primary"
            onClick={handleConfirm}
            disabled={!AMapLoaded}
          >
            确认选择
          </button>
        </div>
      </div>
    </div>
  );
};

export default MapPicker;
