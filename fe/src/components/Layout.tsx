import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import logo from '../assets/rsupport-logo.png';
import { useAuthStore } from '../pages/Auth/authStore'; // 경로에 따라 조정
import { LogOut } from 'lucide-react';


interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { label: '메일발송', path: '/send' },
    { label: '주소록 관리', path: '/address-books' },
    // { label: '템플릿 관리', path: '/templates' },
    // { label: '통계현황', path: '/statistics' },
  ];

  const isActive = (path: string) => location.pathname === path;

  const user = useAuthStore((state) => state.user);
  const resetAccessToken = useAuthStore((state) => state.resetAccessToken);

  const handleLogout = () => {
    resetAccessToken();
    navigate('/login', { replace: true });
  };

  return (
      <div className="flex flex-col h-screen w-screen bg-gray-100">
        {/* Top Navigation Bar */}
        <div className="h-16 bg-white shadow-lg flex items-center justify-between px-6">
          {/* Logo & Menu */}
          <div className="flex items-center">
            <div className="w-32 h-10 rounded-lg cursor-pointer" onClick={() => navigate('/')}>
              <img src={logo} alt="Logo" />
            </div>

            {/* Horizontal Navigation Menu */}
            <nav className="ml-8">
              <ul className="flex space-x-6">
                {menuItems.map(({ label, path }) => (
                    <li key={path}>
                      <button
                          onClick={() => navigate(path)}
                          className={`flex items-center p-3 rounded-lg transition ${
                              isActive(path) ? 'text-black' : 'hover:bg-blue-50'
                          }`}
                          style={{ color: isActive(path) ? '#000000' : '#9D9EA2' }}
                      >
                        {label}
                      </button>
                    </li>
                ))}
              </ul>
            </nav>
          </div>

          {/* User Info & Logout */}
          <div className="flex items-center space-x-4">
          <span className="text-gray-800 text-xs">
            {user?.name || '사용자'}님 반갑습니다!
          </span>
            <button onClick={handleLogout}>
              <LogOut className="w-5 h-5 text-gray-500 hover:text-black" />
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 bg-gray-0 overflow-auto">
          <main className="px-8 py-6">
            {children}
          </main>
        </div>
      </div>
  );
};

export default Layout;
