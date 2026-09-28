import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks=vi.hoisted(()=>({save:vi.fn(),remove:vi.fn(),revalidate:vi.fn(),notify:vi.fn()}));
vi.mock("@/lib/dal/recipes",()=>({saveRecipe:mocks.save,deleteRecipe:mocks.remove}));
vi.mock("next/cache",()=>({revalidatePath:mocks.revalidate}));
vi.mock("@/lib/push",()=>({notifyPartner:mocks.notify}));
import { saveRecipeAction, deleteRecipeAction } from "@/app/(app)/ideas/recipes/actions";
const id="c17effd8-eecf-4d2e-b75e-df730a980e21";
beforeEach(()=>{vi.clearAllMocks();mocks.save.mockResolvedValue({ok:true,data:{id},requestId:id});mocks.remove.mockResolvedValue({ok:true,data:{deleted:true},requestId:id});});
describe("quiet recipe actions",()=>{
 it("saves and invalidates recipes without notifying the partner",async()=>{
  expect((await saveRecipeAction({id,expectedVersion:null,title:"סלט"})).ok).toBe(true);
  expect(mocks.save).toHaveBeenCalledWith({id,expectedVersion:null,title:"סלט",body:"",note:"",sourceUrl:"",course:null,classification:null});
  expect(mocks.revalidate).toHaveBeenCalledWith("/ideas/recipes","layout");expect(mocks.notify).not.toHaveBeenCalled();
 });
 it("rejects invalid input before writing",async()=>{
  expect((await saveRecipeAction({id,expectedVersion:null,title:" "})).ok).toBe(false);expect(mocks.save).not.toHaveBeenCalled();
  expect((await deleteRecipeAction({id,expectedVersion:null})).ok).toBe(false);expect(mocks.remove).not.toHaveBeenCalled();
 });
 it("preserves conflict errors and does not invalidate failed writes",async()=>{
  mocks.save.mockResolvedValue({ok:false,error:{code:"VERSION_CONFLICT",message:"רעננו"},requestId:id});
  expect(await saveRecipeAction({id,expectedVersion:1,title:"סלט"})).toMatchObject({ok:false,error:{code:"VERSION_CONFLICT"}});
  expect(mocks.revalidate).not.toHaveBeenCalled();
 });
 it("deletes with the expected version without notifying",async()=>{
  expect((await deleteRecipeAction({id,expectedVersion:2})).ok).toBe(true);
  expect(mocks.remove).toHaveBeenCalledWith(id,2);expect(mocks.notify).not.toHaveBeenCalled();
 });
});
