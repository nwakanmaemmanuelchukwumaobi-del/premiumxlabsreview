import { expect, it } from "vitest";
import { requireOwnerAccess } from "@/lib/admin-access";
it("denies signed-in strangers who lack the verified owner permission",()=>{ expect(()=>requireOwnerAccess(false)).toThrow("only available to the owner"); });
it("denies missing or failed owner checks",()=>{expect(()=>requireOwnerAccess(null)).toThrow();expect(()=>requireOwnerAccess(true,true)).toThrow();});
it("allows a successful verified owner check",()=>{expect(()=>requireOwnerAccess(true)).not.toThrow();});