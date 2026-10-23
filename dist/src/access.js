/** Future entitlement boundary. No payment collection or access restriction in this preview.
 * Replace with a server-backed provider when the commercial service is ready.
 * A browser flag must never be trusted as payment evidence or permission.
 * Suggested server response: {active, plan, expiresAt, offlineUntil, features}.
 */
export class PreviewAccessProvider {
  async getEntitlement() {return {active:true,plan:'free-preview',expiresAt:null,features:['local-learning','local-import','themes']};}
}
