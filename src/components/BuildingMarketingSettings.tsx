import { useState } from "react";
import { Globe, Copy, Check, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { nivasaApi } from "@/lib/api";
import { motion } from "framer-motion";

interface Props {
  buildingId: string;
  isPublic: boolean;
  slug: string;
  description: string;
  contactPhone: string;
  onUpdate: () => void;
}

export function BuildingMarketingSettings({ buildingId, isPublic, slug, description, contactPhone, onUpdate }: Props) {
  const [publishing, setPublishing] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const [formData, setFormData] = useState({
    is_public: isPublic || false,
    slug: slug || "",
    public_description: description || "",
    contact_phone: contactPhone || "",
  });

  const publicUrl = formData.slug ? `https://nivasa.app/p/${formData.slug}` : "";

  const handleSave = async () => {
    try {
      setPublishing(true);
      if (formData.is_public && !formData.slug) {
        toast.error("Please enter a custom URL slug before publishing.");
        return;
      }
      if (formData.is_public && !formData.contact_phone) {
        toast.error("Please provide a WhatsApp contact number for leads.");
        return;
      }

      await nivasaApi.updateBuilding(buildingId, {
        is_public: formData.is_public,
        slug: formData.slug || undefined,
        public_description: formData.public_description,
        contact_phone: formData.contact_phone,
      });

      toast.success("Marketing settings saved successfully!");
      onUpdate();
    } catch (err) {
      console.error(err);
      toast.error("Failed to update settings. Slug might be taken.");
    } finally {
      setPublishing(false);
    }
  };

  const copyLink = () => {
    if (!publicUrl) return;
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    toast.success("Link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mt-8 rounded-[28px] bg-card p-6 shadow-sm border border-border/60">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
          <Globe className="h-5 w-5 text-blue-500" />
        </div>
        <div>
          <h2 className="text-lg font-bold">Mini Website</h2>
          <p className="text-xs text-muted-foreground">Get inbound leads from WhatsApp</p>
        </div>
      </div>

      <div className="space-y-5">
        <div className="flex items-center justify-between rounded-xl border border-border/50 bg-secondary/20 p-4">
          <div>
            <p className="text-sm font-semibold">Publish Property</p>
            <p className="text-xs text-muted-foreground mt-1">Make this property visible to the public</p>
          </div>
          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              className="peer sr-only"
              checked={formData.is_public}
              onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
            />
            <div className="peer h-6 w-11 rounded-full bg-secondary after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-500 peer-checked:after:translate-x-full peer-focus:outline-none"></div>
          </label>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Custom URL Slug</label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground bg-secondary/50 px-3 py-2.5 rounded-l-xl border border-r-0 border-border">nivasa.app/p/</span>
              <input
                type="text"
                placeholder="e.g. greenwood-pg"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
                className="w-full rounded-r-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">WhatsApp Contact Number</label>
            <input
              type="tel"
              placeholder="+91 98765 43210"
              value={formData.contact_phone}
              onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Marketing Description</label>
            <textarea
              placeholder="Describe why tenants should choose your property..."
              rows={3}
              value={formData.public_description}
              onChange={(e) => setFormData({ ...formData, public_description: e.target.value })}
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none"
            />
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={publishing}
          className="w-full rounded-xl bg-foreground text-background py-3 text-sm font-semibold transition-transform active:scale-[0.98]"
        >
          {publishing ? "Saving..." : "Save Settings"}
        </button>

        {formData.is_public && formData.slug && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-4 border border-blue-500/20 bg-blue-500/5 rounded-2xl flex flex-col items-center text-center space-y-3"
          >
            <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Your Mini Website is Live!</p>
            <div className="flex w-full items-center gap-2">
              <a href={publicUrl} target="_blank" rel="noreferrer" className="flex-1 truncate text-xs font-medium bg-background border border-border px-3 py-2 rounded-lg text-foreground hover:bg-secondary transition-colors">
                {publicUrl}
              </a>
              <button onClick={copyLink} className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
