import { z } from "zod";

export const NodeTypeEnum = z.enum(["normal", "fast", "ws"]);
export type NodeType = z.infer<typeof NodeTypeEnum>;
