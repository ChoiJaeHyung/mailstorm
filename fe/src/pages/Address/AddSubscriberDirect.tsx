// src/pages/AddSubscriberDirect.tsx
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axiosInstance from "../Auth/axios.ts";
import toast from "react-hot-toast";

const initialRow = {
    email: '',
    name: '',
    receive: true,
};

const isValidEmail = (email: string) =>
    /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email);

const AddSubscriberDirect: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [rows, setRows] = useState([{ ...initialRow }]);
    const [loading, setLoading] = useState(false);
    const [emailErrors, setEmailErrors] = useState<(string | null)[]>(rows.map(() => null));

    const handleChange = (idx: number, e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const next = rows.map((row, i) =>
            i === idx ? { ...row, [e.target.name]: e.target.value } : row
        );
        setRows(next);

        // 이메일 필드 변경 시, 유효성 검사 및 에러 저장
        if (e.target.name === 'email') {
            setEmailErrors(prev =>
                prev.map((err, i) => {
                    if (i !== idx) return err;
                    const val = e.target.value;
                    if (val === '') return null;
                    if (!isValidEmail(val)) return '유효하지 않은 이메일 형식입니다.';
                    return null;
                })
            );
        }
    };

    // 행 추가
    const handleAddRow = () => {
        setRows([...rows, { ...initialRow }]);
        setEmailErrors([...emailErrors, null]);
    };

    // 행 삭제
    const handleRemoveRow = (idx: number) => {
        if (rows.length === 1) return; // 마지막 행은 삭제 금지
        setRows(rows.filter((_, i) => i !== idx));
        setEmailErrors(emailErrors.filter((_, i) => i !== idx));
    };

    // 등록 처리
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        // 필수값 검증
        // 이메일 필드 전체 검사 (미입력/유효성 체크)
        for (let i = 0; i < rows.length; i++) {
            if (!rows[i].email) {
                setEmailErrors(errors => {
                    const updated = [...errors];
                    updated[i] = '이메일 주소는 필수입니다.';
                    return updated;
                });
                setLoading(false);
                return;
            }
            if (!isValidEmail(rows[i].email)) {
                setEmailErrors(errors => {
                    const updated = [...errors];
                    updated[i] = '유효하지 않은 이메일 형식입니다.';
                    return updated;
                });
                setLoading(false);
                return;
            }
        }

        try {
            await axiosInstance.post(`/mail-recipients`, {
                groupId: id, // 주소록 id (필요 없다면 제외)
                recipients: rows, // 여러 건 배열로 전송
            });
            toast.success('구독자 추가 성공!');
            navigate(-1);
        } catch (err) {
            toast.error('구독자 추가 실패');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto mt-10 p-8 bg-white rounded shadow">
            <h2 className="text-2xl font-bold mb-8">직접 추가하기</h2>
            <form onSubmit={handleSubmit}>
                <div className="mb-4">
                    {rows.map((row, idx) => (
                        <div key={idx} className="flex gap-4 mb-2 items-end">
                            <div className="flex-2 flex flex-col">
                                <label className="block">이메일 주소</label>
                                <input
                                    name="email"
                                    value={row.email}
                                    onChange={(e) => handleChange(idx, e)}
                                    className={`w-full px-3 py-1.5 border rounded ${emailErrors[idx] ? 'border-red-500' : ''}`}
                                    required
                                />
                                <div className="text-red-500 text-xs mt-2">
                                    {emailErrors[idx] ? emailErrors[idx] : '\u00A0'}
                                </div>
                            </div>
                            <div className="flex-1">
                                <label className="block">이름</label>
                                <input
                                    name="name"
                                    value={row.name}
                                    onChange={(e) => handleChange(idx, e)}
                                    className="w-full px-3 py-1.5 border rounded"
                                />
                                <div className="email-error">
                                    {emailErrors[idx] ? '\u00A0' : '\u00A0'}
                                </div>
                            </div>
                            <div className="flex-1">
                                <label className="block">수신 동의</label>
                                <select
                                    name="receive"
                                    value={String(row.receive)}
                                    onChange={(e) => handleChange(idx, e)}
                                    className="w-full px-4 py-2 border rounded"
                                >
                                    <option value="true">동의</option>
                                    <option value="false">동의하지 않음</option>
                                </select>
                                <div className="">
                                    {emailErrors[idx] ? '\u00A0' : '\u00A0'}
                                </div>
                            </div>
                            <div className="flex-1">
                                <button
                                    type="button"
                                    className="px-2 py-1 text-xs text-red-500 border rounded"
                                    onClick={() => handleRemoveRow(idx)}
                                >
                                    삭제
                                </button>
                                <div className="email-error">
                                    {emailErrors[idx] ? '\u00A0' : '\u00A0'}
                                </div>
                            </div>
                        </div>
                    ))}

                    <button
                        type="button"
                        className="mt-2 px-3 py-1 border rounded text-blue-600"
                        onClick={handleAddRow}
                    >
                        + 추가
                    </button>
                </div>
                <div className="flex gap-2 mt-8">
                    <button type="button" className="px-4 py-2 bg-gray-100 rounded" onClick={() => navigate(-1)}>
                        취소
                    </button>
                    <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded" disabled={loading}>
                        {loading ? '추가 중...' : '추가하기'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AddSubscriberDirect;
