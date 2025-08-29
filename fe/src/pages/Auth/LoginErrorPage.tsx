import { useLocation, Link } from 'react-router-dom';

const LoginErrorPage = () => {
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const reason = queryParams.get('reason');

    return (
        <div className="flex justify-center items-center h-screen bg-red-50 w-screen">
            <div className="text-center p-8 w-full">
                <h2 className="text-2xl font-bold text-red-600 mb-4">로그인 실패</h2>
                <p className="text-gray-700 mb-6">{decodeURIComponent(reason ?? '알 수 없는 오류가 발생했습니다.')}</p>
                <Link
                    to="/login"
                    className="inline-block px-6 py-3 bg-red-500 text-white rounded hover:bg-red-600"
                >
                    로그인 페이지로 돌아가기
                </Link>
            </div>
        </div>
    );
};

export default LoginErrorPage;
