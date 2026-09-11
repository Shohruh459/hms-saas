'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { toast } from '../hooks/use-toast';
import { createRoom, updateRoom, type RoomFormInput } from '../lib/api/rooms';
import type { GenderPolicy, Room, RoomType } from '../lib/api/types';
import { useTranslations } from '../lib/i18n-provider';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';

const ROOM_TYPES: RoomType[] = ['PRIVATE', 'SHARED'];
const GENDER_POLICIES: GenderPolicy[] = ['MIXED', 'MALE_ONLY', 'FEMALE_ONLY'];

function toFormState(room?: Room | null): RoomFormInput {
  return {
    roomNumber: room?.roomNumber ?? '',
    floor: room?.floor ?? 1,
    category: room?.category ?? '',
    pricePerNight: room ? Number(room.pricePerNight) : 0,
    capacity: room?.capacity ?? 2,
    type: room?.type ?? 'PRIVATE',
    genderPolicy: room?.genderPolicy ?? 'MIXED',
    totalBeds: room?.totalBeds ?? 1,
    pricePerBed: room?.pricePerBed ?? undefined,
  };
}

export function RoomFormDialog({
  open,
  onOpenChange,
  room,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  room?: Room | null;
  onSaved: (room: Room) => void;
}) {
  const { t } = useTranslations();
  const [form, setForm] = useState<RoomFormInput>(() => toFormState(room));
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(toFormState(room));
    }
  }, [open, room]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const payload: RoomFormInput = {
        ...form,
        pricePerBed: form.type === 'SHARED' ? form.pricePerBed : undefined,
      };
      const saved = room ? await updateRoom(room.id, payload) : await createRoom(payload);
      toast({ title: t('admin.roomSaved'), variant: 'success' });
      onSaved(saved);
      onOpenChange(false);
    } catch {
      toast({ title: t('common.error'), variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{room ? t('admin.editRoom') : t('admin.addRoom')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="room-form-number">{t('admin.roomNumberLabel')}</Label>
              <Input
                id="room-form-number"
                required
                value={form.roomNumber}
                onChange={(e) => setForm((f) => ({ ...f, roomNumber: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="room-form-floor">{t('admin.floorLabel')}</Label>
              <Input
                id="room-form-floor"
                type="number"
                min={0}
                required
                value={form.floor}
                onChange={(e) => setForm((f) => ({ ...f, floor: Number(e.target.value) }))}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="room-form-category">{t('admin.categoryLabel')}</Label>
            <Input
              id="room-form-category"
              required
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="room-form-price">{t('admin.pricePerNightLabel')}</Label>
              <Input
                id="room-form-price"
                type="number"
                min={0}
                required
                value={form.pricePerNight}
                onChange={(e) => setForm((f) => ({ ...f, pricePerNight: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="room-form-capacity">{t('admin.capacityLabel')}</Label>
              <Input
                id="room-form-capacity"
                type="number"
                min={1}
                value={form.capacity}
                onChange={(e) => setForm((f) => ({ ...f, capacity: Number(e.target.value) }))}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="room-form-type">{t('admin.typeLabel')}</Label>
            <select
              id="room-form-type"
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as RoomType }))}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {ROOM_TYPES.map((type) => (
                <option key={type} value={type}>
                  {t(`room.type_${type}`)}
                </option>
              ))}
            </select>
          </div>

          {form.type === 'SHARED' && (
            <>
              <div className="space-y-1">
                <Label htmlFor="room-form-gender">{t('admin.genderPolicyLabel')}</Label>
                <select
                  id="room-form-gender"
                  value={form.genderPolicy}
                  onChange={(e) => setForm((f) => ({ ...f, genderPolicy: e.target.value as GenderPolicy }))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  {GENDER_POLICIES.map((policy) => (
                    <option key={policy} value={policy}>
                      {t(`admin.genderPolicy_${policy}`)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="room-form-beds">{t('admin.totalBedsLabel')}</Label>
                  <Input
                    id="room-form-beds"
                    type="number"
                    min={1}
                    required
                    value={form.totalBeds}
                    onChange={(e) => setForm((f) => ({ ...f, totalBeds: Number(e.target.value) }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="room-form-price-bed">{t('admin.pricePerBedLabel')}</Label>
                  <Input
                    id="room-form-price-bed"
                    type="number"
                    min={0}
                    required
                    value={form.pricePerBed ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, pricePerBed: Number(e.target.value) }))}
                  />
                </div>
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              {t('admin.cancelRoomForm')}
            </Button>
            <Button type="submit" disabled={submitting}>
              {t('admin.saveRoom')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
