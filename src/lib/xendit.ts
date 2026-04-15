import Xendit from "xendit-node";

export default new Xendit({
  secretKey: process.env.XENDIT_SECRET_KEY!,
});
