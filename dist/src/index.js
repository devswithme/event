"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const hono_1 = require("hono");
const xendit_1 = __importDefault(require("./lib/xendit"));
const prisma_1 = require("./lib/prisma");
const event_1 = __importDefault(require("./model/event"));
const nanoid_1 = require("nanoid");
const promises_1 = require("node:fs/promises");
const node_path_1 = __importDefault(require("node:path"));
const axios_1 = __importDefault(require("axios"));
const app = new hono_1.Hono();
const eventModel = new event_1.default(prisma_1.prisma);
function escapeHtml(input) {
    return input
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
function replaceAll(haystack, needle, replacement) {
    return haystack.split(needle).join(replacement);
}
app.get("/checkout/:packageId", async (c) => {
    const packageId = c.req.param("packageId");
    const pkg = await eventModel.getPackageById(packageId);
    if (!pkg) {
        return c.json({ error: "Event not found" }, 404);
    }
    const tpl = await (0, promises_1.readFile)(node_path_1.default.join(process.cwd(), "src", "views", "checkout.html"), "utf8");
    const title = `${pkg.event.name} (${pkg.name})`;
    const price = `Rp ${pkg.price.toLocaleString("id-ID")}`;
    const action = `/checkout/${packageId}`;
    const html = replaceAll(replaceAll(replaceAll(tpl, "{{TITLE}}", escapeHtml(title)), "{{PRICE}}", escapeHtml(price)), "{{ACTION}}", escapeHtml(action));
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
    let finalPrice = pkg.price;
    const promoCodeRaw = body["promoCode"];
    const promoCode = typeof promoCodeRaw === "string" ? promoCodeRaw.trim().toUpperCase() : "";
    if (promoCode) {
        const claimed = await eventModel.claimPromoCode(promoCode, packageId);
        if (!claimed) {
            return c.json({ error: "Promo code is invalid, not applicable, or quota exhausted" }, 400);
        }
        finalPrice = Math.round(pkg.price * (1 - claimed.discountPct / 100));
    }
    let invoice;
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const nanoid = (0, nanoid_1.customAlphabet)(alphabet, 5);
    const data = {
        amount: finalPrice,
        externalId: `E-${nanoid()}`,
        successRedirectUrl: "https://discord.com/invite/7FBpTEXqVj",
        payerEmail: email,
        shouldSendEmail: true,
        items: [
            {
                name: `${pkg.event.name} (${pkg.name})`,
                price: finalPrice,
                quantity: 1,
            },
        ],
    };
    if (process.env.NODE_ENV === "production") {
        const { data: response } = await axios_1.default.post(new URL(process.env.PAYMENT_PROXY_URL).toString(), data, {
            headers: {
                "Content-Type": "application/json",
                "x-api-key": process.env.PAYMENT_PROXY_API_KEY,
            },
        });
        invoice = response;
    }
    else {
        invoice = await xendit_1.default.Invoice.createInvoice({
            data,
        });
    }
    return c.redirect(invoice.invoiceUrl);
});
app.get("/promo-codes", async (c) => {
    const packageId = c.req.query("packageId");
    const codes = await eventModel.listPromoCodes(packageId);
    return c.json(codes);
});
exports.default = app;
