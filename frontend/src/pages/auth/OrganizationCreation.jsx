import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as zod from "zod";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "../../services/api/client";
import FormField from "../../components/common/FormField";
import { Alert, AlertDescription } from "../../components/ui/alert";

const orgSchema = zod.object({
  name: zod.string().min(2, "Organization name must be at least 2 characters"),
  slug: zod
    .string()
    .min(2, "Slug must be at least 2 characters")
    .regex(/^[a-z0-9-]+$/, "Slugs can only contain lowercase letters, numbers, and hyphens"),
  description: zod.string().optional(),
});

export default function OrganizationCreation() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [errorMsg, setErrorMsg] = useState("");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting, dirtyFields },
  } = useForm({
    resolver: zodResolver(orgSchema),
    defaultValues: { name: "", slug: "", description: "" },
  });

  const orgName = watch("name");

  // Auto-generate slug from name ONLY if slug has not been manually edited
  useEffect(() => {
    if (orgName && !dirtyFields.slug) {
      const generatedSlug = orgName
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "") 
        .replace(/\s+/g, "-") 
        .replace(/-+/g, "-") 
        .trim();
      setValue("slug", generatedSlug, { shouldValidate: true });
    }
  }, [orgName, setValue, dirtyFields.slug]);

  const onSubmit = async (data) => {
    setErrorMsg("");
    try {
      const res = await api.post("/organizations", data);
      if (res.data.success) {
        queryClient.invalidateQueries({ queryKey: ["organizations"] });
        navigate(`/create-workspace?orgId=${res.data.organization.id}&orgSlug=${res.data.organization.slug}`);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || "Failed to create organization.");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col items-center space-y-3 text-center">
        <div className="flex items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-900/60 px-3 py-1 text-[11px] font-medium text-zinc-400">
          <span className="flex h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
          Step 1: Organization Setup
        </div>
        <h3 className="text-xl font-bold tracking-tight text-foreground">
          Create Organization
        </h3>
        <p className="text-xs text-zinc-500">
          Set up your company's workspace entity to invite your team
        </p>
      </div>

      {errorMsg && (
        <Alert variant="destructive">
          <AlertDescription>{errorMsg}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Name Field */}
        <FormField
          label="Organization Name"
          name="name"
          placeholder="Acme Corporation"
          disabled={isSubmitting}
          error={errors.name}
          register={register}
        />

        {/* Slug Field */}
        <FormField
          label="Organization Slug"
          name="slug"
          placeholder="acme-corp"
          disabled={isSubmitting}
          error={errors.slug}
          register={register}
          inputClassName="font-mono text-zinc-300"
        />

        {/* Description Field */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">
            Description (Optional)
          </label>
          <textarea
            placeholder="Introduce your team..."
            disabled={isSubmitting}
            {...register("description")}
            className="w-full min-h-[80px] rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-foreground placeholder:text-zinc-500/60 transition-all duration-200 outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex w-full items-center justify-center rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-all duration-150 disabled:pointer-events-none disabled:opacity-50 cursor-pointer"
        >
          {isSubmitting ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
          ) : (
            "Create Organization"
          )}
        </button>
      </form>
    </div>
  );
}
