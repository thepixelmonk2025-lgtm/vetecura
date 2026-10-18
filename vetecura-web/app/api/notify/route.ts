import { NextRequest, NextResponse } from "next/server";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "8688187742:AAG6aq-umUJpuQ6lS-IP3s11ENWPnWOrpy4";

const GROUP_CHAT_MAPPINGS: Record<string, string | undefined> = {
  stock_in: process.env.TELEGRAM_CHAT_ID_OPERATIONS || "-5484338930",
  stock_out: process.env.TELEGRAM_CHAT_ID_OPERATIONS || "-5484338930",
  inventory_alerts: process.env.TELEGRAM_CHAT_ID_ALERTS || "-5136252998",
  security_audit: process.env.TELEGRAM_CHAT_ID_SECURITY || "-5507131939",
  management_reports: process.env.TELEGRAM_CHAT_ID_SECURITY || "-5507131939",
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { topic = "stock_in", message } = body;

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const chatId = GROUP_CHAT_MAPPINGS[topic] || process.env.TELEGRAM_CHAT_ID || "-5484338930";

    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "HTML",
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("Telegram API Error:", data);
      return NextResponse.json({ success: false, error: data }, { status: 500 });
    }

    return NextResponse.json({ success: true, result: data.result });
  } catch (err: any) {
    console.error("Notification route error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
