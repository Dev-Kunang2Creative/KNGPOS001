import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import AppLayout from '@/layouts/app-layout';
import { downloadQRPoster } from '@/lib/qr-poster';
import { type BreadcrumbItem } from '@/types';
import { DndContext, PointerSensor, useDraggable, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { restrictToParentElement } from '@dnd-kit/modifiers';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import {
    Check,
    CircleDot,
    Download,
    Eye,
    Loader2,
    Palette,
    Plus,
    QrCode,
    Settings2,
    Square,
    Trash2,
    UtensilsCrossed,
    ZoomIn,
    ZoomOut,
} from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';

// ─── Types ───────────────────────────────────────────────────
type Station = { id: number; name: string; description?: string | null; status: 'active' | 'overloaded' | 'inactive'; active_orders_count: number };
type Waiter = { id: number; name: string; email: string };
type Assignment = { kitchen_station_id: number; bar_station_id: number; kitchen_station?: Station; bar_station?: Station } | null;
type Zone = {
    id: number;
    name: string;
    description?: string | null;
    color_hex: string;
    sort_order: number;
    is_active: boolean;
    tables_count: number;
    assignment?: Assignment;
    waiters: Waiter[];
};
type TableQr = { qr_token: string };
type TableShape = 'square' | 'round';
type TableType = { id: number; name: string; color_hex: string; sort_order: number };
type Table = {
    id: number;
    name: string;
    capacity: number;
    zone_id: number;
    table_type_id?: number | null;
    position_x: number;
    position_y: number;
    width: number;
    height: number;
    shape: TableShape;
    status: string;
    self_order_enabled: boolean;
    zone?: Zone;
    active_qr_code?: TableQr | null;
};

type Props = {
    zones: Zone[];
    kitchenStations: Station[];
    barStations: Station[];
    waiters: Waiter[];
    tableTypes: TableType[];
    tables: Table[];
    allZonesAssigned: boolean;
};

const NO_TYPE_COLOR = '#94a3b8';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Zona & Meja', href: '/zones' }];

const CANVAS_W = 1200;
const CANVAS_H = 760;
const GRID = 8;
const STATUSES = ['available', 'occupied', 'open_bill', 'reserved', 'blocked'] as const;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
const snap = (value: number) => Math.round(value / GRID) * GRID;

function getCookie(name: string): string {
    const match = document.cookie.split('; ').find((row) => row.startsWith(name + '='));
    return match ? decodeURIComponent(match.split('=')[1]) : '';
}

// ─── Page ────────────────────────────────────────────────────
export default function ZonesIndex(props: Props) {
    const [tab, setTab] = useState<'floor' | 'qr'>('floor');

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Zona & Meja" />
            <main className="flex flex-1 flex-col gap-4 p-4">
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-normal">Zona & Meja</h1>
                        <p className="text-muted-foreground text-sm">Atur denah meja secara drag & drop, lalu kelola QR self-order.</p>
                    </div>
                    <Badge variant={props.allZonesAssigned ? 'secondary' : 'destructive'}>
                        {props.allZonesAssigned ? 'Semua zona siap order' : 'Ada zona belum dikonfigurasi'}
                    </Badge>
                </div>

                <div className="flex w-full gap-2 border-b">
                    {[
                        ['floor', 'Denah & Zona'],
                        ['qr', 'QR Code'],
                    ].map(([value, label]) => (
                        <button
                            key={value}
                            type="button"
                            onClick={() => setTab(value as 'floor' | 'qr')}
                            className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${tab === value ? 'border-primary text-primary' : 'text-muted-foreground hover:text-foreground border-transparent'}`}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {tab === 'floor' ? <FloorEditor {...props} /> : <QrCatalog tables={props.tables} />}
            </main>
        </AppLayout>
    );
}

// ─── Floor editor ────────────────────────────────────────────
function FloorEditor({ zones, tables, kitchenStations, barStations, waiters, tableTypes }: Props) {
    const [localTables, setLocalTables] = useState<Table[]>(tables);
    const [activeZoneId, setActiveZoneId] = useState<number | null>(zones[0]?.id ?? null);
    const [zoom, setZoom] = useState(1);
    const [editMode, setEditMode] = useState(true);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

    const [tableDialog, setTableDialog] = useState<{ mode: 'create' | 'edit'; table?: Table } | null>(null);
    const [zoneSheetOpen, setZoneSheetOpen] = useState(false);
    const [stationDialogOpen, setStationDialogOpen] = useState(false);
    const [typeDialogOpen, setTypeDialogOpen] = useState(false);

    const typeColor = useCallback((id?: number | null) => tableTypes.find((t) => t.id === id)?.color_hex ?? NO_TYPE_COLOR, [tableTypes]);

    const dirtyRef = useRef<Set<number>>(new Set());
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const inflightRef = useRef<Promise<void> | null>(null);

    const activeZone = useMemo(() => zones.find((z) => z.id === activeZoneId) ?? null, [zones, activeZoneId]);
    const zoneTables = useMemo(() => localTables.filter((t) => t.zone_id === activeZoneId), [localTables, activeZoneId]);

    // Reconcile when server props change: keep optimistic positions for dirty tables.
    useEffect(() => {
        setLocalTables((prev) => {
            if (dirtyRef.current.size === 0) {
                return tables;
            }
            const byId = new Map(prev.map((t) => [t.id, t]));
            return tables.map((t) => (dirtyRef.current.has(t.id) && byId.has(t.id) ? (byId.get(t.id) as Table) : t));
        });
    }, [tables]);

    // Keep an active zone selected when the list changes.
    useEffect(() => {
        if (zones.length > 0 && !zones.some((z) => z.id === activeZoneId)) {
            setActiveZoneId(zones[0].id);
        }
    }, [zones, activeZoneId]);

    const flushSave = useCallback(async (): Promise<void> => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        if (inflightRef.current) {
            await inflightRef.current;
        }
        const ids = Array.from(dirtyRef.current);
        if (ids.length === 0) {
            return;
        }

        const payload = localTables
            .filter((t) => dirtyRef.current.has(t.id))
            .map((t) => ({
                id: t.id,
                position_x: t.position_x,
                position_y: t.position_y,
                width: t.width,
                height: t.height,
                shape: t.shape,
            }));

        dirtyRef.current = new Set();
        setSaveStatus('saving');

        const request = fetch(route('zones.layout.save'), {
            method: 'PATCH',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                'X-XSRF-TOKEN': getCookie('XSRF-TOKEN'),
            },
            body: JSON.stringify({ tables: payload }),
        })
            .then((res) => {
                if (!res.ok) {
                    throw new Error(`Layout save failed: ${res.status}`);
                }
                setSaveStatus('saved');
            })
            .catch(() => {
                // Re-mark as dirty so a later flush retries.
                payload.forEach((t) => dirtyRef.current.add(t.id));
                setSaveStatus('error');
            })
            .finally(() => {
                inflightRef.current = null;
            });

        inflightRef.current = request;
        await request;
    }, [localTables]);

    const scheduleSave = useCallback(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }
        timerRef.current = setTimeout(() => {
            void flushSave();
        }, 600);
    }, [flushSave]);

    // Flush pending layout changes before leaving the page.
    useEffect(() => {
        const handler = () => {
            if (dirtyRef.current.size > 0) {
                void flushSave();
            }
        };
        const off = router.on('before', handler);
        window.addEventListener('beforeunload', handler);
        return () => {
            off();
            window.removeEventListener('beforeunload', handler);
        };
    }, [flushSave]);

    const patchTable = useCallback(
        (id: number, patch: Partial<Table>) => {
            setLocalTables((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
            dirtyRef.current.add(id);
            scheduleSave();
        },
        [scheduleSave],
    );

    const handleDragEnd = useCallback(
        (event: DragEndEvent) => {
            const id = Number(event.active.id);
            const table = localTables.find((t) => t.id === id);
            if (!table) {
                return;
            }
            const nextX = clamp(snap(table.position_x + event.delta.x / zoom), 0, CANVAS_W - table.width);
            const nextY = clamp(snap(table.position_y + event.delta.y / zoom), 0, CANVAS_H - table.height);
            patchTable(id, { position_x: nextX, position_y: nextY });
        },
        [localTables, zoom, patchTable],
    );

    // Run an Inertia mutation after persisting any pending layout edits.
    const mutate = useCallback(
        async (fn: () => void) => {
            await flushSave();
            fn();
        },
        [flushSave],
    );

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

    return (
        <div className="flex flex-col gap-4">
            {/* Zone chips */}
            <div className="flex flex-wrap items-center gap-2">
                {zones.map((zone) => (
                    <button
                        key={zone.id}
                        type="button"
                        onClick={() => setActiveZoneId(zone.id)}
                        className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${activeZoneId === zone.id ? 'border-primary bg-primary/5 text-primary' : 'hover:bg-muted'}`}
                    >
                        {zone.name}
                        <span className="text-muted-foreground text-xs">({zone.tables_count})</span>
                    </button>
                ))}
                <Button variant="outline" size="sm" onClick={() => setZoneSheetOpen(true)}>
                    <Plus className="mr-1 h-4 w-4" /> Zona
                </Button>
            </div>

            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <Button size="sm" disabled={!activeZone} onClick={() => setTableDialog({ mode: 'create' })}>
                        <Plus className="mr-1 h-4 w-4" /> Tambah Meja
                    </Button>
                    <Button variant="outline" size="sm" disabled={!activeZone} onClick={() => setZoneSheetOpen(true)}>
                        <Settings2 className="mr-1 h-4 w-4" /> Pengaturan Zona
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setStationDialogOpen(true)}>
                        <UtensilsCrossed className="mr-1 h-4 w-4" /> Station
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setTypeDialogOpen(true)}>
                        <Palette className="mr-1 h-4 w-4" /> Tipe Meja
                    </Button>
                </div>
                <div className="flex items-center gap-3">
                    <SaveStatus status={saveStatus} />
                    <label className="flex items-center gap-2 text-xs">
                        <Checkbox checked={editMode} onCheckedChange={(c) => setEditMode(Boolean(c))} /> Mode Atur
                    </label>
                    <div className="flex items-center gap-1">
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => setZoom((z) => clamp(Number((z - 0.1).toFixed(2)), 0.5, 1.5))}
                        >
                            <ZoomOut className="h-3.5 w-3.5" />
                        </Button>
                        <span className="w-10 text-center text-xs">{Math.round(zoom * 100)}%</span>
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => setZoom((z) => clamp(Number((z + 0.1).toFixed(2)), 0.5, 1.5))}
                        >
                            <ZoomIn className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Canvas */}
            <Card className="rounded-md">
                <CardContent className="overflow-auto p-3">
                    {activeZone ? (
                        <div style={{ width: CANVAS_W * zoom, height: CANVAS_H * zoom }}>
                            <div style={{ width: CANVAS_W, height: CANVAS_H, transform: `scale(${zoom})`, transformOrigin: 'top left' }}>
                                <DndContext sensors={sensors} modifiers={[restrictToParentElement]} onDragEnd={handleDragEnd}>
                                    <div
                                        className="relative h-full w-full rounded-md border"
                                        style={{
                                            backgroundImage:
                                                'linear-gradient(to right, rgba(0,0,0,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.05) 1px, transparent 1px)',
                                            backgroundSize: `${GRID * 4}px ${GRID * 4}px`,
                                        }}
                                    >
                                        {zoneTables.map((table) => (
                                            <DraggableTable
                                                key={table.id}
                                                table={table}
                                                color={typeColor(table.table_type_id)}
                                                editMode={editMode}
                                                zoom={zoom}
                                                onOpen={() => setTableDialog({ mode: 'edit', table })}
                                                onResize={(w, h) => patchTable(table.id, { width: w, height: h })}
                                            />
                                        ))}
                                        {zoneTables.length === 0 && (
                                            <div className="text-muted-foreground absolute inset-0 flex items-center justify-center text-sm">
                                                Belum ada meja di zona ini. Klik "Tambah Meja".
                                            </div>
                                        )}
                                    </div>
                                </DndContext>
                            </div>
                        </div>
                    ) : (
                        <div className="text-muted-foreground flex h-40 items-center justify-center text-sm">
                            Belum ada zona. Tambahkan zona terlebih dahulu.
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Legend — table types */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
                <span className="text-muted-foreground font-medium">Legenda tipe meja:</span>
                {tableTypes.map((t) => (
                    <span key={t.id} className="inline-flex items-center gap-1.5">
                        <span className="size-3 rounded-sm border" style={{ backgroundColor: t.color_hex }} />
                        {t.name}
                    </span>
                ))}
                <span className="inline-flex items-center gap-1.5">
                    <span className="size-3 rounded-sm border" style={{ backgroundColor: NO_TYPE_COLOR }} />
                    Tanpa tipe
                </span>
                {tableTypes.length === 0 && <span className="text-muted-foreground">Belum ada tipe meja — klik "Tipe Meja" untuk menambah.</span>}
            </div>

            {tableDialog && activeZone && (
                <TableDialog
                    key={tableDialog.table?.id ?? 'create'}
                    mode={tableDialog.mode}
                    table={tableDialog.table}
                    zones={zones}
                    tableTypes={tableTypes}
                    defaultZoneId={activeZone.id}
                    onMutate={mutate}
                    onClose={() => setTableDialog(null)}
                />
            )}

            <ZoneSheet
                open={zoneSheetOpen}
                onOpenChange={setZoneSheetOpen}
                zone={activeZone}
                kitchenStations={kitchenStations}
                barStations={barStations}
                waiters={waiters}
                onMutate={mutate}
            />

            <StationManagerDialog
                open={stationDialogOpen}
                onOpenChange={setStationDialogOpen}
                kitchenStations={kitchenStations}
                barStations={barStations}
                onMutate={mutate}
            />

            <TableTypeManagerDialog open={typeDialogOpen} onOpenChange={setTypeDialogOpen} tableTypes={tableTypes} onMutate={mutate} />
        </div>
    );
}

