import { notFound } from "next/navigation";

/** Target of proxy rewrites for invalid verse URLs — always renders the 404 UI. */
export default function Introuvable() {
  notFound();
}
