import { Minus, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

export function NumberStepper({
  id,
  value,
  min,
  max,
  onChange,
}: {
  id: string;
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Button type="button" variant="outline" size="icon" aria-label="Restar" disabled={value <= min} onClick={() => onChange(value - 1)}>
        <Minus />
      </Button>
      <output id={id} className="w-10 text-center font-display text-xl font-black tabular" aria-live="polite">
        {value}
      </output>
      <Button type="button" variant="outline" size="icon" aria-label="Sumar" disabled={value >= max} onClick={() => onChange(value + 1)}>
        <Plus />
      </Button>
    </div>
  );
}
