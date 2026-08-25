const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config({ path: '../revision-guide/.env.local' });

const app = express();
app.use(cors());
app.use(express.json());

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
  quote: String
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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
