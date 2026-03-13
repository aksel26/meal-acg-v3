"use client";

import { useRef, useState } from "react";
import { useUploadContract, useDeleteContract } from "@/hooks/use-contracts";
import { toast } from "@repo/ui/src/sonner";
import { Upload, Trash2, FileText, ExternalLink } from "lucide-react";
import type { ContractDocument } from "@/lib/supabase/types";

export default function ContractUpload({
  workerId,
  contracts,
}: {
  workerId: string;
  contracts: ContractDocument[];
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadMutation = useUploadContract();
  const deleteMutation = useDeleteContract();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowed.includes(file.type)) {
      toast.error("이미지(JPG, PNG, WebP) 또는 PDF만 업로드 가능합니다.");
      return;
    }

    try {
      await uploadMutation.mutateAsync({ workerId, file });
      toast.success("계약서가 업로드되었습니다.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "업로드에 실패했습니다.");
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDelete = async (id: string, fileName: string) => {
    if (!confirm(`"${fileName}" 파일을 삭제하시겠습니까?`)) return;
    try {
      await deleteMutation.mutateAsync({ id, workerId });
      toast.success("계약서가 삭제되었습니다.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "삭제에 실패했습니다.");
    }
  };

  const handlePreview = async (id: string) => {
    try {
      const res = await fetch(`/api/contracts/${id}`);
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      if (data.signedUrl) {
        setPreviewUrl(data.signedUrl);
      }
    } catch {
      toast.error("미리보기를 불러올 수 없습니다.");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">계약서</h4>
        <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-slate-50">
          <Upload size={13} />
          업로드
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf"
            className="hidden"
            onChange={handleFileChange}
          />
        </label>
      </div>

      {uploadMutation.isPending && (
        <div className="text-xs text-slate-400">업로드 중...</div>
      )}

      {contracts.length === 0 ? (
        <p className="text-xs text-slate-400">업로드된 계약서가 없습니다.</p>
      ) : (
        <div className="space-y-2">
          {contracts.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between rounded-lg border px-3 py-2"
            >
              <div className="flex items-center gap-2">
                <FileText size={14} className="text-slate-400" />
                <span className="text-xs font-medium">{doc.file_name}</span>
                {doc.file_size && (
                  <span className="text-xs text-slate-400">
                    ({(doc.file_size / 1024).toFixed(0)}KB)
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handlePreview(doc.id)}
                  className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <ExternalLink size={13} />
                </button>
                <button
                  onClick={() => handleDelete(doc.id, doc.file_name)}
                  className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {previewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setPreviewUrl(null)}>
          <div className="max-h-[80vh] max-w-[80vw] overflow-auto rounded-xl bg-white p-2" onClick={(e) => e.stopPropagation()}>
            <img src={previewUrl} alt="계약서 미리보기" className="max-h-[75vh] rounded-lg" />
          </div>
        </div>
      )}
    </div>
  );
}
