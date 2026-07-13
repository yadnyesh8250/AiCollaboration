import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Alert, AlertDescription } from "../../components/ui/alert";

export default function InvitationAcceptance() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") || "";

  const [isLoading, setIsLoading] = useState(false);
  const [inviteDetails, setInviteDetails] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!token) {
      setErrorMsg("Invalid or missing invitation token. Please check your link.");
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setInviteDetails({
        inviterName: "Sarah Connor",
        orgName: "Cyberdyne Systems",
        workspaceName: "Skynet Project",
      });
      setIsLoading(false);
    }, 1200);
  }, [token]);

  const handleAccept = async () => {
    setIsLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      navigate("/workspaces/1"); 
    } catch (err) {
      setErrorMsg("Failed to join organization.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDecline = () => {
    navigate("/login");
  };

  if (isLoading && !inviteDetails) {
    return (
      <div className="flex flex-col items-center justify-center py-10 space-y-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-xs text-zinc-500 font-medium">Resolving invitation details...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col space-y-1 text-center">
        <h3 className="text-xl font-bold tracking-tight text-foreground">
          Workspace Invitation
        </h3>
        <p className="text-xs text-zinc-500">
          You have been invited to join a collaboration space
        </p>
      </div>

      {errorMsg && (
        <Alert variant="destructive">
          <AlertDescription>{errorMsg}</AlertDescription>
        </Alert>
      )}

      {inviteDetails && (
        <div className="space-y-6">
          {/* Details Card */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/20 text-xs font-bold text-primary flex items-center justify-center border border-primary/30">
                SC
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {inviteDetails.inviterName}
                </p>
                <p className="text-[10px] text-zinc-500 font-medium">
                  Invited you to collaborate
                </p>
              </div>
            </div>

            <div className="border-t border-zinc-800/60 pt-3">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                Target Workspace
              </p>
              <p className="text-sm font-bold text-foreground mt-0.5">
                {inviteDetails.orgName} / {inviteDetails.workspaceName}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="space-y-2">
            <button
              onClick={handleAccept}
              disabled={isLoading}
              className="flex w-full items-center justify-center rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-all duration-150 disabled:pointer-events-none disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
              ) : (
                "Accept Invitation"
              )}
            </button>

            <button
              onClick={handleDecline}
              disabled={isLoading}
              className="flex w-full items-center justify-center rounded-lg border border-zinc-800 bg-transparent py-2.5 text-sm font-semibold text-foreground hover:bg-muted/40 transition-all duration-150 disabled:pointer-events-none disabled:opacity-50 cursor-pointer"
            >
              Decline
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
