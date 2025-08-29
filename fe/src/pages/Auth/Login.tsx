// src/pages/LoginPage.tsx
import React, { useEffect } from 'react';
import { useSearchParams } from "react-router-dom";
import logo from '../../assets/undraw_stars_5pgw.svg';
import axiosInstance from "./axios.ts";
import toast from "react-hot-toast";

const LoginPage: React.FC = () => {
    const [searchParams] = useSearchParams();

    useEffect(() => {
        const reason = searchParams.get("reason");
        if (reason === "session-expired") {
            toast.error("세션이 종료되었습니다. 다시 로그인해 주세요.");
        }
    }, [searchParams]);

    const handleGoogleLogin = async () => {
        try {
            const res = await axiosInstance.get(`/auth/google`);
            const { url } = await res.data;
            window.location.href = url;
        } catch (err) {
            toast.error('로그인에 실패했습니다. 잠시 후 다시 시도해주세요.');
        }
    };

    return (
        <div className="flex justify-center items-center h-screen bg-gray-100 w-screen px-4">
            <div className="rounded p-8 max-w-md w-full text-center">
                <img
                    src={logo} // 또는 외부 링크 사용 가능
                    alt="메일 이미지"
                    className="w-96 mx-auto mb-24"
                />
                <h3 className="text-xl font-bold mb-4">대량메일발송 시스템에 오신 것을 환영합니다</h3>
                <p className="text-gray-600 mb-2">
                    본 시스템은 <strong className="text-black">알서포트 계정</strong>으로만 로그인할 수 있습니다
                </p>
                <p className="text-sm text-gray-500 mb-6">
                    문의사항은 기술지원 3팀 <strong className="text-black">허재현</strong>에게 연락해 주세요
                </p>
                <button
                    onClick={handleGoogleLogin}
                    className="bg-red-500 text-white py-3 rounded hover:bg-red-600 transition font-semibold"
                >
                    Google 계정으로 로그인
                </button>
            </div>
        </div>
    );
};

export default LoginPage;
