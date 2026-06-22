const TELEGRAM_API = "https://api.telegram.org";
const MAX_MESSAGE_LENGTH = 4096;

function getToken(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN not set");
  return token;
}

export async function sendMessage(chatId: number, text: string) {
  const chunks = splitMessage(text);
  for (const chunk of chunks) {
    await fetch(`${TELEGRAM_API}/bot${getToken()}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: chunk, parse_mode: "HTML" }),
    });
  }
}

export async function sendPhoto(chatId: number, photoUrl: string, caption?: string) {
  const body: Record<string, unknown> = { chat_id: chatId, photo: photoUrl };
  if (caption) body.caption = caption;
  await fetch(`${TELEGRAM_API}/bot${getToken()}/sendPhoto`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function formatRupiah(amount: number): string {
  return `Rp ${amount.toLocaleString("id-ID")}`;
}

function splitMessage(text: string): string[] {
  if (text.length <= MAX_MESSAGE_LENGTH) return [text];
  const chunks: string[] = [];
  let current = "";
  for (const line of text.split("\n")) {
    if (current.length + line.length + 1 > MAX_MESSAGE_LENGTH) {
      chunks.push(current);
      current = line;
    } else {
      current += (current ? "\n" : "") + line;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

export function parseTelegramAmount(text: string): number | null {
  const cleaned = text
    .replace(/\./g, "")
    .replace(/,/g, ".")
    .replace(/[^0-9.,]/g, "");
  const match = cleaned.match(/(\d+(?:[.,]\d{1,2})?)/);
  if (!match) return null;
  const num = parseFloat(match[1].replace(/,/g, "."));
  return isNaN(num) ? null : num;
}

export async function getFileUrl(fileId: string): Promise<string> {
  const resp = await fetch(
    `${TELEGRAM_API}/bot${getToken()}/getFile?file_id=${fileId}`
  );
  const data = await resp.json();
  if (!data.ok) throw new Error("Failed to get file");
  return `${TELEGRAM_API}/file/bot${getToken()}/${data.result.file_path}`;
}
