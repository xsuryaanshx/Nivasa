import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { nivasaApi } from "@/lib/api";
import { 
  ArrowLeft, Calendar, Phone, Briefcase, IndianRupee, AlertCircle, CheckCircle2,
  FileText, Clock, Trash2, Edit2, Plus
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { MagneticButton } from "@/components/MagneticButton";
import { cn } from "@/lib/utils";
import { MarkAttendanceModal } from "@/components/MarkAttendanceModal";
import { RecordStaffPaymentModal } from "@/components/RecordStaffPaymentModal";
import { UploadStaffDocumentModal } from "@/components/UploadStaffDocumentModal";

export default function StaffDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [staff, setStaff] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);

  const fetchData = async () => {
    try {
      if (!id) return;
      setLoading(true);
      const [sData, pData, aData, dData] = await Promise.all([
        nivasaApi.getStaffById(id),
        nivasaApi.getStaffPayments(id),
        nivasaApi.getStaffAttendance(id),
        nivasaApi.getStaffDocuments(id)
      ]);
      setStaff(sData);
      setPayments(pData);
      setAttendance(aData);
      setDocuments(dData);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading staff details...</div>;
  }

  if (!staff) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold mb-2">Staff Not Found</h2>
        <button onClick={() => navigate("/app/staff")} className="text-brand hover:underline">
          Go back to Staff list
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <button 
        onClick={() => navigate("/app/staff")}
        className="mb-6 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Staff
      </button>

      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm mb-8">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 bg-gradient-brand rounded-full text-white flex items-center justify-center text-2xl font-bold shadow-glow shrink-0">
              {staff.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{staff.name}</h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5"><Briefcase className="h-4 w-4"/> {staff.role}</span>
                {staff.phone && <span className="flex items-center gap-1.5"><Phone className="h-4 w-4"/> {staff.phone}</span>}
                <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4"/> Joined {new Date(staff.join_date).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="h-9 w-9 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center hover:bg-secondary/80 transition-colors">
              <Edit2 className="h-4 w-4" />
            </button>
            <button className="h-9 w-9 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500/20 transition-colors">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-8 border-t border-border">
          <div>
            <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Salary</div>
            <div className="font-semibold text-lg">₹{staff.monthly_salary}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Status</div>
            <div className={cn(
              "inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize",
              staff.status === 'active' ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
            )}>
              {staff.status}
            </div>
          </div>
          {staff.emergency_contact_name && (
            <div className="col-span-2">
              <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wider flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5 text-orange-500" /> Emergency Contact
              </div>
              <div className="font-medium text-sm">{staff.emergency_contact_name} ({staff.emergency_contact_phone})</div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Payments Section */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <IndianRupee className="h-5 w-5 text-emerald-500" /> Payment History
            </h2>
            <MagneticButton size="sm" onClick={() => setIsPaymentModalOpen(true)}>
              <Plus className="h-4 w-4" /> Record
            </MagneticButton>
          </div>
          {payments.length === 0 ? (
            <div className="text-center py-6 text-sm text-muted-foreground">No payments recorded yet.</div>
          ) : (
            <div className="space-y-4">
              {payments.map(p => (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                  <div className="flex flex-col">
                    <span className="font-medium">₹{p.amount}</span>
                    <span className="text-xs text-muted-foreground">{new Date(p.payment_date).toLocaleDateString()}</span>
                  </div>
                  {p.notes && <span className="text-xs text-muted-foreground truncate max-w-[120px]">{p.notes}</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Attendance Section */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-500" /> Absences & Leaves
            </h2>
            <MagneticButton size="sm" onClick={() => setIsAttendanceModalOpen(true)}>
              <Plus className="h-4 w-4" /> Mark
            </MagneticButton>
          </div>
          {attendance.length === 0 ? (
            <div className="text-center py-6 text-sm text-muted-foreground">No absences recorded.</div>
          ) : (
            <div className="space-y-4">
              {attendance.map(a => (
                <div key={a.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                  <span className="text-sm">{new Date(a.date).toLocaleDateString()}</span>
                  <span className={cn(
                    "text-xs px-2 py-1 rounded-md capitalize font-medium",
                    a.status === 'present' ? "bg-emerald-500/10 text-emerald-500" :
                    a.status === 'absent' ? "bg-red-500/10 text-red-500" :
                    "bg-orange-500/10 text-orange-500"
                  )}>
                    {a.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Documents Section */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm md:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <FileText className="h-5 w-5 text-purple-500" /> Documents
            </h2>
            <MagneticButton size="sm" onClick={() => setIsDocumentModalOpen(true)}>
              <Plus className="h-4 w-4" /> Upload
            </MagneticButton>
          </div>
          {documents.length === 0 ? (
            <div className="text-center py-6 text-sm text-muted-foreground">No documents uploaded.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {documents.map(d => (
                <div key={d.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-secondary/20">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-medium truncate">{d.document_type}</span>
                    <a href={d.document_url} target="_blank" rel="noreferrer" className="text-xs text-brand hover:underline">View File</a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <MarkAttendanceModal
        open={isAttendanceModalOpen}
        onClose={() => setIsAttendanceModalOpen(false)}
        staffId={id!}
        onSuccess={fetchData}
      />
      
      <RecordStaffPaymentModal
        open={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        staffId={id!}
        onSuccess={fetchData}
      />

      <UploadStaffDocumentModal
        open={isDocumentModalOpen}
        onClose={() => setIsDocumentModalOpen(false)}
        staffId={id!}
        onSuccess={fetchData}
      />
    </div>
  );
}
