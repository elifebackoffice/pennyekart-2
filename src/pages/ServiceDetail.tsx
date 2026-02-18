import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, ExternalLink, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Service {
  id: string;
  name: string;
  website_url: string | null;
  logo_url: string | null;
  image_url: string | null;
}

const ServiceDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [iframeLoading, setIframeLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchService = async () => {
      try {
        const { data, error } = await supabase
          .from("services")
          .select("id, name, website_url, logo_url, image_url")
          .eq("id", id!)
          .single();

        if (error) throw error;
        if (!data?.website_url?.trim()) {
          setError("This service is not available yet. Please check back soon.");
        } else {
          setService(data as Service);
        }
      } catch {
        setError("Could not load this service. Please try again later.");
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchService();
  }, [id]);

  const url = service?.website_url?.trim() || null;

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="flex items-center gap-3 px-4 py-2 border-b bg-card shadow-sm shrink-0">
        <Button variant="ghost" size="sm" onClick={() => navigate("/services")} className="p-2">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        {service?.logo_url ? (
          <img src={service.logo_url} alt={service.name} className="h-5" />
        ) : null}
        <span className="font-semibold text-sm">{service?.name || "Service"}</span>
        {url && (
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto p-2 text-muted-foreground"
            onClick={() => window.open(url, "_blank")}
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        )}
      </header>

      <div className="flex-1 relative overflow-hidden">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {!loading && error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8 text-center">
            <div className="rounded-full bg-muted p-4">
              <AlertCircle className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-lg font-semibold">Coming Soon</h2>
            <p className="text-muted-foreground max-w-xs">{error}</p>
            <Button onClick={() => navigate("/services")} variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Services
            </Button>
          </div>
        )}

        {!loading && url && (
          <>
            {iframeLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Loading {service?.name}...</p>
                </div>
              </div>
            )}
            <iframe
              src={url}
              title={service?.name || "Service"}
              className="w-full h-full border-0"
              onLoad={() => setIframeLoading(false)}
              allow="geolocation; camera; microphone; payment"
              sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation"
            />
          </>
        )}
      </div>
    </div>
  );
};

export default ServiceDetail;
