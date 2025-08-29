# 프론트엔드 개발 가이드

## 목차
- [프로젝트 폴더 구조]
- [공통설정 예시]
- [환경변수]


## 프로젝트 폴더 구조

    src
    ├── assets                                      # 이미지/로고 
    ├── components                                  # 전체 레이아웃 화면
    ├── pages
    │   ├── Address                                 # 주소록 화면
    │   ├── Auth                                    # 인증/로그인/API 정의
    │   ├── Mail                                    # 메일 대시보드 및 상단 공통화면
    │   ├── SendMailTabs                            # 메일발송 탭 화면 
    │   ├── Status                                  # 통계화면


## 공통설정 예시

### API 레이어
- Axios 인스턴스: Authorization: Bearer <token> 자동 첨부, 401 → store 초기화 + 라우터 리다이렉트
- 각 feature의 axios.ts에서 명시적 함수로 캡슐화 (직접 axios 호출 금지).
```axios.ts
    import axios from 'axios';
    import { useAuthStore } from './authStore';
    
    const axiosInstance = axios.create({
        baseURL: import.meta.env.VITE_BASE_URL ?? 'http://localhost:3030', // .env로 분리 가능
        headers: { 'Content-Type': 'application/json' },
        withCredentials: true,
    })
    
    // 요청 시 토큰 자동 첨부
    axiosInstance.interceptors.request.use((config) => {
        const { accessToken } = useAuthStore.getState()
        if (accessToken) {
            config.headers.Authorization = `Bearer ${accessToken}`
        }
        return config
    })
    
    // 401 에러 시 자동 로그아웃 + 리디렉션
    axiosInstance.interceptors.response.use(
        (response) => response,
        (error) => {
            if (error.response?.status === 401) {
                const { resetAccessToken } = useAuthStore.getState()
                resetAccessToken()
    
                const currentPath = window.location.pathname
                window.location.href = `/web/login?redirect=${encodeURIComponent(currentPath)}`
            } else if (error.response?.status === 500) {
                toast.error("서버오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
            } else {
                toast.error("알수없는 오류가 발생하였습니다. 잠시 후 다시 시도해 주세요.");
            }
            return Promise.reject(error)
        }
    )
    
    export default axiosInstance

```
### 인증 Callback
- **외부 인증 서비스**에서 인증 완료 후 이 페이지로 리다이렉트
- **URL 파라미터**에서 토큰과 사용자 정보 추출
- **전역 상태 업데이트** (토큰, 사용자 정보)
- **메인 페이지로 이동** 또는 **로그인 페이지로 이동** (실패 시)

```Callback.tsx
    // src/pages/AuthCallback.tsx
    import { useEffect } from 'react'
    import { useNavigate, useLocation } from 'react-router-dom'
    import { useAuthStore } from './authStore.ts'
    
    const AuthCallback = () => {
        const navigate = useNavigate();
        const location = useLocation();
        const setToken = useAuthStore((state) => state.setAccessToken);
        const setUser = useAuthStore((state) => state.setUser);
    
        useEffect(() => {
            const searchParams = new URLSearchParams(location.search);
            const token = searchParams.get('token');
            const userParam = searchParams.get('user');
    
            if (token && userParam) {
                try {
                    const user = JSON.parse(decodeURIComponent(userParam));
                    setToken(token);
                    setUser(user);
                    navigate('/', { replace: true });
                } catch (e) {
                    console.error('user 파싱 실패:', e);
                    toast.error('사용자 정보 처리 중 오류가 발생했습니다.');
                    navigate('/login');
                }
            } else {
                toast.error('로그인 실패: 유효하지 않은 응답');
                navigate('/login');
            }
        }, [location.search]);
    
        return null;
    };
    
    export default AuthCallback;

```

### 전역 상태 저장소
1. **토큰 설정** (): `setAccessToken`
    - 액세스 토큰을 상태와 로컬 스토리지에 저장

2. **사용자 정보 설정** (): `setUser`
    - 사용자 정보를 JSON으로 직렬화하여 로컬 스토리지에 저장

3. **인증 상태 초기화** (): `resetAccessToken`
    - 로그아웃 시 토큰과 사용자 정보를 모두 삭제

```authStore.ts
    // src/store/authStore.ts
    import { create } from 'zustand'
    
    interface User {
        id: number
        email: string
        name: string
        // 필요한 필드 추가
    }
    
    interface AuthState {
        accessToken: string | null
        user: User | null
        setAccessToken: (token: string) => void
        setUser: (user: User) => void
        resetAccessToken: () => void
    }
    
    const savedToken = localStorage.getItem('accessToken')
    const savedUser = localStorage.getItem('user')
    
    export const useAuthStore = create<AuthState>((set) => ({
        accessToken: savedToken || null,
        user: savedUser ? JSON.parse(savedUser) : null,
    
        setAccessToken: (token) => {
            localStorage.setItem('accessToken', token)
            set({ accessToken: token })
        },
    
        setUser: (user) => {
            localStorage.setItem('user', JSON.stringify(user))
            set({ user })
        },
    
        resetAccessToken: () => {
            localStorage.removeItem('accessToken')
            localStorage.removeItem('user')
            set({ accessToken: null, user: null })
        },
    }))

```

### 라우트가드
- 인증이 필요한 페이지에 대한 접근을 제어함
- 엑세스토큰이 없고 인증페이지가 아닌경우 /login 으로 리다이렉션
- 인증된 사용자이거나 인증페이지인경우 자식컴포넌트를 그대로 렌더링

```RequireAuth.tsx
    // src/Auth/RequireAuth.tsx
    import React from 'react';
    import { Navigate, useLocation } from 'react-router-dom';
    import { useAuthStore } from './authStore.ts';
    
    const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
        const accessToken = useAuthStore((state) => state.accessToken);
        const location = useLocation();
    
        const isAuthPath = [
            '/login',
            '/auth',
        ].some((prefix) => location.pathname.startsWith(prefix));
    
        if (!accessToken && !isAuthPath) {
            return <Navigate to="/login" replace />;
        }
    
        return <>{children}</>;
    };
    
    export default RequireAuth;

```

## 환경변수
- 루트 디렉토리 하위 .env 파일
- 변수명 앞을 반드시 VITE_ 로 시작해야 프로젝트에서 인식함



