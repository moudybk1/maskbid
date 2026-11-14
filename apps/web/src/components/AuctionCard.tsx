import { formatMoney, formatUnits6, TOKEN_SYMBOL } from "@maskbid/protocol";
import type { AuctionView } from "@/lib/data";
import { demoPhoto } from "@/lib/demo-photos";
import { fmtRelative } from "@/lib/format";
import { Arrow } from "./Hero";
import { PhaseBadge } from "./ui";

function timing(v: AuctionView): string {
  const { a, phase, now } = v;
  if (phase === "Live") return `Closes ${fmtRelative(a.endTime, now)}`;
  if (phase === "Scheduled") return `Opens ${fmtRelative(a.startTime, now)}`;
  return `Closed ${fmtRelative(a.endTime, now)}`;
}

export function AuctionCard({ v, maxBids }: { v: AuctionView; maxBids: number }) {
  const { a, phase } = v;
  const own = v.metadata?.images?.[0];
  const stand = own ? null : demoPhoto(v.metadata?.category);
  const sold = phase === "Claim" || phase === "Completed";
  const open = phase === "Live" || phase === "Scheduled";
  const category = v.metadata?.category?.replace("_", " ") ?? "Verified asset";
  return (
    <a className="lot-card card" href={`/auctions/${v.id}`}>
      <div className="lot-body">
        <div className="lot-top">
          <PhaseBadge phase={phase} />
          <span className="lot-when">{timing(v)}</span>
        </div>
        <div className="lot-head">
          <h3>{v.metadata?.title ?? `Asset #${a.tokenId.toString()}`}</h3>
          <p className="lot-meta"><span>{category}</span><span>Lot {v.id.toString()}</span><span>Token #{a.tokenId.toString()}</span></p>
        </div>
        <dl className="lot-figures">
          <div className="lot-price">
            <dt>{sold ? "Winning bid" : "Reserve"}</dt>
            <dd>{formatUnits6(sold ? a.winningAmountUnits : a.reserveUnits)}<small>{TOKEN_SYMBOL}</small></dd>
          </div>
          <div className="lot-deposit">
            <dt>Deposit</dt>
            <dd>{formatMoney(a.depositUnits)}</dd>
          </div>
        </dl>
        <div className="bidbar">
          <div className="bidbar-label"><span>{a.bidCount} sealed bid{a.bidCount === 1 ? "" : "s"}</span>{open && <span>{maxBids - a.bidCount} seats left</span>}</div>
          <div className="bidbar-track"><div className="bidbar-fill" style={{ width: `${Math.max(2, (100 * a.bidCount) / maxBids)}%` }} /></div>
        </div>
        <span className="lot-go">{phase === "Live" ? "Place a sealed bid" : sold ? "View result" : "View lot"} <Arrow /></span>
      </div>
      <div className="lot-art photo">
        <img src={own ?? stand!.src} alt="" loading="lazy" />
        {stand && <span className="lot-credit">Illustrative photo · {stand.credit}</span>}
      </div>
    </a>
  );
}
