import React, { useEffect } from 'react';
import { HashRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { App as CapApp } from '@capacitor/app';
import { Home } from './pages/Home';
import { Detail } from './pages/Detail';
import { Settings } from './pages/Settings';

// 返回键处理组件
const BackButtonHandler: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // 只在原生平台处理返回键
    if (!Capacitor.isNativePlatform()) return;

    let listenerHandle: any = null;

    // 异步设置监听器
    const setupListener = async () => {
      listenerHandle = await CapApp.addListener('backButton', () => {
        // 如果在首页，退出应用
        if (location.pathname === '/' || location.pathname === '') {
          CapApp.exitApp();
        } else {
          // 否则返回上一页
          navigate(-1);
        }
      });
    };

    setupListener();

    return () => {
      if (listenerHandle) {
        listenerHandle.remove();
      }
    };
  }, [navigate, location]);

  return null;
};

const App: React.FC = () => {
  useEffect(() => {
    // 配置状态栏（仅在原生平台）
    if (Capacitor.isNativePlatform()) {
      // 设置状态栏样式
      StatusBar.setStyle({ style: Style.Light });
      // 设置状态栏背景色为纸张色
      StatusBar.setBackgroundColor({ color: '#F8F5E6' });
      // 显示状态栏
      StatusBar.show();
    }
  }, []);

  return (
    <div
      className="min-h-screen bg-[#F8F5E6]"
      style={{
        paddingTop: Capacitor.isNativePlatform() ? 'env(safe-area-inset-top)' : '0',
        paddingBottom: Capacitor.isNativePlatform() ? 'env(safe-area-inset-bottom)' : '0'
      }}
    >
      <Router>
        <BackButtonHandler />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/article/:id" element={<Detail />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Router>
    </div>
  );
};

export default App;