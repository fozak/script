// Dummy array for testing
window.testArray = [
  { id: 1, name: "Task A", done: false },
  { id: 2, name: "Task B", done: true }
];

// Expose a helper to save to chrome.storage.local
window.saveTasks = () => {
  chrome.storage.local.set({ tasks: window.testArray }, () => {
    console.log("Saved tasks:", window.testArray);
  });
};

// Expose a helper to read from chrome.storage.local
window.loadTasks = () => {
  chrome.storage.local.get("tasks", (res) => {
    console.log("Loaded tasks:", res.tasks);
  });
};

// You can also put your conversion / hydration functions here
window.hydrateTasks = (arr) => {
  return arr.map(t => ({ ...t, done: Boolean(t.done) }));
};

console.log("Content script loaded!");
