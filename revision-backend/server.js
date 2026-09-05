const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const zlib = require('zlib');
// load local env file if present; on Render, env vars come from the dashboard
require('dotenv').config({ path: '../revision-guide/.env.local' });
require('dotenv').config(); // also loads .env in this folder if it exists

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' })); // default was 100kb -> big md uploads failed with 413/403

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB_NAME || 'revision_notes';

if (!MONGODB_URI) {
  console.error("MONGODB_URI is not defined in .env.local!");
  process.exit(1);
}

mongoose.connect(MONGODB_URI, {
  dbName: DB_NAME
}).then(() => {
  console.log(`Connected to MongoDB (Database: ${DB_NAME})`);
}).catch(err => {
  console.error('MongoDB connection error:', err);
});

// Mongoose Models
const noteSchema = new mongoose.Schema({
  id: String, // Kept to maintain compatibility with frontend logic
  text: String,
  timestamp: Number,
  docId: String,
  quote: String,
  tags: { type: [String], default: [] } // tag labels for filtering, e.g. "concept", "formula"
});

const highlightSchema = new mongoose.Schema({
  id: String, // Kept to maintain compatibility with frontend logic
  text: String,
  startIndex: Number,
  endIndex: Number,
  docId: String,
  color: String
});

const Note = mongoose.model('Note', noteSchema, 'notes'); // collection name 'notes'
const Highlight = mongoose.model('Highlight', highlightSchema, 'highlights'); // collection name 'highlights'

const documentSchema = new mongoose.Schema({
  id: String,
  title: String,
  content: String,
  folder: { type: String, default: 'Uploaded Documents' }
});
const Document = mongoose.model('Document', documentSchema, 'documents');

// --- API ROUTES ---

