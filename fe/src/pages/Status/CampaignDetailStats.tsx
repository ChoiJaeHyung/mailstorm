import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axiosInstance from "../Auth/axios.ts";

type StatType = "SENT" | "BOUNCED" | "open" | "click" | "unsubscribe";

interface StatRecipient {
    id: number;
    email: string;
    name?: string;
    status: StatType;
    etc: string;
    updatedAt: string;
    createdAt: string;
}

const STAT_LABELS: Record<StatType, string> = {
    SENT: "발송성공",
    BOUNCED: "발송실패",
    open: "오픈",
    click: "클릭",
    unsubscribe: "수신거부",
};

const CampaignDetailStats: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [recipients, setRecipients] = useState<StatRecipient[]>([]);
    const [search, setSearch] = useState("");
    const [statType, setStatType] = useState<StatType>("SENT");

    useEffect(() => {
        if (!id) return;

        let url = "";
        if (statType === "SENT" || statType === "BOUNCED") {
            // 성공/실패는 mail-logs에서 조회
            url = `/mail-logs/status?campaign_id=${id}&status=${statType}`;
        } else if (statType === "open" || statType === "click" || statType === "unsubscribe") {
            // 오픈, 클릭, 수신거부는 mail-tracker에서 조회
            url = `/tracker?campaign_id=${id}&type=${statType}`;
        } else {
            setRecipients([]); // 타입 오류 등 예외처리
            return;
        }

        axiosInstance.get(url)
            .then((res) => res.data)
            .then((data) => setRecipients(data || []))
            .catch(() => setRecipients([]));
    }, [id, statType]);

    // 검색 필터
    const filtered = recipients.filter(
        (r) =>
            (r.email || "").toLowerCase().includes(search.toLowerCase()) ||
            (r.name || "").toLowerCase().includes(search.toLowerCase())
    );

    // 날짜 문자열 (로컬)
    const formatDateForFile = (d = new Date()) => {
        const pad = (n: number) => n.toString().padStart(2, "0");
        const yyyy = d.getFullYear();
        const mm = pad(d.getMonth() + 1);
        const dd = pad(d.getDate());
        const hh = pad(d.getHours());
        const mi = pad(d.getMinutes());
        return `${yyyy}-${mm}-${dd}_${hh}${mi}`;
    };

    // CSV 생성
    const toCSV = (rows: StatRecipient[]) => {
        // 헤더: 이메일 주소, 이름, 비고, 상태, 업데이트일
        const header = ["이메일 주소", "이름", "비고", "상태", "업데이트일"];
        const escape = (v: unknown) => {
            const s = `${v ?? ""}`.replace(/"/g, '""');
            return `"${s}"`;
        };
        const lines = rows.map((r) =>
            [
                escape(r.email),
                escape(r.name ?? ""),
                escape(r.etc ?? ""),
                escape(STAT_LABELS[r.status] ?? r.status),
                escape(r.updatedAt ?? r.createdAt ?? ""),
            ].join(",")
        );
        // BOM 추가(엑셀 한글 깨짐 방지)
        return "\uFEFF" + [header.join(","), ...lines].join("\r\n");
    };

    const handleDownloadCSV = () => {
        const label = STAT_LABELS[statType] ?? "통계";
        const safeSubject = "상세통계";
        const now = formatDateForFile(new Date());
        // 요청한 규칙: <라벨>_<이메일제목>_<날짜>.csv
        const filename = `${label}_${safeSubject}_${now}.csv`;

        const csv = toCSV(filtered);
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    };

    return (
        <div>
            {/* 상단 필터 */}
            <div className="flex items-center gap-4 mb-4 ml-8 mr-8">
                {(["SENT", "BOUNCED", "open", "click", "unsubscribe"] as StatType[]).map(
                    (type) => (
                        <button
                            key={type}
                            className={`px-3 py-1 rounded-full text-sm font-semibold
                ${
                                statType === type
                                    ? "bg-blue-100 text-blue-700"
                                    : "bg-gray-100 text-gray-400"
                            }
              `}
                            onClick={() => setStatType(type)}
                        >
                            {STAT_LABELS[type]}
                        </button>
                    )
                )}
                <div className="ml-auto flex items-center gap-3">
                    <button
                        onClick={handleDownloadCSV}
                        className="px-3 py-2 rounded-md text-xs font-semibold bg-green-600 text-white hover:bg-green-700"
                        title="현재 필터 결과를 CSV로 다운로드"
                    >
                        다운로드
                    </button>

                    <input
                        className="px-4 py-2 border border-gray-300 rounded-md w-48 text-xs"
                        placeholder="이메일/이름 검색"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>
            {/* 리스트 테이블 */}
            <div className="bg-white rounded shadow overflow-x-auto ml-8 mr-8">
                <table className="w-full table-fixed">
                    <thead>
                    <tr className="bg-gray-50 text-sm">
                        <th className="p-2 text-left min-w-[200px] w-[220px] max-w-[240px]">이메일 주소</th>
                        <th className="p-2 text-left min-w-[80px] w-[100px] max-w-[120px]">이름</th>
                        <th className="p-2 text-left min-w-[320px] w-[360px] max-w-[400px]">비고</th>
                    </tr>
                    </thead>
                    <tbody>
                    {filtered.map((r) => (
                        <tr key={r.id} className="border-t">
                            <td className="p-2 text-sm truncate max-w-[240px]">{r.email}</td>
                            <td className="p-2 text-sm truncate max-w-[120px]">{r.name || "-"}</td>
                            <td className="p-2 text-sm truncate max-w-[400px]">
                                {r.etc}
                            </td>
                        </tr>
                    ))}
                    {filtered.length === 0 && (
                        <tr className="border-t">
                            <td colSpan={3} className="p-4 text-gray-400 truncate text-center max-w[760px]">
                                해당 항목이 없습니다.
                            </td>
                        </tr>
                    )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default CampaignDetailStats;
