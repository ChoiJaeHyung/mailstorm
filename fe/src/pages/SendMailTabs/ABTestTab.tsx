import React, { useEffect, useRef, useState } from "react";
import axiosInstance from "../Auth/axios.ts";
import toast from "react-hot-toast";

interface TabProps {
    campaignId: number;
    onCompletion?: (isDone: boolean) => void;
}

const ABTestTab: React.FC<TabProps> = ({ campaignId, onCompletion }) => {
    const [abTest, setAbTest] = useState<boolean>(false);
    const [abType, setAbType] = useState<number>(1); // 1 제목, 2 발신자, 3 스케줄, 4 콘텐츠
    const [testRatio, setTestRatio] = useState<number>(0);
    const [totalCount, setTotalCount] = useState<number>(0);

    // 승자 발송(또는 시간차) 설정
    const [delayUnit, setDelayUnit] = useState<"H" | "D">("D");
    const [delayValue, setDelayValue] = useState<number>(1);

    // 스케줄 테스트(B 전용)
    const [delayUnitB, setDelayUnitB] = useState<"H" | "D">("D");
    const [delayValueB, setDelayValueB] = useState<number>(1);

    const [loaded, setLoaded] = useState<boolean>(false);

    const debounceRef = useRef<number | null>(null);
    const onCompletionRef = useRef<TabProps['onCompletion']>(undefined);
    const didInitialSaveRef = useRef<boolean>(false);

    useEffect(() => {
        onCompletionRef.current = onCompletion;
    }, [onCompletion]);

    const computeDone = (
        abTestVal: boolean,
        abTypeVal: number | null | undefined,
        ratioVal: number | null | undefined
    ) => {
        if (!abTestVal) return true;
        const hasType = abTypeVal !== undefined && abTypeVal !== null;
        const hasRatio = Number.isFinite(ratioVal) && (ratioVal as number) > 0;
        return hasType && hasRatio;
    };

    const fetchRecipientCount = async (cid: number) => {
        try {
            const res = await axiosInstance.get(`/mail-groups/count/${cid}`);
            const count = Number(res.data) || 0;
            setTotalCount(count);
        } catch (err) {
            console.error(err);
            toast.error("주소록 건수를 불러오는 중 오류가 발생했습니다.");
            setTotalCount(0);
        }
    };

    // 최초/캠페인 변경 시 데이터 로드
    useEffect(() => {
        let canceled = false;

        (async () => {
            try {
                const res = await axiosInstance.get(
                    `/mail-sendinfo/by-campaign/${campaignId}`
                );
                if (canceled) return;
                const data = res.data ?? {};

                const initAbTest = data.abTest ?? false;
                const initAbType = data.abType ?? 1;
                const initTestRatio = data.testRatio ?? 0;
                const initDailyUnit = (data.dailyUnit as "H" | "D") ?? "D";
                const initDailyValue = data.dailyValue ?? 1;
                const initDelayUnitB = (data.dailyUnitB as "H" | "D") ?? "D";
                const initDelayValueB = data.dailyValueB ?? 1;

                setAbTest(initAbTest);
                setAbType(initAbType);
                setTestRatio(initTestRatio);
                setDelayUnit(initDailyUnit);
                setDelayValue(initDailyValue);
                setDelayUnitB(initDelayUnitB);
                setDelayValueB(initDelayValueB);

                onCompletionRef.current?.(
                    computeDone(initAbTest, initAbType, initTestRatio)
                );

                // 값이 "없던" 경우에만 최초 저장 1회 (무한루프 방지)
                const missing =
                    data.abTest === undefined ||
                    data.abType === undefined ||
                    data.testRatio === undefined;

                if (missing && !didInitialSaveRef.current) {
                    didInitialSaveRef.current = true;
                    await axiosInstance.patch(`/mail-sendinfo/by-campaign/${campaignId}`, {
                        abTest: Boolean(initAbTest),
                    });
                }

                await fetchRecipientCount(campaignId);
            } catch (err) {
                console.error(err);
                toast.error("A/B테스트 정보를 불러오는 중 오류가 발생했습니다.");
            } finally {
                if (!canceled) setLoaded(true);
            }
        })();

        return () => {
            canceled = true;
            didInitialSaveRef.current = false;
        };
    }, [campaignId]);

    // 발송 스케줄 테스트면 비율 100% 고정
    useEffect(() => {
        if (!loaded) return;
        if (abType === 3 && testRatio !== 100) {
            setTestRatio(100);
        }
    }, [abType, loaded, testRatio]);

    const saveField = async () => {
        try {
            const payload = {
                abTest: Boolean(abTest),
                abType: Number(abType) || 1,
                testRatio: Number.isFinite(testRatio) ? testRatio : 0,
                dailyUnit: String(delayUnit),
                dailyValue: Number(delayValue),
                dailyUnitB: String(delayUnitB),
                dailyValueB: Number(delayValueB),
            };
            await axiosInstance.patch(
                `/mail-sendinfo/by-campaign/${campaignId}`,
                payload
            );
            onCompletionRef.current?.(
                computeDone(payload.abTest, payload.abType, payload.testRatio)
            );
        } catch (err: any) {
            console.error("자동저장 에러:", err);
            toast.error("자동저장 에러 : " + (err?.message ?? "unknown"));
        }
    };

    // 상태 변경 시 디바운스 저장 (스케줄 값 포함)
    useEffect(() => {
        if (!loaded) return;
        if (debounceRef.current) window.clearTimeout(debounceRef.current);
        debounceRef.current = window.setTimeout(() => {
            saveField();
        }, 400);
        return () => {
            if (debounceRef.current) window.clearTimeout(debounceRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        abTest,
        abType,
        testRatio,
        delayUnit,
        delayValue,
        delayUnitB,
        delayValueB,
        loaded,
    ]);

    return (
        <div>
            <h2 className="text-2xl font-bold mb-4">A/B 테스트를 설정하세요</h2>
            <p className="text-gray-700 mb-8">
                A/B 테스트는 한 가지 항목에 대해 두 가지 버전으로 이메일을 발송하여 성과를
                비교하는 것입니다.
                <br />
                예를 들어 같은 이메일 제목만 달리하여 성과가 좋은지 검증하는 것이죠.
                <br />
                주소록에 포함된 수신자 중 일부에게 먼저 테스트를 보내고 성과가 좋은
                버전을 나머지 수신자에게 보내는 것도 가능합니다.
            </p>

            {/* A/B 사용 여부 */}
            <div className="mb-8">
                <label className="block font-semibold mb-2">
                    A/B 테스트를 하시겠습니까?
                </label>
                <div className="flex gap-8 items-center">
                    <label className="flex items-center gap-2">
                        <input
                            type="radio"
                            checked={abTest}
                            onChange={() => setAbTest(true)}
                            onBlur={saveField}
                        />
                        예
                    </label>
                    <label className="flex items-center gap-2">
                        <input
                            type="radio"
                            checked={!abTest}
                            onChange={() => setAbTest(false)}
                            onBlur={saveField}
                        />
                        아니오
                    </label>
                </div>
            </div>

            {abTest && (
                <>
                    {/* 테스트 항목 선택 */}
                    <div className="mb-8">
                        <label className="block text-lg font-semibold mb-2">
                            어떤 항목을 테스트하시겠습니까?
                        </label>
                        <div className="flex flex-col gap-2">
                            <label className="flex items-center gap-2">
                                <input
                                    type="radio"
                                    checked={abType === 1}
                                    onChange={() => setAbType(1)}
                                    onBlur={saveField}
                                />
                                이메일 제목
                            </label>
                            <label className="flex items-center gap-2">
                                <input
                                    type="radio"
                                    checked={abType === 2}
                                    onChange={() => setAbType(2)}
                                    onBlur={saveField}
                                />
                                발신자 이름
                            </label>
                            <label className="flex items-center gap-2">
                                <input
                                    type="radio"
                                    checked={abType === 3}
                                    onChange={() => setAbType(3)}
                                    onBlur={saveField}
                                />
                                발송 스케줄
                            </label>
                            <label className="flex items-center gap-2">
                                <input
                                    type="radio"
                                    checked={abType === 4}
                                    onChange={() => setAbType(4)}
                                    onBlur={saveField}
                                />
                                콘텐츠
                            </label>
                        </div>
                    </div>

                    {/* 비율/설명 영역 */}
                    <div className="mb-8">
                        {abType !== 3 ? (
                            <>
                                <label className="block text-lg font-semibold mb-2">
                                    테스트 그룹과 발송 그룹의 비율을 설정하세요.
                                </label>
                                <div className="flex items-center gap-4">
                                    <span>0%</span>
                                    <input
                                        type="range"
                                        min={0}
                                        max={100}
                                        value={testRatio}
                                        onChange={(e) => setTestRatio(Number(e.target.value))}
                                        onBlur={saveField}
                                        className="flex-1"
                                    />
                                    <span>100%</span>
                                </div>
                                <div className="text-sm text-gray-700 mt-2">
                                    {(() => {
                                        const testTotal = Math.floor(totalCount * (testRatio / 100));
                                        const a = Math.floor(testTotal / 2);
                                        const b = testTotal - a; // 홀수 보정
                                        const rest = totalCount - testTotal;
                                        return (
                                            <>
                                                테스트그룹{" "}
                                                <span className="font-semibold">
                          A: {a.toLocaleString()}명
                        </span>
                                                &nbsp;
                                                <span className="font-semibold">
                          B: {b.toLocaleString()}명
                        </span>
                                                &nbsp; 본 발송 대상:{" "}
                                                <span className="font-semibold">
                          {rest.toLocaleString()}명
                        </span>
                                            </>
                                        );
                                    })()}
                                </div>
                            </>
                        ) : (
                            <>
                                {/* 슬라이더는 100% 고정 + 비활성화 */}
                                <div className="flex items-center gap-4 opacity-60">
                                    <span>0%</span>
                                    <input
                                        type="range"
                                        min={100}
                                        max={100}
                                        value={100}
                                        readOnly
                                        disabled
                                        className="flex-1"
                                    />
                                    <span>100%</span>
                                </div>

                                <div className="text-sm text-gray-700 mt-2">
                                    {(() => {
                                        const a = Math.floor(totalCount / 2);
                                        const b = totalCount - a; // 홀수 보정
                                        return (
                                            <>
                                                테스트그룹{" "}
                                                <span className="font-semibold">
                          A: {a.toLocaleString()}명
                        </span>
                                                &nbsp;
                                                <span className="font-semibold">
                          B: {b.toLocaleString()}명
                        </span>
                                            </>
                                        );
                                    })()}
                                </div>
                            </>
                        )}
                    </div>

                    {/* 승자 발송(제목/발신자/콘텐츠) 또는 시간차 발송(스케줄) */}
                    {abType !== 3 ? (
                        <div className="mb-6 text-gray-700">
                            테스트 후 성과가 더 좋은 버전을{" "}
                            <select
                                value={delayValue}
                                onChange={(e) => setDelayValue(Number(e.target.value))}
                                className="border rounded px-2 py-1 mx-1"
                                onBlur={saveField}
                            >
                                {(delayUnit === "H"
                                        ? Array.from({ length: 23 }, (_, i) => i + 1) // 1~23
                                        : Array.from({ length: 7 }, (_, i) => i + 1) // 1~7
                                ).map((v) => (
                                    <option key={v} value={v}>
                                        {v}
                                    </option>
                                ))}
                            </select>
                            <select
                                value={delayUnit}
                                onChange={(e) => {
                                    setDelayUnit(e.target.value as "H" | "D");
                                    setDelayValue(1);
                                }}
                                onBlur={saveField}
                                className="border rounded px-2 py-1 mx-1"
                            >
                                <option value="H">시간</option>
                                <option value="D">일</option>
                            </select>
                            후에 발송합니다. 승자 판단 기준은{" "}
                            <span className="font-semibold">오픈율</span>입니다.
                        </div>
                    ) : (
                        <>
                            <label className="block text-lg font-semibold mb-2">
                                발송 스케줄을 테스트 항목으로 선택했기 때문에 발송 그룹이 필요하지
                                않습니다.
                            </label>
                            <p className="text-sm text-gray-700 mb-3">
                            주소록에 포함된 구독자 전체를 2개의 테스트 그룹으로 나누어
                            발송합니다.
                            </p>
                        </>
                    )}
                </>
            )}
        </div>
    );
};

export default ABTestTab;
