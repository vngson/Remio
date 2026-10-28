"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { deleteEventAction } from "@/lib/events/actions";

export function DeleteEventButton({
  id,
  title,
}: {
  id: string;
  title: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <Button
        variant="quiet"
        size="sm"
        className="h-auto px-0 py-0 text-ink-faint hover:text-son"
        onClick={() => dialogRef.current?.showModal()}
      >
        Xoá
      </Button>

      <dialog
        ref={dialogRef}
        aria-label={`Xoá sự kiện ${title}`}
        className="w-[min(26rem,calc(100vw-2rem))] rounded-slip border border-rule-strong bg-raised p-0 text-ink [&::backdrop]:bg-ink/45"
      >
        <form
          action={deleteEventAction}
          onSubmit={() => dialogRef.current?.close()}
          className="flex flex-col gap-5 p-6"
        >
          <input type="hidden" name="id" value={id} />
          <div className="flex flex-col gap-2">
            <span className="label-print text-son">Xoá sự kiện</span>
            <h2 className="text-xl">{title}</h2>
            <p className="text-ink-soft">
              Sự kiện cùng toàn bộ lịch sử nhắc nhở sẽ bị xoá vĩnh viễn. Không
              thể hoàn tác.
            </p>
          </div>
          <div className="flex justify-end gap-3 border-t border-rule pt-5">
            <Button variant="outline" onClick={() => dialogRef.current?.close()}>
              Giữ lại
            </Button>
            <Button type="submit" variant="primary">
              Xoá vĩnh viễn
            </Button>
          </div>
        </form>
      </dialog>
    </>
  );
}
