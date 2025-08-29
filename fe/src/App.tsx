import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import SendMailDashboard from './pages/Mail/SendMailDashboard.tsx';
import AddressBook from './pages/Address/AddressBookDashboard.tsx';
import AddressBookCreate from './pages/Address/AddressBookCreate.tsx';
import AddSubscriberDirect from './pages/Address/AddSubscriberDirect';
import RecipientList from './pages/Address/RecipientList';
import CampaignStats from "./pages/Status/CampaignStats.tsx";
import LoginPage from "./pages/Auth/Login";
import AuthCallback from "./pages/Auth/Callback";
import RequireAuth from "./pages/Auth/RequireAuth";
import LoginErrorPage from "./pages/Auth/LoginErrorPage";

function AppRoutes() {
  const location = useLocation();
  const isAuthPage = location.pathname.startsWith('/login') || location.pathname.startsWith('/auth');

  return (
      <Routes>
        {/* 로그인/콜백은 Layout 없이 렌더링 */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/callback/client" element={<AuthCallback />} />
        <Route path="/error" element={<LoginErrorPage />} />
        {/* 인증 필요한 라우트들만 감싸기 */}
        {!isAuthPage && (
            <Route
                path="*"
                element={
                  <RequireAuth>
                    <Layout>
                      <Routes>
                        <Route path="/" element={<SendMailDashboard />} />
                        <Route path="/send" element={<SendMailDashboard />} />
                        <Route path="/send/:id/stats" element={<CampaignStats />} />
                        <Route path="/address-books" element={<AddressBook />} />
                        <Route path="/address-books/new" element={<AddressBookCreate />} />
                        <Route path="/address-books/:id/add-direct" element={<AddSubscriberDirect />} />
                        <Route path="/address-books/:id/recipients" element={<RecipientList />} />
                      </Routes>
                    </Layout>
                  </RequireAuth>
                }
            />
        )}
      </Routes>
  );
}

function App() {
  return (
      <Router basename="/web">
        <AppRoutes />
      </Router>
  );
}

export default App;
