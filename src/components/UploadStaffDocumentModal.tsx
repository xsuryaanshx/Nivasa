import { useState } from "react";
import { X, FileText, Link as LinkIcon } from "lucide-react";
import { nivasaApi } from "@/lib/api";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export function UploadStaffDocumentModal({ 
  open, 
  onClose, 
  staffId,
  onSuccess 
}: { 
  open: boolean; 
  onClose: () => void;
  staffId: string;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    document_type: "",
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.error("Please select a file to upload");
      return;
    }
    
    // 5MB file size limit (5 * 1024 * 1024 bytes)
    if (selectedFile.size > 5 * 1024 * 1024) {
      toast.error("File is too large. Please upload a file smaller than 5MB.");
      return;
    }
    
    try {
      setLoading(true);

      // Upload file to Supabase storage
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${staffId}_${Math.random()}.${fileExt}`;
      const filePath = `staff/${fileName}`;

      const { data: uploadData, error: uploadError } = await nivasaApi.supabase.storage
        .from('documents')
        .upload(filePath, selectedFile);

      if (uploadError) {
        throw new Error("Storage upload failed. Please ensure you have created a 'documents' bucket in Supabase and made it public. Details: " + uploadError.message);
      }

      const { data: { publicUrl } } = nivasaApi.supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      await nivasaApi.addStaffDocument({
        staff_id: staffId,
        document_type: formData.document_type,
        document_url: publicUrl
      });
      toast.success("Document added successfully");
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.message || "Failed to add document");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-md overflow-hidden rounded-3xl border border-border bg-card shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-border/50 px-6 py-4">
            <h2 className="text-lg font-bold">Add Document</h2>
            <button
              onClick={onClose}
              className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Document Type</label>
                <div className="relative">
                  <FileText className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    required
                    value={formData.document_type}
                    onChange={e => setFormData(prev => ({ ...prev, document_type: e.target.value }))}
                    className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-brand"
                    placeholder="e.g. Aadhaar Card, ID Proof"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Upload File</label>
                <div className="relative flex items-center justify-center rounded-xl border border-dashed border-border bg-background p-6 transition-colors hover:bg-secondary/50">
                  <input
                    type="file"
                    required
                    accept="image/*,application/pdf"
                    onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                    className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                  />
                  <div className="flex flex-col items-center gap-2 text-center">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                    {selectedFile ? (
                      <p className="text-sm font-medium text-brand">{selectedFile.name}</p>
                    ) : (
                      <>
                        <p className="text-sm font-medium">Click to browse or take a photo</p>
                        <p className="text-xs text-muted-foreground">Supports PDF and Images</p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl bg-secondary py-2.5 text-sm font-semibold text-secondary-foreground transition-colors hover:bg-secondary/80"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 rounded-xl bg-brand py-2.5 text-sm font-semibold text-primary-foreground shadow-glow transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
              >
                {loading ? "Saving..." : "Save Document"}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
