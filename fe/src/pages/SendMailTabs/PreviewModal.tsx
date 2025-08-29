import React, { useEffect, useState } from 'react';
import axiosInstance from '../Auth/axios';
import toast from 'react-hot-toast';
import { CheckCircleIcon, ShieldCheckIcon, ExclamationCircleIcon } from '@heroicons/react/24/solid';

interface PreviewData {
    recipientCount: number;
    subject: string;
    subjectB?: string;
    senderName: string;
    senderNameB?: string;
    senderEmail?: string;
    previewText: string;
    abType: number;            // 0: 없음, 1: 제목, 2: 발신자, 3: 스케줄, 4: 콘텐츠
    abTest: boolean;
    scheduleMessage?: string;
    testRatioText?: string;
    sendRatioText?: string;
    groupName: string;
    html: string;              // 콘텐츠 A
    htmlB: string;             // 콘텐츠 B (없으면 빈 문자열)
}

interface SendPayload {
    executeAt?: string;
    execute2At?: string;
    isReserved?: boolean;
}

interface PreviewModalProps {
    campaignId: number;
    type: 'S' | 'B';           // S: 즉시발송, B: 예약발송
    onClose: () => void;
    onSend: (payload?: SendPayload) => void;
    sending: boolean;
}

/** 좌:라벨 / 우:내용 한 줄 */
const Row: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode; last?: boolean }> = ({
                                                                                                                icon, title, children, last
                                                                                                            }) => (
    <div className={`grid grid-cols-[220px_1fr] gap-12 py-5 ${last ? '' : 'border-b border-gray-300'}`}>
        <div className="flex items-start gap-2">
            <span className="mt-0.5">{icon}</span>
            <span className="font-semibold text-gray-800">{title}</span>
        </div>
        <div className="text-gray-800">{children}</div>
    </div>
);

/** HTML 전용 모달 (iframe srcDoc으로 격리 렌더링) */
const HtmlModal: React.FC<{ open: boolean; onClose: () => void; html: string; title?: string }> = ({
                                                                                                       open, onClose, html, title = '본문 미리보기'
                                                                                                   }) => {
    if (!open) return null;
    return (
        <div className="fixed inset-0 bg-black/30 z-[60] flex items-center justify-center backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl w-[900px] max-w-[95vw] max-h-[90vh] overflow-hidden relative">
                <div className="flex items-center justify-between px-5 py-3 border-b">
                    <h3 className="text-lg font-bold">{title}</h3>
                    <button
                        className="text-gray-500 hover:text-gray-800 px-2 py-1"
                        onClick={onClose}
                        aria-label="닫기"
                    >
                        ✕
                    </button>
                </div>
                <div className="h-[70vh]">
                    {/* sandbox로 JS 차단하고, srcDoc으로 스타일/레이아웃 간섭 최소화 */}
                    <iframe
                        title="content-preview"
                        className="w-full h-full"
                        sandbox=""
                        srcDoc={html || '<div style="padding:16px;color:#666">미리볼 본문이 없습니다.</div>'}
                    />
                </div>
            </div>
        </div>
    );
};


