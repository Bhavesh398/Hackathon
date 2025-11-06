import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Award, Download, QrCode, Calendar, Trophy } from "lucide-react";

interface Certificate {
  id: string;
  event_id: string;
  certificate_code: string;
  issued_at: string;
  events?: {
    title: string;
  };
}

const Certificates = () => {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<string[]>([]);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Static (frontend-only) certificate to show as an example
  const staticCertificate: Certificate = {
    id: "static-certificate-1",
    event_id: "static-event",
    certificate_code: "135746342",
    // Issued date set to the provided sample date
    issued_at: "2025-11-06T00:00:00.000Z",
    events: { title: "Certificate" },
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }

    // Get user roles
    const { data: rolesData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id);
    
    setRoles(((rolesData as any[])?.map((r) => r.role)) || []);

    fetchCertificates();
  };

  const fetchCertificates = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("certificates")
        .select(`
          *,
          events (
            title
          )
        `)
        .eq("user_id", user.id)
        .order("issued_at", { ascending: false });

      if (error) throw error;

      setCertificates(data || []);
    } catch (error) {
      console.error("Error fetching certificates:", error);
      toast({
        title: "Error",
        description: "Failed to load certificates",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadCertificate = (certificateId: string) => {
    // If this is the static sample certificate, open a printable HTML certificate
    if (certificateId === staticCertificate.id) {
      // If a static JPG is available in public/, link to it for direct download and include it in the print view
      const staticPath = "/certificate-sample.jpg";
      // try to open printable view which includes the image
      openStaticCertificate(staticCertificate, staticPath);
      return;
    }

    toast({
      title: "Coming Soon",
      description: "Certificate download feature will be available soon!",
    });
  };

  const openStaticCertificate = (cert: Certificate, imagePath?: string) => {
    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) {
      toast({ title: "Blocked", description: "Popup blocked, allow popups for this site", variant: "destructive" });
      return;
    }

    const issuedDate = new Date(cert.issued_at).toLocaleDateString();
    const html = `
      <html>
      <head>
        <title>Certificate - ${cert.events?.title}</title>
        <style>
          body { font-family: Arial, sans-serif; display:flex; align-items:center; justify-content:center; height:100vh; margin:0; }
          .certificate { width:800px; border:10px solid #e5e7eb; padding:24px; text-align:center; }
          .cert-title { font-size:28px; font-weight:700; margin-bottom:8px; }
          .cert-sub { color:#6b7280; margin-bottom:24px; }
          .cert-name { font-size:22px; font-weight:600; margin:16px 0; }
          .cert-meta { color:#374151; margin-top:24px; }
        </style>
      </head>
      <body>
        <div class="certificate">
          ${imagePath ? `<div style="text-align:center"><img src="${imagePath}" alt="Certificate" style="max-width:100%;height:auto;border:1px solid #e5e7eb;margin-bottom:12px"/></div>` : ''}
          <div class="cert-title">${cert.events?.title}</div>
          <div class="cert-sub">Certificate of Participation</div>
          <div class="cert-name">Presented to <strong>Innovex Participant</strong></div>
          <div>For active participation in the program</div>
          <div class="cert-meta">Issued: ${issuedDate} • Code: ${cert.certificate_code}</div>
        </div>
        <script>function printAndClose(){ window.print(); }</script>
      </body>
      </html>
    `;

    win.document.open();
    win.document.write(html);
    win.document.close();
  };

  const viewQRCode = (certificateCode: string) => {
    toast({
      title: "Certificate Code",
      description: `Verification Code: ${certificateCode}`,
    });
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-background via-background to-muted/20">
        <AppSidebar userRoles={roles} />
        <main className="flex-1 p-8">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Award className="h-6 w-6 text-primary" />
                </div>
                <h1 className="text-3xl font-bold">My Certificates</h1>
              </div>
              <p className="text-muted-foreground">
                View and download your verified achievement certificates
              </p>
            </div>

            {/* Certificates Grid */}
            {loading ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Loading certificates...</p>
              </div>
            ) : ([staticCertificate, ...certificates].length === 0) ? (
              <Card className="text-center py-12">
                <CardContent>
                  <Trophy className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No Certificates Yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Participate in events and earn verified certificates
                  </p>
                  <Button onClick={() => navigate("/events")}>
                    Browse Events
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[staticCertificate, ...certificates].map((cert) => (
                  <Card
                    key={cert.id}
                    className="group hover:shadow-xl transition-all duration-300 border-border hover:border-primary/50 overflow-hidden"
                  >
                    <div className="h-2 bg-gradient-to-r from-primary to-secondary" />
                    <CardHeader>
                      <div className="flex items-start justify-between mb-2">
                        <div className="p-3 rounded-lg bg-primary/10 group-hover:scale-110 transition-transform">
                          <Award className="h-8 w-8 text-primary" />
                        </div>
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <QrCode className="h-3 w-3" />
                          Verified
                        </Badge>
                      </div>
                      <CardTitle className="text-xl">
                        {cert.events?.title || "Event Certificate"}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-1 mt-2">
                        <Calendar className="h-3 w-3" />
                        Issued on {new Date(cert.issued_at).toLocaleDateString()}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="p-3 bg-muted rounded-lg">
                          <p className="text-xs text-muted-foreground mb-1">Certificate Code</p>
                          <p className="text-sm font-mono font-semibold break-all">
                            {cert.certificate_code}
                          </p>
                        </div>
                        <div className="flex gap-2 mt-4">
                          <Button
                            onClick={() => downloadCertificate(cert.id)}
                            className="flex-1"
                            variant="default"
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </Button>
                          <Button
                            onClick={() => viewQRCode(cert.certificate_code)}
                            variant="outline"
                          >
                            <QrCode className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Info Card */}
            {certificates.length > 0 && (
              <Card className="mt-8 border-primary/20">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <QrCode className="h-5 w-5 text-primary" />
                    About QR Verification
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Each certificate comes with a unique QR code and verification code. 
                    Share your certificate code with employers or institutions to verify 
                    your achievement's authenticity.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Certificates;
