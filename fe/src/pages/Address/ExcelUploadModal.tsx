// ExcelUploadModal.tsx
import React, { useRef, useEffect, useState } from 'react';

interface Props {
    open: boolean;
    onClose: () => void;
    onUpload: (file: File) => void;
    sampleUrl: string;
}
const ExcelUploadModal: React.FC<Props> = ({ open, onClose, onUpload, sampleUrl }) => {
    const fileRef = useRef<HTMLInputElement>(null);
    const modalRef = useRef<HTMLDivElement>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    // 바깥 클릭 시 닫힘
    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open, onClose]);

    // 샘플 다운로드
    const handleDownloadSample = () => {
        const link = document.createElement('a');
        link.href = sampleUrl;
        link.download = 'excel_upload_sample.csv';
        link.type = 'text/csv;charset=utf-8;';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // 파일 선택 핸들러
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setSelectedFile(e.target.files[0]);
        }
    };

    // 파일 업로드 버튼 클릭 시
    const handleUpload = async () => {
        if (!selectedFile) return;
        setIsUploading(true);
        await onUpload(selectedFile);
        setIsUploading(false);
        setSelectedFile(null);
        onClose();
    };


    if (!open) return null;
    return (
        <div className="fixed inset-0 bg-transparent backdrop-blur-sm flex items-center justify-center z-50">
            <div ref={modalRef} className="bg-white rounded-xl shadow-lg p-8 w-[420px]">
                <h2 className="text-lg font-bold mb-3">파일로 추가하기</h2>
                <div className="mb-4">
                    <ul className="text-sm text-gray-700 leading-relaxed mb-2">
                        <li>CSV 파일만 업로드할 수 있습니다. <button onClick={handleDownloadSample} className="underline text-blue-600">샘플 파일 내려받기</button></li>
                    </ul>
                    {/* 커스텀 파일선택 버튼 */}
                    <div className="flex items-center gap-2">
                        <input
                            ref={fileRef}
                            type="file"
                            accept=".csv"
                            className="hidden"
                            onChange={handleFileChange}
                            id="excel-upload-input"
                        />
                        <button
                            type="button"
                            onClick={() => fileRef.current?.click()}
                            className="px-4 py-2 rounded bg-blue-600 text-white font-semibold hover:bg-blue-700"
                        >
                            파일 선택
                        </button>
                        <span className="text-sm text-gray-700 truncate max-w-[180px]">
                            {selectedFile ? selectedFile.name : '선택된 파일 없음'}
                        </span>
                    </div>
                </div>
                <div className="flex justify-end gap-2">
                    <button className="px-4 py-2 rounded bg-gray-100" onClick={onClose}>취소</button>
                    <button
                        className="px-4 py-2 rounded bg-blue-600 text-white font-semibold hover:bg-blue-700"
                        onClick={handleUpload}
                        disabled={!selectedFile || isUploading}
                    >
                        {isUploading ? '업로드 중...' : '업로드'}
                    </button>
                </div>
            </div>
        </div>
    );
};
export default ExcelUploadModal;
