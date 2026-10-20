"use client";

import { ArrowDown, ArrowUp, Camera, ImagePlus, Plus, Trash2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { saveRecipeAction } from "@/app/actions/recipes";
import type { RecipeInput } from "@/lib/recipe-input";
import { formatQuantity, parseQuantity } from "@/lib/scaler";
import { canonicalTags, suggestTags, tagSlug } from "@/lib/tags";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";

type Props = {
  target: { kitchenId: string } | { recipeId: string };
  initial: RecipeInput;
  existingPhotos?: { id: string; url: string }[];
  kitchenTags: string[];
  cancelHref: string;
};

type Row = { key: string; quantity: string; unit: string; name: string };
type StepRow = { key: string; text: string };

let seq = 0;
const key = () => `k${++seq}`;

const numOrNull = (s: string) => {
  const n = Number.parseInt(s, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
};

export function RecipeEditor({ target, initial, existingPhotos = [], kitchenTags, cancelHref }: Props) {
  const t = useTranslations("editor");
  const formId = useId();
  const [pending, startTransition] = useTransition();

  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description);
  const [servings, setServings] = useState(initial.servings?.toString() ?? "");
  const [prep, setPrep] = useState(initial.prepMinutes?.toString() ?? "");
  const [cook, setCook] = useState(initial.cookMinutes?.toString() ?? "");
  const [tags, setTags] = useState(initial.tags);
  const [rows, setRows] = useState<Row[]>(() =>
    initial.ingredients.map((i) => ({
      key: key(),
      quantity: i.quantity == null ? "" : formatQuantity(i.quantity),
      unit: i.unit,
      name: i.name,
    })),
  );
  const [stepRows, setStepRows] = useState<StepRow[]>(() => initial.steps.map((text) => ({ key: key(), text })));
  const [kept, setKept] = useState(existingPhotos);
  const [added, setAdded] = useState<{ file: File; url: string }[]>([]);

  const addedRef = useRef(added);
  useEffect(() => {
    addedRef.current = added;
  }, [added]);
  useEffect(() => () => addedRef.current.forEach((a) => URL.revokeObjectURL(a.url)), []);

  const submit = () => {
    const ingredients = rows
      .filter((r) => r.name.trim())
      .map((r) => ({ quantity: parseQuantity(r.quantity), unit: r.unit.trim(), name: r.name.trim() }));
    const data: RecipeInput = {
      title: title.trim(),
      description: description.trim(),
      servings: numOrNull(servings),
      prepMinutes: numOrNull(prep),
      cookMinutes: numOrNull(cook),
      tags,
      ingredients,
      steps: stepRows.map((s) => s.text.trim()).filter(Boolean),
    };
    if (!data.title) {
      toast.error(t("titleRequired"));
      return;
    }
    const fd = new FormData();
    fd.set("data", JSON.stringify(data));
    added.forEach((a) => fd.append("photos", a.file));
    existingPhotos.filter((p) => !kept.includes(p)).forEach((p) => fd.append("removePhotos", p.id));
    startTransition(async () => {
      const res = await saveRecipeAction(target, fd);
      if (res?.error) toast.error(res.error);
    });
  };

  return (
    <form
      id={formId}
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="space-y-6"
    >
      <Card className="space-y-5 p-5 sm:p-6">
        <div>
          <Label htmlFor="title">{t("title")}</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={200} className="text-lg" />
        </div>
        <div>
          <Label htmlFor="description">{t("description")}</Label>
          <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={5000} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <NumberField id="servings" label={t("servings")} value={servings} onChange={setServings} placeholder="—" />
          <NumberField id="prep" label={t("prepMinutes")} value={prep} onChange={setPrep} placeholder="min" />
          <NumberField id="cook" label={t("cookMinutes")} value={cook} onChange={setCook} placeholder="min" />
        </div>
        <p className="-mt-2 text-xs text-muted-foreground">{t("servingsHint")}</p>
        <TagInput value={tags} onChange={setTags} suggestions={kitchenTags} />
      </Card>

      <Card id="photos" className="scroll-mt-24 p-5 sm:p-6">
        <h2 className="text-xl font-semibold">{t("photos")}</h2>
        <PhotoPicker
          kept={kept}
          added={added}
          onRemoveKept={(id) => setKept((k) => k.filter((p) => p.id !== id))}
          onRemoveAdded={(url) => {
            URL.revokeObjectURL(url);
            setAdded((a) => a.filter((p) => p.url !== url));
          }}
          onAdd={(files) => setAdded((a) => [...a, ...files.map((file) => ({ file, url: URL.createObjectURL(file) }))])}
        />
      </Card>

      <Card className="p-5 sm:p-6">
        <h2 className="text-xl font-semibold">{t("ingredients")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("ingredientsHint")}</p>
        <ul className="mt-4 space-y-2">
          {rows.map((r, i) => (
            <li key={r.key} className="flex items-start gap-2">
              <div className="grid flex-1 grid-cols-[4.5rem_5rem_1fr] gap-2 max-sm:grid-cols-[4rem_4.5rem_1fr]">
                <Input
                  aria-label={t("quantity")}
                  placeholder={t("quantity")}
                  inputMode="decimal"
                  value={r.quantity}
                  onChange={(e) => setRows(update(rows, i, { quantity: e.target.value }))}
                  className={cn(r.quantity && parseQuantity(r.quantity) == null && "border-destructive")}
                />
                <Input
                  aria-label={t("unit")}
                  placeholder={t("unit")}
                  value={r.unit}
                  onChange={(e) => setRows(update(rows, i, { unit: e.target.value }))}
                />
                <Input
                  aria-label={t("ingredientName")}
                  placeholder={t("ingredientName")}
                  value={r.name}
                  onChange={(e) => setRows(update(rows, i, { name: e.target.value }))}
                />
              </div>
              <RowControls
                onUp={i > 0 ? () => setRows(move(rows, i, -1)) : undefined}
                onDown={i < rows.length - 1 ? () => setRows(move(rows, i, 1)) : undefined}
                onRemove={() => setRows(rows.filter((_, n) => n !== i))}
                labels={{ up: t("moveUp"), down: t("moveDown"), remove: t("remove") }}
              />
            </li>
          ))}
        </ul>
        <Button
          type="button"
          variant="outline"
          className="mt-3"
          onClick={() => setRows([...rows, { key: key(), quantity: "", unit: "", name: "" }])}
        >
          <Plus />
          {t("addIngredient")}
        </Button>
      </Card>

      <Card className="p-5 sm:p-6">
        <h2 className="text-xl font-semibold">{t("steps")}</h2>
        <ol className="mt-4 space-y-3">
          {stepRows.map((s, i) => (
            <li key={s.key} className="flex items-start gap-2">
              <span className="mt-2.5 grid size-7 shrink-0 place-items-center rounded-full bg-accent text-sm font-semibold text-accent-foreground">
                {i + 1}
              </span>
              <Textarea
                aria-label={t("stepN", { n: i + 1 })}
                value={s.text}
                onChange={(e) => setStepRows(update(stepRows, i, { text: e.target.value }))}
                className="min-h-20 flex-1"
              />
              <RowControls
                onUp={i > 0 ? () => setStepRows(move(stepRows, i, -1)) : undefined}
                onDown={i < stepRows.length - 1 ? () => setStepRows(move(stepRows, i, 1)) : undefined}
                onRemove={() => setStepRows(stepRows.filter((_, n) => n !== i))}
                labels={{ up: t("moveUp"), down: t("moveDown"), remove: t("remove") }}
              />
            </li>
          ))}
        </ol>
        <Button type="button" variant="outline" className="mt-3" onClick={() => setStepRows([...stepRows, { key: key(), text: "" }])}>
          <Plus />
          {t("addStep")}
        </Button>
      </Card>

      <div className="sticky bottom-0 -mx-4 flex justify-end gap-2 border-t bg-background/90 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0">
        <Button type="button" variant="ghost" asChild>
          <a href={cancelHref}>{t("cancel")}</a>
        </Button>
        <Button type="submit" size="lg" disabled={pending} className="min-w-32">
          {pending ? t("saving") : t("save")}
        </Button>
      </div>
    </form>
  );
}

function update<T>(list: T[], index: number, patch: Partial<T>) {
  return list.map((item, i) => (i === index ? { ...item, ...patch } : item));
}

function move<T>(list: T[], index: number, dir: number) {
  const next = [...list];
  [next[index], next[index + dir]] = [next[index + dir], next[index]];
  return next;
}

function NumberField(props: { id: string; label: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div>
      <Label htmlFor={props.id} className="truncate">
        {props.label}
      </Label>
      <Input
        id={props.id}
        type="number"
        inputMode="numeric"
        min={1}
        value={props.value}
        placeholder={props.placeholder}
        onChange={(e) => props.onChange(e.target.value)}
      />
    </div>
  );
}

function RowControls({
  onUp,
  onDown,
  onRemove,
  labels,
}: {
  onUp?: () => void;
  onDown?: () => void;
  onRemove: () => void;
  labels: { up: string; down: string; remove: string };
}) {
  return (
    <div className="flex shrink-0 items-center max-sm:flex-col max-sm:gap-0.5">
      <div className="flex max-sm:hidden">
        <Button type="button" variant="ghost" size="icon-sm" onClick={onUp} disabled={!onUp} aria-label={labels.up}>
          <ArrowUp />
        </Button>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onDown} disabled={!onDown} aria-label={labels.down}>
          <ArrowDown />
        </Button>
      </div>
      <Button type="button" variant="ghost" size="icon" onClick={onRemove} aria-label={labels.remove} className="text-muted-foreground">
        <Trash2 />
      </Button>
    </div>
  );
}

