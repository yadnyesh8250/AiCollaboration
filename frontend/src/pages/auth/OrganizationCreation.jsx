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
      <div className="flex flex-col items-center space-y-2 text-center select-none">
        <div className="flex items-center gap-1 text-[9px] font-bold text-zinc-500 uppercase tracking-widest bg-zinc-950 px-2 py-0.5 rounded-full border border-zinc-900">
          Step 1: Organization Setup
        </div>
        <h3 className="text-xl font-bold tracking-tight text-white pt-1">
          Create Organization
        </h3>
        <p className="text-[11px] text-zinc-500 font-medium">
          Set up your organization workspace configuration
        </p>
      </div>

      {errorMsg && (
        <Alert variant="destructive">
          <AlertDescription>{errorMsg}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          label="Organization Name"
          name="name"
          placeholder="Acme Corporation"
          disabled={isSubmitting}
          error={errors.name}
          register={register}
        />

        <FormField
          label="Organization Slug"
          name="slug"
          placeholder="acme-corp"
          disabled={isSubmitting}
          error={errors.slug}
          register={register}
          inputClassName="font-mono text-zinc-300"
        />

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">
            Description (Optional)
          </label>
          <textarea
            placeholder="Introduce your team..."
            disabled={isSubmitting}
            {...register("description")}
            className="w-full min-h-[70px] rounded-lg border border-zinc-900 bg-zinc-950/40 px-3 py-2 text-xs text-foreground placeholder:text-zinc-650/70 transition-all duration-200 outline-none focus:border-zinc-700 focus:ring-1 focus:ring-zinc-800"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex h-9 w-full items-center justify-center rounded-lg bg-white text-xs font-bold text-black hover:bg-zinc-200 transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50 cursor-pointer"
        >
          {isSubmitting ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent" />
          ) : (
            "Create Organization"
          )}
        </button>
      </form>
    </div>
  );
}
