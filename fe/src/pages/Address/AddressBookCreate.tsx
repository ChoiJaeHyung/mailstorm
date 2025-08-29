import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../Auth/authStore';
import axiosInstance from "../Auth/axios.ts";

// 이메일 유효성 검사 함수
const isValidEmail = (email: string) =>
    /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email);

const AddressBookCreate: React.FC = () => {
    const [name, setName] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [footerCompany, setFooterCompany] = useState('');
    const [footerEmail, setFooterEmail] = useState('');
    const [footerAddress, setFooterAddress] = useState('');
    const [footerTel, setFooterTel] = useState('');
    const navigate = useNavigate();

    const { user } = useAuthStore(); // 현재 로그인된 유저 정보 접근

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            setError('주소록 이름을 입력하세요.');
            return;
        } else if (!footerCompany.trim() || !footerAddress.trim() || !footerTel.trim() || !footerEmail.trim()) {
            setError('이메일 푸터 정보를 확인해주세요.');
            return;
        } else if (!isValidEmail(footerEmail)) {
            setError('유효하지 않은 이메일 형식입니다.');
            return;
        }
        setSaving(true);
        setError(null);
        try {
            await axiosInstance.post(`/mail-groups`, {
                name,
                userId: user?.id,
                footerCompany: footerCompany,
                footerFromMail: footerEmail,
                footerAddress: footerAddress,
                footerTel: footerTel,
            });

            navigate('/address-books');
        } catch (err) {
            setError('주소록 생성에 실패했습니다.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto px-6 py-12">
            <h2 className="text-2xl font-bold mb-2">새로운 주소록을 만듭니다</h2>
            <p className="text-gray-500 text-sm mt-2 mb-6">
                주소록은 구독자의 이메일 주소와 그 외 정보가 저장되는 곳입니다.<br />
                몇 가지 정보를 입력하여 주소록을 만들면 구독자를 추가할 수 있습니다.
            </p>
            <form onSubmit={handleSubmit}>
                <div className="mb-10">
                    <label className="block text-xl font-bold mb-2">주소록 이름</label>
                    <input
                        className="w-full px-4 py-3 border border-gray-300 rounded-md text-xs"
                        type="text"
                        value={name}
                        placeholder="예) VIP고객 주소록"
                        onChange={(e) => setName(e.target.value)}
                        disabled={saving}
                    />
                </div>
                {/* --- 푸터 정보 추가 영역 --- */}
                <div className="mb-10">
                    <h3 className="text-xl font-bold mb-2">이메일 푸터 정보</h3>
                    <p className="text-gray-500 text-sm mb-6">
                        영리 목적의 광고성 정보를 전송하려면 정보통신망법에 따라 회사명 또는 이름, 주소, 전화번호를 이메일 본문에 표시해야 합니다.<br />
                        이메일 콘텐츠를 편집할 때 푸터 상자를 추가하면 아래 정보를 이메일 본문에 추가할 수 있습니다.
                    </p>
                    <div className="mb-6">
                        <label className="block text-base font-semibold mb-2">회사명 또는 이름</label>
                        <input
                            className="w-full px-4 py-3 border border-gray-300 rounded-md text-xs"
                            type="text"
                            value={footerCompany}
                            placeholder=""
                            onChange={(e) => setFooterCompany(e.target.value)}
                        />
                    </div>
                    <div className="mb-6">
                        <label className="block text-base font-semibold mb-2">이메일 주소</label>
                        <input
                            className="w-full px-4 py-3 border border-gray-300 rounded-md text-xs"
                            type="text"
                            value={footerEmail}
                            placeholder=""
                            onChange={(e) => setFooterEmail(e.target.value)}
                        />
                    </div>
                    <div className="mb-6">
                        <label className="block text-base font-semibold mb-2">주소</label>
                        <input
                            className="w-full px-4 py-3 border border-gray-300 rounded-md text-xs"
                            type="text"
                            value={footerAddress}
                            placeholder=""
                            onChange={(e) => setFooterAddress(e.target.value)}
                        />
                    </div>
                    <div className="mb-6">
                        <label className="block text-base font-semibold mb-2">전화번호</label>
                        <input
                            className="w-full px-4 py-3 border border-gray-300 rounded-md text-xs"
                            type="text"
                            value={footerTel}
                            placeholder=""
                            onChange={(e) => setFooterTel(e.target.value)}
                        />
                    </div>
                </div>
                {error && <div className="text-red-500 mb-6">{error}</div>}
                <div className="flex justify-end">
                    <button
                        type="submit"
                        className="px-6 py-3 text-lg bg-black text-white rounded hover:bg-gray-800 transition"
                        disabled={saving}
                    >
                        만들기
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AddressBookCreate;
