// Reminder message templates in English + Hindi (Devanagari).
export type ReminderKind = "routine" | "missed" | "urgent";

export function buildReminder(
  kind: ReminderKind,
  lang: "en" | "hi",
  params: { patientName: string; dueDate: string; workerName: string; phone: string }
): { message: string; whatsappUrl: string; smsUrl: string } {
  const { patientName, dueDate, workerName, phone } = params;
  let message: string;
  if (lang === "hi") {
    if (kind === "urgent")
      message = `नमस्ते ${patientName} जी, आपकी स्थिति को देखते हुए तुरंत स्वास्थ्य केंद्र जाएँ। आपकी आशा कार्यकर्ता ${workerName} से संपर्क करें। नियत तिथि: ${dueDate}। - सहाय्यक`;
    else if (kind === "missed")
      message = `नमस्ते ${patientName} जी, आपकी पिछली मुलाकात छूट गई है (तिथि: ${dueDate})। कृपया जल्द ही ${workerName} से मिलें। - सहाय्यक`;
    else
      message = `नमस्ते ${patientName} जी, आपकी अगली जाँच ${dueDate} को है। कृपया ${workerName} से मिलें। - सहाय्यक`;
  } else {
    if (kind === "urgent")
      message = `Hello ${patientName}, your readings need urgent attention. Please visit the health centre immediately. Your health worker ${workerName} will help you. Due date: ${dueDate}. - Sahayak`;
    else if (kind === "missed")
      message = `Hello ${patientName}, you missed your follow-up (was due: ${dueDate}). Please meet ${workerName} soon. - Sahayak`;
    else
      message = `Hello ${patientName}, your next check-up is on ${dueDate}. Please meet ${workerName}. - Sahayak`;
  }
  const digits = phone.replace(/\D/g, "");
  const whatsappUrl = `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
  const smsUrl = `sms:${phone}?body=${encodeURIComponent(message)}`;
  return { message, whatsappUrl, smsUrl };
}
