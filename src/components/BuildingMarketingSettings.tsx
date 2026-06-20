import { useState } from "react";
import { Globe, Copy, Check, ExternalLink, Image as ImageIcon, Upload, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { nivasaApi } from "@/lib/api";
import { motion } from "framer-motion";

interface Props {
  buildingId: string;
  isPublic: boolean;
  slug: string;
  address: string;
  description: string;
  contactPhone: string;
  images?: string[];
  amenities?: string[];
  onUpdate: () => void;
}

const COMMON_AMENITIES = [
  "Fully Furnished", "AC", "Non-AC", "Wi-Fi", "RO Water", 
  "Security Camera", "Daily Cleaning", "Power Backup", 
  "Washing Machine", "TV", "Parking", "Meals Included"
];

export function BuildingMarketingSettings({ buildingId, isPublic, slug, address, description, contactPhone, images, amenities, onUpdate }: Props) {
  const [publishing, setPublishing] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const [formData, setFormData] = useState({
    is_public: isPublic || false,
    slug: slug || "",
    address: address || "",
    public_description: description || "",
    contact_phone: contactPhone || "",
    images: images || [],
    public_amenities: amenities || ["Fully Furnished", "Wi-Fi", "RO Water", "Security Camera"],
    cover_image_url: images && images.length > 0 ? images[0] : "",
  });

  const [uploadingImage, setUploadingImage] = useState(false);

  const publicUrl = formData.slug ? `https://app.amiflow.in/p/${formData.slug}` : "";

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
        address: formData.address || undefined,
        public_description: formData.public_description,
        contact_phone: formData.contact_phone,
        public_amenities: formData.public_amenities,
        images: formData.images,
        cover_image_url: formData.images[0] || "",
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

  const isSaved = formData.slug === slug && formData.is_public === isPublic && formData.address === address && slug !== "";

  const copyLink = () => {
    if (!publicUrl || !isSaved) return;
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    toast.success("Link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleAmenity = (amenity: string) => {
    setFormData(prev => {
      const current = prev.public_amenities || [];
      if (current.includes(amenity)) {
        return { ...prev, public_amenities: current.filter(a => a !== amenity) };
      } else {
        return { ...prev, public_amenities: [...current, amenity] };
      }
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (formData.images.length >= 6) {
      toast.error("You can only upload up to 6 photos.");
      return;
    }

    try {
      setUploadingImage(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `building_${buildingId}_${crypto.randomUUID()}.${fileExt}`;
      const filePath = `buildings/${fileName}`;
      
      const { error: uploadError } = await nivasaApi.supabase.storage
        .from('documents')
        .upload(filePath, file);
        
      if (uploadError) throw new Error(uploadError.message);

      const { data: { publicUrl } } = nivasaApi.supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      setFormData(prev => ({
        ...prev,
        images: [...prev.images, publicUrl],
        cover_image_url: prev.images.length === 0 ? publicUrl : prev.cover_image_url
      }));
      toast.success("Image uploaded!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to upload image.");
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  const removeImage = (index: number) => {
    setFormData(prev => {
      const newImages = [...prev.images];
      newImages.splice(index, 1);
      return {
        ...prev,
        images: newImages,
        cover_image_url: newImages[0] || ""
      };
    });
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
              <span className="text-sm text-muted-foreground bg-secondary/50 px-3 py-2.5 rounded-l-xl border border-r-0 border-border">app.amiflow.in/p/</span>
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
              value={formData.public_description}
              onChange={(e) => setFormData(prev => ({ ...prev, public_description: e.target.value }))}
              placeholder="Describe what makes your property special..."
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm min-h-[100px] resize-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Map Address / Coordinates</label>
            <p className="text-[10px] text-muted-foreground mb-1">Used to accurately pinpoint your property on the Google Map.</p>
            <textarea
              value={formData.address}
              onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
              placeholder="e.g. 123 Main Street, City OR 28.5355, 77.3910"
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm min-h-[60px] resize-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Property Amenities</label>
            <div className="flex flex-wrap gap-2">
              {COMMON_AMENITIES.map((amenity) => {
                const isSelected = (formData.public_amenities || []).includes(amenity);
                return (
                  <button
                    key={amenity}
                    onClick={() => toggleAmenity(amenity)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                      isSelected 
                        ? "border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400" 
                        : "border-border bg-secondary/30 text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                    }`}
                  >
                    {amenity}
                  </button>
                );
              })}
              
              {/* Render custom amenities that are selected but not in COMMON_AMENITIES */}
              {(formData.public_amenities || []).filter(a => !COMMON_AMENITIES.includes(a)).map(amenity => (
                <button
                  key={amenity}
                  onClick={() => toggleAmenity(amenity)}
                  className="rounded-full border border-blue-500 bg-blue-500/10 px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 transition-colors"
                >
                  {amenity}
                </button>
              ))}
            </div>

            {/* Custom Amenity Input */}
            <div className="mt-3 flex items-center gap-2">
              <input
                type="text"
                placeholder="Type custom amenity..."
                className="w-full sm:w-auto rounded-xl border border-border bg-background px-4 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const val = e.currentTarget.value.trim();
                    if (val && !(formData.public_amenities || []).includes(val)) {
                      setFormData(prev => ({ ...prev, public_amenities: [...(prev.public_amenities || []), val] }));
                    }
                    e.currentTarget.value = '';
                  }
                }}
              />
              <span className="text-[10px] text-muted-foreground hidden sm:inline-block">Press Enter to add</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Property Photos (Up to 6)</label>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {formData.images.map((url, i) => (
                <div key={i} className="relative aspect-video overflow-hidden rounded-xl border border-border">
                  <img src={url} alt="Property" className="h-full w-full object-cover" />
                  <button 
                    onClick={() => removeImage(i)}
                    className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md hover:bg-black/70"
                  >
                    <X className="h-3 w-3" />
                  </button>
                  {i === 0 && (
                    <div className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-bold text-white backdrop-blur-sm">COVER</div>
                  )}
                </div>
              ))}
              
              {formData.images.length < 6 && (
                <label className="flex aspect-video cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border/60 bg-secondary/20 hover:bg-secondary/40 hover:border-brand/50 transition-colors">
                  {uploadingImage ? (
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  ) : (
                    <>
                      <Upload className="mb-2 h-5 w-5 text-muted-foreground" />
                      <span className="text-[10px] font-medium text-muted-foreground">Add Photo</span>
                    </>
                  )}
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploadingImage} />
                </label>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={publishing}
          className="w-full rounded-xl bg-foreground text-background py-3 text-sm font-semibold transition-transform active:scale-[0.98]"
        >
          {publishing ? "Saving..." : "Save Settings"}
        </button>

        {isSaved && formData.is_public && formData.slug && (
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
        {!isSaved && formData.is_public && formData.slug && (
          <div className="mt-4 p-4 border border-yellow-500/20 bg-yellow-500/5 rounded-2xl flex flex-col items-center text-center space-y-2">
            <p className="text-sm font-medium text-yellow-600 dark:text-yellow-500">You have unsaved changes</p>
            <p className="text-xs text-muted-foreground">Click "Save Settings" above to make your mini website live at this URL.</p>
          </div>
        )}
      </div>
    </div>
  );
}
