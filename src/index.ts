import { Hono } from "hono";
import xendit from "./lib/xendit";
import { prisma } from "./lib/prisma";
import EventModel from "./model/event";
import { customAlphabet } from "nanoid";
import { readFile } from "node:fs/promises";
import path from "node:path";
import axios from "axios";

const app = new Hono();
const eventModel = new EventModel(prisma);

function escapeHtml(input: string) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function replaceAll(haystack: string, needle: string, replacement: string) {
  return haystack.split(needle).join(replacement);
}

app.get("/checkout/:packageId", async (c) => {
  const packageId = c.req.param("packageId");

  const pkg = await eventModel.getPackageById(packageId);

  if (!pkg) {
    return c.json({ error: "Event not found" }, 404);
  }

  const tpl = await readFile(
    path.join(process.cwd(), "src", "views", "checkout.html"),
    "utf8",
  );
  const title = `${pkg.event.name} (${pkg.name})`;
  const price = `Rp ${pkg.price.toLocaleString("id-ID")}`;
  const action = `/checkout/${packageId}`;

  const html = replaceAll(
    replaceAll(
      replaceAll(tpl, "{{TITLE}}", escapeHtml(title)),
      "{{PRICE}}",
      escapeHtml(price),
    ),
    "{{ACTION}}",
    escapeHtml(action),
  );

  return c.html(html);
});

app.post("/checkout/:packageId", async (c) => {
  const packageId = c.req.param("packageId");

  const pkg = await eventModel.getPackageById(packageId);

  if (!pkg) {
    return c.json({ error: "Event not found" }, 404);
  }

  const body = await c.req.parseBody();
  const emailRaw = body["email"];
  const email = typeof emailRaw === "string" ? emailRaw.trim() : "";

  if (!email) {
    return c.json({ error: "Email is required" }, 400);
  }

  let invoice;

  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const nanoid = customAlphabet(alphabet, 5);

  const data = {
    amount: pkg.price,
    externalId: `E-${nanoid()}`,
    successRedirectUrl: "https://discord.com/invite/7FBpTEXqVj",
    payerEmail: email,
    shouldSendEmail: true,
    items: [
      {
        name: `${pkg.event.name} (${pkg.name})`,
        price: pkg.price,
        quantity: 1,
      },
    ],
  };

  if (process.env.NODE_ENV === "production") {
    const { data: response } = await axios.post(
      new URL(process.env.PAYMENT_PROXY_URL!).toString(),
      data,
      {
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.PAYMENT_PROXY_API_KEY,
        },
      },
    );
    invoice = response;
  } else {
    invoice = await xendit.Invoice.createInvoice({
      data,
    });
  }

  return c.redirect(invoice.invoiceUrl);
});

export default app;
