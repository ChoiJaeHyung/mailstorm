import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axiosInstance from "../Auth/axios.ts";
import { QuestionMarkCircleIcon } from '@heroicons/react/24/outline';
import toast from "react-hot-toast";

interface CampaignStatsData {
    id: number;
    groupName: string;
    senderName: string;
    senderEmail: string;
    subject: string;
    url: string;
    sendDate: string;
    completeDate: string;
    successCount: number;
    openCount: number;
    clickCount: number;
    rejectCount: number;
    totalCount: number;
    contentHtml: string;
}

const CampaignStats: React.FC = () => {
    const { id } = useParams();
    const [stats, setStats] = useState<CampaignStatsData | null>(null);
    const [loading, setLoading] = useState(true);

    // 모달 상태
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        if (!id) return;
        setLoading(true);

        axiosInstance(`/mail-campaigns/status/${id}`)
            .then((res) => res.data)
            .then((data) => {
                if (data.error) {
                    toast.error('데이터를 불러올 수 없습니다.');
                    setStats(null);
                } else {
                    setStats({
                        id: Number(id),
                        groupName: data.groupName,
                        senderName: data.senderName,
                        senderEmail: data.senderEmail,
                        subject: data.campaignName,
                        url: data.url || '',
                        sendDate: data.sendDate ? new Date(data.sendDate).toLocaleString() : '',
                        completeDate: data.endDate ? new Date(data.endDate).toLocaleString() : '',
                        successCount: data.successCount ?? 0,
                        openCount: data.openCount ?? 0,
                        clickCount: data.clickCount ?? 0,
                        rejectCount: data.rejectCount ?? 0,
                        totalCount: data.totalCount ?? 0,
                        contentHtml: data.contentHtml ?? '',
                    });
                }
            })
            .catch(() => {
                toast.error('데이터 조회 오류!');
                setStats(null);
            })
            .finally(() => setLoading(false));
    }, [id]);

    if (loading) return <div>로딩중...</div>;
    if (!stats) return <div>데이터 없음</div>;

    // 퍼센트 계산
    const percent = (value: number) => {
        if (!stats.totalCount) return '0%';
        return ((value / stats.totalCount) * 100).toFixed(1) + '%';
    };

    // --- 툴팁 & KPI 카드 ---
    const InfoTooltip: React.FC<{ text: string; position?: 'top' | 'bottom' }> = ({
                                                                                      text,
                                                                                      position = 'top',
                                                                                   }) => (
        <span
            tabIndex={0}                 // 키보드 포커스 가능 (버튼 아님)
            aria-label="정보"
            className="relative inline-flex items-center outline-none group"
        >
        <QuestionMarkCircleIcon className="w-4 h-4 text-gray-400 group-hover:text-gray-600" strokeWidth={2} />

        <span
            role="tooltip"
            className={`pointer-events-none absolute ${
                position === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'
            } left-1/2 -translate-x-1/2 z-20 hidden whitespace-nowrap
                     rounded-md bg-gray-900 px-2 py-1 text-xs text-white shadow
                     group-hover:block group-focus-visible:block`}
        >
          {text}
        </span>
      </span>
    );

    const KPI: React.FC<{
        label: string;
        help: string;
        percentText: string;
        count: number;
        percentClass?: string;
    }> = ({ label, help, percentText, count, percentClass = 'text-gray-600' }) => (
        <div className="bg-white rounded-lg shadow p-6 flex flex-col items-start">
            <div className="text-xs text-gray-500 mb-1 flex items-center">
                <span className="text-gray-600 mr-1">{label}</span>
                <InfoTooltip text={help} />
                <span className="ml-1 text-gray-400"> {count}</span>
            </div>
            <div className={`text-4xl font-bold ${percentClass}`}>{percentText}</div>
        </div>
    );

    // --- 모달 ---
    const Modal = ({ open, onClose, html }: { open: boolean; onClose: () => void; html: string }) => {
        if (!open) return null;
        return (
            <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center backdrop-blur-sm">
                <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 relative">
                    <button
                        className="absolute top-2 right-2 text-xl font-bold text-gray-400 hover:text-gray-700"
                        onClick={onClose}
                        aria-label="닫기"
                    >
                        X
                    </button>
                    <h3 className="text-xl font-bold mb-4">발송된 메일 본문</h3>
                    <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: html }} />
                </div>
            </div>
        );
    };

    return (
        <div className="max-w-5xl mx-auto px-8 py-8">
            <h2 className="text-2xl font-bold mb-14 ml-1">{stats.subject}</h2>

            {/* 이메일 정보 */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
                <div className="flex p-1 flex-wrap gap-12 mb-8">
                    <div className="flex-1 flex-row gap-4">
                        <div className="text-xs text-gray-500 mb-1">주소록</div>
                        <div className="font-semibold">{stats.groupName}</div>
                    </div>
                    <div className="flex-1 flex-row gap-4">
                        <div className="text-xs text-gray-500 mb-1">발신자 이름</div>
                        <div className="font-semibold">{stats.senderName}</div>
                    </div>
                </div>

                <div className="flex p-1 flex-wrap gap-12 mb-6">
                    <div className="flex-1 flex-row gap-4">
                        <div className="text-xs text-gray-500 mb-1">이메일 제목</div>
                        <div>{stats.subject}</div>
                    </div>
                    <div className="flex-1 flex-row gap-4">
                        <div className="text-xs text-gray-500 mb-1">발신자 이메일 주소</div>
                        <div className="font-semibold">{stats.senderEmail}</div>
                    </div>
                </div>

                <div className="flex p-1 flex-wrap gap-12 mb-6">
                    <div className="flex-1 flex-row gap-4">
                        <div className="text-xs text-gray-500 mb-1">발송시작일</div>
                        <div>{stats.sendDate}</div>
                    </div>
                    <div className="flex-1 flex-row gap-4">
                        <div className="text-xs text-gray-500 mb-1">발송완료일</div>
                        <div>{stats.completeDate}</div>
                    </div>
                </div>

                <div className="flex justify-between p-1 flex-wrap gap-12">
                    <div className="flex-1 flex-row gap-4">
                        <div className="text-xs text-gray-500 mb-1">이메일 본문</div>
                        <div className="">
                            <div className="text-xs text-blue-600 cursor-pointer" onClick={() => setShowModal(true)}>
                                본문확인
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 성과 */}
            <div className="mb-6">
                <div className="font-semibold mb-2">성과</div>
                <div className="grid grid-cols-4 gap-4">
                    <KPI
                        label="발송 성공"
                        help="이메일 발송을 성공한 구독자 수 입니다"
                        percentText={percent(stats.successCount)}
                        count={stats.successCount}
                        percentClass="text-gray-400"
                    />
                    <KPI
                        label="오픈"
                        help="이메일을 오픈한 구독자 수 입니다"
                        percentText={percent(stats.openCount)}
                        count={stats.openCount}
                        percentClass="text-yellow-400"
                    />
                    <KPI
                        label="클릭"
                        help="이메일 콘텐츠에 포함한 링크를 클릭한 구독자 수 입니다"
                        percentText={percent(stats.clickCount)}
                        count={stats.clickCount}
                        percentClass="text-blue-400"
                    />
                    <KPI
                        label="수신거부"
                        help="이메일 콘텐츠에 포함된 수신거부 링크를 클릭한 구독자 수 입니다"
                        percentText={percent(stats.rejectCount)}
                        count={stats.rejectCount}
                        percentClass="text-gray-400"
                    />
                </div>
            </div>

            {/* 모달 렌더링 */}
            <Modal open={showModal} onClose={() => setShowModal(false)} html={stats.contentHtml} />
        </div>
    );
};

export default CampaignStats;
