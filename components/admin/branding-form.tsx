"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import type { Organization } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { updateOrganization } from "@/app/(admin)/branding/actions";
import { Slide } from "@/components/player/slide";

const PREVIEW_ITEM = {
  id: "preview",
  title: "Zo ziet een bericht eruit",
  subtitle: "Voorbeeld van de huisstijl",
  body: "Dit is een voorbeeldbericht om de gekozen kleuren te beoordelen. Controleer of de tekst goed leesbaar is op de achtergrondkleur.",
  type: "news" as const,
  priority: "normal" as const,
  imageUrl: null,
  videoUrl: null,
  durationSeconds: 15,
  metadata: null,
};

function ColorField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-12 cursor-pointer rounded border border-slate-200"
          aria-label={`${label} kiezen`}
        />
        <Input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          pattern="^#[0-9a-fA-F]{6}$"
          className="w-32 font-mono text-sm"
        />
      </div>
    </div>
  );
}

export function BrandingForm({ organization }: { organization: Organization }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(organization.name);
  const [logoUrl, setLogoUrl] = useState(organization.logoUrl ?? "");
  const [primaryColor, setPrimaryColor] = useState(organization.primaryColor);
  const [secondaryColor, setSecondaryColor] = useState(
    organization.secondaryColor
  );
  const [backgroundColor, setBackgroundColor] = useState(
    organization.backgroundColor
  );
  const [textColor, setTextColor] = useState(organization.textColor);

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Upload mislukt");
      }
      const data = (await res.json()) as { url: string };
      setLogoUrl(data.url);
      toast.success("Logo geüpload");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload mislukt");
    } finally {
      setUploading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await updateOrganization({
        name,
        logoUrl: logoUrl || undefined,
        primaryColor,
        secondaryColor,
        backgroundColor,
        textColor,
      });
      if (result.ok) {
        toast.success("Huisstijl opgeslagen");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Organisatie</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="org-name">Naam organisatie / afdeling *</Label>
              <Input
                id="org-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={100}
              />
            </div>
            <div className="space-y-2">
              <Label>Logo</Label>
              <div className="flex items-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUpload(file);
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ImagePlus className="h-4 w-4" />
                  )}
                  {logoUrl ? "Ander logo" : "Logo uploaden"}
                </Button>
                {logoUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setLogoUrl("")}
                  >
                    <Trash2 className="h-4 w-4" /> Verwijderen
                  </Button>
                )}
              </div>
              {logoUrl && (
                <div
                  className="mt-2 inline-block rounded-md p-3"
                  style={{ backgroundColor }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={logoUrl} alt="Logo" className="max-h-16" />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Kleuren</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <ColorField
              id="primary"
              label="Primaire kleur"
              value={primaryColor}
              onChange={setPrimaryColor}
            />
            <ColorField
              id="secondary"
              label="Secundaire kleur (accenten)"
              value={secondaryColor}
              onChange={setSecondaryColor}
            />
            <ColorField
              id="background"
              label="Achtergrondkleur scherm"
              value={backgroundColor}
              onChange={setBackgroundColor}
            />
            <ColorField
              id="text"
              label="Tekstkleur scherm"
              value={textColor}
              onChange={setTextColor}
            />
          </CardContent>
        </Card>

        <Button type="submit" disabled={isPending || uploading}>
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Huisstijl opslaan
        </Button>
      </form>

      <div className="space-y-2">
        <p className="text-sm font-medium text-slate-700">Live voorbeeld</p>
        <div className="overflow-hidden rounded-xl border border-slate-300 shadow-md">
          <div className="aspect-video w-full">
            <Slide
              item={PREVIEW_ITEM}
              branding={{
                name,
                logoUrl: logoUrl || null,
                primaryColor,
                secondaryColor,
                backgroundColor,
                textColor,
              }}
            />
          </div>
        </div>
        <p className="text-xs text-slate-500">
          Het voorbeeld gebruikt de kleuren die je links instelt (nog niet
          opgeslagen).
        </p>
      </div>
    </div>
  );
}
