// Permalinks at the pinned SHA. Every EvidencePin / RepoLink resolves to the
// exact bytes the provenance gate read, so a claim and its proof can never drift
// apart. The SHA comes from the generated facts, not a literal.
import facts from "../generated/facts.json";

export const REPO = "crypticpy/build-a-claude-harness";
export const PIN_SHA = (facts as { sha: string }).sha;
export const SHORT_SHA = (facts as { shortSha: string }).shortSha;

export function permalink(path: string, lines?: [number, number?]): string {
  const clean = path.replace(/^\//, "");
  let frag = "";
  if (lines) {
    const [a, b] = lines;
    frag = `#L${a}${b && b !== a ? `-L${b}` : ""}`;
  }
  return `https://github.com/${REPO}/blob/${PIN_SHA}/${clean}${frag}`;
}
