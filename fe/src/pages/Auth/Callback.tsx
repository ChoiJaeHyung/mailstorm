// src/pages/AuthCallback.tsx
import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from './authStore.ts'
import toast from "react-hot-toast";

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