const PreviewModal: React.FC<PreviewModalProps> = ({ campaignId, type, onClose, onSend, sending }) => {
    const [data, setData] = useState<PreviewData | null>(null);
    const [showHtmlModal, setShowHtmlModal] = useState(false);
    const [modalHtml, setModalHtml] = useState('');          // ← 여기만 바꿔주면 됨 (A/B 선택 결과)

    // === 예약 시간 상태 ===
    const [sendDate, setSendDate] = useState<string>('');   // A용 날짜
    const [ampm, setAmpm] = useState<'AM'|'PM'>('AM');
    const [hour, setHour] = useState<number>(9);
    const [minute, setMinute] = useState<number>(0);

    // ab_type === 3 (스케줄 AB)일 때 B용 세트
    const [sendDateB, setSendDateB] = useState<string>(''); // B용 날짜
    const [ampmB, setAmpmB] = useState<'AM'|'PM'>('AM');
    const [hourB, setHourB] = useState<number>(10);
    const [minuteB, setMinuteB] = useState<number>(0);

    // KST(+09:00) ISO 문자를 만들어서 서버에 넘길 때 사용
    const toZonedISO = (dateStr: string, ap: 'AM'|'PM', h12: number, m: number) => {
        const h24 = ap === 'AM'
            ? (h12 === 12 ? 0 : h12)
            : (h12 === 12 ? 12 : h12 + 12);
        const hh = String(h24).padStart(2, '0');
        const mm = String(m).padStart(2, '0');
        return `${dateStr}T${hh}:${mm}:00+09:00`;
    };

    /** 본문 확인 클릭 핸들러 */
    const openHtml = (variant: 'A' | 'B' = 'A') => {
        if (!data) return;
        const html = variant === 'B' ? (data.htmlB || '') : (data.html || '');
        setModalHtml(html);
        setShowHtmlModal(true);
    };

    useEffect(() => {
        if (!data) return;
        // 오늘 날짜(현지) → YYYY-MM-DD
        const d = new Date();
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const today = `${yyyy}-${mm}-${dd}`;

        setSendDate(prev => prev || today);
        setSendDateB(prev => prev || today); // 스케줄 AB 대비

        // 현재 시/분을 기준으로 기본값 (예: 지금 시각, 분은 00으로 정렬)
        const nowH = d.getHours();
        const nowM = 0;
        if (nowH >= 12) {
            setAmpm('PM');
            setHour(nowH === 12 ? 12 : nowH - 12);
        } else {
            setAmpm('AM');
            setHour(nowH === 0 ? 12 : nowH);
        }
        setMinute(nowM);

        // B용은 A보다 1시간 뒤 기본값
        const bH = (nowH + 1) % 24;
        if (bH >= 12) {
            setAmpmB('PM');
            setHourB(bH === 12 ? 12 : bH - 12);
        } else {
            setAmpmB('AM');
            setHourB(bH === 0 ? 12 : bH);
        }
        setMinuteB(nowM);
    }, [data]);

    useEffect(() => {
        const load = async () => {
            try {
                const [campaign, sendInfo, recipientCount, content] = await Promise.all([
                    axiosInstance.get(`/mail-campaigns/status/${campaignId}`).then(r => r.data),
                    axiosInstance.get(`/mail-sendinfo/by-campaign/${campaignId}`).then(r => r.data),
                    axiosInstance.get(`/mail-groups/count/${campaignId}`).then(r => Number(r.data) || 0),
                    axiosInstance.get(`/mail-contents/by-campaign/${campaignId}`).then(r => r.data)
                ]);

                const d: PreviewData = {
                    recipientCount,
                    subject: sendInfo.subject ?? '',
                    subjectB: sendInfo.subjectB ?? '',
                    senderName: sendInfo.senderName ?? '',
                    senderNameB: sendInfo.senderNameB ?? '',
                    senderEmail: sendInfo.senderEmail ?? '',
                    previewText: sendInfo.previewText ?? '',
                    abType: Number(sendInfo.abType) || 0,
                    abTest: sendInfo.abTest,
                    scheduleMessage: sendInfo.scheduleMessage,
                    testRatioText: sendInfo.testRatioText,
                    sendRatioText: sendInfo.sendRatioText,
                    groupName: campaign.groupName,
                    html: content.html ?? '',
                    htmlB: content.htmlB ?? '',
                };

                if (type === 'S' && d.abType === 3) {
                    toast.error('A/B 테스트 [발송 스케줄] 상태입니다. 예약하기로 진행해 주세요.');
                    onClose();
                    return;
                }
                setData(d);
            } catch (e) {
                toast.error('미리보기 데이터를 불러오지 못했습니다.');
                onClose();
            }
        };
        load();
    }, [campaignId, onClose, type]);

    if (!data) return null;

    const isAB = data.abTest;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
            <div className="px-20 w-[960px] max-w-[95vw] bg-white rounded-2xl shadow-2xl overflow-hidden">
                {/* 헤더 */}
                <div className="px-6 py-5">
                    <h2 className="text-2xl font-bold text-center m-4">모든 준비가 끝났습니다</h2>
                </div>

                {/* 본문: 각 행이 좌(라벨)/우(내용) */}
                <div className="px-6 max-h-[66vh] overflow-y-auto">
                    {/* 주소록 */}
                    <Row icon={<CheckCircleIcon className="w-5 h-5 text-blue-600" />} title="주소록">
                        <div className="space-y-1">
                            <div className="text-gray-700">{data.groupName}</div>
                            <div className="text-gray-700 text-xs">주소록의 모든 구독자에게 발송합니다.</div>
                            <div className="text-gray-500 text-xs">{data.recipientCount}명에게 발송합니다.</div>
                        </div>
                    </Row>

                    {/* A/B 테스트 */}
                    <Row icon={<CheckCircleIcon className="w-5 h-5 text-blue-600" />} title="A/B 테스트">
                        {isAB ? (
                            <div className="space-y-2">
                                <div>
                                    {data.abType === 1 && '이메일 제목을 2개 버전으로 테스트합니다.'}
                                    {data.abType === 2 && '발신자 이름을 2개 버전으로 테스트합니다.'}
                                    {data.abType === 3 && '발송 스케줄을 2개 버전으로 테스트합니다.'}
                                    {data.abType === 4 && '메일 콘텐츠를 2개 버전으로 테스트합니다.'}
                                </div>
                                {!!data.scheduleMessage && <div>{data.scheduleMessage}</div>}
                                {(data.testRatioText || data.sendRatioText) && (
                                    <div className="space-y-1 text-gray-600">
                                        {!!data.testRatioText && <div>{data.testRatioText}</div>}
                                        {!!data.sendRatioText && <div>{data.sendRatioText}</div>}
                                    </div>
                                )}
                                <p className="text-red-500 text-xs">
                                    테스트 그룹 발송 후 발송 그룹이 발송되기 전에 구독자가 추가, 수신거부, 자동삭제, 완전삭제되면
                                    발송 그룹의 발송 대상 수가 달라질 수 있습니다.
                                </p>
                            </div>
                        ) : (
                            <div className="">A/B 테스트를 사용하지 않습니다.</div>
                        )}
                    </Row>

                    {/* 이메일 제목 */}
                    <Row icon={<CheckCircleIcon className="w-5 h-5 text-blue-600" />} title="이메일 제목">
                        <div className="space-y-1">
                            <div>{data.subject || '-'}</div>
                            {data.abType === 1 && !!data.subjectB && <div>{data.subjectB}</div>}
                        </div>
                    </Row>

                    {/* 발신자 이름 */}
                    <Row icon={<CheckCircleIcon className="w-5 h-5 text-blue-600" />} title="발신자 이름">
                        <div className="space-y-1">
                            <div>{data.senderName || '-'}</div>
                            {data.abType === 2 && !!data.senderNameB && <div>{data.senderNameB}</div>}
                        </div>
                    </Row>

                    {/* 발신자 이메일 주소 */}
                    <Row icon={<ShieldCheckIcon className="w-5 h-5 text-green-500" />} title="발신자 이메일 주소">
                        <div>{data.senderEmail || '-'}</div>
                    </Row>

                    {/* 미리보기 텍스트 */}
                    <Row icon={<ExclamationCircleIcon className="w-5 h-5 text-yellow-500" />} title="미리보기 텍스트" last>
                        <div>{data.previewText || '콘텐츠 내용의 일부가 자동으로 표시됩니다.'}</div>
                    </Row>

                    {/* 콘텐츠 본문확인 */}
                    <Row icon={<CheckCircleIcon className="w-5 h-5 text-blue-600" />} title="콘텐츠" last>
                        <div className="flex items-center gap-3">
                            <div className="text-xs text-blue-600 cursor-pointer"  onClick={() => openHtml('A')}>
                                본문확인 (A)
                            </div>


                            {/* 콘텐츠 A/B 테스트일 때만 B 버튼 노출 */}
                            {data.abType === 4 && (
                                <div className="text-xs text-blue-600 cursor-pointer"  onClick={() => openHtml('A')}>
                                    본문확인 (B)
                                </div>
                            )}
                        </div>
                    </Row>
                    {type === 'B' && (
                        <div className="px-6 pt-4 pb-2 border-t border-gray-300 space-y-4">
                            {/* 단일 예약 or 스케줄 AB 두 세트 */}
                            {data.abType === 3 ? (
                                <>
                                    {/* 테스트 그룹 A */}
                                    <div className="flex items-center flex-wrap gap-2">
                                        <span className="mr-1 font-medium">테스트 그룹 A를</span>
                                        <input
                                            type="date"
                                            className="border rounded px-3 py-2"
                                            value={sendDate}
                                            onChange={(e) => setSendDate(e.target.value)}
                                        />
                                        <select
                                            className="border rounded px-2 py-2"
                                            value={ampm}
                                            onChange={(e) => setAmpm(e.target.value as 'AM'|'PM')}
                                        >
                                            <option value="AM">오전</option>
                                            <option value="PM">오후</option>
                                        </select>
                                        <select
                                            className="border rounded px-2 py-2"
                                            value={hour}
                                            onChange={(e) => setHour(Number(e.target.value))}
                                        >
                                            {Array.from({ length: 12 }, (_, i) => i + 1).map(h => (
                                                <option key={h} value={h}>{h}</option>
                                            ))}
                                        </select>
                                        :
                                        <select
                                            className="border rounded px-2 py-2"
                                            value={minute}
                                            onChange={(e) => setMinute(Number(e.target.value))}
                                        >
                                            {[0,10,20,30,40,50].map(m => (
                                                <option key={m} value={m}>{String(m).padStart(2,'0')}</option>
                                            ))}
                                        </select>
                                        <span className="ml-1">에 발송합니다.</span>
                                    </div>

                                    {/* 테스트 그룹 B */}
                                    <div className="flex items-center flex-wrap gap-2">
                                        <span className="mr-1 font-medium">테스트 그룹 B를</span>
                                        <input
                                            type="date"
                                            className="border rounded px-3 py-2"
                                            value={sendDateB}
                                            onChange={(e) => setSendDateB(e.target.value)}
                                        />
                                        <select
                                            className="border rounded px-2 py-2"
                                            value={ampmB}
                                            onChange={(e) => setAmpmB(e.target.value as 'AM'|'PM')}
                                        >
                                            <option value="AM">오전</option>
                                            <option value="PM">오후</option>
                                        </select>
                                        <select
                                            className="border rounded px-2 py-2"
                                            value={hourB}
                                            onChange={(e) => setHourB(Number(e.target.value))}
                                        >
                                            {Array.from({ length: 12 }, (_, i) => i + 1).map(h => (
                                                <option key={h} value={h}>{h}</option>
                                            ))}
                                        </select>
                                        :
                                        <select
                                            className="border rounded px-2 py-2"
                                            value={minuteB}
                                            onChange={(e) => setMinuteB(Number(e.target.value))}
                                        >
                                            {[0,10,20,30,40,50].map(m => (
                                                <option key={m} value={m}>{String(m).padStart(2,'0')}</option>
                                            ))}
                                        </select>
                                        <span className="ml-1">에 발송합니다.</span>
                                    </div>
                                </>
                            ) : (
                                // 단일 예약 (일반 예약)
                                <div className="flex items-center flex-wrap gap-2">
                                    <input
                                        type="date"
                                        className="border rounded px-3 py-2"
                                        value={sendDate}
                                        onChange={(e) => setSendDate(e.target.value)}
                                    />
                                    <select
                                        className="border rounded px-2 py-2"
                                        value={ampm}
                                        onChange={(e) => setAmpm(e.target.value as 'AM'|'PM')}
                                    >
                                        <option value="AM">오전</option>
                                        <option value="PM">오후</option>
                                    </select>
                                    <select
                                        className="border rounded px-2 py-2"
                                        value={hour}
                                        onChange={(e) => setHour(Number(e.target.value))}
                                    >
                                        {Array.from({ length: 12 }, (_, i) => i + 1).map(h => (
                                            <option key={h} value={h}>{h}</option>
                                        ))}
                                    </select>
                                    :
                                    <select
                                        className="border rounded px-2 py-2"
                                        value={minute}
                                        onChange={(e) => setMinute(Number(e.target.value))}
                                    >
                                        {[0,10,20,30,40,50].map(m => (
                                            <option key={m} value={m}>{String(m).padStart(2,'0')}</option>
                                        ))}
                                    </select>
                                    <span className="ml-1">에 발송합니다.</span>
                                </div>
                            )}

                            <p className="text-sm text-gray-500">
                                발송시각은 한국 표준시(UTC+9:00)를 기준으로 합니다.
                            </p>
                        </div>
                    )}


                </div>

                {/* 하단 버튼 */}
                <div className="flex justify-end gap-3 px-6 py-4 bg-white">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                        disabled={sending}
                    >
                        닫기
                    </button>
                    <button
                        onClick={() => {
                            if (type === 'B') {
                                const executeAt = toZonedISO(sendDate, ampm, hour, minute);
                                const payload: any = { executeAt };

                                if (data.abType === 3) {
                                    // 발송 스케줄 AB라면 B 시간도 함께
                                    payload.execute2At = toZonedISO(sendDateB, ampmB, hourB, minuteB);
                                }

                                onSend(payload); // ← 예약 파라미터 전달
                            } else {
                                onSend();        // ← 즉시 발송
                            }
                        }}
                        className={`px-4 py-2 rounded disabled:opacity-60 ${
                            type === 'B'
                                ? 'bg-gray-500 text-white hover:bg-gray-600'
                                : 'bg-red-600 text-white hover:bg-red-700'
                        }`}
                        disabled={sending}
                    >
                        {sending
                            ? (type === 'B' ? '예약 중...' : '발송 중...')
                            : (type === 'B' ? '예약 발송' : '최종 발송')}
                    </button>
                </div>
            </div>

            {/* HTML 미리보기 모달 */}
            <HtmlModal
                open={showHtmlModal}
                onClose={() => setShowHtmlModal(false)}
                html={modalHtml}
                title="본문 미리보기"
            />
        </div>
    );
};

export default PreviewModal;