function SaveStatus({ status }: { status: 'idle' | 'saving' | 'saved' | 'error' }) {
    if (status === 'saving') {
        return (
            <span className="text-muted-foreground flex items-center gap-1 text-xs">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Menyimpan…
            </span>
        );
    }
    if (status === 'saved') {
        return (
            <span className="flex items-center gap-1 text-xs text-emerald-600">
                <Check className="h-3.5 w-3.5" /> Tersimpan
            </span>
        );
    }
    if (status === 'error') {
        return <span className="text-destructive text-xs">Gagal menyimpan</span>;
    }
    return null;
}

// ─── Draggable table ─────────────────────────────────────────
function DraggableTable({
    table,
    color,
    editMode,
    zoom,
    onOpen,
    onResize,
}: {
    table: Table;
    color: string;
    editMode: boolean;
    zoom: number;
    onOpen: () => void;
    onResize: (width: number, height: number) => void;
}) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: table.id, disabled: !editMode });

    const startResize = (event: React.PointerEvent) => {
        event.preventDefault();
        event.stopPropagation();
        const startX = event.clientX;
        const startY = event.clientY;
        const startW = table.width;
        const startH = table.height;
        (event.target as Element).setPointerCapture(event.pointerId);

        const onMove = (e: PointerEvent) => {
            const dx = (e.clientX - startX) / zoom;
            const dy = (e.clientY - startY) / zoom;
            if (table.shape === 'round') {
                const size = clamp(snap(startW + Math.max(dx, dy)), 40, 600);
                onResize(size, size);
            } else {
                onResize(clamp(snap(startW + dx), 40, 600), clamp(snap(startH + dy), 40, 600));
            }
        };
        const onUp = (e: PointerEvent) => {
            (event.target as Element).releasePointerCapture(e.pointerId);
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
        };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
    };

    return (
        <div
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            onClick={onOpen}
            className="group bg-background absolute flex flex-col items-center justify-center border-2 text-xs font-medium shadow-sm select-none"
            style={{
                left: table.position_x,
                top: table.position_y,
                width: table.width,
                height: table.height,
                borderColor: color,
                borderRadius: table.shape === 'round' ? '9999px' : '0.375rem',
                transform: transform ? `translate3d(${transform.x / zoom}px, ${transform.y / zoom}px, 0)` : undefined,
                zIndex: isDragging ? 20 : 1,
                cursor: editMode ? 'grab' : 'pointer',
                touchAction: editMode ? 'none' : 'auto',
            }}
            title={`${table.name} • ${table.capacity} kursi`}
        >
            <span className="truncate px-1">{table.name}</span>
            <span className="text-muted-foreground text-[10px]">{table.capacity} kursi</span>
            <span className="text-muted-foreground text-[10px]">{table.status}</span>
            {editMode && (
                <span
                    onPointerDown={startResize}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-primary/70 absolute -right-1 -bottom-1 h-3 w-3 cursor-se-resize rounded-sm opacity-0 transition-opacity group-hover:opacity-100"
                />
            )}
        </div>
    );
}

