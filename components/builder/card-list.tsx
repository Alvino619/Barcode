"use client";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Copy, GripVertical, Pencil, Trash2 } from "lucide-react";
import type { BuilderCard } from "@/lib/schemas/builder";
import { cardTypes } from "@/lib/card-defaults";
import { cardSchema } from "@/lib/schemas/card";

type Actions = { select: (id: string) => void; duplicate: (id: string) => void; remove: (id: string) => void; toggle: (id: string) => void };
function CardRow({ card, selected, actions }: { card: BuilderCard; selected: boolean; actions: Actions }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id });
  const name = cardTypes.find((type) => type.type === card.data.type)!.name;
  return <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }} className={`flex flex-wrap items-center gap-2 rounded-xl border p-3 ${selected ? "border-primary bg-emerald-50/60" : "bg-white"}`}>
    <button type="button" {...attributes} {...listeners} aria-label={`Geser kartu ${name}`} className="touch-none rounded p-2 text-muted-foreground focus:ring-2 focus:ring-primary"><GripVertical className="h-4 w-4" /></button>
    <button type="button" className="min-w-0 flex-1 text-left" onClick={() => actions.select(card.id)}><span className="block text-sm font-semibold">{name}</span><span className="text-xs text-muted-foreground">{!cardSchema.safeParse(card.data).success ? "Lengkapi isian" : card.data.isVisible ? "Ditampilkan" : "Disembunyikan"}</span></button>
    <div className="flex items-center gap-1"><input type="checkbox" role="switch" aria-label={`Tampilkan kartu ${name}`} checked={card.data.isVisible} onChange={() => actions.toggle(card.id)} className="m-2 h-4 w-4 accent-emerald-700" />
      <button type="button" aria-label={`Edit kartu ${name}`} className="rounded p-2 hover:bg-slate-100" onClick={() => actions.select(card.id)}><Pencil className="h-4 w-4" /></button>
      <button type="button" aria-label={`Duplikat kartu ${name}`} className="rounded p-2 hover:bg-slate-100" onClick={() => actions.duplicate(card.id)}><Copy className="h-4 w-4" /></button>
      <button type="button" aria-label={`Hapus kartu ${name}`} className="rounded p-2 text-destructive hover:bg-red-50" onClick={() => actions.remove(card.id)}><Trash2 className="h-4 w-4" /></button>
    </div>
  </div>;
}
export function CardList({ cards, selected, actions, reorder }: { cards: BuilderCard[]; selected: string | null; actions: Actions; reorder: (from: string, to: string) => void }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  return <DndContext id="card-builder-sort" sensors={sensors} collisionDetection={closestCenter} onDragEnd={({ active, over }) => { if (over) reorder(String(active.id), String(over.id)); }} accessibility={{ screenReaderInstructions: { draggable: "Tekan spasi untuk mengambil kartu. Gunakan panah untuk memindahkan, spasi untuk meletakkan, Escape untuk membatalkan." }, announcements: {
    onDragStart: () => "Kartu diambil.", onDragOver: ({ over }) => over ? `Posisi ${cards.findIndex((card) => card.id === over.id) + 1}.` : "Di luar daftar.", onDragEnd: () => "Kartu diletakkan.", onDragCancel: () => "Pemindahan dibatalkan.",
  } }}><SortableContext items={cards.map((card) => card.id)} strategy={verticalListSortingStrategy}><div className="space-y-2">{cards.map((card) => <CardRow key={card.id} card={card} selected={selected === card.id} actions={actions} />)}</div></SortableContext></DndContext>;
}
