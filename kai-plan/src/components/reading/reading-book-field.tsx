"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addCalendarDays } from "@/lib/date";
import {
  bookOnCalendarDate,
  type BookDayEntry,
} from "@/lib/reading-data";

type Props = {
  rowDate: string;
  book: string;
  bookDayEntries: BookDayEntry[];
  recentBookTitles: string[];
  onBookChange: (next: string) => void;
};

export function ReadingRecentBooksDatalist({ titles }: { titles: string[] }) {
  return (
    <datalist id="reading-recent-books">
      {titles.map((title) => (
        <option key={title} value={title} />
      ))}
    </datalist>
  );
}

export function ReadingBookField({
  rowDate,
  book,
  bookDayEntries,
  recentBookTitles,
  onBookChange,
}: Props) {
  const day = rowDate.trim();
  const priorIso = addCalendarDays(day, -1);
  const priorBook = /^\d{4}-\d{2}-\d{2}$/.test(day)
    ? bookOnCalendarDate(bookDayEntries, priorIso)
    : null;
  const recentFirst = recentBookTitles[0] ?? null;
  const t = book.trim();

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Input
        type="text"
        list="reading-recent-books"
        value={book}
        onChange={(e) => onBookChange(e.target.value)}
        placeholder="Book title"
        autoComplete="off"
        spellCheck
        className="h-9 border-border/60 bg-background/50 text-xs"
      />
      <div className="flex flex-wrap gap-1">
        {priorBook ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 px-2 text-[10px] font-medium"
            onClick={() => onBookChange(priorBook)}
          >
            Prior day
          </Button>
        ) : null}
        {recentFirst && recentFirst !== t ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 px-2 text-[10px] font-medium"
            onClick={() => onBookChange(recentFirst)}
          >
            Most recent
          </Button>
        ) : null}
      </div>
    </div>
  );
}
