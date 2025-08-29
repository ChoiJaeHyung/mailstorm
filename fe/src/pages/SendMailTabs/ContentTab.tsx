import React, { useEffect, useRef, useState } from 'react';
import EmailEditor from 'react-email-editor';
import axiosInstance from "../Auth/axios.ts";
import toast from 'react-hot-toast';

interface ContentTabProps {
    campaignId: number;
    onCompletion?: (isDone: boolean) => void; // 저장/완성 상태 부모로 알림
}

type Variant = 'A' | 'B';

const ContentTab: React.FC<ContentTabProps> = ({ campaignId, onCompletion }) => {
    const editorRef = useRef<any>(null);

    // 로딩/에러
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // A/B 설정 상태
    const [abTest, setAbTest] = useState<boolean>(false);
    const [abType, setAbType] = useState<number>(1);

    // 탭 (A/B)
    const [active, setActive] = useState<Variant>('A');

    // 서버 원본 보관 (완료판정/탭전환 로딩용)
    const [htmlA, setHtmlA] = useState<string>('');
    const [designA, setDesignA] = useState<any>(null);
    const [htmlB, setHtmlB] = useState<string>('');
    const [designB, setDesignB] = useState<any>(null);

    // 에디터 준비 전에 불러온 디자인을 임시로 보관
    const [editorReady, setEditorReady] = useState(false);
    const [copying, setCopying] = useState(false); // ✨ 복사 진행 상태 추가
    const isABContent = abTest && abType === 4;

    const loadDesignSafely = (design: any) => {
        try {
            if (editorRef.current?.editor && design && typeof design === 'object' && Object.keys(design).length > 0) {
                editorRef.current.editor.loadDesign(design);
            } else {
                // design이 없으면 에디터 빈 상태 유지
            }
        } catch (e) {
            console.error('loadDesign error', e);
        }
    };

    // ✨ 복사 핸들러: A 탭이면 A→B, B 탭이면 B→A로 복사
    const handleCopyAcross = () => {
        if (!isABContent) return; // 콘텐츠 A/B 테스트 아닐 때는 동작 X
        const unlayer = editorRef.current?.editor || editorRef.current?.unlayer || editorRef.current;
        if (!unlayer) {
            toast.error('에디터가 아직 준비되지 않았습니다.');
            return;
        }

        setCopying(true);
        setError(null);

        unlayer.exportHtml(async (data: { design: object; html: string }) => {
            try {
                const payload: any = {};
                const from = active;
                const to = active === 'A' ? 'B' : 'A';

                if (from === 'A') {
                    payload.htmlB = data.html ?? '';
                    payload.designB = data.design ?? {};
                } else {
                    payload.html = data.html ?? '';
                    payload.design = data.design ?? {};
                }

                await axiosInstance.patch(`/mail-contents/by-campaign/${campaignId}`, payload);

                // 로컬 상태 동기화
                if (from === 'A') {
                    setHtmlB(payload.htmlB);
                    setDesignB(payload.designB);
                } else {
                    setHtmlA(payload.html);
                    setDesignA(payload.design);
                }

                // 완료 판정 갱신
                onCompletion?.(computeDone(
                    from === 'B' ? payload.html : undefined,
                    from === 'A' ? payload.htmlB : undefined
                ));

                toast.success(`그룹 ${from} → ${to} 로 복사했습니다.`);
            } catch (err) {
                console.error(err);
                toast.error('복사 중 오류가 발생했습니다.');
            } finally {
                setCopying(false);
            }
        });
    };

    const computeDone = (hA?: string, hB?: string) => {
        const aOk = !!(hA ?? htmlA);
        if (isABContent) {
            const bOk = !!(hB ?? htmlB);
            return aOk && bOk;
        }
        return aOk;
    };

    // 초기 데이터: abTest/abType + 콘텐츠 A/B 로드
    useEffect(() => {
        let canceled = false;

        (async () => {
            setLoading(true);
            setError(null);
            try {
                // 1) A/B 설정
                const si = await axiosInstance.get(`/mail-sendinfo/by-campaign/${campaignId}`);
                if (canceled) return;
                const siData = si.data ?? {};
                setAbTest(!!siData.abTest);
                setAbType(Number(siData.abType ?? 1));

                // 2) 콘텐츠 A/B
                const res = await axiosInstance.get(`/mail-contents/by-campaign/${campaignId}`);
                if (canceled) return;
                const data = res.data ?? {};

                setHtmlA(data.html ?? '');
                setDesignA(data.design ?? null);
                setHtmlB(data.htmlB ?? '');
                setDesignB(data.designB ?? null);

                // 에디터에 A 로드
                if (editorReady) {
                    loadDesignSafely(data.design ?? null);
                }

                // 완료 판정
                onCompletion?.(computeDone(data.html, data.htmlB));
            } catch (err) {
                if (!canceled) {
                    console.error(err);
                    setError('콘텐츠를 불러오는 중 오류가 발생했습니다.');
                }
            } finally {
                if (!canceled) setLoading(false);
            }
        })();

        return () => {
            canceled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [campaignId, editorReady]);

    // 에디터 준비 이벤트
    const handleEditorReady = () => {
        setEditorReady(true);
        // 이미 받아둔 A/B 디자인 중 현재 탭 것을 로드
        if (active === 'A') loadDesignSafely(designA);
        else loadDesignSafely(designB);
    };

    // 탭 전환 시 현재 탭 디자인 로드
    useEffect(() => {
        if (!editorReady) return;
        if (active === 'A') loadDesignSafely(designA);
        else loadDesignSafely(designB);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [active, editorReady]);

    // 저장: 현재 탭만 PATCH (부분 업데이트)
    const handleSave = () => {
        const unlayer = editorRef.current?.editor || editorRef.current?.unlayer || editorRef.current;
        if (!unlayer) {
            toast.error('에디터가 아직 준비되지 않았습니다.');
            return;
        }

        setLoading(true);
        setError(null);

        unlayer.exportHtml(async (data: { design: object; html: string }) => {
            try {
                // 현재 탭에 맞는 필드만 PATCH
                const payload: any = {};
                if (active === 'A') {
                    payload.html = data.html ?? '';
                    payload.design = data.design ?? {};
                } else {
                    payload.htmlB = data.html ?? '';
                    payload.designB = data.design ?? {};
                }

                await axiosInstance.patch(`/mail-contents/by-campaign/${campaignId}`, payload);

                // 로컬 상태 갱신
                if (active === 'A') {
                    setHtmlA(payload.html);
                    setDesignA(payload.design);
                } else {
                    setHtmlB(payload.htmlB);
                    setDesignB(payload.designB);
                }

                // 완료 판정 통지
                onCompletion?.(computeDone(
                    active === 'A' ? payload.html : undefined,
                    active === 'B' ? payload.htmlB : undefined
                ));

                toast.success('콘텐츠가 저장되었습니다.');
            } catch (err) {
                console.error(err);
                toast.error('저장 중 오류가 발생했습니다.');
            } finally {
                setLoading(false);
            }
        });
    };

    return (
        <div className="flex flex-col h-full w-full">
            {/* 상단 A/B 탭: abTest && abType===4 일 때만 표시 */}
            {isABContent && (
                <div className="w-full px-4 pt-4">
                    <div className="flex items-center justify-between mb-4">
                        {/* A/B 선택 버튼 */}
                        <div className="flex gap-2">
                            {(["A", "B"] as ("A" | "B")[]).map((variant) => (
                                <button
                                    key={variant}
                                    className={`px-3 py-1 rounded-full text-sm font-semibold
                                    ${
                                        active === variant
                                            ? "bg-blue-100 text-blue-700"
                                            : "bg-gray-100 text-gray-400"
                                    }`}
                                    onClick={() => setActive(variant)}
                                >
                                    테스트 그룹 {variant}
                                </button>
                            ))}
                        </div>

                        {/* 완료조건: 우측 가운데 정렬 */}
                        <div className="flex-1 text-right text-sm text-gray-600 ">
                            {isABContent
                                ? `완료 조건: A와 B 모두 콘텐츠가 저장되어야 합니다. (A: ${
                                    htmlA ? "✓" : "—"
                                }, B: ${htmlB ? "✓" : "—"})`
                                : `완료 조건: A 콘텐츠 저장 (현재: ${htmlA ? "✓" : "—"})`}
                        </div>
                    </div>
                </div>
            )}

            {/* 에디터 영역 */}
            <div className="flex-1 w-full h-full overflow-hidden">
                <div className="w-full h-full">
                    <EmailEditor
                        ref={editorRef}
                        options={{}}
                        appearance={{ theme: "light" }}
                        className="w-full h-full"
                        style={{ width: "100%", minHeight: "600px" }}
                        onReady={handleEditorReady}
                    />
                </div>
            </div>
            {/* 하단 저장 버튼: 오른쪽 정렬 */}
            <div className="w-full p-4 bg-white shadow-md flex justify-end items-center">
                {isABContent && (
                    <button
                        onClick={handleCopyAcross}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition mr-2"
                        disabled={copying || loading}
                        title={active === 'A' ? 'A → B 복사' : 'B → A 복사'}
                    >
                        {copying ? '복사 중...' : (active === 'A' ? 'A → B 복사' : 'B → A 복사')}
                    </button>
                )}
                <button
                    onClick={handleSave}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                    disabled={loading}
                >
                    {loading
                        ? "저장 중..."
                        : !isABContent
                            ? "저장"
                            : `${active}안 저장`}
                </button>
                {error && <span className="text-red-500 ml-2">{error}</span>}
            </div>
        </div>
    );
};

export default ContentTab;
