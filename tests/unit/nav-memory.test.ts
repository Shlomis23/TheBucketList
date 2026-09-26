import { beforeEach, describe, expect, it, vi } from "vitest";
import { __resetNavMemory, goBack, newEntryId, onTabTap, recordNavigation, saveScroll } from "@/lib/nav/memory";

// סימולציה של היסטוריית הדפדפן בסביבת node: כל רשומה עם מזהה, כמו ש-NavMemory
// מחתים ב-pushState. history.go(-n) זז אחורה ומדווח כמו popstate.
let entries: { id: string; url: string }[] = [];
let index = -1;
let lastGo: number[] = [];
let scrolledTop = 0;
const router = {
  pushes: [] as { href: string; scroll?: boolean }[],
  push(href: string, opts?: { scroll?: boolean }) {
    this.pushes.push({ href, scroll: opts?.scroll });
  },
};

beforeEach(() => {
  __resetNavMemory();
  entries = [];
  index = -1;
  lastGo = [];
  scrolledTop = 0;
  router.pushes = [];
  vi.stubGlobal("window", {
    history: { go: (n: number) => lastGo.push(n) },
    scrollTo: () => {
      scrolledTop++;
    },
  });
});

function visit(...urls: string[]) {
  return urls.map((url) => {
    entries = entries.slice(0, index + 1);
    entries.push({ id: newEntryId(), url });
    index = entries.length - 1;
    return recordNavigation(url, entries[index].id);
  });
}
function replace(url: string) {
  entries[index] = { ...entries[index], url };
  return recordNavigation(url, entries[index].id);
}
// הדפדפן זז n צעדים (כפתור, לשונית, או "אחורה" של אנדרואיד).
function go(n: number) {
  index += n;
  const e = entries[index];
  return recordNavigation(e.url, e.id);
}

describe("זיכרון גלילה", () => {
  it("חזרה אחורה לרשימה מחזירה את המיקום השמור של אותה תצוגה", () => {
    visit("/", "/ideas?view=waiting");
    saveScroll("/ideas?view=waiting", 640);
    visit("/ideas/a");
    expect(go(-1).restoreTo).toBe(640);
  });

  it("כניסה חדשה לרשימה (לא חזרה) — בלי שחזור, מלמעלה", () => {
    visit("/ideas");
    saveScroll("/ideas", 500);
    visit("/plans");
    expect(visit("/ideas")[0].restoreTo).toBeNull();
  });

  it("push לאותה כתובת כמו שני צעדים קודם אינו חזרה", () => {
    visit("/ideas");
    saveScroll("/ideas", 500);
    visit("/ideas/a", "/ideas/a/edit");
    expect(visit("/ideas/a")[0].restoreTo).toBeNull();
    goBack(router, "/ideas");
    expect(lastGo).toEqual([-3]); // מדלג על הטופס ועל אותו רעיון
    expect(go(-3).restoreTo).toBe(500);
  });

  it("לא שומר מיקום בדפי פרטים", () => {
    visit("/ideas/a");
    saveScroll("/ideas/a", 300);
    visit("/ideas");
    expect(go(-1).restoreTo).toBeNull();
  });

  it("שינוי סינון באותו מסך (replace) לא נחשב מסך חדש", () => {
    visit("/", "/memories");
    replace("/memories?q=ים");
    saveScroll("/memories?q=ים", 210);
    visit("/memories/m1");
    goBack(router, "/memories");
    expect(lastGo).toEqual([-1]);
    expect(go(-1).restoreTo).toBe(210);
  });

  it("אנדרואיד: אחורה מרעיון לרשימה, ואז שוב לבית — כל אחד למקומו", () => {
    visit("/");
    saveScroll("/", 150);
    visit("/ideas");
    saveScroll("/ideas", 700);
    visit("/ideas/a");
    expect(go(-1).restoreTo).toBe(700);
    expect(go(-1).restoreTo).toBe(150);
  });
});

describe("כפתור חזרה", () => {
  it("רעיון -> תוכנית חדשה -> תוכנית: חזרה לרעיון", () => {
    visit("/ideas", "/ideas/a", "/plans/new", "/plans/p1");
    goBack(router, "/plans");
    expect(lastGo).toEqual([-2]);
  });

  it("בלי מסך קודם (מהתראה) — לרשימה של האזור, בלי קפיצה לראש", () => {
    visit("/plans/p1");
    goBack(router, "/plans");
    expect(lastGo).toEqual([]);
    expect(router.pushes).toEqual([{ href: "/plans", scroll: false }]);
  });
});

describe("לחיצה על לשונית", () => {
  it("ברשימה עצמה — גלילה לראש", () => {
    visit("/ideas");
    expect(onTabTap(router, "/ideas", "/ideas")).toBe(true);
    expect(scrolledTop).toBe(1);
  });

  it("בתוך רעיון שנפתח מהרשימה — חזרה לרשימה עם המיקום", () => {
    visit("/", "/ideas?view=all");
    saveScroll("/ideas?view=all", 900);
    visit("/ideas/a", "/ideas/a/edit", "/ideas/a");
    expect(onTabTap(router, "/ideas", "/ideas/a")).toBe(true);
    expect(lastGo).toEqual([-3]);
    expect(go(-3).restoreTo).toBe(900);
  });

  it("בתוך רעיון שנפתח מהבית — חזרה לרשימה עם המיקום השמור", () => {
    visit("/ideas");
    saveScroll("/ideas", 420);
    visit("/", "/ideas/b");
    expect(onTabTap(router, "/ideas", "/ideas/b")).toBe(true);
    expect(lastGo).toEqual([-2]);
    expect(go(-2).restoreTo).toBe(420);
  });

  it("אזור אחר — הקישור הרגיל", () => {
    visit("/ideas", "/ideas/a");
    expect(onTabTap(router, "/plans", "/ideas/a")).toBe(false);
    expect(onTabTap(router, "/", "/ideas/a")).toBe(false);
  });

  it("רעיון מהתראה ואז לשונית רעיונות — push לרשימה עם שחזור", () => {
    visit("/ideas/a");
    expect(onTabTap(router, "/ideas", "/ideas/a")).toBe(true);
    expect(router.pushes).toEqual([{ href: "/ideas", scroll: false }]);
  });
});
