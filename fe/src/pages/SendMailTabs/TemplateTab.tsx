import React from 'react';

const categories = [
  '전체', '기본 템플릿', '뉴스레터', '웰컴 이메일', '상품판매', '이벤트', '공지',
  '리빙', 'B2B', '뷰티', '비영리단체', 'F&B', '패션', '플랫폼',
];

const TemplateTab: React.FC = () => {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-8">템플릿을 선택하세요</h2>
      <div className="flex gap-8">
        {/* 좌측 카테고리 */}
        <div className="w-48">
          <ul className="space-y-2">
            {categories.map(cat => (
              <li key={cat} className="text-gray-700 hover:text-blue-600 cursor-pointer px-2 py-1 rounded hover:bg-gray-100">
                {cat}
              </li>
            ))}
          </ul>
        </div>
        {/* 우측 템플릿 카드 그리드 */}
        <div className="flex-1 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {/* 예시 카드 */}
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow p-4 flex flex-col items-center justify-center border border-gray-100 hover:border-blue-400 cursor-pointer transition">
              <div className="w-24 h-32 bg-gray-100 rounded mb-3"></div>
              <div className="font-semibold mb-1">템플릿 {i + 1}</div>
              <div className="text-xs text-gray-400">기본 템플릿</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TemplateTab; 