import { NodeDataReference } from "../node-data-reference";
import { Node } from "./node";

export interface InputKeyNode extends Node {
    inputKey: string;
}