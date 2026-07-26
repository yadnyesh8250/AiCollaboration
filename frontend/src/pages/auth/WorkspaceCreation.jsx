import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as zod from "zod";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "../../services/api/client";
import FormField from "../../components/common/FormField";
import { Alert, AlertDescription } from "../../components/ui/alert";

const workspaceSchema = zod.object({
  name: zod.string().min(2, "Workspace name must be at least 2 characters"),
});

export default function WorkspaceCreation() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const orgId = searchParams.get("orgId");
  const orgSlug = searchParams.get("orgSlug") || "org";

  const [setupStep, setSetupStep] = useState(0); 
  const [progressText, setProgressText] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(workspaceSchema),
    defaultValues: { name: "" },
  });

  const onSubmit = async (data) => {
    setSetupStep(1);
    setErrorMsg("");
    
    try {
      setProgressText("Provisioning workspace registry...");
      
      const workspaceSlug = data.name.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-");
      
      const res = await api.post(`/organizations/${orgId}/workspaces`, {
        name: data.name,
        slug: workspaceSlug,
        description: "Auto-provisioned workspace.",
      });

      if (res.data.success) {
        queryClient.invalidateQueries({ queryKey: ["workspaces", orgId] });
        setProgressText("Initializing AI context graph...");
        await new Promise((resolve) => setTimeout(resolve, 800));

        setProgressText("Deploying collaboration channels...");
        await new Promise((resolve) => setTimeout(resolve, 600));

        setSetupStep(2);
        setProgressText("Workspace ready! Redirecting...");
        await new Promise((resolve) => setTimeout(resolve, 1000));
        
        navigate("/");
      }
    } catch (err) {
      console.error(err);
      setSetupStep(0);
      setErrorMsg(err.response?.data?.message || "Failed to create workspace.");
    }
  };

  if (setupStep > 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 space-y-6 animate-in fade-in duration-200">
        <div className="relative flex h-14 w-14 items-center justify-center">
          <div className="absolute inset-0 animate-ping rounded-full bg-white/5" />
          <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-white border-t-transparent z-10" />
        </div>
        <div className="text-center space-y-1.5 select-none">
          <h4 className="text-xs font-bold tracking-tight text-white uppercase tracking-wider">
            Configuring environment
          </h4>
          <p className="text-[11px] text-zinc-500 animate-pulse">
            {progressText}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col items-center space-y-2 text-center select-none">
        <div className="flex items-center gap-1 text-[9px] font-bold text-zinc-500 uppercase tracking-widest bg-zinc-950 px-2 py-0.5 rounded-full border border-zinc-900">
          Step 2: Workspace Setup
        </div>
        <h3 className="text-xl font-bold tracking-tight text-white pt-1">
          Create Workspace
        </h3>
        <p className="text-[11px] text-zinc-500 font-medium">
          Define your first active workspace in organization &ldquo;{orgSlug}&rdquo;
        </p>
      </div>

      {errorMsg && (
        <Alert variant="destructive">
          <AlertDescription>{errorMsg}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          label="Workspace Name"
          name="name"
          placeholder="e.g. Engineering, Product"
          disabled={isSubmitting}
          error={errors.name}
          register={register}
        />

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex h-9 w-full items-center justify-center rounded-lg bg-white text-xs font-bold text-black hover:bg-zinc-200 transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50 cursor-pointer"
        >
          Launch Workspace
        </button>
      </form>
    </div>
  );
}
