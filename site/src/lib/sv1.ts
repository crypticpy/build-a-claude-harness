// SV-1 Lifecycle Timeline — the hero. Build-time only: turns the generated
// StationModel[] into ONE typed DiagramModel plus the step-script and drawer
// data. The same source feeds three renders (animated SVG, data twin, no-JS
// fallback). No d3/runtime here beyond the frozen kit.
import models from "../generated/models.json";
import {
  type DiagramModel,
  type DiagramNode,
  type DiagramEdge,
} from "./diagram";

export interface Matcher {
  matcher: string;
  command: string;
  arg: string;
}
export interface Station {
  id: string;
  subscribed: boolean;
  fanout: boolean;
  matchers: Matcher[];
  contract: { stdin: string; stdout: string } | null;
  note: string;
  narration: string;
  provenance: { sha: string; permalink: string } | null;
}

export interface StepView {
  litNodes: string[];
  litEdges: string[];
  tokenX: number;
  tokenY: number;
  drawer: string;
  narration: string;
}

const WIRE_Y = 150;
const MARGIN = 90;
const WIDTH = 980;
const HEIGHT = 430;

export const stations = models.stations as Station[];

function xFor(i: number, n: number): number {
  if (n <= 1) return WIDTH / 2;
  return MARGIN + (i * (WIDTH - 2 * MARGIN)) / (n - 1);
}

export function buildSv1(): {
  model: DiagramModel;
  steps: StepView[];
  wireY: number;
  wireD: string;
} {
  const n = stations.length;
  const nodes: DiagramNode[] = stations.map((s, i) => ({
    id: s.id,
    kind: "router",
    label: s.id,
    x: xFor(i, n),
    y: WIRE_Y,
    w: 70,
    h: 56,
    trust: s.subscribed ? "fact" : "unpinnable",
  }));

  // Event-payload segments between consecutive stations: the platform handing
  // the turn forward. The inbound segment lights as the token arrives.
  const edges: DiagramEdge[] = [];
  for (let i = 1; i < n; i++) {
    edges.push({
      id: `seg-${i}`,
      from: stations[i - 1].id,
      to: stations[i].id,
      type: "event",
    });
  }

  const model: DiagramModel = {
    id: "sv1",
    sha: (models as { shortSha?: string }).shortSha,
    width: WIDTH,
    height: HEIGHT,
    nodes,
    edges,
  };

  const steps: StepView[] = stations.map((s, i) => ({
    litNodes: [s.id],
    litEdges: i > 0 ? [`seg-${i}`] : [],
    tokenX: xFor(i, n),
    tokenY: WIRE_Y,
    drawer: s.id,
    narration: s.narration,
  }));

  const first = xFor(0, n);
  const last = xFor(n - 1, n);
  const wireD = `M${first},${WIRE_Y} H${last}`;

  return { model, steps, wireY: WIRE_Y, wireD };
}
