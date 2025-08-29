import React, { useState } from 'react';
import axiosInstance from "../Auth/axios.ts";
import toast from "react-hot-toast";

interface AddressBook {
    id: number;
    name: string;
    footerCompany?: string;
    footerAddress?: string;
    footerFromMail?: string;
    footerTel?: string;
}

interface Props {
    book: AddressBook;
    onClose: () => void;
    onSaved: () => void;
}

// 이메일 유효성 검사 함수
const isValidEmail = (email: string) =>
    /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email);

const AddressBookEditModal: React.FC<Props> = ({ book, onClose, onSaved }) => {
    const [name, setName] = useState(book.name || '');
    const [error, setError] = useState<string | null>(null);
    const [footerCompany, setFooterCompany] = useState(book.footerCompany || '');
    const [footerAddress, setFooterAddress] = useState(book.footerAddress || '');
    const [footerFromMail, setFooterFromMail] = useState(book.footerFromMail || '');
    const [footerTel, setFooterTel] = useState(book.footerTel || '');
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        if (!name.trim()) {
            setError('주소록 이름을 입력하세요.');
            setSaving(false);
            return;
        } else if (!footerCompany.trim() || !footerAddress.trim() || !footerTel.trim() || !footerFromMail.trim()) {
            setError('이메일 푸터 정보를 확인해주세요.');
            setSaving(false);
            return;
        } else if (!isValidEmail(footerFromMail)) {
            setError('유효하지 않은 이메일 형식입니다.');
            setSaving(false);
            return;
        }
        try {
            await axiosInstance.patch(`/mail-groups/${book.id}`, {
                name,
                footerCompany: footerCompany,
                footerFromMail: footerFromMail,
                footerAddress: footerAddress,
                footerTel: footerTel,
            });
            toast.success("주소록 수정에 성공하였습니다.");
            onSaved();
            onClose();
        } catch {
            toast.error("주소록 수정 실패하였습니다.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center z-50">
            <div className="bg-white p-8 rounded-lg w-[420px] shadow">
                <h2 className="text-xl font-bold mb-6">주소록 수정</h2>
                <label className="block text-base font-semibold mb-2">주소록 이름</label>
                <input
                    className="w-full px-3 py-2 border rounded mb-4"
                    value={name}
                    onChange={e => setName(e.target.value)}
                />
                <label className="block text-base font-semibold mb-2">회사명 또는 이름</label>
                <input
                    className="w-full px-3 py-2 border rounded mb-4"
                    value={footerCompany}
                    onChange={e => setFooterCompany(e.target.value)}
                />
                <label className="block text-base font-semibold mb-2">이메일 주소</label>
                <input
                    className="w-full px-3 py-2 border rounded mb-4"
                    value={footerFromMail}
                    onChange={e => setFooterFromMail(e.target.value)}
                />
                <label className="block text-base font-semibold mb-2">주소</label>
                <input
                    className="w-full px-3 py-2 border rounded mb-4"
                    value={footerAddress}
                    onChange={e => setFooterAddress(e.target.value)}
                />
                <label className="block text-base font-semibold mb-2">전화번호</label>
                <input
                    className="w-full px-3 py-2 border rounded mb-6"
                    value={footerTel}
                    onChange={e => setFooterTel(e.target.value)}
                />
                {error && <div className="text-red-500 mb-6">{error}</div>}
                <div className="flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-100 rounded">취소</button>
                    <button
                        onClick={handleSave}
                        className="px-4 py-2 bg-black text-white rounded"
                        disabled={saving}
                    >
                        저장
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddressBookEditModal;
