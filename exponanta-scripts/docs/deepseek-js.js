const DEEPSEEK_API_KEY = ""; // paste your key

const res = await fetch("https://api.deepseek.com/chat/completions", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${DEEPSEEK_API_KEY}`
  },
  body: JSON.stringify({
    model: "deepseek-v4-flash",
    messages: [
      { role: "system", content: "You are a helpful assistant." },
      { role: "user", content: "Say hello and tell me which model you are." }
    ],
    stream: false
  })
});

const data = await res.json();
console.log(data.choices[0].message.content);


//=============parsing

const pageText = document.body.innerText.slice(0, 15000); // trim to avoid token limits

const res = await fetch("https://api.deepseek.com/chat/completions", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${DEEPSEEK_API_KEY}`
  },
  body: JSON.stringify({
    model: "deepseek-v4-flash",
    messages: [
      {
        role: "system",
        content: "You are a data extraction assistant. Extract and structure the content from the provided webpage text into clean, logical JSON. Return ONLY valid JSON, no markdown, no explanation, no backticks."
      },
      {
        role: "user",
        content: `Structure this webpage content as JSON:\n\n${pageText}`
      }
    ],
    stream: false
  })
});

const data = await res.json();
const raw = data.choices[0].message.content;

// Parse and pretty-print
const parsed = JSON.parse(raw);
console.log(JSON.stringify(parsed, null, 2));