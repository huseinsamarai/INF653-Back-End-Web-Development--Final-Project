require('dotenv').config();

const express = require('express');
const path = require('path');

const connectDB = require('./config/db');
const States = require('./models/States');
const verifyStates = require('./middleware/verifyStates');

const app = express();
const PORT = process.env.PORT || 3000;

const statesData = require('./statesData.json');

// ===== BASIC MIDDLEWARE =====
app.disable('x-powered-by');
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

// ===== CORS =====
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

// ===== HELPERS =====
const normalizeCode = (code) => String(code || '').toUpperCase();

const getStateName = (code) => {
  const state = statesData.find(
    (s) => normalizeCode(s.code) === normalizeCode(code)
  );
  return state ? state.state : code;
};

const formatPopulation = (num) =>
  Number(num).toLocaleString('en-US');

// ===== MERGE FOR SINGLE (FIXED) =====
const mergeForSingle = (stateData, funfactDoc) => {
  const merged = { ...stateData };

  if (funfactDoc) {
    // Always include funfacts if doc exists (even empty)
    merged.funfacts = Array.isArray(funfactDoc.funfacts)
      ? funfactDoc.funfacts
      : [];
  }

  return merged;
};

const getMergedState = async (code) => {
  const stateData = statesData.find(
    (s) => normalizeCode(s.code) === normalizeCode(code)
  );

  if (!stateData) return null;

  const doc = await States.findOne({
    stateCode: normalizeCode(code),
  }).lean();

  return mergeForSingle(stateData, doc);
};

// ===== 404 =====
const send404 = (req, res) => {
  res.status(404);
  return res.sendFile(path.join(__dirname, 'public', 'index.html'));
};

// ===== ROUTES =====
const api = express.Router();

api.get('/', (req, res) => {
  res.json({ message: 'States API' });
});

// ===== GET ALL STATES (IMPORTANT RULE) =====
api.get('/states', async (req, res, next) => {
  try {
    const { contig } = req.query;

    const docs = await States.find({}).lean();

    const map = new Map(
      docs.map((d) => [normalizeCode(d.stateCode), d.funfacts || []])
    );

    let results = statesData.map((state) => {
      const facts = map.get(normalizeCode(state.code)) || [];

      const merged = { ...state };

      // ONLY include if has actual values
      if (facts.length > 0) {
        merged.funfacts = facts;
      }

      return merged;
    });

    if (contig === 'true') {
      results = results.filter(
        (s) => !['AK', 'HI'].includes(normalizeCode(s.code))
      );
    }

    if (contig === 'false') {
      results = results.filter(
        (s) => ['AK', 'HI'].includes(normalizeCode(s.code))
      );
    }

    res.json(results);
  } catch (err) {
    next(err);
  }
});

// ===== SINGLE STATE =====
api.get('/states/:state', verifyStates, async (req, res) => {
  const state = await getMergedState(req.code);

  if (!state) {
    return res.status(404).json({
      message: 'Invalid state abbreviation parameter',
    });
  }

  res.json(state);
});

// ===== FUNFACT =====
api.get('/states/:state/funfact', verifyStates, async (req, res) => {
  const state = await getMergedState(req.code);

  if (!state) {
    return res.status(404).json({
      message: 'Invalid state abbreviation parameter',
    });
  }

  if (!state.funfacts || state.funfacts.length === 0) {
    return res.status(404).json({
      message: `No Fun Facts found for ${state.state}`,
    });
  }

  const random =
    state.funfacts[Math.floor(Math.random() * state.funfacts.length)];

  res.json({ funfact: random });
});

// ===== CAPITAL =====
api.get('/states/:state/capital', verifyStates, async (req, res) => {
  const state = await getMergedState(req.code);
  res.json({ state: state.state, capital: state.capital_city });
});

// ===== NICKNAME =====
api.get('/states/:state/nickname', verifyStates, async (req, res) => {
  const state = await getMergedState(req.code);
  res.json({ state: state.state, nickname: state.nickname });
});

// ===== POPULATION =====
api.get('/states/:state/population', verifyStates, async (req, res) => {
  const state = await getMergedState(req.code);
  res.json({
    state: state.state,
    population: formatPopulation(state.population),
  });
});

// ===== ADMISSION =====
api.get('/states/:state/admission', verifyStates, async (req, res) => {
  const state = await getMergedState(req.code);
  res.json({
    state: state.state,
    admitted: state.admission_date,
  });
});

// ===== POST =====
api.post('/states/:state/funfact', verifyStates, async (req, res) => {
  const { funfacts } = req.body;

  if (!funfacts) {
    return res.status(400).json({
      message: 'State fun facts value required',
    });
  }

  if (!Array.isArray(funfacts)) {
    return res.status(400).json({
      message: 'State fun facts value must be an array',
    });
  }

  let doc = await States.findOne({ stateCode: req.code });

  if (!doc) {
    doc = new States({
      stateCode: req.code,
      funfacts,
    });
  } else {
    doc.funfacts.push(...funfacts);
  }

  await doc.save();

  res.status(201).json({
    _id: doc._id,
    stateCode: doc.stateCode,
    funfacts: doc.funfacts,
    __v: doc.__v,
  });
});

// ===== PATCH =====
api.patch('/states/:state/funfact', verifyStates, async (req, res) => {
  const { index, funfact } = req.body;
  const name = getStateName(req.code);

  if (!index) {
    return res.status(400).json({
      message: 'State fun fact index value required',
    });
  }

  if (!funfact) {
    return res.status(400).json({
      message: 'State fun fact value required',
    });
  }

  const doc = await States.findOne({ stateCode: req.code });

  if (!doc || !doc.funfacts.length) {
    return res.status(404).json({
      message: `No Fun Facts found for ${name}`,
    });
  }

  const i = index - 1;

  if (!doc.funfacts[i]) {
    return res.status(404).json({
      message: `No Fun Fact found at that index for ${name}`,
    });
  }

  doc.funfacts[i] = funfact;
  await doc.save();

  res.json({
    _id: doc._id,
    stateCode: doc.stateCode,
    funfacts: doc.funfacts,
    __v: doc.__v,
  });
});

// ===== DELETE =====
api.delete('/states/:state/funfact', verifyStates, async (req, res) => {
  const { index } = req.body;
  const name = getStateName(req.code);

  if (!index) {
    return res.status(400).json({
      message: 'State fun fact index value required',
    });
  }

  const doc = await States.findOne({ stateCode: req.code });

  if (!doc || !doc.funfacts.length) {
    return res.status(404).json({
      message: `No Fun Facts found for ${name}`,
    });
  }

  const i = index - 1;

  if (!doc.funfacts[i]) {
    return res.status(404).json({
      message: `No Fun Fact found at that index for ${name}`,
    });
  }

  doc.funfacts.splice(i, 1);
  await doc.save();

  res.json({
    _id: doc._id,
    stateCode: doc.stateCode,
    funfacts: doc.funfacts,
    __v: doc.__v,
  });
});

// ===== ROOT =====
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ===== API =====
app.use('/api', api);

// ===== 404 =====
app.use(send404);

// ===== ERROR =====
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Server Error' });
});

// ===== START =====
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});