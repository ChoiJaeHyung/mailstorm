import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axiosInstance from "../Auth/axios.ts";

interface Recipient {
    id: number;
    email: string;
    name?: string;
    receive?: boolean;
    createdAt: string;
    updatedAt: string;
}

const RecipientList: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [recipients, setRecipients] = useState<Recipient[]>([]);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [search, setSearch] = useState('');
    const [statusMenuOpen, setStatusMenuOpen] = useState(false);
    const statusMenuRef = useRef<HTMLDivElement>(null);

    // 다운로드용 그룹명(없으면 그룹-{id})
    const [groupName, setGroupName] = useState<string>('');

    // ===== 공통 유틸 =====
    const sanitize = (s: string) =>
        (s || '').replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, ' ').trim();

    const formatDateForFile = (d = new Date()) => {
        const pad = (n: number) => n.toString().padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
    };

    const toCSV = (rows: Recipient[]) => {
        const header = ['이메일 주소', '상태', '이름', '구독일', '마지막 업데이트일'];
        const escape = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
        const lines = rows.map(r =>
            [
                escape(r.email),
                escape(r.receive === false ? '수신거부' : '구독 중'),
                escape(r.name ?? ''),
                escape(new Date(r.createdAt).toLocaleString()),
                escape(new Date(r.updatedAt).toLocaleString()),
            ].join(',')
        );
        return '\uFEFF' + [header.join(','), ...lines].join('\r\n'); // BOM for Excel
    };

    const handleDownloadCSV = () => {
        const csv = toCSV(filtered);
        const safeGroup = sanitize(groupName || `그룹-${id}`);
        const filename = `주소록_${safeGroup}_${formatDateForFile(new Date())}.csv`;

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    };

    // ===== 데이터 로딩 =====
    useEffect(() => {
        if (!id) return;
        axiosInstance.get(`/mail-recipients?group_id=${id}`)
            .then(res => res.data)
            .then(data => setRecipients(Array.isArray(data) ? data : []));
    }, [id]);

    // 그룹명 조회(가능하면)
    useEffect(() => {
        if (!id) return;
        axiosInstance.get(`/mail-groups/${id}`)
            .then(res => res.data)
            .then(data => setGroupName(data?.name ?? ''))
            .catch(() => setGroupName(''));
    }, [id]);

    // 팝업 바깥 클릭 시 닫기
    useEffect(() => {
        if (!statusMenuOpen) return;
        const handleClick = (e: MouseEvent) => {
            if (statusMenuRef.current && !statusMenuRef.current.contains(e.target as Node)) {
                setStatusMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [statusMenuOpen]);

    // 검색 필터링
    const filtered = recipients.filter(
        r =>
            r.email.toLowerCase().includes(search.toLowerCase()) ||
            (r.name || '').toLowerCase().includes(search.toLowerCase())
    );

    // 체크박스
    const handleCheck = (rid: number, checked: boolean) => {
        setSelectedIds(checked ? [...selectedIds, rid] : selectedIds.filter(id => id !== rid));
    };
    const handleCheckAll = (checked: boolean) => {
        setSelectedIds(checked ? filtered.map(r => r.id) : []);
    };

    // 상태변경/삭제
    const handleStatusChange = async (type: 'unsubscribe' | 'resubscribe' | 'delete') => {
        if (selectedIds.length === 0) return;
        if (type === 'delete' && !window.confirm('정말 삭제할까요?')) return;
        for (const rid of selectedIds) {
            if (type === 'unsubscribe') {
                await axiosInstance.patch(`/mail-recipients/${rid}`, { receive: false });
            } else if (type === 'resubscribe') {
                await axiosInstance.patch(`/mail-recipients/${rid}`, { receive: true });
            } else {
                await axiosInstance.delete(`/mail-recipients/${rid}`);
            }
        }
        setSelectedIds([]);
        if (!id) return;
        axiosInstance.get(`/mail-recipients?group_id=${id}`)
            .then(res => res.data)
            .then(data => setRecipients(Array.isArray(data) ? data : []));
    };

    return (
        <div className="max-w-5xl mx-auto px-6 py-8">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">구독자 목록</h2>
                <button className="px-3 py-2 rounded bg-gray-300" onClick={() => navigate(-1)}>돌아가기</button>
            </div>

            <div className="flex gap-4 justify-between items-center mb-4">
                <input
                    className="w-1/2 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-black"
                    placeholder="이메일/이름 검색"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />

                {/* 오른쪽: 상태 변경하기 + 다운로드(바로 옆) */}
                <div className="flex items-center gap-2">
                    <div className="relative" ref={statusMenuRef}>
                        <button
                            onClick={handleDownloadCSV}
                            className="px-4 py-2 mr-2 rounded bg-green-600 text-white text-sm hover:bg-green-700"
                            title="현재 필터 결과를 CSV로 다운로드"
                        >
                            다운로드
                        </button>
                        <button
                            className="px-4 py-2 bg-gray-50 border rounded text-sm"
                            onClick={() => setStatusMenuOpen(open => !open)}
                            disabled={selectedIds.length === 0}
                        >
                            상태 변경하기 ▼
                        </button>
                        {statusMenuOpen && (
                            <div className="absolute left-0 mt-2 w-40 bg-white border rounded shadow z-10">
                                <button
                                    className="block w-full px-4 py-2 text-left hover:bg-gray-100"
                                    onClick={() => { setStatusMenuOpen(false); handleStatusChange('unsubscribe'); }}
                                >
                                    수신거부
                                </button>
                                <button
                                    className="block w-full px-4 py-2 text-left hover:bg-gray-100"
                                    onClick={() => { setStatusMenuOpen(false); handleStatusChange('resubscribe'); }}
                                >
                                    수신거부 취소
                                </button>
                                <button
                                    className="block w-full px-4 py-2 text-left hover:bg-gray-100 text-red-500"
                                    onClick={() => { setStatusMenuOpen(false); handleStatusChange('delete'); }}
                                >
                                    완전삭제
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="bg-white rounded shadow overflow-x-auto">
                <table className="w-full">
                    <thead>
                    <tr className="bg-gray-50 text-sm">
                        <th className="p-2">
                            <input
                                type="checkbox"
                                checked={filtered.length > 0 && filtered.every(r => selectedIds.includes(r.id))}
                                onChange={e => handleCheckAll(e.target.checked)}
                            />
                        </th>
                        <th className="p-2 text-left">이메일 주소</th>
                        <th className="p-2 text-left">상태</th>
                        <th className="p-2 text-left">이름</th>
                        <th className="p-2 text-left">구독일</th>
                        <th className="p-2 text-left">마지막 업데이트일</th>
                    </tr>
                    </thead>
                    <tbody>
                    {filtered.map(r => (
                        <tr key={r.id} className="border-t">
                            <td className="p-2 text-center">
                                <input
                                    type="checkbox"
                                    checked={selectedIds.includes(r.id)}
                                    onChange={e => handleCheck(r.id, e.target.checked)}
                                />
                            </td>
                            <td className="p-2 text-sm">{r.email}</td>
                            <td className="p-2 text-sm">{r.receive === false ? '수신거부' : '구독 중'}</td>
                            <td className="p-2 text-sm">{r.name || '-'}</td>
                            <td className="p-2 text-sm">{new Date(r.createdAt).toLocaleString()}</td>
                            <td className="p-2 text-sm">{new Date(r.updatedAt).toLocaleString()}</td>
                        </tr>
                    ))}
                    {filtered.length === 0 && (
                        <tr>
                            <td className="p-4 text-gray-400 text-center" colSpan={7}>
                                등록된 구독자가 없습니다.
                            </td>
                        </tr>
                    )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default RecipientList;
