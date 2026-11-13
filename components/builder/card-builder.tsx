"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Contact, FileDown, Image, Images, Link as LinkIcon, MapPin, Minus, Plus, Share2, Type, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PagePreview } from "@/components/cards/PagePreview";
import { cardSchema, type ValidatedCard } from "@/lib/schemas/card";
import { pageThemeSchema } from "@/lib/schemas/page";
import { builderDocumentSchema, reorderCards, type BuilderState } from "@/lib/schemas/builder";
import { cardTypes, newCard } from "@/lib/card-defaults";
import { useBuilder } from "./use-builder";
import { CardList } from "./card-list";
import { ContentForm } from "./content-form";
import { StyleForm } from "./style-form";
import { ThemeForm } from "./theme-form";
import { QrCodeDialog } from "@/components/qr-code-dialog";

const typeIcons = { Type, Image, Link: LinkIcon, Contact, MapPin, Share2, Video, FileDown, Minus, Images };
export function CardBuilder({ pageId, initial }: { pageId: string; initial: BuilderState }) {
  const builder = useBuilder(pageId, initial);
  const { document, change } = builder;
  const [selected, setSelected] = useState<string | null>(document.cards[0]?.id ?? null);
  const [panel, setPanel] = useState<"cards" | "theme">("cards");
  const [cardTab, setCardTab] = useState<"content" | "style">("content");
  const [mobileTab, setMobileTab] = useState<"editor" | "preview">("editor");
  const picker = useRef<HTMLDialogElement>(null);
  const conflictDialog = useRef<HTMLDialogElement>(null);
  const card = document.cards.find((item) => item.id === selected);
  const valid = builderDocumentSchema.safeParse(document);
  const validCards = document.cards.flatMap((item) => { const parsed = cardSchema.safeParse(item.data); return parsed.success ? [{ id: item.id, data: parsed.data }] : []; });
  const preview = { ...document, cards: validCards, theme: pageThemeSchema.safeParse(document.theme).success ? document.theme : initial.document.theme };
  useEffect(() => { if (builder.conflict) conflictDialog.current?.showModal(); else conflictDialog.current?.close(); }, [builder.conflict]);

  function add(type: ValidatedCard["type"]) {
    const id = crypto.randomUUID();
    change((prev) => ({ ...prev, cards: [...prev.cards, { id, data: newCard(type, prev.cards.length, prev.theme.defaultRadius) }] }));
    setSelected(id); setCardTab("content"); setPanel("cards"); picker.current?.close();
  }
  return <div className="space-y-5">
    <header className="flex flex-wrap items-center justify-between gap-4"><div className="min-w-0"><Link className="text-sm text-muted-foreground hover:underline" href="/admin">← Semua halaman</Link><h1 className="mt-2 break-words text-2xl font-bold">{document.page.title}</h1><p role="status" aria-live="polite" className={`mt-1 text-xs ${builder.error || builder.conflict ? "text-destructive" : "text-muted-foreground"}`}>{builder.status}{builder.dirty && " · Ada perubahan lokal"}</p></div><div className="flex flex-wrap gap-2">
      <Button asChild variant="outline" size="sm"><Link href={`/admin/pages/${pageId}/settings`}>Pengaturan halaman</Link></Button>
      <QrCodeDialog title={document.page.title} slug={document.page.slug} defaultLogo={document.page.logo} />
      <Button asChild variant="outline" size="sm"><a href={`/admin/pages/${pageId}/preview`} target="_blank" rel="noopener noreferrer">Pratinjau</a></Button>
      {document.page.isPublished && !builder.dirty && !builder.saving ? <Button asChild variant="outline" size="sm"><a href={`/p/${document.page.slug}`} target="_blank" rel="noopener noreferrer">Lihat halaman ↗</a></Button> : <Button size="sm" variant="outline" disabled>Lihat halaman ↗</Button>}
      <Button size="sm" disabled={!valid.success || Boolean(builder.conflict) || builder.saving || builder.uploading > 0} onClick={() => change((prev) => ({ ...prev, page: { ...prev.page, isPublished: !prev.page.isPublished } }))}>{document.page.isPublished ? "Batalkan publikasi" : "Publikasikan"}</Button>
    </div></header>
    {document.page.isPublished && document.cards.length === 0 && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Halaman dipublikasikan tanpa kartu. Tambahkan kartu untuk melengkapi isinya.</p>}
    {builder.error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-900">{builder.error} <button className="ml-2 underline" onClick={builder.retry}>Coba lagi</button></div>}
    <div className="flex gap-2 lg:hidden" aria-label="Tampilan editor"><Button variant={mobileTab === "editor" ? "default" : "outline"} onClick={() => setMobileTab("editor")}>Editor</Button><Button variant={mobileTab === "preview" ? "default" : "outline"} onClick={() => setMobileTab("preview")}>Pratinjau</Button></div>
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_407px]">
      <section className={`${mobileTab === "preview" ? "hidden lg:block" : ""} min-w-0 space-y-4`}>
        <div className="flex gap-2"><Button variant={panel === "cards" ? "default" : "outline"} onClick={() => setPanel("cards")}>Kartu ({document.cards.length})</Button><Button variant={panel === "theme" ? "default" : "outline"} onClick={() => setPanel("theme")}>Tema</Button></div>
        {panel === "theme" ? <div className="rounded-2xl border bg-white p-5"><ThemeForm pageId={pageId} onBusy={builder.onBusy} theme={document.theme} onChange={(theme) => change((prev) => ({ ...prev, theme }))} applyRadius={() => change((prev) => ({ ...prev, cards: prev.cards.map((item) => ({ ...item, data: { ...item.data, style: { ...item.data.style, radius: prev.theme.defaultRadius } } as ValidatedCard })) }))} /></div> : <>
          {document.cards.length === 0 && <div className="rounded-xl border border-dashed p-8 text-center"><h2 className="font-semibold">Halaman Anda masih kosong</h2><p className="mt-2 text-sm text-muted-foreground">Mulai dengan teks, foto, atau tombol tautan.</p></div>}
          <CardList cards={document.cards} selected={selected} reorder={(from, to) => change((prev) => ({ ...prev, cards: reorderCards(prev.cards, from, to) }))} actions={{
            select: (id) => setSelected(id),
            toggle: (id) => change((prev) => ({ ...prev, cards: prev.cards.map((item) => item.id === id ? { ...item, data: { ...item.data, isVisible: !item.data.isVisible } } : item) })),
            duplicate: (id) => { if (document.cards.length >= 100) { window.alert("Maksimal 100 kartu."); return; } const source = document.cards.find((item) => item.id === id); if (!source) return; const copyId = crypto.randomUUID(); change((prev) => ({ ...prev, cards: [...prev.cards, { id: copyId, data: { ...structuredClone(source.data), order: prev.cards.length } }] })); setSelected(copyId); },
            remove: (id) => { if (window.confirm("Hapus kartu ini? Perubahan akan disimpan otomatis.")) { change((prev) => ({ ...prev, cards: prev.cards.filter((item) => item.id !== id).map((item, order) => ({ ...item, data: { ...item.data, order } })) })); if (id === selected) setSelected(null); } },
          }} />
          <Button variant="outline" className="w-full border-dashed" disabled={document.cards.length >= 100 || !pageThemeSchema.safeParse(document.theme).success} onClick={() => picker.current?.showModal()}><Plus className="h-4 w-4" />Tambah Kartu</Button>
          {card && <section className="space-y-4 rounded-2xl border bg-white p-5"><h2 className="font-semibold">Edit {cardTypes.find((type) => type.type === card.data.type)?.name}</h2><div className="flex gap-2"><Button size="sm" variant={cardTab === "content" ? "default" : "outline"} onClick={() => setCardTab("content")}>Isi</Button><Button size="sm" variant={cardTab === "style" ? "default" : "outline"} onClick={() => setCardTab("style")}>Tampilan</Button></div>
            {cardTab === "content" ? <fieldset disabled={builder.uploading > 0}><ContentForm key={card.id} card={card.data} pageId={pageId} onBusy={builder.onBusy} onChange={(data) => change((prev) => ({ ...prev, cards: prev.cards.map((item) => item.id === card.id ? { ...item, data } : item) }))} /></fieldset> : <><StyleForm card={card.data} onChange={(data) => change((prev) => ({ ...prev, cards: prev.cards.map((item) => item.id === card.id ? { ...item, data } : item) }))} />{!cardSchema.safeParse(card.data).success && <p role="alert" className="text-sm text-destructive">Kartu belum valid. Periksa warna, batas angka, serta isian pada tab Isi.</p>}</>}
          </section>}
        </>}
      </section>
      <aside aria-label="Pratinjau langsung" className={`${mobileTab === "editor" ? "hidden lg:block" : ""} min-w-0 lg:sticky lg:top-5`}><p className="mb-3 text-center text-xs font-medium text-muted-foreground">PRATINJAU LANGSUNG · 375 PX</p><div className="mx-auto max-w-full overflow-x-auto"><div className="mx-auto w-[399px] max-w-full rounded-[2.5rem] border-[12px] border-slate-900 bg-slate-900 shadow-xl"><div className="mx-auto mb-2 h-1 w-20 rounded-full bg-slate-600" /><div className="h-[680px] overflow-y-auto rounded-[1.5rem] bg-white"><PagePreview document={preview} /></div></div></div>{validCards.length !== document.cards.length && <p className="mt-3 text-center text-xs text-amber-800">Kartu yang belum valid tidak ditampilkan atau disimpan.</p>}</aside>
    </div>
    <dialog ref={picker} aria-labelledby="card-picker-title" className="max-h-[85vh] w-[calc(100%-2rem)] max-w-xl rounded-2xl border p-5 shadow-xl backdrop:bg-slate-950/40"><div className="mb-4 flex items-center justify-between"><h2 id="card-picker-title" className="text-lg font-semibold">Tambah Kartu</h2><Button variant="ghost" size="sm" onClick={() => picker.current?.close()}>Tutup</Button></div><div className="grid grid-cols-2 gap-3">{cardTypes.map((type) => { const Icon = typeIcons[type.icon]; return <button key={type.type} type="button" className="rounded-xl border p-4 text-left hover:border-primary hover:bg-emerald-50" onClick={() => add(type.type)}><Icon className="mb-2 h-5 w-5 text-primary" /><span className="block text-sm font-semibold">{type.name}</span><span className="mt-1 block text-xs text-muted-foreground">{type.description}</span></button>; })}</div></dialog>
    <dialog ref={conflictDialog} aria-labelledby="version-conflict-title" onCancel={(e) => e.preventDefault()} className="w-[calc(100%-2rem)] max-w-md space-y-4 rounded-2xl border p-6 shadow-xl backdrop:bg-slate-950/40"><h2 id="version-conflict-title" className="text-xl font-bold">Halaman diubah di tempat lain</h2><p className="text-sm text-muted-foreground">Muat ulang untuk memakai versi terbaru dan membuang perubahan lokal, atau timpa dengan susunan yang sedang Anda edit.</p><div className="flex flex-wrap justify-end gap-2"><Button variant="outline" onClick={() => void builder.reload()}>Muat ulang</Button><Button disabled={!valid.success || builder.uploading > 0} onClick={builder.overwrite}>Timpa</Button></div>{builder.error && <p role="alert" className="text-sm text-destructive">{builder.error}</p>}</dialog>
  </div>;
}
