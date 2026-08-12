import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as zod from "zod";
import { useNavigate } from "react-router-dom";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
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
  const [activeTab, setActiveTab] = useState("join"); // "join" | "create"

  // Fetch all global organizations for joining
  const { data: globalOrgs = [], isLoading: loadingGlobal, refetch: refetchGlobal } = useQuery({
    queryKey: ["globalOrganizations"],
    queryFn: () => api.get("/organizations/global/all").then((res) => res.data.organizations),
  });

  const joinMutation = useMutation({
    mutationFn: (orgId) => api.post(`/organizations/${orgId}/join`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      // Redirect to root which will auto-select the joined workspace
      navigate("/");
    },
    onError: (err) => {
      setErrorMsg(err.response?.data?.message || "Failed to join organization.");
    }
  });

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
    <div className="space-y-6 animate-in fade-in duration-200 selection:bg-primary/20 selection:text-white">
      <div className="flex flex-col items-center space-y-2 text-center select-none">
        <div className="flex items-center gap-1 text-[9px] font-bold text-zinc-500 uppercase tracking-widest bg-zinc-100 px-2 py-0.5 rounded-full border border-zinc-200">
          Step 1: Setup Workspace Location
        </div>
        <h3 className="text-xl font-bold tracking-tight text-zinc-900 pt-1">
          Welcome to A-Collab
        </h3>
        <p className="text-[11px] text-zinc-400 font-medium">
          Join an active organization workspace or spin up a new container
        </p>
      </div>

      {/* Tabs */}
      <div className="flex rounded-lg bg-zinc-100 p-1 border border-zinc-200 select-none">
        <button
          onClick={() => {
            setActiveTab("join");
            refetchGlobal();
          }}
          className={`flex-1 rounded-md py-1.5 text-center text-xs font-semibold cursor-pointer transition-all ${
            activeTab === "join"
              ? "bg-white text-zinc-800 border border-zinc-200/50 shadow-sm"
              : "text-zinc-500 hover:text-zinc-700 border border-transparent"
          }`}
        >
          Join Existing
        </button>
        <button
          onClick={() => setActiveTab("create")}
          className={`flex-1 rounded-md py-1.5 text-center text-xs font-semibold cursor-pointer transition-all ${
            activeTab === "create"
              ? "bg-white text-zinc-800 border border-zinc-200/50 shadow-sm"
              : "text-zinc-500 hover:text-zinc-700 border border-transparent"
          }`}
        >
          Create New
        </button>
      </div>

      {errorMsg && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3.5 text-[11px] font-semibold text-red-750 leading-relaxed text-center animate-in fade-in">
          {errorMsg}
        </div>
      )}

      {activeTab === "join" ? (
        <div className="space-y-4">
          <div className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest px-1 select-none">
            Active Organizations ({globalOrgs.length})
          </div>

          <div className="max-h-[220px] overflow-y-auto border border-zinc-200 rounded-xl divide-y divide-zinc-200 bg-zinc-50/50 p-1.5 space-y-1.5 no-scrollbar shadow-inner">
            {loadingGlobal ? (
              <div className="py-12 flex flex-col items-center justify-center text-center space-y-2">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <span className="text-[9px] text-zinc-450 font-bold uppercase tracking-widest animate-pulse">Loading list...</span>
              </div>
            ) : globalOrgs.length === 0 ? (
              <div className="py-12 text-center select-none">
                <p className="text-[11px] font-semibold text-zinc-500">No organizations found</p>
                <p className="text-[9px] text-zinc-400 mt-1 max-w-[200px] mx-auto">
                  Click the "Create New" tab to configure the system's first organization.
                </p>
              </div>
            ) : (
              globalOrgs.map((org) => (
                <div
                  key={org.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-zinc-150 bg-white hover:bg-zinc-50 transition-all gap-4 shadow-sm"
                >
                  <div className="overflow-hidden space-y-0.5">
                    <p className="text-xs font-bold text-zinc-800 truncate">{org.name}</p>
                    <p className="text-[9px] text-zinc-400 line-clamp-1 leading-normal">
                      {org.description || "Active organization space"}
                    </p>
                    <div className="flex items-center gap-2 pt-0.5">
                      <span className="text-[8px] font-mono text-zinc-450 font-bold">
                        WORKSPACES: {org._count?.workspaces ?? 0}
                      </span>
                      <span className="text-[8px] font-mono text-zinc-455 font-bold">
                        MEMBERS: {org._count?.members ?? 0}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => joinMutation.mutate(org.id)}
                    disabled={joinMutation.isPending}
                    className="h-7 px-3.5 rounded-lg bg-primary text-[10px] font-bold text-white hover:bg-primary-dark disabled:opacity-50 shrink-0 cursor-pointer transition-all shadow-sm"
                  >
                    {joinMutation.isPending ? "Joining..." : "Join"}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        /* Create New Form */
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
            inputClassName="font-mono text-zinc-650"
          />

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-455 uppercase tracking-widest block select-none">
              Description (Optional)
            </label>
            <textarea
              placeholder="Introduce your team..."
              disabled={isSubmitting}
              {...register("description")}
              className="w-full min-h-[70px] rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-xs text-zinc-800 placeholder:text-zinc-400 outline-none focus:border-primary/30 focus:ring-1 focus:ring-primary/20 transition-all resize-none shadow-sm"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex h-9 w-full items-center justify-center rounded-lg bg-primary text-xs font-bold text-white hover:bg-primary-dark transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50 cursor-pointer shadow-sm"
          >
            {isSubmitting ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              "Create Organization"
            )}
          </button>
        </form>
      )}
    </div>
  );
}
