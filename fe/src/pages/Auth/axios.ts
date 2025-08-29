// lib/axios.ts
import axios from 'axios';
import { useAuthStore } from './authStore';
import toast from "react-hot-toast";

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
            toast.error("세션이 종료되었습니다. 로그인 화면으로 이동합니다.");
            const { resetAccessToken } = useAuthStore.getState()
            resetAccessToken()
            const currentFullPath =
                window.location.pathname + window.location.search + window.location.hash;

            // 로그인 화면에서 토스트를 띄우기 위한 reason 파라미터 전달
            const to = `/web/login?redirect=${encodeURIComponent(currentFullPath)}&reason=session-expired`;

            // 뒤로가기 시 무한 401 루프 방지: replace 사용 권장
            window.location.replace(to);

            return Promise.reject(error);
        } else if (error.response?.status === 500) {
            toast.error("서버오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
        } else {
            toast.error("알수없는 오류가 발생하였습니다. 잠시 후 다시 시도해 주세요.");
        }
        return Promise.reject(error)
    }
)

export default axiosInstance
