import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as zod from "zod";
import { useNavigate, useSearchParams } from "react-router-dom";
import FormField from "../../components/common/FormField";

const workspaceSchema = zod.object({
  name: zod.string().min(2, "Workspace name must be at least 2 characters"),
});

export default function WorkspaceCreation() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orgSlug = searchParams.get("orgSlug") || "org";

  const [setupStep, setSetupStep] = useState(0); 
  const [progressText, setProgressText] = useState("");

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
    
    try {
      setProgressText("Provisioning database channels...");
      await new Promise((resolve) => setTimeout(resolve, 800));
      
      setProgressText("Initializing AI context graph...");
      await new Promise((resolve) => setTimeout(resolve, 800));

      setProgressText("Deploying collaboration channels...");
      await new Promise((resolve) => setTimeout(resolve, 600));

      setSetupStep(2);
      setProgressText("Workspace ready! Redirecting...");
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      navigate("/workspaces/1");
    } catch (err) {
      console.error(err);
      setSetupStep(0);
    }
  };

  if (setupStep > 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 space-y-6 animate-in fade-in duration-200">
        <div className="relative flex h-16 w-16 items-center justify-center">
          <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent z-10" />
        </div>
        <div className="text-center space-y-1.5">
          <h4 className="text-sm font-semibold text-foreground">
            Setting up your environment
          </h4>
          <p className="text-xs text-muted-foreground animate-pulse">
            {progressText}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Onboarding Wizard Header Step 2 matching approved Figma layout */}
      <div className="flex flex-col items-center space-y-3 text-center">
        <div className="flex items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-900/60 px-3 py-1 text-[11px] font-medium text-zinc-400">
          <span className="flex h-1.5 w-1.5 rounded-full bg-zinc-600" />
          Step 2: Workspace Setup
        </div>
        <h3 className="text-xl font-bold tracking-tight text-foreground">
          Create Workspace
        </h3>
        <p className="text-xs text-zinc-500">
          Define your first workspace in organization "{orgSlug}"
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Workspace Name */}
        <FormField
          label="Workspace Name"
          name="name"
          placeholder="Engineering, Marketing, Sales"
          disabled={isSubmitting}
          error={errors.name}
          register={register}
        />

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex w-full items-center justify-center rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-all duration-150 disabled:pointer-events-none disabled:opacity-50 cursor-pointer"
        >
          Launch Workspace
        </button>
      </form>
    </div>
  );
}
