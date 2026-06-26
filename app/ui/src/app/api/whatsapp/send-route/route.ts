import { NextResponse } from "next/server";

import { sendRoutesRequestSchema } from "@/lib/validation/whatsapp.schema";
import { sendRoutesToWhatsApp } from "@/lib/whatsapp/whatsappClient";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON format" }, { status: 400 });
  }

  try {
    const validation = sendRoutesRequestSchema.safeParse(body);

    if (!validation.success) {
      const message = validation.error.issues[0].message;
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const results = await sendRoutesToWhatsApp(validation.data.routes);

    return NextResponse.json({ results }, { status: 200 });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Failed to send routes via WhatsApp." },
      { status: 500 },
    );
  }
}
