import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SendMailForm from './SendMailForm.tsx';
import axiosInstance from '../Auth/axios';
import toast from "react-hot-toast";

interface MailCampaign {
  id: number;
  name: string;
  description: string;
  status: 'draft' | 'sent' | 'scheduled' | 'failed' | 'test' | 'partial';
  sendDate: string;
  createdAt: string;
  updatedAt: string;
  created_at: string;
  updated_at: string;
  send_date: string;
}
const SendMailDashboard: React.FC = () => {
  const [showForm, setShowForm] = useState(false);
  const [campaigns, setCampaigns] = useState<MailCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingCampaign, setEditingCampaign] = useState<MailCampaign | null>(null);
  const [creating, setCreating] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState<number | null>(null);

  const navigate = useNavigate();

  // 이메일 목록 조회
  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get<MailCampaign[]>(`/mail-campaigns`);
      setCampaigns(response.data);
    } catch (error) {
      toast.error("이메일 목록을 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 새 이메일 생성
  const createNewCampaign = async () => {
    if (creating) return; // 중복 생성 방지

    try {
      setCreating(true);
      const response = await axiosInstance.post(`/mail-campaigns`, {
        name: '제목없음',
        description: '',
        status: 'draft',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      const newCampaign = await response.data;
      // 목록에 새 이메일 추가
      setCampaigns([newCampaign, ...campaigns]);
      setSelectedCampaignId(newCampaign.id);

      // 생성된 이메일을 바로 편집 모드로 전환
      setEditingCampaign(newCampaign);

    } catch (error) {
      toast.error("이메일 생성 중 오류가 발생했습니다.");
    } finally {
      setCreating(false);
      setShowForm(true);
    }
  };

  // 이메일 삭제
  const deleteCampaign = async (id: number) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;

    try {
      await axiosInstance(`/mail-campaigns/${id}`, {
        method: 'DELETE',
      });

      // 목록에서 제거
      setCampaigns(campaigns.filter(campaign => campaign.id !== id));
      toast.success("이메일이 삭제되었습니다.");
    } catch (error) {
      toast.error("이메일 삭제 중 오류가 발생했습니다.");
    }
  };

  // 이메일 수정
  const updateCampaign = async (id: number, updateData: Partial<MailCampaign>) => {
    try {
      const response = await axiosInstance(`mail-campaigns/${id}`, {
        method: 'PATCH',
        data: JSON.stringify(updateData),
      });

      const updatedCampaign = await response.data();

      // 목록 업데이트
      setCampaigns(campaigns.map(campaign =>
        campaign.id === id ? { ...campaign, ...updatedCampaign } : campaign
      ));

      setEditingCampaign(null);
      toast.success("이메일이 수정되었습니다.");
    } catch (error) {
      toast.error("이메일 수정 중 오류가 발생했습니다.");
    }
  };

  // 상태별 색상 및 텍스트
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'sent':
        return { color: 'bg-green-500', text: '발송됨' };
      case 'scheduled':
        return { color: 'bg-blue-500', text: '예약됨' };
      case 'draft':
        return { color: 'bg-gray-500', text: '임시저장' };
      case 'test':
        return { color: 'bg-yellow-500', text: 'A/B테스트' };
      case 'partial':
        return { color: 'bg-yellow-500', text: '예약발송진행중' };
      case 'failed':
        return { color: 'bg-red-500', text: '발송실패' };
      default:
        return { color: 'bg-gray-500', text: '알 수 없음' };
    }
  };

  // 캠페인 카드 클릭 핸들러
  const handleCampaignClick = (campaign: MailCampaign) => {
    if (campaign.status === 'sent') {
      // 통계화면으로 리다이렉트
      navigate(`/send/${campaign.id}/stats`);
    } else {
      // 기존 상세 폼 진입
      setSelectedCampaignId(campaign.id);
      setShowForm(true);
    }
  };


  // 검색 필터링 - 안전한 처리
  const filteredCampaigns = campaigns.filter(campaign =>
    campaign?.name?.toLowerCase().includes(searchTerm.toLowerCase()) || false
  );

  useEffect(() => {
    fetchCampaigns();
  }, []);

  if (showForm) {
    return <SendMailForm
        campaignId={selectedCampaignId}
    />;
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      {/* 상단: 검색 + 새로 만들기 */}
      <div className="flex justify-between items-center mb-6">
        <input
          type="text"
          placeholder="이메일 제목, 태그 검색"
          className="w-1/2 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-black"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <button
            className={`ml-4 px-6 py-2 text-white font-semibold rounded-md shadow transition ${
                creating
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-red-600 hover:bg-red-700'
            }`}
            onClick={createNewCampaign}
            disabled={creating}
        >
          {creating ? '생성 중...' : '+ 새로 만들기'}
        </button>
      </div>

      {/* 로딩 상태 */}
      {loading ? (
        <div className="text-center py-8">
          <div className="text-gray-500">이메일 목록을 불러오는 중...</div>
        </div>
      ) : (
        /* 이메일 이메일 카드 리스트 */
        <div className="items-center bg-white rounded-lg shadow p-1 divide-y divide-gray-200">
          {filteredCampaigns.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchTerm ? '검색 결과가 없습니다.' : '등록된 이메일이 없습니다.'}
            </div>
          ) : (
            filteredCampaigns.map((campaign) => {
              const statusInfo = getStatusInfo(campaign.status);
              const isSent = campaign.status === 'sent' && 'test' && 'partial'; // 추가
              return (
                <div
                    key={campaign.id}
                    className={`
                              flex items-center px-4 py-4 hover:bg-gray-100 cursor-pointer"
                              ${isSent ? 'opacity-60 pointer-events-none' : ''}
                            `}
                >
                  <div className="flex-1 cursor-pointer"
                       onClick={() => handleCampaignClick(campaign)}
                       // style={isSent ? { cursor: 'not-allowed' } : {}}
                       style={campaign.status === 'sent' ? { cursor: 'pointer', pointerEvents: 'auto' } : { cursor: 'pointer' }}
                  >
                    <div className="flex items-center gap-4 mb-2">
                      <span
                          className={`inline-block w-2 h-2 ${statusInfo.color} rounded-full`}
                          title={statusInfo.text}
                      ></span>
                      <span className="text-lg font-bold">{campaign.name}</span>
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      {/*{campaign.send_date && `발송일: ${new Date(campaign.send_date).toLocaleDateString()}`}*/}
                      {/*{campaign.addressBookName && ` | 주소록: ${campaign.addressBookName}`}*/}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      생성일: {new Date(campaign.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {/*<button*/}
                    {/*  onClick={() => fetchCampaignDetail(campaign.id)}*/}
                    {/*  className="text-blue-500 hover:underline text-sm"*/}
                    {/*>*/}
                    {/*  미리보기*/}
                    {/*</button>*/}
                    <button
                      onClick={() => handleCampaignClick(campaign)}
                      className="text-green-500 hover:underline text-sm"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => deleteCampaign(campaign.id)}
                      className="text-red-500 hover:underline text-sm"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* 이메일 수정 모달 */}
      {editingCampaign && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">이메일 수정</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">제목</label>
                <input
                  type="text"
                  value={editingCampaign.name}
                  onChange={(e) => setEditingCampaign({
                    ...editingCampaign,
                    name: e.target.value
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">상태</label>
                <select
                  value={editingCampaign.status}
                  onChange={(e) => setEditingCampaign({
                    ...editingCampaign,
                    status: e.target.value as MailCampaign['status']
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  <option value="draft">임시저장</option>
                  <option value="scheduled">예약됨</option>
                  <option value="test">AB테스트</option>
                  <option value="sent">발송됨</option>
                  <option value="failed">발송실패</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setEditingCampaign(null)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={() => updateCampaign(editingCampaign.id, {
                  name: editingCampaign.name,
                  status: editingCampaign.status
                })}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SendMailDashboard;