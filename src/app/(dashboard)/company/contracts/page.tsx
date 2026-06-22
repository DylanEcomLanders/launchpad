/* /company/contracts is no longer a top tab - it's a detail surface
 * reached from Inbox ("Contracts awaiting your counter-sign") or from
 * a Person's Agreements tab. Layout treats this path as a detail
 * route and renders {children}, so we re-export the panel directly. */
export { default } from "../_panels/ContractsPanel";