// ─── Table create/edit dialog ────────────────────────────────
function TableDialog({
    mode,
    table,
    zones,
    tableTypes,
    defaultZoneId,
    onMutate,
    onClose,
}: {
    mode: 'create' | 'edit';
    table?: Table;
    zones: Zone[];
    tableTypes: TableType[];
    defaultZoneId: number;
    onMutate: (fn: () => void) => Promise<void>;
    onClose: () => void;
}) {
    const form = useForm({
        name: table?.name ?? '',
        capacity: table?.capacity ?? 4,
        zone_id: String(table?.zone_id ?? defaultZoneId),
        table_type_id: table?.table_type_id ? String(table.table_type_id) : '',
        position_x: table?.position_x ?? Math.round((CANVAS_W - 96) / 2),
        position_y: table?.position_y ?? Math.round((CANVAS_H - 64) / 2),
        shape: (table?.shape ?? 'square') as TableShape,
        width: table?.width ?? 96,
        height: table?.height ?? 64,
        status: table?.status ?? 'available',
        self_order_enabled: table?.self_order_enabled ?? true,
    });

    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.transform((data) => ({
            ...data,
            zone_id: Number(data.zone_id),
            table_type_id: data.table_type_id ? Number(data.table_type_id) : null,
        }));
        void onMutate(() => {
            if (mode === 'create') {
                form.post('/settings/tables', { preserveScroll: true, onSuccess: onClose });
            } else if (table) {
                form.put(`/settings/tables/${table.id}`, { preserveScroll: true, onSuccess: onClose });
            }
        });
    };

    const remove = () => {
        if (!table) {
            return;
        }
        void onMutate(() => router.delete(`/settings/tables/${table.id}`, { preserveScroll: true, onSuccess: onClose }));
    };

    return (
        <Dialog open onOpenChange={(o) => (!o ? onClose() : undefined)}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{mode === 'create' ? 'Tambah Meja' : `Edit Meja ${table?.name}`}</DialogTitle>
                </DialogHeader>
                <form onSubmit={submit} className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="grid gap-2">
                            <Label>Nama / Nomor Meja</Label>
                            <Input value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} placeholder="Contoh: Meja 1" />
                            <InputError message={form.errors.name} />
                        </div>
                        <div className="grid gap-2">
                            <Label>Kapasitas Kursi</Label>
                            <Input type="number" value={form.data.capacity} onChange={(e) => form.setData('capacity', Number(e.target.value))} />
                            <InputError message={form.errors.capacity} />
                        </div>
                        <div className="grid gap-2">
                            <Label>Zona</Label>
                            <Select value={form.data.zone_id} onValueChange={(v) => form.setData('zone_id', v)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Pilih Zona" />
                                </SelectTrigger>
                                <SelectContent>
                                    {zones.map((zone) => (
                                        <SelectItem key={zone.id} value={String(zone.id)}>
                                            {zone.name}
                                            {zone.assignment ? '' : ' (belum dikonfigurasi)'}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label>Status</Label>
                            <Select value={form.data.status} onValueChange={(v) => form.setData('status', v)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Pilih Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    {STATUSES.map((status) => (
                                        <SelectItem key={status} value={status}>
                                            {status}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label>Bentuk Meja</Label>
                        <ToggleGroup
                            type="single"
                            value={form.data.shape}
                            onValueChange={(v) => {
                                if (!v) {
                                    return;
                                }
                                const shape = v as TableShape;
                                if (shape === 'round') {
                                    const size = Math.max(form.data.width, form.data.height);
                                    form.setData((data) => ({ ...data, shape, width: size, height: size }));
                                } else {
                                    form.setData('shape', shape);
                                }
                            }}
                            className="justify-start"
                        >
                            <ToggleGroupItem value="square" aria-label="Kotak">
                                <Square className="mr-1 h-4 w-4" /> Kotak
                            </ToggleGroupItem>
                            <ToggleGroupItem value="round" aria-label="Bulat">
                                <CircleDot className="mr-1 h-4 w-4" /> Bulat
                            </ToggleGroupItem>
                        </ToggleGroup>
                    </div>

                    <div className="grid gap-2">
                        <Label>Tipe Meja (warna)</Label>
                        <Select value={form.data.table_type_id || 'none'} onValueChange={(v) => form.setData('table_type_id', v === 'none' ? '' : v)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Tanpa tipe" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Tanpa tipe</SelectItem>
                                {tableTypes.map((t) => (
                                    <SelectItem key={t.id} value={String(t.id)}>
                                        <span className="inline-flex items-center gap-2">
                                            <span className="size-3 rounded-sm border" style={{ backgroundColor: t.color_hex }} />
                                            {t.name}
                                        </span>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <label className="flex items-center gap-2 text-sm">
                        <Checkbox checked={form.data.self_order_enabled} onCheckedChange={(c) => form.setData('self_order_enabled', Boolean(c))} />
                        Izinkan pelanggan self-order dari meja ini
                    </label>

                    <DialogFooter className="flex-row justify-between gap-2 sm:justify-between">
                        {mode === 'edit' ? (
                            <Button type="button" variant="destructive" size="sm" onClick={remove}>
                                <Trash2 className="mr-1 h-4 w-4" /> Hapus
                            </Button>
                        ) : (
                            <span />
                        )}
                        <Button type="submit" disabled={form.processing}>
                            {mode === 'create' ? 'Simpan Meja' : 'Simpan Perubahan'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

// ─── Zone settings sheet ─────────────────────────────────────
function ZoneSheet({
    open,
    onOpenChange,
    zone,
    kitchenStations,
    barStations,
    waiters,
    onMutate,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    zone: Zone | null;
    kitchenStations: Station[];
    barStations: Station[];
    waiters: Waiter[];
    onMutate: (fn: () => void) => Promise<void>;
}) {
    const [creating, setCreating] = useState(false);
    const isCreate = creating || !zone;

    const form = useForm({
        name: zone?.name ?? '',
        description: zone?.description ?? '',
        color_hex: zone?.color_hex ?? '#2563EB',
        sort_order: zone?.sort_order ?? 0,
        is_active: zone?.is_active ?? true,
    });

    useEffect(() => {
        if (!isCreate && zone) {
            form.setData({
                name: zone.name,
                description: zone.description ?? '',
                color_hex: zone.color_hex,
                sort_order: zone.sort_order,
                is_active: zone.is_active,
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [zone?.id, isCreate]);

    const [assignment, setAssignment] = useState({
        kitchen_station_id: String(zone?.assignment?.kitchen_station_id ?? ''),
        bar_station_id: String(zone?.assignment?.bar_station_id ?? ''),
    });
    useEffect(() => {
        setAssignment({
            kitchen_station_id: String(zone?.assignment?.kitchen_station_id ?? ''),
            bar_station_id: String(zone?.assignment?.bar_station_id ?? ''),
        });
    }, [zone?.id, zone?.assignment?.kitchen_station_id, zone?.assignment?.bar_station_id]);

    const [waiterToAdd, setWaiterToAdd] = useState('');

    const saveZone = (event: FormEvent) => {
        event.preventDefault();
        void onMutate(() => {
            if (isCreate) {
                form.post('/zones', { preserveScroll: true, onSuccess: () => setCreating(false) });
            } else if (zone) {
                form.put(`/zones/${zone.id}`, { preserveScroll: true });
            }
        });
    };

    const saveAssignment = () => {
        if (!zone || !assignment.kitchen_station_id || !assignment.bar_station_id) {
            return;
        }
        void onMutate(() =>
            router.put(
                `/zones/${zone.id}/assignment`,
                { kitchen_station_id: Number(assignment.kitchen_station_id), bar_station_id: Number(assignment.bar_station_id) },
                { preserveScroll: true },
            ),
        );
    };

    const addWaiter = () => {
        if (!zone || !waiterToAdd) {
            return;
        }
        void onMutate(() =>
            router.post(`/zones/${zone.id}/waiters`, { user_id: Number(waiterToAdd) }, { preserveScroll: true, onSuccess: () => setWaiterToAdd('') }),
        );
    };

    const removeWaiter = (userId: number) => {
        if (!zone) {
            return;
        }
        void onMutate(() => router.delete(`/zones/${zone.id}/waiters/${userId}`, { preserveScroll: true }));
    };

    const deleteZone = () => {
        if (!zone) {
            return;
        }
        void onMutate(() => router.delete(`/zones/${zone.id}`, { preserveScroll: true, onSuccess: () => onOpenChange(false) }));
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full overflow-y-auto sm:max-w-md">
                <SheetHeader>
                    <SheetTitle>{isCreate ? 'Tambah Zona' : `Pengaturan Zona: ${zone?.name}`}</SheetTitle>
                </SheetHeader>

                <div className="space-y-6 px-4 pb-8">
                    {zone && !creating && (
                        <Button variant="outline" size="sm" onClick={() => setCreating(true)}>
                            <Plus className="mr-1 h-4 w-4" /> Buat Zona Baru
                        </Button>
                    )}

                    <form onSubmit={saveZone} className="space-y-3">
                        <div className="grid gap-2">
                            <Label>Nama Zona / Lantai</Label>
                            <Input
                                value={form.data.name}
                                onChange={(e) => form.setData('name', e.target.value)}
                                placeholder="Contoh: Lantai 1 (Depan)"
                            />
                            <InputError message={form.errors.name} />
                            <p className="text-muted-foreground text-xs">
                                Zona menentukan routing ke kitchen/bar. VIP/Indoor/Outdoor diatur lewat Tipe Meja (warna).
                            </p>
                        </div>
                        <div className="grid gap-2">
                            <Label>Deskripsi</Label>
                            <Input value={form.data.description} onChange={(e) => form.setData('description', e.target.value)} />
                        </div>
                        <div className="grid gap-2">
                            <Label>Urutan</Label>
                            <Input type="number" value={form.data.sort_order} onChange={(e) => form.setData('sort_order', Number(e.target.value))} />
                        </div>
                        <label className="flex items-center gap-2 text-sm">
                            <Checkbox checked={form.data.is_active} onCheckedChange={(c) => form.setData('is_active', Boolean(c))} /> Zona aktif
                        </label>
                        <Button type="submit" size="sm" disabled={form.processing}>
                            {isCreate ? 'Simpan Zona' : 'Simpan Perubahan'}
                        </Button>
                    </form>

                    {zone && !creating && (
                        <>
                            <div className="space-y-3 border-t pt-4">
                                <h3 className="text-sm font-medium">Routing Station</h3>
                                <div className="grid gap-2">
                                    <Label>Kitchen Station</Label>
                                    <Select
                                        value={assignment.kitchen_station_id}
                                        onValueChange={(v) => setAssignment((a) => ({ ...a, kitchen_station_id: v }))}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Pilih kitchen station" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {kitchenStations.map((s) => (
                                                <SelectItem key={s.id} value={String(s.id)}>
                                                    {s.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label>Bar Station</Label>
                                    <Select
                                        value={assignment.bar_station_id}
                                        onValueChange={(v) => setAssignment((a) => ({ ...a, bar_station_id: v }))}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Pilih bar station" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {barStations.map((s) => (
                                                <SelectItem key={s.id} value={String(s.id)}>
                                                    {s.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Button size="sm" variant="secondary" onClick={saveAssignment}>
                                    Simpan Routing
                                </Button>
                            </div>

                            <div className="space-y-3 border-t pt-4">
                                <h3 className="text-sm font-medium">Waiter Zona</h3>
                                <div className="flex flex-wrap gap-2">
                                    {zone.waiters.map((w) => (
                                        <Badge key={w.id} variant="secondary" className="gap-1">
                                            {w.name}
                                            <button type="button" onClick={() => removeWaiter(w.id)} className="ml-1 text-xs hover:text-red-600">
                                                ×
                                            </button>
                                        </Badge>
                                    ))}
                                    {zone.waiters.length === 0 && <span className="text-muted-foreground text-xs">Belum ada waiter.</span>}
                                </div>
                                <div className="flex gap-2">
                                    <Select value={waiterToAdd} onValueChange={setWaiterToAdd}>
                                        <SelectTrigger className="flex-1">
                                            <SelectValue placeholder="Pilih waiter" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {waiters
                                                .filter((w) => !zone.waiters.some((zw) => zw.id === w.id))
                                                .map((w) => (
                                                    <SelectItem key={w.id} value={String(w.id)}>
                                                        {w.name}
                                                    </SelectItem>
                                                ))}
                                        </SelectContent>
                                    </Select>
                                    <Button size="sm" onClick={addWaiter} disabled={!waiterToAdd}>
                                        Tambah
                                    </Button>
                                </div>
                            </div>

                            <div className="border-t pt-4">
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    disabled={zone.tables_count > 0}
                                    onClick={deleteZone}
                                    title={zone.tables_count > 0 ? 'Pindahkan/hapus meja dulu' : undefined}
                                >
                                    <Trash2 className="mr-1 h-4 w-4" /> Hapus Zona
                                </Button>
                                {zone.tables_count > 0 && (
                                    <p className="text-muted-foreground mt-1 text-xs">Zona masih memiliki {zone.tables_count} meja.</p>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}

// ─── Station manager dialog ──────────────────────────────────
function StationManagerDialog({
    open,
    onOpenChange,
    kitchenStations,
    barStations,
    onMutate,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    kitchenStations: Station[];
    barStations: Station[];
    onMutate: (fn: () => void) => Promise<void>;
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Kelola Station</DialogTitle>
                </DialogHeader>
                <div className="grid gap-6 sm:grid-cols-2">
                    <StationColumn title="Kitchen" type="kitchen" stations={kitchenStations} onMutate={onMutate} />
                    <StationColumn title="Bar" type="bar" stations={barStations} onMutate={onMutate} />
                </div>
            </DialogContent>
        </Dialog>
    );
}

function StationColumn({
    title,
    type,
    stations,
    onMutate,
}: {
    title: string;
    type: 'kitchen' | 'bar';
    stations: Station[];
    onMutate: (fn: () => void) => Promise<void>;
}) {
    const [name, setName] = useState('');
    const baseUrl = type === 'kitchen' ? '/stations/kitchen' : '/stations/bar';

    const add = () => {
        if (!name.trim()) {
            return;
        }
        void onMutate(() =>
            router.post(baseUrl, { name, description: '', status: 'active' }, { preserveScroll: true, onSuccess: () => setName('') }),
        );
    };

    const remove = (id: number) => {
        void onMutate(() => router.delete(`${baseUrl}/${id}`, { preserveScroll: true }));
    };

    return (
        <div className="space-y-3">
            <h3 className="text-sm font-medium">{title}</h3>
            <div className="space-y-2">
                {stations.map((s) => (
                    <div key={s.id} className="flex items-center justify-between rounded-md border px-2 py-1.5 text-sm">
                        <span>{s.name}</span>
                        <button type="button" onClick={() => remove(s.id)} className="text-muted-foreground text-xs hover:text-red-600">
                            Hapus
                        </button>
                    </div>
                ))}
                {stations.length === 0 && <span className="text-muted-foreground text-xs">Belum ada station.</span>}
            </div>
            <div className="flex gap-2">
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={`Nama ${title.toLowerCase()}`} className="h-8" />
                <Button size="sm" onClick={add}>
                    Tambah
                </Button>
            </div>
        </div>
    );
}

// ─── Table type manager dialog ───────────────────────────────
function TableTypeManagerDialog({
    open,
    onOpenChange,
    tableTypes,
    onMutate,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    tableTypes: TableType[];
    onMutate: (fn: () => void) => Promise<void>;
}) {
    const [name, setName] = useState('');
    const [color, setColor] = useState('#2563EB');

    const add = () => {
        if (!name.trim()) {
            return;
        }
        void onMutate(() =>
            router.post(
                '/table-types',
                { name, color_hex: color, sort_order: tableTypes.length },
                { preserveScroll: true, onSuccess: () => setName('') },
            ),
        );
    };

    const updateColor = (id: number, color_hex: string, typeName: string) => {
        void onMutate(() => router.put(`/table-types/${id}`, { name: typeName, color_hex }, { preserveScroll: true }));
    };

    const remove = (id: number) => {
        void onMutate(() => router.delete(`/table-types/${id}`, { preserveScroll: true }));
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Tipe Meja</DialogTitle>
                </DialogHeader>
                <p className="text-muted-foreground text-sm">
                    Tipe meja menentukan warna meja di denah (mis. VIP, Indoor, Outdoor). Warna ini muncul sebagai legenda.
                </p>
                <div className="space-y-2">
                    {tableTypes.map((t) => (
                        <div key={t.id} className="flex items-center gap-2 rounded-md border px-2 py-1.5">
                            <input
                                type="color"
                                value={t.color_hex}
                                onChange={(e) => updateColor(t.id, e.target.value, t.name)}
                                className="h-7 w-9 rounded border"
                                title="Ubah warna"
                            />
                            <span className="flex-1 text-sm">{t.name}</span>
                            <button type="button" onClick={() => remove(t.id)} className="text-muted-foreground text-xs hover:text-red-600">
                                Hapus
                            </button>
                        </div>
                    ))}
                    {tableTypes.length === 0 && <span className="text-muted-foreground text-xs">Belum ada tipe meja.</span>}
                </div>
                <DialogFooter className="flex-row items-center gap-2 sm:justify-start">
                    <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-9 w-11 rounded border" />
                    <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama tipe (mis. VIP)" className="h-9 flex-1" />
                    <Button size="sm" onClick={add}>
                        Tambah
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ─── QR catalog tab ──────────────────────────────────────────
function QrCatalog({ tables }: { tables: Table[] }) {
    const { appUrl, restaurant } = usePage().props as unknown as { appUrl: string; restaurant?: { name?: string } };

    const missingQrCount = tables.filter((t) => !t.active_qr_code).length;
    const tablesWithQr = tables.filter((t) => t.active_qr_code);

    function generateAll() {
        router.post('/settings/tables/generate-all-qr', {}, { preserveScroll: true });
    }

    function downloadAll() {
        // Trigger each poster download sequentially so the browser doesn't drop them.
        tablesWithQr.forEach((table, index) => {
            window.setTimeout(() => downloadQRPoster(table.name, restaurant?.name, `qr-cat-${table.id}`), index * 400);
        });
    }

    return (
        <Card className="rounded-md">
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                <CardTitle className="flex items-center gap-2 text-base">
                    <QrCode className="h-5 w-5" /> QR Code Self-Order
                </CardTitle>
                <div className="flex flex-wrap gap-2">
                    <Button type="button" size="sm" onClick={generateAll} disabled={missingQrCount === 0}>
                        <QrCode className="mr-1 h-4 w-4" /> Generate Semua QR{missingQrCount > 0 ? ` (${missingQrCount})` : ''}
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={downloadAll} disabled={tablesWithQr.length === 0}>
                        <Download className="mr-1 h-4 w-4" /> Download Semua Poster{tablesWithQr.length > 0 ? ` (${tablesWithQr.length})` : ''}
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                    {tables.map((table) => {
                        const canvasId = `qr-cat-${table.id}`;
                        return (
                            <div key={table.id} className="flex flex-col items-center gap-2 rounded-md border p-3 text-center">
                                <span className="font-medium">{table.name}</span>
                                {table.active_qr_code ? (
                                    <>
                                        <div className="rounded-md border bg-white p-2">
                                            <QRCodeCanvas id={canvasId} value={`${appUrl}/s/${table.active_qr_code.qr_token}`} size={120} />
                                        </div>
                                        <div className="flex w-full flex-col gap-1.5">
                                            <Dialog>
                                                <DialogTrigger asChild>
                                                    <Button type="button" variant="secondary" size="sm">
                                                        <Eye className="mr-1 h-3.5 w-3.5" /> Lihat
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent className="sm:max-w-md">
                                                    <DialogHeader>
                                                        <DialogTitle>QR Code Meja: {table.name}</DialogTitle>
                                                    </DialogHeader>
                                                    <div className="flex flex-col items-center gap-4 p-4">
                                                        <div className="rounded-md border bg-white p-4">
                                                            <QRCodeCanvas value={`${appUrl}/s/${table.active_qr_code.qr_token}`} size={260} />
                                                        </div>
                                                        <p className="text-muted-foreground text-xs break-all">
                                                            {appUrl}/s/{table.active_qr_code.qr_token}
                                                        </p>
                                                    </div>
                                                </DialogContent>
                                            </Dialog>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => downloadQRPoster(table.name, restaurant?.name, canvasId)}
                                            >
                                                <Download className="mr-1 h-3.5 w-3.5" /> Poster
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => router.post(`/settings/tables/${table.id}/qr`, {}, { preserveScroll: true })}
                                            >
                                                <QrCode className="mr-1 h-3.5 w-3.5" /> Regenerate
                                            </Button>
                                        </div>
                                    </>
                                ) : (
                                    <span className="text-muted-foreground text-xs">QR belum dibuat.</span>
                                )}
                            </div>
                        );
                    })}
                    {tables.length === 0 && <p className="text-muted-foreground col-span-full py-8 text-center text-sm">Belum ada meja.</p>}
                </div>
            </CardContent>
        </Card>
    );
}
