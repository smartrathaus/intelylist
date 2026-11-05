import { describe, expect, it } from "vitest";
import { shoppingCategoryOrder, suggestShoppingCategory } from "@/lib/shopping-categories";

describe("automatic shopping categories", () => {
  it("assigns common grocery products to shelf groups independent of casing", () => {
    expect(suggestShoppingCategory("Bio-Milch")).toBe("Milchprodukte & Eier");
    expect(suggestShoppingCategory("Tomaten")).toBe("Obst & Gemüse");
    expect(suggestShoppingCategory("Zahnpasta")).toBe("Drogerie");
    expect(suggestShoppingCategory("Vollkornbrot")).toBe("Backwaren");
  });
  it("uses a safe fallback and stable aisle ordering", () => {
    expect(suggestShoppingCategory("Spezialgewürz")).toBe("Sonstiges");
    expect(shoppingCategoryOrder[0]).toBe("Obst & Gemüse");
    expect(shoppingCategoryOrder[shoppingCategoryOrder.length-1]).toBe("Sonstiges");
  });
});
