// Data layer for Rabbit Hole Radar.
// The UI calls these methods instead of reading storage directly. Later, this module
// can be switched to a Google Apps Script endpoint without rewriting app.js.
export const STORAGE_KEY = "rabbit-hole-radar:v1";
export const CATEGORIES = [
  "Data & Analytics", "Coding", "AI & Technology", "Food & Geography",
  "Electronics & DIY", "Career & Learning", "Other"
];
export const STATUSES = ["Idea", "Exploring", "Building", "Completed"];
export const CURIOSITY_LEVELS = ["Just Curious", "I Want to Try This", "Let's Build It!"];
export const PRIORITIES = ["Low", "Medium", "High"];

const day = 86400000;
const uid = () => globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2, 11);
const task = (text, done = false) => ({ id: uid(), text, done });
const link = (label, url) => ({ id: uid(), label, url });

export function makeIdea(fields = {}) {
  const now = Date.now();
  return {
    id: uid(), title: "", description: "", category: "Other",
    curiosity: "Just Curious", priority: "Medium", status: "Idea",
    progress: 0, notes: "", tasks: [], links: [], favorite: false,
    hours: 0, createdAt: now, updatedAt: now, ...fields
  };
}

export function sampleIdeas() {
  const now = Date.now();
  return [
    makeIdea({
      title: "Map the foods I've tried around the world",
      description: "Build an interactive map that traces dishes back to their regions of origin.",
      category: "Food & Geography", curiosity: "Let's Build It!", priority: "High",
      status: "Building", progress: 65, hours: 14, favorite: true,
      notes: "Keep the focus on where the food comes from. Restaurants are a fun detail, not the main event.",
      tasks: [task("Choose a map library", true), task("Sketch the data structure", true), task("Connect the spreadsheet API"), task("Add regional filters")],
      links: [link("Leaflet", "https://leafletjs.com/")],
      createdAt: now - 20 * day, updatedAt: now - day
    }),
    makeIdea({
      title: "A tiny Python data pipeline",
      description: "Pull a public dataset, clean it, validate it, and load it somewhere useful.",
      category: "Data & Analytics", curiosity: "Let's Build It!", priority: "High",
      status: "Exploring", progress: 35, hours: 6,
      tasks: [task("Pick a dataset", true), task("Write the extraction step", true), task("Add validation checks"), task("Document the pipeline")],
      createdAt: now - 12 * day, updatedAt: now - 3 * day
    }),
    makeIdea({
      title: "Make a tiny JavaScript game",
      description: "One screen, a simple goal, and a little personality. Weird is welcome.",
      category: "Coding", curiosity: "I Want to Try This", status: "Completed",
      progress: 100, hours: 5, notes: "A small finished project is still a finished project.",
      tasks: [task("Get the canvas working", true), task("Add controls", true), task("Polish the game loop", true)],
      createdAt: now - 40 * day, updatedAt: now - 9 * day
    }),
    makeIdea({
      title: "What can I build with a Raspberry Pi?",
      description: "Find a useful or delightfully unnecessary little electronics project.",
      category: "Electronics & DIY", curiosity: "Let's Build It!", status: "Exploring",
      progress: 20, hours: 3,
      tasks: [task("Check what parts I have", true), task("Choose a first experiment")],
      createdAt: now - 6 * day, updatedAt: now - 2 * day
    }),
    makeIdea({
      title: "How do LLM embeddings actually work?",
      description: "Get a feel for vectors and similarity by building a tiny semantic search.",
      category: "AI & Technology", curiosity: "Just Curious", priority: "Medium",
      status: "Idea", progress: 0, hours: 0,
      createdAt: now - 2 * day, updatedAt: now - 2 * day
    })
  ];
}

function normalize(ideas) {
  if (!Array.isArray(ideas)) throw new Error("Saved journal data wasn't a list.");
  return ideas.map((idea) => ({
    ...makeIdea(idea), ...idea,
    tasks: Array.isArray(idea.tasks) ? idea.tasks : [],
    links: Array.isArray(idea.links) ? idea.links : [],
    progress: Math.max(0, Math.min(100, Number(idea.progress) || 0)),
    hours: Math.max(0, Number(idea.hours) || 0)
  }));
}

export const localData = {
  async load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return normalize(JSON.parse(raw));
      const initial = sampleIdeas();
      await this.save(initial);
      return initial;
    } catch (error) {
      console.error("Could not load the saved journal:", error);
      throw new Error("Your saved journal couldn't be loaded. Try refreshing the page.");
    }
  },
  async save(ideas) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ideas));
      return { savedAt: Date.now() };
    } catch (error) {
      console.error("Could not save the journal:", error);
      throw new Error("The browser couldn't save your changes. Storage may be full or disabled.");
    }
  },
  async clear() {
    localStorage.removeItem(STORAGE_KEY);
    return this.save([]);
  }
};

// Future spreadsheet adapter shape. Set a deployed Google Apps Script URL here
// after we create the API. Never put private secrets in this public repository.
// The public app should call a server-side Apps Script endpoint, not store secrets.
export const dataStore = localData;

export const SUGGESTIONS = [
  { title: "Build a tiny Python data pipeline", description: "Fetch, clean, validate, and store a dataset in a pipeline small enough to understand end to end.", category: "Data & Analytics" },
  { title: "Explore the origin story of an unfamiliar dish", description: "Choose a dish you've never tried, trace where it came from, and map how it spread.", category: "Food & Geography" },
  { title: "Create a JavaScript mini-game", description: "A one-screen canvas game: snake, pong, or something weirder.", category: "Coding" },
  { title: "Analyze an interesting public dataset", description: "Pick something odd from an open-data portal and find three surprising facts.", category: "Data & Analytics" },
  { title: "Automate an annoying everyday task", description: "Find one repetitive thing you do and make a script do it for you.", category: "Coding" },
  { title: "Build a small electronics project", description: "An LED that reacts to sound, a plant moisture alarm, or a tiny clock.", category: "Electronics & DIY" },
  { title: "Make generative art", description: "Create a sketch that draws something different every time you run it.", category: "Coding" },
  { title: "Map a surprising historical trade route", description: "Follow the path of pepper, cinnamon, or another everyday ingredient across centuries.", category: "Food & Geography" },
  { title: "Train a tiny image classifier", description: "Teach a model to tell apart two things around the house using a small set of photos.", category: "AI & Technology" },
  { title: "Explain one thing you learned in five minutes", description: "Pick a concept you've recently figured out and make a tiny guide or demo for someone else.", category: "Career & Learning" }
];