import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { nivasaApi } from "@/lib/api";
import type { Building } from "@/lib/types";
import { MapPin, Wifi, Wind, Zap, Droplets, CheckCircle2, Shield, Calendar, Navigation } from "lucide-react";
import { motion } from "framer-motion";

export default function PublicListing() {
  const { slug } = useParams();
  const [building, setBuilding] = useState<Building | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!slug) return;
      try {
        const data = await nivasaApi.getPublicBuilding(slug);
        if (data) {
          setBuilding(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [slug]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
      </div>
    );
  }

  if (!building) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6 text-center">
        <h1 className="text-2xl font-bold text-foreground">Property Not Found</h1>
        <p className="mt-2 text-muted-foreground">The property you are looking for does not exist or is no longer public.</p>
      </div>
    );
  }

  const amenities = building.public_amenities || ["Fully Furnished", "24/7 Water", "Security Camera", "Daily Cleaning"];

  const getAmenityIcon = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes("wifi") || n.includes("internet")) return <Wifi className="h-5 w-5" />;
    if (n.includes("ac") || n.includes("air condition")) return <Wind className="h-5 w-5" />;
    if (n.includes("electricity") || n.includes("power")) return <Zap className="h-5 w-5" />;
    if (n.includes("water") || n.includes("ro")) return <Droplets className="h-5 w-5" />;
    if (n.includes("security") || n.includes("cctv") || n.includes("guard")) return <Shield className="h-5 w-5" />;
    return <CheckCircle2 className="h-5 w-5" />;
  };

  const handleContactWhatsApp = () => {
    const phone = building.contact_phone || "";
    const cleanPhone = phone.replace(/\D/g, "");
    if (!cleanPhone) {
      alert("No contact number provided for this property.");
      return;
    }
    const message = `Hi! I am interested in your property: ${building.name}. Could you share more details?\n\n- Sent via Nivasa by Ami Group.`;
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  return (
    <div className="min-h-[100dvh] bg-secondary/30 pb-28">
      {/* Cover Image */}
      <div className="relative h-64 md:h-96 w-full bg-slate-200">
        {building.cover_image_url ? (
          <img 
            src={building.cover_image_url} 
            alt={building.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand/20 to-brand/5">
            <span className="text-4xl font-bold text-brand/30">{building.name.charAt(0)}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
      </div>

      <div className="mx-auto max-w-3xl -mt-16 relative z-10 px-4 sm:px-6 lg:px-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border border-border/50 bg-card p-6 shadow-xl backdrop-blur-md sm:p-8"
        >
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-foreground sm:text-4xl tracking-tight">
              {building.name}
            </h1>
          </div>
          
          <div className="mt-4 flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-5 w-5 text-brand" />
            <span className="text-sm font-medium">{building.address || "Address not provided"}</span>
          </div>

          {building.images && building.images.length > 1 && (
            <div className="mt-8 border-t border-border/50 pt-8">
              <h2 className="text-xl font-semibold text-foreground mb-4">Gallery</h2>
              <div className="flex gap-4 overflow-x-auto pb-4 snap-x">
                {building.images.map((img, idx) => (
                  <div key={idx} className="h-40 w-48 shrink-0 overflow-hidden rounded-2xl border border-border snap-center">
                    <img src={img} alt={`Gallery image ${idx + 1}`} className="h-full w-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 border-t border-border/50 pt-8">
            <h2 className="text-xl font-semibold text-foreground">About the property</h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              {building.public_description || "A beautiful, well-maintained property offering comfortable living spaces. Reach out to learn more about availability and pricing."}
            </p>
          </div>

          <div className="mt-8 border-t border-border/50 pt-8">
            <h2 className="text-xl font-semibold text-foreground">Amenities</h2>
            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
              {amenities.map((amenity, i) => (
                <div key={i} className="flex items-center gap-3 rounded-2xl border border-border/50 bg-secondary/50 p-4 transition-colors hover:bg-secondary">
                  <div className="text-brand">
                    {getAmenityIcon(amenity)}
                  </div>
                  <span className="text-sm font-medium text-foreground">{amenity}</span>
                </div>
              ))}
            </div>
          </div>

          {building.address && (() => {
            const isUrl = building.address.trim().startsWith("http://") || building.address.trim().startsWith("https://");
            const directionsUrl = isUrl 
              ? building.address.trim() 
              : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(building.address)}`;
            
            return (
              <div className="mt-8 border-t border-border/50 pt-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-foreground">Location</h2>
                  <a 
                    href={directionsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary transition-colors"
                  >
                    <Navigation className="h-3.5 w-3.5 text-brand" /> Get Directions
                  </a>
                </div>
                
                {isUrl ? (
                  <div className="flex flex-col items-center justify-center w-full h-64 overflow-hidden rounded-2xl border border-border/50 shadow-sm relative bg-secondary/30 p-6 text-center space-y-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand/10 text-brand">
                      <MapPin className="h-6 w-6 animate-pulse" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Google Maps Location Provided</p>
                      <p className="text-xs text-muted-foreground mt-1 max-w-[280px] mx-auto">Click below to view the address and get turn-by-turn navigation directly on Google Maps.</p>
                    </div>
                    <a
                      href={directionsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand text-white px-5 py-2.5 text-xs font-semibold shadow-soft hover:opacity-90 transition-opacity"
                    >
                      <Navigation className="h-3.5 w-3.5" /> Open in Google Maps
                    </a>
                  </div>
                ) : (
                  <div className="w-full h-64 overflow-hidden rounded-2xl border border-border/50 shadow-sm relative bg-secondary/50">
                    <iframe 
                      width="100%" 
                      height="100%" 
                      frameBorder="0" 
                      style={{ border: 0 }} 
                      src={`https://www.google.com/maps/embed?origin=mfe&pb=!1m3!2m1!1s${encodeURIComponent(building.address)}!6i15`} 
                      allowFullScreen 
                      title="Google Maps Location"
                    ></iframe>
                  </div>
                )}
              </div>
            );
          })()}
        </motion.div>
      </div>

      {/* Sticky Bottom Bar for Action */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/80 p-4 backdrop-blur-xl sm:p-6">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <div className="hidden sm:block">
            <p className="text-sm font-semibold text-foreground">Interested in {building.name}?</p>
            <p className="text-xs text-muted-foreground">Contact the owner directly</p>
          </div>
          <button
            onClick={handleContactWhatsApp}
            className="flex flex-1 sm:flex-none items-center justify-center gap-2 rounded-2xl bg-[#25D366] px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#25D366]/20 transition-all hover:bg-[#20bd5a] hover:scale-[1.02] active:scale-95"
          >
            Contact on WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
}