// GET all notes
app.get('/api/notes', async (req, res) => {
  try {
    const notes = await Note.find();
    res.json(notes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST a new note
app.post('/api/notes', async (req, res) => {
  try {
    const newNote = new Note(req.body);
    await newNote.save();
    res.json(newNote);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE a note
app.delete('/api/notes/:id', async (req, res) => {
  try {
    await Note.deleteOne({ id: req.params.id });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE a note (e.g. tags)
app.put('/api/notes/:id', async (req, res) => {
  try {
    const note = await Note.findOneAndUpdate(
      { id: req.params.id },
      { $set: req.body },
      { new: true }
    );
    if (!note) return res.status(404).json({ error: 'Note not found' });
    res.json(note);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET all highlights
app.get('/api/highlights', async (req, res) => {
  try {
    const highlights = await Highlight.find();
    res.json(highlights);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST a new highlight
app.post('/api/highlights', async (req, res) => {
  try {
    const newHighlight = new Highlight(req.body);
    await newHighlight.save();
    res.json(newHighlight);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE a highlight
app.delete('/api/highlights/:id', async (req, res) => {
  try {
    await Highlight.deleteOne({ id: req.params.id });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET all documents
app.get('/api/documents', async (req, res) => {
  try {
    const docs = await Document.find();
    res.json(docs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST a new document
// NOTE: Cloudflare (in front of Render) WAF-blocks request bodies containing
// patterns like '../' with a bare 403 and no CORS headers. The client sends
// content gzipped + base64 encoded (contentEncoding: 'gzip-base64') so the WAF
// sees only opaque bytes; we decode here before saving.
app.post('/api/documents', async (req, res) => {
  try {
    const body = { ...req.body };
    if (body.contentEncoding === 'gzip-base64' && body.content) {
      body.content = zlib.gunzipSync(Buffer.from(body.content, 'base64')).toString('utf8');
      delete body.contentEncoding;
    }
    const newDoc = new Document(body);
    await newDoc.save();
    res.json(newDoc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE a document (rename / move folder / edit content)
app.put('/api/documents/:id', async (req, res) => {
  try {
    const doc = await Document.findOneAndUpdate(
      { id: req.params.id },
      { $set: req.body },
      { new: true }
    );
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE a document, and clean up its notes + highlights
app.delete('/api/documents/:id', async (req, res) => {
  try {
    const docId = req.params.id;
    await Document.deleteOne({ id: docId });
    await Note.deleteMany({ docId });
    await Highlight.deleteMany({ docId });
    res.json({ message: 'Document deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- AI ROUTES (OpenAI-compatible; also works with other providers) ---

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

async function callAI(systemPrompt, userMessage, { json = false } = {}) {
  if (!OPENAI_API_KEY) {
    const err = new Error('OPENAI_API_KEY is not set in .env.local');
    err.code = 'AI_NOT_CONFIGURED';
    throw err;
  }
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      temperature: 0.3,
      ...(json ? { response_format: { type: 'json_object' } } : {})
    })
  });
  if (!res.ok) {
    const errText = await res.text();
    const err = new Error(`AI provider error ${res.status}: ${errText.slice(0, 300)}`);
    err.code = 'AI_ERROR';
    throw err;
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}

function aiError(res, err) {
  const status = err && err.code === 'AI_NOT_CONFIGURED' ? 501 : 502;
  return res.status(status).json({
    error: err?.message || 'AI request failed',
    aiConfigured: Boolean(OPENAI_API_KEY)
  });
}

app.post('/api/ai/explain', async (req, res) => {
  try {
    const { text } = req.body || {};
    if (!text) return res.status(400).json({ error: 'Missing text' });
    const answer = await callAI(
      'You are a study tutor. Explain the given passage in simple, clear language. Be concise.',
      `Explain this passage simply:\n\n${text.slice(0, 4000)}`
    );
    res.json({ answer });
  } catch (err) { aiError(res, err); }
});

app.post('/api/ai/summarize', async (req, res) => {
  try {
    const { title, content } = req.body || {};
    if (!content) return res.status(400).json({ error: 'Missing content' });
    const answer = await callAI(
      'You are a study assistant. Return a JSON object with keys "summary" (2-3 sentence overview), "keyPoints" (array of strings, max 8), and "headings" (array of main section headings).',
      `Summarize this document titled "${title || 'Untitled'}":\n\n${content.slice(0, 12000)}`,
      { json: true }
    );
    let parsed = { summary: answer, keyPoints: [], headings: [] };
    try { parsed = JSON.parse(answer); } catch { /* keep fallback */ }
    res.json(parsed);
  } catch (err) { aiError(res, err); }
});

app.post('/api/ai/quiz', async (req, res) => {
  try {
    const { content } = req.body || {};
    if (!content) return res.status(400).json({ error: 'Missing content' });
    const answer = await callAI(
      'You are a quiz generator. Return a JSON object with key "cards": an array of objects {front, back}. Generate 6 flashcards from the material.',
      `Create flashcards from this material:\n\n${content.slice(0, 12000)}`,
      { json: true }
    );
    let parsed = { cards: [] };
    try { parsed = JSON.parse(answer); } catch { /* ignore */ }
    if (!Array.isArray(parsed.cards)) parsed.cards = [];
    res.json(parsed);
  } catch (err) { aiError(res, err); }
});

app.post('/api/ai/ask', async (req, res) => {
  try {
    const { question, content } = req.body || {};
    if (!question) return res.status(400).json({ error: 'Missing question' });
    const answer = await callAI(
      'You are a study assistant. Answer the question using ONLY the provided document. If the document does not contain the answer, say so clearly.',
      `Question: ${question}\n\nDocument:\n${(content || '').slice(0, 12000)}`
    );
    res.json({ answer });
  } catch (err) { aiError(res, err); }
});

app.post('/api/ai/tag', async (req, res) => {
  try {
    const { text } = req.body || {};
    if (!text) return res.status(400).json({ error: 'Missing text' });
    const answer = await callAI(
      'You classify study notes. Return a JSON object with keys "tags" (array of 1-3 short lowercase labels like "concept") and "title" (a short suggested chip-like label, max 6 words).',
      `Suggest tags and a short title for this note:\n\n${text.slice(0, 1500)}`,
      { json: true }
    );
    let parsed = { tags: [], title: '' };
    try { parsed = JSON.parse(answer); } catch { /* ignore */ }
    if (!Array.isArray(parsed.tags)) parsed.tags = [];
    res.json(parsed);
  } catch (err) { aiError(res, err); }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
