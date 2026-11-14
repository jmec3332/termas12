import {
  formatCLP,
  formatDateLong,
  formatPhone,
  formatTurn,
  PACKAGES,
  TURN_MINUTES,
  VENUE_PHONE,
  type Booking,
} from "./termas";

export const VISIT_NOTICE = "Llevar traje de baño y toalla, y llegar 15 minutos antes del primer turno.";

export function bookingLines(b: Booking): string[] {
  const lines = [
    `Código: ${b.code}`,
    `Paquete: ${PACKAGES[b.packageId].name}`,
    `Fecha: ${formatDateLong(b.date)}`,
    `Personas: ${b.people}${b.kids ? ` + ${b.kids} menor${b.kids > 1 ? "es" : ""} de 4 años (sin cargo)` : ""}`,
  ];
  if (b.tinaHour !== null) lines.push(`Tina: ${formatTurn("tina", b.tinaHour)}`);
  if (b.saunaHour !== null) lines.push(`Sauna: ${formatTurn("sauna", b.saunaHour)}`);
  lines.push("Piscinas: libres todo el día");
  lines.push(`Total: ${formatCLP(b.total)} (${formatCLP(b.unitPrice)} por persona, temporada ${b.season})`);
  lines.push(`A nombre de: ${b.name} · ${formatPhone(b.phone)}`);
  return lines;
}

export function whatsappLink(b: Booking): string {
  const text = [`Reserva Termas Punulaf`, ...bookingLines(b), "", VISIT_NOTICE].join("\n");
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function icsDate(date: string, hour: number, minute: number) {
  return `${date.replace(/-/g, "")}T${String(hour).padStart(2, "0")}${String(minute).padStart(2, "0")}00`;
}

function icsEscape(s: string) {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export function buildIcs(b: Booking): string {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const desc = icsEscape([...bookingLines(b), "", VISIT_NOTICE].join("\n"));
  const events: { uid: string; summary: string; start: string; end: string }[] = [];
  if (b.tinaHour !== null)
    events.push({ uid: "tina", summary: "Tina · Termas Punulaf", start: icsDate(b.date, b.tinaHour, 0), end: icsDate(b.date, b.tinaHour, TURN_MINUTES.tina) });
  if (b.saunaHour !== null)
    events.push({ uid: "sauna", summary: "Sauna · Termas Punulaf", start: icsDate(b.date, b.saunaHour, 0), end: icsDate(b.date, b.saunaHour, TURN_MINUTES.sauna) });
  if (!events.length)
    events.push({ uid: "piscinas", summary: "Piscinas · Termas Punulaf", start: icsDate(b.date, 10, 0), end: icsDate(b.date, 18, 0) });
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Termas Punulaf//Reservas//ES", "CALSCALE:GREGORIAN", "METHOD:PUBLISH"];
  for (const e of events) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${b.code}-${e.uid}@termaspunulaf.cl`,
      `DTSTAMP:${stamp}`,
      `DTSTART;TZID=America/Santiago:${e.start}`,
      `DTEND;TZID=America/Santiago:${e.end}`,
      `SUMMARY:${icsEscape(e.summary)} (${b.code})`,
      `DESCRIPTION:${desc}`,
      "LOCATION:Termas Punulaf\\, Chile",
      "BEGIN:VALARM",
      "TRIGGER:-PT2H",
      "ACTION:DISPLAY",
      "DESCRIPTION:Recordatorio Termas Punulaf",
      "END:VALARM",
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

export function downloadIcs(b: Booking) {
  downloadBlob(new Blob([buildIcs(b)], { type: "text/calendar;charset=utf-8" }), `reserva-${b.code}.ics`);
}

/** PDF mínimo escrito a mano (Helvetica + WinAnsi) para no depender de librerías externas. */
export function buildPdf(b: Booking): Uint8Array {
  const esc = (s: string) =>
    s
      .split("")
      .map((ch) => (ch.charCodeAt(0) < 256 ? ch : ch === "–" ? "-" : ch === "·" ? "\xb7" : "?"))
      .join("")
      .replace(/\\/g, "\\\\")
      .replace(/\(/g, "\\(")
      .replace(/\)/g, "\\)");
  const ops: string[] = [];
  ops.push("0.243 0.290 0.227 rg 0 742 595 100 re f");
  ops.push(`BT /F2 22 Tf 0.969 0.949 0.910 rg 50 790 Td (${esc("Termas Punulaf")}) Tj ET`);
  ops.push(`BT /F1 11 Tf 0.969 0.949 0.910 rg 50 768 Td (${esc("Comprobante de reserva")}) Tj ET`);
  ops.push(`BT /F2 28 Tf 0.851 0.557 0.290 rg 50 700 Td (${esc(b.code)}) Tj ET`);
  let y = 660;
  for (const line of bookingLines(b)) {
    ops.push(`BT /F1 12 Tf 0.165 0.149 0.133 rg 50 ${y} Td (${esc(line)}) Tj ET`);
    y -= 22;
  }
  y -= 14;
  ops.push(`0.851 0.557 0.290 rg 50 ${y - 8} 495 34 re f`);
  ops.push(`BT /F2 11 Tf 0.165 0.149 0.133 rg 60 ${y + 6} Td (${esc(VISIT_NOTICE)}) Tj ET`);
  y -= 50;
  ops.push(`BT /F1 10 Tf 0.4 0.4 0.4 rg 50 ${y} Td (${esc(`Cancelaciones con más de 24 horas de anticipación en "Mi visita". Contacto: ${VENUE_PHONE}`)}) Tj ET`);
  const content = ops.join("\n");

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
  ];
  let out = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((obj, i) => {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xref = out.length;
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((o) => (out += `${String(o).padStart(10, "0")} 00000 n \n`));
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  const bytes = new Uint8Array(out.length);
  for (let i = 0; i < out.length; i++) bytes[i] = out.charCodeAt(i) & 0xff;
  return bytes;
}

export function downloadPdf(b: Booking) {
  const bytes = buildPdf(b);
  downloadBlob(new Blob([bytes.buffer as ArrayBuffer], { type: "application/pdf" }), `reserva-${b.code}.pdf`);
}
