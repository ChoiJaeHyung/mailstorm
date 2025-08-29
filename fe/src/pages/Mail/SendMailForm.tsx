// SendMailForm.tsx
import React, { useState, useEffect, useRef } from 'react'
import { CheckCircleIcon } from '@heroicons/react/24/solid'
import AddressBookTab from '../SendMailTabs/AddressBookTab.tsx'
import ABTestTab from "../SendMailTabs/ABTestTab.tsx";
import SendInfoTab    from '../SendMailTabs/SendInfoTab.tsx'
import ContentTab     from '../SendMailTabs/ContentTab.tsx'
import PreviewModal from '../SendMailTabs/PreviewModal.tsx'
import axiosInstance from "../Auth/axios.ts";
import toast from "react-hot-toast";

const TABS = [
    { label: '주소록' },
    { label: 'A/B테스트'},
    { label: '발송정보' },
    { label: '콘텐츠' },
] as const

interface SendMailFormProps {
    campaignId?: number | null
}

const isValidEmail = (email: string) =>
    /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email)

const SendMailForm: React.FC<SendMailFormProps> = ({ campaignId }) => {
    const [currentTab, setCurrentTab] = useState(0)
    const [completed, setCompleted] = useState<boolean[]>(
        Array(TABS.length).fill(false)
    )
    const [sending, setSending] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [showPreview, setShowPreview] = useState(false)
    const [campaignTitle, setCampaignTitle] = useState('');
    const [editingTitle, setEditingTitle] = useState(false);
    const [buttonType, setButtonType] = useState<'S' | 'B'>('S');
    const inputRef = useRef<HTMLInputElement>(null);

    // ---------- 완료 판정 헬퍼들 ----------
    const computeAddressBookDone = (mc: any) =>
        Boolean(mc?.groupId)

    const computeABTabDone = (si: any) => {
        if (si?.abTest == null) return false
        if (!si?.abTest) return true
        const hasType = si?.abType !== undefined && si?.abType !== null
        const ratioOk = typeof si?.testRatio === 'number' && si?.testRatio > 0
        return hasType && ratioOk
    }

    const computeSendInfoDone = (si: any) => {
        const emailOk = isValidEmail(si?.senderEmail ?? '')
        const previewOk = Boolean(si?.previewText)
        if (!emailOk || !previewOk) return false

        // abType별 필수
        const subjectA = Boolean(si?.subject)
        const subjectB = Boolean(si?.subjectB)
        const nameA = Boolean(si?.senderName)
        const nameB = Boolean(si?.senderNameB)

        if (!si?.abTest) {
            // A/B 미사용: 제목/발신자 A만 확인
            return subjectA && nameA
        }

        switch (Number(si?.abType ?? 0)) {
            case 1: // 제목 테스트
                return subjectA && subjectB && nameA
            case 2: // 발신자 테스트
                return nameA && nameB && subjectA
            default:
                // 스케줄/콘텐츠 등은 A만 확인 (요구에 맞게 조정 가능)
                return subjectA && nameA
        }
    }

    type SendPayload = {
        executeAt?: string;   // ISO(+09:00) e.g. "2025-08-20T18:00:00+09:00"
        execute2At?: string;  // (AB 스케줄용) B 타임
    };

    const computeContentDone = (si: any, content: any) => {
        const htmlA = Boolean(content?.html)
        if (si?.abTest && Number(si?.abType) === 4) {
            const htmlB = Boolean(content?.htmlB)
            return htmlA && htmlB
        }
        return htmlA
    }
    // -------------------------------------

    // 제목 input 자동 포커스
    useEffect(() => {
        if (editingTitle && inputRef.current) inputRef.current.focus();
    }, [editingTitle]);

    // 🔁 리팩토링한 최초 로딩
    useEffect(() => {
        if (!campaignId) return;

        (async () => {
            try {
                // 병렬 로딩
                const [mc, si, ct] = await Promise.all([
                    axiosInstance.get(`/mail-campaigns/${campaignId}`).then(r => r.data),
                    axiosInstance.get(`/mail-sendinfo/by-campaign/${campaignId}`).then(r => r.data),
                    axiosInstance.get(`/mail-contents/by-campaign/${campaignId}`).then(r => r.data),
                ]);

                setCampaignTitle(mc?.name ?? '');

                // 탭별 완료 여부 계산
                const done0 = computeAddressBookDone(mc);
                const done1 = computeABTabDone(si);
                const done2 = computeSendInfoDone(si);
                const done3 = computeContentDone(si, ct);

                setCompleted([done0, done1, done2, done3]);
            } catch (e) {
                console.error(e);
                // 일부 실패해도 나머지 진행되도록 에러만 노출
                toast.error('초기 데이터 로딩 중 오류가 발생했습니다.');
            }
        })();
    }, [campaignId]);

    const handlePreview = async (type: string) => {
        if (!campaignId) return;
        try {
            setButtonType(type === 'B' ? 'B' : 'S');
            setShowPreview(true)
        } catch (err) {
            toast.error("미리보기 데이터를 불러오는데 실패했습니다.");
        }
    }

    // 캠페인명 저장 함수
    const saveTitle = async (newTitle: string) => {
        if (!campaignId || !newTitle.trim()) return;
        await axiosInstance.patch(`/mail-campaigns/${campaignId}`, {
            name: newTitle.trim()
        });
        setCampaignTitle(newTitle.trim());
    };

    const handleTitleBlur = async () => {
        setEditingTitle(false);
        await saveTitle(campaignTitle);
    };

    // 자식(Tab)으로부터 '완료(true)/미완료(false)' 업데이트
    const handleCompletion = (idx: number, isDone: boolean) => {
        setCompleted(prev => {
            if (prev[idx] === isDone) return prev
            const next = [...prev]
            next[idx] = isDone
            return next
        })
    }

    const handleSend = async (payload?: SendPayload) => {
        setError(null)
        setSending(true)
        try {
            const body: any = { campaignId };

            // 예약발송인지? 일반발송인지?
            body.type = buttonType;

            // 예약발송이면 넘어온 날짜 필드도 같이 보냄
            if (payload?.executeAt) body.executeAt = payload.executeAt;
            if (payload?.execute2At) body.execute2At = payload.execute2At;

            await axiosInstance.post(`/mail/send`, body)
            toast.success("발송요청이 완료되었습니다.");
            setShowPreview(false)
        } catch (err: any) {
            toast.error("발송 중 오류가 발생했습니다.");
        } finally {
            setSending(false)
            setTimeout(() => { window.location.replace('/'); }, 1000);
        }
    }

    const allCompleted = completed.every(Boolean)

    return (
        <div className="max-w-5xl mx-auto px-6 py-8">
            {/* 예약/발송 버튼 */}
            <div className="flex justify-between mb-6 gap-4">
                {editingTitle ? (
                    <input
                        ref={inputRef}
                        type="text"
                        className="text-xl font-bold focus:outline-none bg-transparent max-w-xs"
                        value={campaignTitle}
                        onChange={e => setCampaignTitle(e.target.value)}
                        onBlur={handleTitleBlur}
                        onKeyDown={e => { if (e.key === 'Enter') inputRef.current?.blur(); }}
                    />
                ) : (
                    <span
                        className="text-xl font-bold truncate max-w-xs cursor-pointer"
                        title="클릭해서 수정"
                        onClick={() => setEditingTitle(true)}
                    >
            {campaignTitle || '캠페인 제목 없음'}
          </span>
                )}

                <div className="flex gap-2 items-center">
                    <button
                        className="px-6 py-2 bg-gray-400 text-white font-semibold rounded-md shadow hover:bg-gray-700 disabled:opacity-50"
                        onClick={() => handlePreview("B")}
                        disabled={!allCompleted || sending || !campaignId}
                    >
                        {sending ? '예약발송 중...' : '예약발송'}
                    </button>
                    <button
                        className="px-6 py-2 bg-red-600 text-white font-semibold rounded-md shadow hover:bg-red-700 disabled:opacity-50"
                        onClick={() => handlePreview("S")}
                        disabled={!allCompleted || sending || !campaignId}
                    >
                        {sending ? '발송 중...' : '발송하기'}
                    </button>
                    {error && <span className="text-red-500 ml-4">{error}</span>}
                </div>
            </div>

            {/* 탭 헤더 */}
            <div className="flex mb-8">
                {TABS.map((tab, idx) => (
                    <button
                        key={tab.label}
                        className={`
              flex-1 flex items-center justify-center
              py-3 text-lg font-semibold border-b-2 transition
              ${
                            currentTab === idx
                                ? 'border-black text-black'
                                : 'border-transparent text-gray-400 hover:text-black'
                        }
            `}
                        onClick={() => setCurrentTab(idx)}
                    >
            <span className="mr-2">
              {completed[idx]
                  ? <CheckCircleIcon className="w-5 h-5 text-green-500" />
                  : <span className="inline-block w-5 h-5" />
              }
            </span>
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* 탭 콘텐츠 */}
            <div className="min-h-[400px]">
                {currentTab === 0 && (
                    <AddressBookTab
                        campaignId={campaignId ?? 0}
                        onCompletion={done => handleCompletion(0, done)}
                    />
                )}
                {currentTab === 1 && (
                    <ABTestTab
                        campaignId={campaignId ?? 0}
                        onCompletion={done => handleCompletion(1, done)}
                    />
                )}
                {currentTab === 2 && (
                    <SendInfoTab
                        campaignId={campaignId ?? 0}
                        onCompletion={done => handleCompletion(2, done)}
                    />
                )}
                {currentTab === 3 && (
                    <ContentTab
                        campaignId={campaignId?? 0}
                        onCompletion={done => handleCompletion(3, done)}
                    />
                )}
            </div>

            {/* 미리보기 모달 */}
            {showPreview && (
                <PreviewModal
                    campaignId={Number(campaignId)}
                    type={buttonType as 'S' | 'B'}
                    onClose={() => setShowPreview(false)}
                    onSend={handleSend}
                    sending={sending}
                />
            )}
        </div>
    )
}

export default SendMailForm
