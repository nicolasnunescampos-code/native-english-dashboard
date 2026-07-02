function normalizeAnswer(text) {
    let t = text.toLowerCase().trim();
    return t;
}

try {
  normalizeAnswer(null);
} catch(e) {
  console.log(e.message);
}