function TagInput({ value, onChange, suggestions }: { value: string[]; onChange: (v: string[]) => void; suggestions: string[] }) {
  const t = useTranslations("editor");
  const [draft, setDraft] = useState("");
  const suggestionList = useRef<HTMLDivElement>(null);
  // A tag typed differently from an existing one ("plat principal") reuses its spelling ("Plat principal").
  const add = (raw: string) => {
    const next = canonicalTags([...value, raw], suggestions);
    if (next.length > value.length) onChange(next);
    setDraft("");
  };
  const taken = new Set(value.map(tagSlug));
  const remaining = suggestTags(
    suggestions.filter((s) => !taken.has(tagSlug(s))).map((name) => ({ name })),
    draft,
  )
    .map((s) => s.name)
    .slice(0, 12);

  return (
    <div>
      <Label htmlFor="tag-input">{t("tags")}</Label>
      <div className="flex min-h-11 flex-wrap items-center gap-1.5 rounded-xl border border-input bg-card px-2 py-1.5 focus-within:border-primary focus-within:ring-4 focus-within:ring-ring">
        {value.map((tag) => (
          <span key={tag} className="inline-flex h-8 items-center gap-1 rounded-full bg-accent pl-3 pr-1 text-sm text-accent-foreground">
            {tag}
            <button
              type="button"
              onClick={() => onChange(value.filter((v) => v !== tag))}
              className="grid size-6 place-items-center rounded-full hover:bg-black/10"
              aria-label={t("removeTag", { tag })}
            >
              <X className="size-3.5" />
            </button>
          </span>
        ))}
        <input
          id="tag-input"
          value={draft}
          onChange={(e) => (e.target.value.endsWith(",") ? add(e.target.value.slice(0, -1)) : setDraft(e.target.value))}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add(draft);
            } else if (e.key === "Backspace" && !draft && value.length) {
              onChange(value.slice(0, -1));
            }
          }}
          onBlur={(e) => {
            // Picking a suggestion replaces the draft; don't also save the half-typed text.
            if (draft && !suggestionList.current?.contains(e.relatedTarget)) add(draft);
          }}
          placeholder={value.length ? "" : t("tagsPlaceholder")}
          className="h-8 min-w-24 flex-1 bg-transparent px-1 text-base outline-none sm:text-sm"
        />
      </div>
      {remaining.length > 0 && (
        <div ref={suggestionList} className="mt-2 flex flex-wrap gap-1.5">
          {remaining.map((s) => (
            <button
              key={s}
              type="button"
              // Keep focus in the input so a click or tap doesn't blur it first.
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => add(s)}
              className="h-8 rounded-full border border-dashed px-3 text-sm text-muted-foreground hover:border-solid hover:bg-muted"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function PhotoPicker({
  kept,
  added,
  onRemoveKept,
  onRemoveAdded,
  onAdd,
}: {
  kept: { id: string; url: string }[];
  added: { file: File; url: string }[];
  onRemoveKept: (id: string) => void;
  onRemoveAdded: (url: string) => void;
  onAdd: (files: File[]) => void;
}) {
  const t = useTranslations("editor");
  const gallery = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);
  const tiles = [
    ...kept.map((p) => ({ url: p.url, remove: () => onRemoveKept(p.id) })),
    ...added.map((p) => ({ url: p.url, remove: () => onRemoveAdded(p.url) })),
  ];
  const onFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    onAdd(Array.from(e.target.files ?? []).filter((f) => f.type.startsWith("image/")));
    e.target.value = "";
  };

  return (
    <div className="mt-4">
      {tiles.length > 0 && (
        <ul className="mb-4 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
          {tiles.map((p, i) => (
            <li key={p.url} className="relative aspect-square overflow-hidden rounded-xl bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt="" className="size-full object-cover" />
              {i === 0 && (
                <span className="absolute left-1.5 top-1.5 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white">
                  {t("cover")}
                </span>
              )}
              <button
                type="button"
                onClick={p.remove}
                className="absolute right-1.5 top-1.5 grid size-8 place-items-center rounded-full bg-black/60 text-white"
                aria-label={t("remove")}
              >
                <X className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={() => gallery.current?.click()}>
          <ImagePlus />
          {t("addPhotos")}
        </Button>
        <Button type="button" variant="outline" className="sm:hidden" onClick={() => camera.current?.click()}>
          <Camera />
          {t("takePhoto")}
        </Button>
      </div>
      <input ref={gallery} type="file" accept="image/*" multiple hidden onChange={onFiles} />
      <input ref={camera} type="file" accept="image/*" capture="environment" hidden onChange={onFiles} />
    </div>
  );
}
