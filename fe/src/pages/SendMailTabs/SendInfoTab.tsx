import React, { useState, useEffect } from 'react';
import axiosInstance from "../Auth/axios.ts";

interface SendInfoTabProps {
    campaignId: number;
    onCompletion?: (isDone: boolean) => void;
}

// 이메일 유효성 검사 함수
const isValidEmail = (email: string) =>
    /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email);

const SendInfoTab: React.FC<SendInfoTabProps> = ({ campaignId, onCompletion }) => {
    // 기본 필드
    const [subject, setSubject] = useState('');
    const [fromName, setFromName] = useState('');
    const [fromEmail, setFromEmail] = useState('no-reply@mail.rsup.io');
    const [previewText, setPreviewText] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [emailError, setEmailError] = useState<string | null>(null);

    // A/B 관련
    const [abTest, setAbTest] = useState<boolean>(false);
    const [abType, setAbType] = useState<number>(1); // 1: 제목, 2: 발신자명, 3: 발송스케줄, 4: 콘텐츠 (가정)

    // B안 입력 필드 (제목/발신자명)
    const [subjectB, setSubjectB] = useState('');
    const [fromNameB, setFromNameB] = useState('');

    // 데이터 불러오기
    useEffect(() => {
        const fetchInfo = async () => {
            setError(null);
            try {
                const res = await axiosInstance.get(`/mail-sendinfo/by-campaign/${campaignId}`);
                const data = await res.data;

                // A/B 플래그/타입
                setAbTest(Boolean(data.abTest));
                setAbType(Number(data.abType ?? 1));

                // A안
                setSubject(data.subject ?? '');
                setFromName(data.senderName ?? '');
                setFromEmail((data.senderEmail && data.senderEmail.trim()) || 'no-reply@mail.rsup.io');
                setPreviewText(data.previewText ?? '');

                // B안 (없으면 공란)
                setSubjectB(data.subjectB ?? '');
                setFromNameB(data.senderNameB ?? '');

                // 완료 판정
                const done = computeDone({
                    abTest: Boolean(data.abTest),
                    abType: Number(data.abType ?? 1),
                    subject: data.subject ?? '',
                    subjectB: data.subjectB ?? '',
                    senderName: data.senderName ?? '',
                    senderNameB: data.senderNameB ?? '',
                    senderEmail: data.senderEmail ?? '',
                    previewText: data.previewText ?? '',
                });
                onCompletion?.(done);
            } catch (err) {
                console.error(err);
                setError('발송정보를 불러오는 중 오류가 발생했습니다.');
            }
        };
        fetchInfo();
    }, [campaignId, onCompletion]);

    // 이메일 입력 변경 시 실시간 유효성 검사
    useEffect(() => {
        if (fromEmail === '') {
            setEmailError(null);
        } else if (!isValidEmail(fromEmail)) {
            setEmailError('유효하지 않은 이메일 형식입니다.');
        } else {
            setEmailError(null);
        }
    }, [fromEmail]);

    // 완료 판정 (abType별 요구 필드가 다름)
    const computeDone = (p: {
        abTest: boolean;
        abType: number;
        subject: string;
        subjectB: string;
        senderName: string;
        senderNameB: string;
        senderEmail: string;
        previewText: string;
    }) => {
        // 공통 필수
        if (!p.senderEmail || !isValidEmail(p.senderEmail) || !p.previewText) return false;

        if (!p.abTest) {
            // A/B 안함 → 제목/발신자 둘 다 하나만 확인
            return Boolean(p.subject && p.senderName);
        }

        // A/B 하는 경우: 타입별로 B안까지 체크
        if (p.abType === 1) {
            // 제목 테스트: 제목 A/B 모두 필요, 발신자명은 A만 있으면 OK
            return Boolean(p.subject && p.subjectB && p.senderName);
        }
        if (p.abType === 2) {
            // 발신자명 테스트: 발신자명 A/B 모두 필요, 제목은 A만 있으면 OK
            return Boolean(p.senderName && p.senderNameB && p.subject);
        }

        // 그 외 타입(3:스케줄, 4:콘텐츠 등)은 기본 A만 있으면 됨(요구에 맞게 수정 가능)
        return Boolean(p.subject && p.senderName);
    };

    const saveField = async () => {
        setError(null);
        try {
            const payload: any = {
                // 공통
                subject: subject,
                senderName: fromName,
                senderEmail: fromEmail,
                previewText: previewText,
            };

            // 타입별 B안 필드 포함
            if (abTest && abType === 1) {
                payload.subjectB = subjectB;
            }
            if (abTest && abType === 2) {
                payload.senderNameB = fromNameB;
            }

            await axiosInstance.patch(`/mail-sendinfo/by-campaign/${campaignId}`, payload);

            const done = computeDone({
                abTest,
                abType,
                subject: subject || "",
                subjectB: subjectB || "",
                senderName: fromName || "",
                senderNameB: fromNameB || "",
                senderEmail: fromEmail || 'no-reply@mail.rsup.io',
                previewText: previewText || "",
            });
            onCompletion?.(done);
        } catch (err) {
            console.error('자동저장 에러:', err);
            setError('자동저장 중 오류가 발생했습니다.');
        }
    };

    return (
        <div>
            <h2 className="text-2xl font-bold mb-8">발송정보를 입력하세요</h2>
            {error && <p className="text-red-500 mb-4">{error}</p>}

            {/* 이메일 제목 (A) */}
            <div className="mb-6">
                <label className="block text-lg font-semibold mb-2">
                    이메일 제목{abTest && abType === 1 ? ' (A그룹)' : ''}
                </label>
                <input
                    type="text"
                    className="w-full px-4 py-3 border border-gray-300 rounded-md"
                    placeholder="이메일 제목을 입력하세요"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    onBlur={saveField}
                />
            </div>

            {/* 이메일 제목 (B) — abTest && abType === 1 일 때만 노출 */}
            {abTest && abType === 1 && (
                <div className="mb-6">
                    <label className="block text-lg font-semibold mb-2">이메일 제목 (B그룹)</label>
                    <input
                        type="text"
                        className="w-full px-4 py-3 border border-gray-300 rounded-md"
                        placeholder="B그룹 이메일 제목을 입력하세요"
                        value={subjectB}
                        onChange={(e) => setSubjectB(e.target.value)}
                        onBlur={saveField}
                    />
                </div>
            )}

            {/* 발신자 이름 (A) */}
            <div className="mb-6">
                <label className="block text-lg font-semibold mb-2">
                    발신자 이름{abTest && abType === 2 ? ' (A그룹)' : ''}
                </label>
                <input
                    type="text"
                    className="w-full px-4 py-3 border border-gray-300 rounded-md"
                    placeholder="발신자 이름을 입력하세요"
                    value={fromName}
                    onChange={(e) => setFromName(e.target.value)}
                    onBlur={saveField}
                />
            </div>

            {/* 발신자 이름 (B) — abTest && abType === 2 일 때만 노출 */}
            {abTest && abType === 2 && (
                <div className="mb-6">
                    <label className="block text-lg font-semibold mb-2">발신자 이름 (B그룹)</label>
                    <input
                        type="text"
                        className="w-full px-4 py-3 border border-gray-300 rounded-md"
                        placeholder="B안 발신자 이름을 입력하세요"
                        value={fromNameB}
                        onChange={(e) => setFromNameB(e.target.value)}
                        onBlur={saveField}
                    />
                </div>
            )}

            {/* 발신자 이메일 주소 (고정/비활성) */}
            <div className="mb-6">
                <label className="block text-lg font-semibold mb-2">발신자 이메일 주소</label>
                <input
                    type="email"
                    className="w-full px-4 py-3 border border-gray-300 rounded-md"
                    placeholder="이메일 주소를 입력하세요"
                    value={fromEmail}
                    disabled={true}
                    onChange={(e) => setFromEmail(e.target.value)}
                    onBlur={saveField}
                />
                {emailError && (
                    <div className="text-red-500 text-sm mt-2">{emailError}</div>
                )}
            </div>

            {/* 미리보기 텍스트 */}
            <div className="mb-6">
                <label className="block text-lg font-semibold mb-2">미리보기 텍스트</label>
                <input
                    type="text"
                    className="w-full px-4 py-3 border border-gray-300 rounded-md"
                    placeholder="미리보기 텍스트를 입력하세요"
                    value={previewText}
                    onChange={(e) => setPreviewText(e.target.value)}
                    onBlur={saveField}
                />
                <div className="text-gray-500 text-sm mt-2">
                    미리보기 텍스트는 수신자의 받은편지함 제목, 발신자 이름과 함께 표시됩니다.
                </div>
            </div>
        </div>
    );
};

export default SendInfoTab;
