import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { api } from "../../services/api/client";
import { useAuthStore } from "../../stores/authStore";

export default function InvitationAcceptance() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") || "";
  const { user } = useAuthStore();

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    if (!token) {
      setErrorMsg("Invalid or missing invitation token. Please verify your link.");
    }
  }, [token]);

  const handleAccept = async () => {
    if (!token) return;
    setIsLoading(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const res = await api.post("/invites/accept", { token });
      setSuccessMsg(res.data.message || "Successfully joined the workspace!");
      setTimeout(() => {
        navigate("/");
      }, 1500);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Failed to accept the invitation. Make sure your logged-in email matches the invite target.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDecline = () => {
    navigate("/");
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200 selection:bg-primary/20 selection:text-white">
      <div className="flex flex-col space-y-2 text-center select-none">
        <div className="flex h-10 w-10 mx-auto items-center justify-center rounded-xl bg-white text-black font-black text-lg shadow-sm">
          A
        </div>
        <h3 className="text-lg font-bold tracking-tight text-white pt-2">
          Workspace Invitation
        </h3>
        <p className="text-[11px] text-zinc-550 font-medium">
          You have been invited to join a collaboration space
        </p>
      </div>

      {errorMsg && (
        <div className="rounded-lg border border-red-900/40 bg-red-950/15 p-3.5 text-[11px] font-semibold text-red-400 leading-relaxed text-center animate-in fade-in">
          {errorMsg}
        </div>
      )}

      {successMsg && (
        <div className="rounded-lg border border-emerald-900/40 bg-emerald-950/15 p-3.5 text-[11px] font-semibold text-emerald-450 leading-relaxed text-center animate-in fade-in">
          {successMsg}
        </div>
      )}

      <div className="space-y-5">
        {/* Details Card */}
        <div className="rounded-xl border border-zinc-950 bg-[#050505] p-5 space-y-3.5">
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest select-none">
            Invitation Details
          </p>
          <div className="space-y-1">
            <p className="text-xs text-zinc-300 font-semibold leading-relaxed">
              Target Email: <span className="text-white font-mono">{user?.email || "Guest Email"}</span>
            </p>
            <p className="text-[10px] text-zinc-550 font-medium leading-relaxed select-none">
              To join, accept this invitation. Your currently signed-in email address must match the target recipient email of the invite.
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="space-y-2">
          <button
            onClick={handleAccept}
            disabled={isLoading || !token}
            className="flex w-full h-9.5 items-center justify-center rounded-lg bg-white text-xs font-bold text-black hover:bg-zinc-200 transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent" />
            ) : (
              "Accept Invitation"
            )}
          </button>

          <button
            onClick={handleDecline}
            disabled={isLoading}
            className="flex w-full h-9.5 items-center justify-center rounded-lg border border-zinc-900 bg-transparent text-xs font-semibold text-zinc-400 hover:text-zinc-200 transition-all duration-150 disabled:pointer-events-none disabled:opacity-50 cursor-pointer"
          >
            Decline
          </button>
        </div>
      </div>
    </div>
  );
}
