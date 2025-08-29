import React, { useState } from "react";
import CampaignDashboard from "./CampaignDashboard";
import CampaignDetailStats from "./CampaignDetailStats";

const CampaignStats: React.FC = () => {
    const [tab, setTab] = useState<"dashboard" | "detail">("dashboard");

    return (
        <div className="max-w-5xl mx-auto px-8 py-8 ">
            {/* 탭 UI */}
            <div className="flex mb-2 ml-8 mr-8 border-b border-gray-300">
                <button
                    className={`px-4 py-2 mr-2 font-bold transition-colors
            ${
                        tab === "dashboard"
                            ? "black border-b-8 border-blue-400"
                            : "text-gray-400 border-b-8 border-transparent"
                    }
          `}
                    onClick={() => setTab("dashboard")}
                >
                    대시보드
                </button>
                <button
                    className={`px-4 py-2 font-bold transition-colors
            ${
                        tab === "detail"
                            ? "black border-b-2 border-blue-400"
                            : "text-gray-400 border-b-2 border-transparent"
                    }
          `}
                    onClick={() => setTab("detail")}
                >
                    상세통계
                </button>
            </div>

            {/* 탭별 내용 */}
            <div>
                {tab === "dashboard" ? <CampaignDashboard /> : <CampaignDetailStats />}
            </div>
        </div>
    );
};

export default CampaignStats;
