import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ExcelUploadModal from './ExcelUploadModal.tsx'; // 상단 import 추가
import AddressBookEditModal from './AddressBookEditModal.tsx';
import { useAuthStore } from '../Auth/authStore';
import axiosInstance from "../Auth/axios.ts";
import toast from "react-hot-toast";

interface AddressBook {
    id: number;
    name: string;
    createdAt: string;
    lastAdded: string;
    subscribers: number;
}

const AddressBookDashboard: React.FC = () => {
    const navigate = useNavigate();
    const [books, setBooks] = useState<AddressBook[]>([]);
    const [dropdownOpen, setDropdownOpen] = useState<number | null>(null);
    const [addDropdownOpen, setAddDropdownOpen] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [editBook, setEditBook] = useState<AddressBook | null>(null);

    const { user } = useAuthStore(); // 현재 로그인된 유저 정보 접근

    // 엑셀업로드 팝업 오픈 제어
    const [excelModalOpen, setExcelModalOpen] = useState<{ open: boolean, groupId?: number }>({ open: false });

    // 각각의 드롭다운을 위한 ref 생성
    const dropdownRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});
    const addDropdownRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});

    // 바깥 클릭 감지 (⋮ 개별동작 드롭다운)
    useEffect(() => {
        if (dropdownOpen === null) return;
        const handler = (e: MouseEvent) => {
            if (
                dropdownRefs.current[dropdownOpen] &&
                !dropdownRefs.current[dropdownOpen]!.contains(e.target as Node)
            ) {
                setDropdownOpen(null);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [dropdownOpen]);

    // 바깥 클릭 감지 (추가하기 드롭다운)
    useEffect(() => {
        if (addDropdownOpen === null) return;
        const handler = (e: MouseEvent) => {
            if (
                addDropdownRefs.current[addDropdownOpen] &&
                !addDropdownRefs.current[addDropdownOpen]!.contains(e.target as Node)
            ) {
                setAddDropdownOpen(null);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [addDropdownOpen]);

    // 검색 필터링 - 안전한 처리
    const filteredBooks = books.filter(books =>
        books?.name?.toLowerCase().includes(searchTerm.toLowerCase()) || false
    );

    // 파일 업로드 핸들러
    const handleExcelUpload = (file: File) => {
        // FormData로 업로드하거나, 원하는 방식으로 API 호출
        // 예시
        if (!excelModalOpen.groupId) return;
        const formData = new FormData();
        formData.append('file', file);
        formData.append('group_id', excelModalOpen.groupId.toString());
        axiosInstance.post(`/mail-recipients/upload-excel`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        })
            .then(() => {
                toast.success("엑셀 업로드가 완료되었습니다.");
                setExcelModalOpen({ open: false });
                fetchBooks();
            })
            .catch(err => {
                toast.error(`업로드 실패: ${err.message || err}`);
            });
    };

    // 1. 주소록 조회
    useEffect(() => {
        fetchBooks();
    }, []);
    const fetchBooks = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await axiosInstance.get(`/mail-groups?user_id=${user?.id}`);
            const data = await res.data;
            setBooks(data);
        } catch (err) {
            setError('주소록 조회 실패');
        } finally {
            setLoading(false);
        }
    };

    // 4. 삭제
    const handleDeleteBook = async (book: AddressBook) => {
        if (!window.confirm(`정말 [${book.name}] 주소록을 삭제할까요?`)) return;
        setLoading(true);
        try {
            await axiosInstance.delete(`/mail-groups/${book.id}`);
            toast.success("주소록 삭제에 성공하였습니다.");
            await fetchBooks();
        } catch (err) {
            toast.error("주소록 삭제에 실패하였습니다.");
        } finally {
            setLoading(false);
        }
    };

    // 5. 복사 (API 없으면 프론트에서 단순 복제)
    const handleCopyBook = async (book: AddressBook) => {
        const name = prompt('복사본 이름을 입력하세요', `${book.name}_복사`);
        if (!name) return;

        setLoading(true);
        try {
            // 1. 새 주소록 생성
            const res = await axiosInstance.post(`/mail-groups`, {
                name,
                userId : user?.id ,
            });
            const newBook = await res.data;
            const subsRes = await axiosInstance.get(`/mail-recipients?group_id=${book.id}`);
            const oldSubs = await subsRes.data;

            // 3. 새 주소록에 구독자 등록 (배열로 POST)
            if (oldSubs && oldSubs.length > 0) {
                // 새 group_id로 구독자들 재구성
                const newSubs = oldSubs.map((sub: any) => ({
                    email: sub.email,
                    name: sub.name,
                    receive: sub.receive,
                    groupId: newBook.id,
                    // 필요한 추가 필드가 있다면 추가
                }));
                // 한 번에 여러건 등록
                await axiosInstance.post(`/mail-recipients`, { groupId: newBook.id, recipients: newSubs });
            }
            toast.success("주소록 복사에 성공하였습니다.");
            // 2. 기존 구독자 목록 가져오기
            await fetchBooks();
        } catch (err) {
            setError('주소록 복사에 실패하였습니다.');
        } finally {
            setLoading(false);
        }
    };

    // (구독자 직접 추가, 엑셀 업로드 등은 별도 구현 필요)

    return (
        <div className="max-w-5xl mx-auto px-6 py-8">
            <div className="flex justify-between items-center mb-6">
                <input
                    type="text"
                    placeholder="이메일 제목, 태그 검색"
                    className="w-1/2 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-black"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <button
                    className="ml-4 px-6 py-2 text-white font-semibold rounded-md shadow transition bg-red-600 hover:bg-red-700"
                    onClick={() => navigate('/address-books/new')}
                    disabled={loading}
                >
                    + 새로 만들기
                </button>
            </div>

            {error && <div className="mb-4 text-red-500">{error}</div>}

            <div className="items-center bg-white rounded-lg shadow p-1 divide-y divide-gray-200">
                {filteredBooks.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        {searchTerm ? '검색 결과가 없습니다.' : '등록된 주소록이 없습니다.'}
                    </div>
                ) : (
                filteredBooks.map((book) => (
                    <div key={book.id} className="flex items-center px-4 py-4 hover:bg-gray-100 cursor-pointer">
                        <div className="flex-1"  onClick={() => navigate(`/address-books/${book.id}/recipients`)}>
                            <div className="text-lg font-bold">{book.name}</div>
                            <div className="text-xs text-gray-400 mt-1">
                                생성일: {new Date(book.createdAt).toLocaleDateString()}
                            </div>
                        </div>
                        {/*<div className="w-24 text-center">*/}
                        {/*    <div className="text-xs text-gray-400 mb-1">구독자</div>*/}
                        {/*    <div className="text-lg font-bold">{book.subscribers}</div>*/}
                        {/*</div>*/}
                        {/* 추가하기 드롭다운 */}
                        <div className="relative w-32 text-center" ref={el => { addDropdownRefs.current[book.id] = el;}}>
                            <button
                                className="flex items-center justify-center gap-1 px-3 py-2 bg-gray-50 rounded border border-gray-200 text-gray-700 text-sm w-full"
                                onClick={e => {
                                    e.stopPropagation();
                                    setAddDropdownOpen(addDropdownOpen === book.id ? null : book.id);
                                }}
                            >
                                추가하기 <span>▼</span>
                            </button>
                            {addDropdownOpen === book.id && (
                                <div className="absolute right-0 mt-2 w-36 bg-white border border-gray-200 rounded shadow z-10">
                                    <button
                                        className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                                        onClick={() => {
                                            setAddDropdownOpen(null);
                                            navigate(`/address-books/${book.id}/add-direct`);
                                        }}
                                    >
                                        직접 추가
                                    </button>
                                    <button
                                        className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                                        onClick={() => {
                                            setAddDropdownOpen(null);
                                            setExcelModalOpen({ open: true, groupId: book.id });
                                        }}
                                    >
                                        엑셀 업로드
                                    </button>
                                </div>
                            )}
                        </div>
                        {/* 개별동작 드롭다운 */}
                        <div className="relative ml-2" ref={el => { dropdownRefs.current[book.id] = el;}}>
                            <button
                                className="w-10 h-10 flex items-center justify-center bg-gray-100 rounded"
                                onClick={e => {
                                    e.stopPropagation();
                                    setDropdownOpen(dropdownOpen === book.id ? null : book.id);
                                }}
                            >
                                <span>⋮</span>
                            </button>
                            {dropdownOpen === book.id && (
                                <div className="absolute right-0 mt-2 w-32 bg-white border border-gray-200 rounded shadow z-10">
                                    <button
                                        className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                                        onClick={() => { setDropdownOpen(null); setEditBook(book); }}
                                    >
                                        수정
                                    </button>
                                    <button
                                        className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                                        onClick={() => { setDropdownOpen(null); handleCopyBook(book); }}
                                    >
                                        복사
                                    </button>
                                    <button
                                        className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-red-500"
                                        onClick={() => { setDropdownOpen(null); handleDeleteBook(book); }}
                                    >
                                        삭제
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )))}

            </div>
            {/* 엑셀업로드 팝업 */}
            <ExcelUploadModal
                open={excelModalOpen.open}
                onClose={() => setExcelModalOpen({ open: false })}
                onUpload={handleExcelUpload}
                sampleUrl="/web/resource/excel_upload_sample.csv"
            />

            {editBook && (
                <AddressBookEditModal
                    book={editBook}
                    onClose={() => setEditBook(null)}
                    onSaved={fetchBooks} // 목록 다시 불러오기
                />
            )}
        </div>
    );
};

export default AddressBookDashboard;
