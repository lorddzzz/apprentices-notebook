/** The error every EN stub throws until its task lands: `not built (EN-5)`. */
export function notBuilt(task: string): never {
  throw new Error(`not built (${task})`);
}
