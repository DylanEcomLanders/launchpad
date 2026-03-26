"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { Logo } from "@/components/logo";

interface NdaData {
  memberName: string;
  memberRole: string;
  signed: boolean;
  signedDate?: string;
  signedName?: string;
}

export default function NdaPage() {
  const { token } = useParams<{ token: string }>();
  const [nda, setNda] = useState<NdaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [signName, setSignName] = useState("");
  const [signing, setSigning] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [signatureData, setSignatureData] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);

  const startDraw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    isDrawing.current = true;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = ("touches" in e ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = ("touches" in e ? e.touches[0].clientY : e.clientY) - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
  }, []);

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = ("touches" in e ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = ("touches" in e ? e.touches[0].clientY : e.clientY) - rect.top;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#1A1A1A";
    ctx.lineTo(x, y);
    ctx.stroke();
  }, []);

  const endDraw = useCallback(() => {
    isDrawing.current = false;
    const canvas = canvasRef.current;
    if (canvas) setSignatureData(canvas.toDataURL());
  }, []);

  const clearSignature = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignatureData("");
  }, []);

  useEffect(() => {
    fetch(`/api/nda?token=${token}`)
      .then((r) => r.json())
      .then((d) => { setNda(d.nda); setLoading(false); })
      .catch(() => setLoading(false));
  }, [token]);

  const handleSign = async () => {
    if (!signName.trim() || !agreed) return;
    setSigning(true);
    try {
      const res = await fetch("/api/nda", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, signedName: signName.trim(), signatureImage: signatureData }),
      });
      if (res.ok) {
        setNda((prev) => prev ? { ...prev, signed: true, signedDate: new Date().toISOString().split("T")[0], signedName: signName.trim() } : null);
      }
    } catch {}
    setSigning(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin size-6 border-2 border-[#E5E5EA] border-t-[#1A1A1A] rounded-full" />
      </div>
    );
  }

  if (!nda) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-[#777]">NDA not found or invalid link.</p>
      </div>
    );
  }

  const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <div className="max-w-2xl mx-auto px-6 py-12 md:py-20">
        {/* Header */}
        <div className="text-center mb-12">
          <Logo height={18} />
          <p className="text-xs text-[#AAA] uppercase tracking-[0.2em] mt-6">Confidentiality Agreement</p>
        </div>

        {/* NDA Content */}
        <div className="bg-white border border-[#E8E8E8] rounded-2xl p-8 md:p-12 shadow-sm">
          {nda.signed ? (
            <div className="text-center py-8">
              <div className="size-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="size-8 text-emerald-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-[#1A1A1A] mb-2">NDA Signed</h2>
              <p className="text-sm text-[#777]">
                Signed by <strong>{nda.signedName}</strong> on {nda.signedDate}
              </p>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-bold text-[#1A1A1A] mb-6">Non-Disclosure Agreement</h1>

              <div className="prose prose-sm text-[#555] leading-relaxed space-y-4 text-sm">
                <p>
                  This Non-Disclosure Agreement (&quot;Agreement&quot;) is entered into as of <strong>{today}</strong> between:
                </p>

                <p>
                  <strong>Ecomlanders Ltd</strong> (&quot;the Company&quot;), and
                </p>

                <p>
                  <strong>{nda.memberName}</strong>, {nda.memberRole} (&quot;the Recipient&quot;).
                </p>

                <h3 className="text-sm font-bold text-[#1A1A1A] mt-6">1. Confidential Information</h3>
                <p>
                  &quot;Confidential Information&quot; means any and all information disclosed by the Company to the Recipient, including but not limited to: client data, project details, business strategies, financial information, technical systems, proprietary tools, client lists, pricing structures, internal processes, and any other information that is not publicly available.
                </p>

                <h3 className="text-sm font-bold text-[#1A1A1A] mt-6">2. Obligations</h3>
                <p>
                  The Recipient agrees to: (a) keep all Confidential Information strictly confidential; (b) not disclose any Confidential Information to any third party without prior written consent from the Company; (c) use the Confidential Information solely for the purpose of providing their services to the Company; (d) take all reasonable measures to protect the confidentiality of the information.
                </p>

                <h3 className="text-sm font-bold text-[#1A1A1A] mt-6">3. Client Information</h3>
                <p>
                  The Recipient acknowledges that all client information, including but not limited to client names, contact details, project specifications, store URLs, analytics data, revenue figures, and conversion data, is strictly confidential. The Recipient shall not share, discuss, or disclose any client information with anyone outside of the Company, including on social media, personal channels, or to other clients.
                </p>

                <h3 className="text-sm font-bold text-[#1A1A1A] mt-6">4. Intellectual Property</h3>
                <p>
                  All work product, designs, code, strategies, and materials created during the Recipient&apos;s engagement with the Company remain the exclusive property of the Company and its clients. The Recipient shall not use, reproduce, or distribute any such materials for personal use or for the benefit of any third party.
                </p>

                <h3 className="text-sm font-bold text-[#1A1A1A] mt-6">5. Duration</h3>
                <p>
                  This Agreement shall remain in effect for the duration of the Recipient&apos;s engagement with the Company and for a period of two (2) years following the termination of that engagement.
                </p>

                <h3 className="text-sm font-bold text-[#1A1A1A] mt-6">6. Breach</h3>
                <p>
                  Any breach of this Agreement may result in immediate termination of the Recipient&apos;s engagement and may give rise to legal action for damages and injunctive relief.
                </p>

                <h3 className="text-sm font-bold text-[#1A1A1A] mt-6">7. Governing Law</h3>
                <p>
                  This Agreement shall be governed by and construed in accordance with the laws of England and Wales.
                </p>
              </div>

              {/* Signature section */}
              <div className="mt-10 pt-8 border-t border-[#E8E8E8]">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#AAA] mb-4">Sign this Agreement</p>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-[#555] block mb-1.5">Your full name</label>
                    <input
                      type="text"
                      value={signName}
                      onChange={(e) => setSignName(e.target.value)}
                      className="w-full px-4 py-2.5 text-sm border border-[#E5E5EA] rounded-lg focus:outline-none focus:border-[#999]"
                      placeholder={nda.memberName}
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-medium text-[#555]">Draw your signature</label>
                      {signatureData && (
                        <button onClick={clearSignature} className="text-[10px] text-[#AAA] hover:text-[#1A1A1A]">Clear</button>
                      )}
                    </div>
                    <canvas
                      ref={canvasRef}
                      width={500}
                      height={150}
                      onMouseDown={startDraw}
                      onMouseMove={draw}
                      onMouseUp={endDraw}
                      onMouseLeave={endDraw}
                      onTouchStart={startDraw}
                      onTouchMove={draw}
                      onTouchEnd={endDraw}
                      className="w-full border border-[#E5E5EA] rounded-lg cursor-crosshair bg-white touch-none"
                      style={{ height: 150 }}
                    />
                  </div>

                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={agreed}
                      onChange={(e) => setAgreed(e.target.checked)}
                      className="mt-0.5 size-4 rounded border-[#E5E5EA] accent-[#1A1A1A]"
                    />
                    <span className="text-xs text-[#777] leading-relaxed">
                      I, <strong>{signName || nda.memberName}</strong>, have read, understood, and agree to the terms of this Non-Disclosure Agreement.
                    </span>
                  </label>

                  <button
                    onClick={handleSign}
                    disabled={!signName.trim() || !agreed || !signatureData || signing}
                    className="w-full py-3 bg-[#1A1A1A] text-white text-sm font-semibold rounded-xl hover:bg-[#2D2D2D] transition-colors disabled:opacity-30"
                  >
                    {signing ? "Signing..." : "Sign Agreement"}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <p className="text-[10px] text-[#CCC] text-center mt-8">© 2026 Ecomlanders Ltd. All rights reserved.</p>
      </div>
    </div>
  );
}
