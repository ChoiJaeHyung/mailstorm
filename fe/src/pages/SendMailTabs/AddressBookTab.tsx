import React, { useEffect, useState } from 'react';
import axiosInstance from "../Auth/axios.ts";

interface MailGroup {
    id: number;
    name: string;
}

interface AddressBookTabProps {
    campaignId: number;
    onCompletion?: (done: boolean) => void
    onGroupSelect?: (groupId: number) => void;
}

const AddressBookTab: React.FC<AddressBookTabProps> = ({ campaignId, onGroupSelect, onCompletion }) => {
    const [groups, setGroups] = useState<MailGroup[]>([]);
    const [selectedGroup, setSelectedGroup] = useState<string | ''>('');
    const [initialGroup, setInitialGroup] = useState<string | ''>('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // 최초 fetch/campaignId 변경 시
    useEffect(() => {
        let ignore = false;
        setLoading(true);
        setError(null);

        Promise.all([
            axiosInstance.get(`/mail-groups`).then(res => res.data),
            axiosInstance.get(`/mail-campaigns/${campaignId}`).then(res => res.data),
        ])
            .then(([groupsData, campaignData]) => {
                if (ignore) return;
                setGroups(groupsData);
                if (groupsData.some((g: MailGroup) => String(g.id) === String(campaignData.groupId))) {
                    setSelectedGroup(String(campaignData.groupId));
                    setInitialGroup(String(campaignData.groupId));
                } else {
                    setSelectedGroup('');
                    setInitialGroup('');
                }
            })
            .catch((err) => {
                console.error(err);
                setError('주소록/메일정보를 불러오는 중 오류가 발생했습니다.');
            })
            .finally(() => setLoading(false));

        return () => { ignore = true };
    }, [campaignId]);

    // 선택 변화(직접 선택 or 탭 전환)마다 "실제 변경"만 저장!
    useEffect(() => {
        if (selectedGroup === initialGroup) return; // 변화가 없으면 저장 안함
        // 실제 저장 호출
        (async () => {
            try {
                await axiosInstance.patch(`/mail-campaigns/group/${campaignId}`, {
                        group_id: selectedGroup === '' ? null : Number(selectedGroup)
                    }
                );
                // 저장이 성공하면 initialGroup도 동기화 (사용자 수동 변경 이후!)
                setInitialGroup(selectedGroup);
            } catch (err) {
                console.error('자동저장 에러:', err);
            }
        })();
        // 콜백도 저장 시점에
        onCompletion?.(selectedGroup !== '');
        if (selectedGroup !== '') onGroupSelect?.(Number(selectedGroup));
    }, [selectedGroup]);

    // 직접 셀렉트박스 선택
    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedGroup(e.target.value === '' ? '' : e.target.value);
    };

    return (
        <div>
            <h2 className="text-2xl font-bold mb-8">주소록을 선택하세요</h2>
            <div className="mb-8">
                <label className="block text-lg font-semibold mb-2">주소록</label>
                {loading && <div className="text-gray-500">로딩 중...</div>}
                {error && <div className="text-red-500 mb-2">{error}</div>}
                <select
                    className="w-1/2 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    disabled={loading || groups.length === 0}
                    value={selectedGroup}
                    onChange={handleChange}
                >
                    <option value="" disabled>주소록을 선택하세요</option>
                    {groups.map((g) => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                </select>
            </div>
            <p className="text-gray-700 text-base">
                다른 모든 단계를 입력하고 [발송하기], [예약하기]를 누르면 선택한
                조건에 따른 발송 대상 구독자 수를 확인할 수 있습니다.
                <br />
                주소록을 선택하면 그 주소록의 기본값으로 발신자 정보가 설정됩니다.
                [발송 정보]에서 발신자 정보를 확인하고 변경할 수 있습니다.
            </p>
        </div>
    );
};

export default AddressBookTab;
